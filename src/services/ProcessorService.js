/**
 * Processor Service
 * Processes messages gathered from Kafka
 * Interacts with the V4 api for feeding data into legacy system
 */

const _ = require('lodash')
const Joi = require('@hapi/joi')
const config = require('config')
const logger = require('../common/logger')
const helper = require('../common/helper')
const constants = require('../constants')
const groupService = require('./groupsService')
const termsService = require('./termsService')
const copilotPaymentService = require('./copilotPaymentService')
const timelineService = require('./timelineService')
const metadataService = require('./metadataService')
const paymentService = require('./paymentService')
const { createOrSetNumberOfReviewers } = require('./selfServiceReviewerService')
const { disableTimelineNotifications } = require('./selfServiceNotificationService')
const legacyChallengeService = require('./legacyChallengeService')
const legacyChallengeReviewService = require('./legacyChallengeReviewService')

/**
 * Drop and recreate phases in ifx
 * @param {Number} legacyId the legacy challenge ID
 * @param {Array} v5Phases the v5 phases
 * @param {String} createdBy the createdBy
 */
async function recreatePhases (legacyId, v5Phases, createdBy) {
  logger.info('recreatePhases :: start')
  const phaseTypes = await timelineService.getPhaseTypes()
  const phasesFromIFx = await timelineService.getChallengePhases(legacyId)
  logger.debug('Creating phases that exist on v5 and not on legacy...')
  for (const phase of v5Phases) {
    const phaseLegacyId = _.get(_.find(phaseTypes, pt => pt.name === phase.name), 'phase_type_id')
    const existingLegacyPhase = _.find(phasesFromIFx, p => p.phase_type_id === phaseLegacyId)
    logger.debug(`Phase ${phase.name} has legacy phase type id ${phaseLegacyId} - Existing Phase ${JSON.stringify(existingLegacyPhase)}`)
    if (!existingLegacyPhase && phaseLegacyId) {
      const statusTypeId = phase.isOpen
        ? constants.PhaseStatusTypes.Open
        : (new Date().getTime() <= new Date(phase.scheduledEndDate).getTime() ? constants.PhaseStatusTypes.Scheduled : constants.PhaseStatusTypes.Closed)
      logger.debug(`Will create phase ${phase.name}/${phaseLegacyId} with duration ${phase.duration} seconds`)
      await timelineService.createPhase(
        legacyId,
        phaseLegacyId,
        statusTypeId,
        phase.scheduledStartDate,
        phase.actualStartDate,
        phase.scheduledEndDate,
        phase.actualEndDate,
        phase.duration * 1000,
        createdBy
      )
    } else if (!phaseLegacyId) {
      logger.warn(`Could not create phase ${phase.name} on legacy!`)
    }
  }
  logger.debug('Deleting phases that exist on legacy and not on v5...')
  for (const phase of phasesFromIFx) {
    const phaseName = _.get(_.find(phaseTypes, pt => pt.phase_type_id === phase.phase_type_id), 'name')
    const v5Equivalent = _.find(v5Phases, p => p.name === phaseName)
    if (!v5Equivalent) {
      logger.debug(`Will delete phase ${phaseName}`)
      await timelineService.dropPhase(legacyId, phase.project_phase_id)
    }
  }
  logger.info('recreatePhases :: end')
}

/**
 * Sync the information from the v5 phases into legacy
 * @param {Number} legacyId the legacy challenge ID
 * @param {Array} v5Phases the v5 phases
 * @param {Boolean} isSelfService is the challenge self-service
 * @param {String} createdBy the created by
 */
async function syncChallengePhases (legacyId, v5Phases, createdBy, isSelfService, numOfReviewers) {
  const phaseTypes = await timelineService.getPhaseTypes()
  const phasesFromIFx = await timelineService.getChallengePhases(legacyId)
  logger.debug(`Phases from v5: ${JSON.stringify(v5Phases)}`)
  logger.debug(`Phases from IFX: ${JSON.stringify(phasesFromIFx)}`)
  for (const phase of phasesFromIFx) {
    const phaseName = _.get(_.find(phaseTypes, pt => pt.phase_type_id === phase.phase_type_id), 'name')
    const v5Equivalent = _.find(v5Phases, p => p.name === phaseName)
    logger.info(`v4 Phase: ${JSON.stringify(phase)}, v5 Equiv: ${JSON.stringify(v5Equivalent)}`)
    if (v5Equivalent) {
      // Compare duration and status
      // if (v5Equivalent.duration * 1000 !== phase.duration * 1 || isSelfService) {
      // ||
      // (v5Equivalent.isOpen && _.toInteger(phase.phase_status_id) === constants.PhaseStatusTypes.Closed) ||
      // (!v5Equivalent.isOpen && _.toInteger(phase.phase_status_id) === constants.PhaseStatusTypes.Open)) {
      // const newStatus = v5Equivalent.isOpen
      //   ? constants.PhaseStatusTypes.Open
      //   : (new Date().getTime() <= new Date(v5Equivalent.scheduledEndDate).getTime() ? constants.PhaseStatusTypes.Scheduled : constants.PhaseStatusTypes.Closed)
      // update phase
      logger.debug(`Will update phase ${phaseName}/${v5Equivalent.name} from ${phase.duration} to duration ${v5Equivalent.duration * 1000} milli`)
      const newStatus = v5Equivalent.isOpen
        ? constants.PhaseStatusTypes.Open
        : (new Date().getTime() <= new Date(v5Equivalent.scheduledEndDate).getTime() ? constants.PhaseStatusTypes.Scheduled : constants.PhaseStatusTypes.Closed)
      await timelineService.updatePhase(
        phase.project_phase_id,
        legacyId,
        v5Equivalent.scheduledStartDate,
        v5Equivalent.scheduledEndDate,
        v5Equivalent.duration * 1000,
        newStatus
      )
      // newStatus)
      // } else {
      //   logger.info(`Durations for ${phaseName} match: ${v5Equivalent.duration * 1000} === ${phase.duration}`)
      // }
    } else {
      logger.info(`No v5 Equivalent Found for ${phaseName}`)
    }
    if (isSelfService && phaseName === 'Review') {
      // make sure to set the required reviewers to 2
      await createOrSetNumberOfReviewers(_.toString(phase.project_phase_id), _.toString(numOfReviewers), _.toString(createdBy))
    }
  }
  // TODO: What about iterative reviews? There can be many for the same challenge.
  // TODO: handle timeline template updates
}

/**
 * Update the payments from v5 prize sets into legacy
 * @param {Number} legacyId the legacy challenge ID
 * @param {Array} v5PrizeSets the v5 prize sets
 * @param {String} createdBy the created by
 */
async function updateMemberPayments (legacyId, v5PrizeSets, createdBy) {
  const prizesFromIfx = await paymentService.getChallengePrizes(legacyId, constants.prizeTypesIds.Contest)
  const [checkpointPrizesFromIfx] = await paymentService.getChallengePrizes(legacyId, constants.prizeTypesIds.Checkpoint)
  const v5Prizes = _.map(_.get(_.find(v5PrizeSets, p => p.type === constants.prizeSetTypes.ChallengePrizes), 'prizes', []), prize => prize.value)
  const v5CheckPointPrizes = _.map(_.get(_.find(v5PrizeSets, p => p.type === constants.prizeSetTypes.CheckPoint), 'prizes', []), prize => prize.value)
  // compare prizes
  if (v5Prizes && v5Prizes.length > 0) {
    v5Prizes.sort((a, b) => b - a)
    for (let i = 0; i < v5Prizes.length; i += 1) {
      const ifxPrize = _.find(prizesFromIfx, p => p.place === i + 1)
      if (ifxPrize) {
        if (_.toInteger(ifxPrize.prize_amount) !== v5Prizes[i]) {
          await paymentService.updatePrize(ifxPrize.prize_id, legacyId, v5Prizes[i], 1)
        }
      } else {
        await paymentService.createPrize(legacyId, i + 1, v5Prizes[i], constants.prizeTypesIds.Contest, 1, createdBy)
      }
    }
    if (prizesFromIfx.length > v5Prizes.length) {
      const prizesToDelete = _.filter(prizesFromIfx, p => p.place > v5Prizes.length)
      for (const prizeToDelete of prizesToDelete) {
        await paymentService.deletePrize(legacyId, prizeToDelete.prize_id)
      }
    }
  }
  // compare checkpoint prizes
  if (v5CheckPointPrizes && v5CheckPointPrizes.length > 0) {
    // we assume that all checkpoint prizes will be the same
    if (v5CheckPointPrizes.length !== checkpointPrizesFromIfx.number_of_submissions || v5CheckPointPrizes[0] !== _.toInteger(checkpointPrizesFromIfx.prize_amount)) {
      await paymentService.updatePrize(checkpointPrizesFromIfx.prize_id, legacyId, v5CheckPointPrizes[0], v5CheckPointPrizes.length)
    }
  } else if (checkpointPrizesFromIfx) {
    await paymentService.deletePrize(legacyId, checkpointPrizesFromIfx.prize_id)
  }
}

/**
 * Get group information by V5 UUID
 * @param {String} v5GroupId the v5 group UUID
 * @param {String} m2mToken token for accessing the API
 */
async function getGroup (v5GroupId, m2mToken) {
  const response = await helper.getRequest(`${config.V5_GROUPS_API_URL}/${v5GroupId}`, m2mToken)
  return response.body
}

/**
 * Get terms information by V5 UUID
 * @param {String} v5TermsId the v5 terms UUID
 * @param {String} m2mToken token for accessing the API
 */
async function getV5Terms (v5TermsId, m2mToken) {
  logger.debug(`Get V5 Terms: ${config.V5_TERMS_API_URL}/${v5TermsId}`)
  const response = await helper.getRequest(`${config.V5_TERMS_API_URL}/${v5TermsId}`, m2mToken)
  logger.debug(`Get v5 terms response: ${JSON.stringify(response.body)}`)
  return response.body
}

// /**
//  * Get resource role information by V5 UUID
//  * @param {String} v5RoleId the v5 role UUID
//  * @param {String} m2mToken token for accessing the API
//  */
// async function getV5Role (v5RoleId, m2mToken) {
//   const response = await helper.getRequest(`${config.V5_RESOURCE_ROLES_API_URL}?id=${v5RoleId}`, m2mToken)
//   return response.body[0]
// }

/**
 * Associate challenge groups
 * @param {Array<String>} toBeAdded the array of groups to be added
 * @param {Array<String>} toBeDeleted the array of groups to be deleted
 * @param {String|Number} legacyChallengeId the legacy challenge ID
 */
async function associateChallengeGroups (v5groups, legacyId, m2mToken) {
  const { groupsToBeAdded, groupsToBeDeleted } = await getGroups(v5groups, legacyId, m2mToken)
  logger.info(`Groups to add to challenge: ${legacyId}: ${JSON.stringify(groupsToBeAdded)}`)
  for (const group of groupsToBeAdded) {
    await groupService.addGroupToChallenge(legacyId, group)
  }
  logger.info(`Groups to remove from challenge: ${legacyId}: ${JSON.stringify(groupsToBeDeleted)}`)
  for (const group of groupsToBeDeleted) {
    await groupService.removeGroupFromChallenge(legacyId, group)
  }
}

/**
 * Associate challenge terms
 * @param {Array<Object{termsId, roleId}>} toBeAdded the array of terms to be added
 * @param {Array<Object{termsId, roleId}>} toBeDeleted the array of terms to be deleted
 * @param {String|Number} legacyChallengeId the legacy challenge ID
 */
async function associateChallengeTerms (v5Terms, legacyChallengeId, createdBy, updatedBy) {
  // logger.debug(`v5Terms Terms Array: ${JSON.stringify(v5Terms)}`)
  const legacyTermsArray = await termsService.getTermsForChallenge(legacyChallengeId)
  // logger.debug(`Legacy Terms Array: ${JSON.stringify(legacyTermsArray)}`)
  const nda = _.find(v5Terms, e => e.id === config.V5_TERMS_NDA_ID)
  const legacyNDA = _.find(legacyTermsArray, e => _.toNumber(e.id) === _.toNumber(config.LEGACY_TERMS_NDA_ID))

  const standardTerms = _.find(v5Terms, e => e.id === config.V5_TERMS_STANDARD_ID)
  const legacyStandardTerms = _.find(legacyTermsArray, e => _.toNumber(e.id) === _.toNumber(config.LEGACY_TERMS_STANDARD_ID))

  // logger.debug(`NDA: ${config.V5_TERMS_NDA_ID} - ${JSON.stringify(nda)}`)
  // logger.debug(`Standard Terms: ${config.V5_TERMS_STANDARD_ID} - ${JSON.stringify(standardTerms)}`)
  // logger.debug(`Legacy NDA: ${JSON.stringify(legacyNDA)}`)
  // logger.debug(`Legacy Standard Terms: ${JSON.stringify(legacyStandardTerms)}`)

  const m2mToken = await helper.getM2MToken()
  if (standardTerms && standardTerms.id && !legacyStandardTerms) {
    logger.debug('Associate Challenge Terms - v5 Standard Terms exist, not in legacy. Adding to Legacy.')
    const v5StandardTerm = await getV5Terms(standardTerms.id, m2mToken)
    await termsService.addTermsToChallenge(legacyChallengeId, v5StandardTerm.legacyId, config.LEGACY_SUBMITTER_ROLE_ID, createdBy, updatedBy)
  } else if (!standardTerms && legacyStandardTerms && legacyStandardTerms.id) {
    logger.debug('Associate Challenge Terms - Legacy NDA exist, not in V5. Removing from Legacy.')
    await termsService.removeTermsFromChallenge(legacyChallengeId, legacyStandardTerms.id, config.LEGACY_SUBMITTER_ROLE_ID)
  }

  if (nda && nda.id && !legacyNDA) {
    logger.debug('Associate Challenge Terms - v5 NDA exist, not in legacy. Adding to Legacy.')
    const v5NDATerm = await getV5Terms(nda.id, m2mToken)
    await termsService.addTermsToChallenge(legacyChallengeId, v5NDATerm.legacyId, config.LEGACY_SUBMITTER_ROLE_ID, createdBy, updatedBy, true)
  } else if (!nda && legacyNDA && legacyNDA.id) {
    logger.debug('Associate Challenge Terms - Legacy NDA exist, not in V5. Removing from Legacy.')
    await termsService.removeTermsFromChallenge(legacyChallengeId, legacyNDA.id, config.LEGACY_SUBMITTER_ROLE_ID, true)
  }

  // logger.debug('Associate Challenge Terms - Nothing to Do')
}

/**
 * Set the copilot payment on legacy
 * @param {String} challengeId the V5 challenge ID
 * @param {Number|String} legacyChallengeId the legacy challenge ID
 * @param {Array} prizeSets the prizeSets array
 * @param {String} createdBy the created by handle
 * @param {String} updatedBy the updated by handle
 * @param {String} m2mToken the m2m token
 */
async function setCopilotPayment (challengeId, legacyChallengeId, prizeSets = [], createdBy, updatedBy, m2mToken) {
  try {
    const copilotPayment = _.get(_.find(prizeSets, p => p.type === config.COPILOT_PAYMENT_TYPE), 'prizes[0].value', 0)
    logger.debug('Fetching challenge copilot...')
    const res = await helper.getRequest(`${config.V5_RESOURCES_API_URL}?challengeId=${challengeId}&roleId=${config.COPILOT_ROLE_ID}`, m2mToken)
    const [copilotResource] = res.body
    if (!copilotResource) {
      logger.warn(`Copilot does not exist for challenge ${challengeId} (legacy: ${legacyChallengeId})`)
      return
    }
    logger.debug(`Setting Copilot Payment: ${copilotPayment} for legacyId ${legacyChallengeId} for copilot ${copilotResource.memberId}`)
    await copilotPaymentService.setManualCopilotPayment(legacyChallengeId, createdBy, updatedBy)
    await copilotPaymentService.setCopilotPayment(legacyChallengeId, copilotPayment, createdBy, updatedBy)
  } catch (e) {
    logger.error('Failed to set the copilot payment!')
    logger.debug(e)
  }
}

/**
 * Get technologies from V4 API
 * @param {String} m2mToken token for accessing the API
 * @returns {Object} technologies response body
 */
async function getTechnologies (m2mToken) {
  const response = await helper.getRequest(`${config.V4_TECHNOLOGIES_API_URL}`, m2mToken)
  return response.body
}

/**
 * Get platforms from V4 API
 * @param {String} m2mToken token for accessing the API
 * @returns {Object} platforms response body
 */
async function getPlatforms (m2mToken) {
  const response = await helper.getRequest(`${config.V4_PLATFORMS_API_URL}`, m2mToken)
  return response.body
}

/**
 * Get Challenge from V4 API
 * @param {String} m2mToken token for accessing the API
 * @param {Number} legacyId token for accessing the API
 * @returns {Object} challenge response body
 */
async function getChallengeById (m2mToken, legacyId) {
  const response = await helper.getRequest(`${config.V4_CHALLENGE_API_URL}/${legacyId}`, m2mToken)
  return _.get(response, 'body.result.content')
}

/**
 * Get Project from V5 API
 * @param {String} m2mToken token for accessing the API
 * @param {Number} projectId project id
 * @returns {Object} project response body
 */
async function getDirectProjectId (m2mToken, projectId) {
  const response = await helper.getRequest(`${config.V5_PROJECTS_API_URL}/${projectId}`, m2mToken)
  return response.body
}

/**
 * Get legacy challenge track and subTrack values based on the v5 trackId, typeId and tags
 * @param {String} trackId the V5 track ID
 * @param {String} typeId the v5 type ID
 * @param {Array<String>} tags the v5 tags
 * @param {String} m2mToken the M2M token
 */
async function getLegacyTrackInformation (trackId, typeId, tags, m2mToken) {
  if (_.isUndefined(trackId)) {
    throw new Error('Cannot create a challenge without a trackId.')
  }
  if (_.isUndefined(typeId)) {
    throw new Error('Cannot create a challenge without a typeId.')
  }
  const query = [
    `trackId=${trackId}`,
    `typeId=${typeId}`
  ]
  _.each((tags || []), (tag) => {
    query.push(`tags[]=${encodeURIComponent(tag)}`)
  })
  try {
    const res = await helper.getRequest(`${config.V5_CHALLENGE_MIGRATION_API_URL}/convert-to-v4?${query.join('&')}`, m2mToken)
    return {
      // track: res.body.track,
      subTrack: res.body.subTrack,
      ...(res.body.isTask ? { task: true } : {})
    }
  } catch (e) {
    throw new Error(_.get(e, 'message', 'Failed to get V4 track/subTrack information'))
  }
}

/**
 * Construct DTO from Kafka message payload.
 * @param {Object} payload the Kafka message payload
 * @param {String} m2mToken the m2m token
 * @param {Boolean} isCreated flag indicate the DTO is used in creating challenge
 * @param {Array} informixGroupIds IDs from Informix associated with the group
 * @param {Array<Object>} informixTermsIds IDs from Informix [{termsId, roleId}]
 * @returns the DTO for saving a draft contest.(refer SaveDraftContestDTO in ap-challenge-microservice)
 */
async function parsePayload (payload, m2mToken) {
  try {
    let projectId
    if (_.get(payload, 'legacy.directProjectId')) {
      projectId = payload.legacy.directProjectId
    } else {
      projectId = _.get((await getDirectProjectId(m2mToken, payload.projectId)), 'directProjectId')
      if (!projectId) throw new Error(`Could not find Direct Project ID for Project ${payload.projectId}`)
    }

    const legacyTrackInfo = await getLegacyTrackInformation(payload.trackId, payload.typeId, payload.tags, m2mToken)

    const data = {
      ...legacyTrackInfo,
      name: payload.name,
      reviewType: _.get(payload, 'legacy.reviewType', 'INTERNAL'),
      projectId,
      status: payload.status === constants.challengeStatuses.CancelledPaymentFailed ? constants.challengeStatuses.CancelledFailedScreening : payload.status
    }
    if (payload.billingAccountId) {
      data.billingAccountId = payload.billingAccountId
    }
    if (_.get(payload, 'legacy.forumId')) {
      data.forumId = payload.legacy.forumId
    }
    if (payload.copilotId) {
      data.copilotId = payload.copilotId
    }
    // if (isCreated) {
    // hard code some required properties for v4 api
    data.confidentialityType = _.get(payload, 'legacy.confidentialityType', 'public')
    data.submissionGuidelines = 'Please read above'
    data.submissionVisibility = true
    data.milestoneId = 1
    // }

    data.detailedRequirements = payload.description
    if (payload.privateDescription) {
      // don't include the private description as there could be
      // info that shouldn't be public. Just identify the v5 challenge id
      data.detailedRequirements += '\n\r'
      data.detailedRequirements += 'V5 Challenge - Additional Details: ' + payload.id
    }
    const SECONDS_TO_MILLIS = 1000
    if (payload.phases) {
      const registrationPhase = _.find(payload.phases, p => p.phaseId === config.REGISTRATION_PHASE_ID)
      const submissionPhase = _.find(payload.phases, p => p.phaseId === config.SUBMISSION_PHASE_ID)
      const startDate = payload.startDate ? new Date(payload.startDate) : new Date()
      data.registrationStartsAt = startDate.toISOString()
      data.registrationEndsAt = new Date(startDate.getTime() + (registrationPhase || submissionPhase).duration * SECONDS_TO_MILLIS).toISOString()
      data.registrationDuration = (registrationPhase || submissionPhase).duration * SECONDS_TO_MILLIS
      data.submissionEndsAt = new Date(startDate.getTime() + submissionPhase.duration * SECONDS_TO_MILLIS).toISOString()
      data.submissionDuration = submissionPhase.duration * SECONDS_TO_MILLIS

      // Only Design can have checkpoint phase and checkpoint prizes
      const checkpointPhase = _.find(payload.phases, p => p.phaseId === config.CHECKPOINT_SUBMISSION_PHASE_ID)
      if (checkpointPhase) {
        data.checkpointSubmissionStartsAt = startDate.toISOString()
        data.checkpointSubmissionEndsAt = new Date(startDate.getTime() + checkpointPhase.duration * SECONDS_TO_MILLIS).toISOString()
        data.checkpointSubmissionDuration = checkpointPhase.duration * SECONDS_TO_MILLIS
      } else {
        data.checkpointSubmissionStartsAt = null
        data.checkpointSubmissionEndsAt = null
        data.checkpointSubmissionDuration = null
      }
    }
    if (payload.prizeSets) {
      // Only Design can have checkpoint phase and checkpoint prizes
      const checkpointPrize = _.find(payload.prizeSets, { type: constants.prizeSetTypes.CheckPoint })
      if (checkpointPrize) {
        // checkpoint prize are the same for each checkpoint submission winner
        data.numberOfCheckpointPrizes = checkpointPrize.prizes.length
        data.checkpointPrize = checkpointPrize.prizes[0].value
      } else {
        data.numberOfCheckpointPrizes = 0
        data.checkpointPrize = 0
      }

      // prize type can be Challenge prizes
      const challengePrizes = _.find(payload.prizeSets, { type: constants.prizeSetTypes.ChallengePrizes })
      if (!challengePrizes) {
        throw new Error('Challenge prize information is invalid.')
      }
      data.prizes = _.map(challengePrizes.prizes, 'value').sort((a, b) => b - a)
    }
    if (payload.tags) {
      const techResult = await getTechnologies(m2mToken)
      data.technologies = _.filter(techResult.result.content, e => payload.tags.includes(e.name))

      if (data.technologies.length < 1) {
        data.technologies = _.filter(techResult.result.content, e => e.name === 'Other')
      }

      const platResult = await getPlatforms(m2mToken)
      data.platforms = _.filter(platResult.result.content, e => payload.tags.includes(e.name))

      if (data.platforms.length < 1) {
        data.platforms = _.filter(platResult.result.content, e => e.name === 'Other')
      }

      logger.debug(`Technologies: ${JSON.stringify(data.technologies)}`)
      logger.debug(`Platforms: ${JSON.stringify(data.platforms)}`)
    }

    if (payload.metadata && payload.metadata.length > 0) {
      const fileTypes = _.find(payload.metadata, meta => meta.name === 'fileTypes')
      if (fileTypes) {
        if (_.isArray(fileTypes.value)) {
          data.fileTypes = fileTypes.value
        } else {
          try {
            data.fileTypes = JSON.parse(fileTypes.value)
          } catch (e) {
            data.fileTypes = []
          }
        }
      }
    }

    return data
  } catch (err) {
    // Debugging
    logger.debug(err)
    if (err.status) {
      // extract error message from V5 API
      const message = _.get(err, 'response.body.message')
      throw new Error(message)
    } else {
      throw err
    }
  }
}

async function getGroups (v5Groups, legacyId, m2mToken) {
  const v4GroupIds = await groupService.getGroupsForChallenge(legacyId)
  let groupsToBeAdded = []
  let groupsToBeDeleted = []
  if (v5Groups && v5Groups.length > 0) {
    const oldGroups = _.map(v4GroupIds, g => _.toString(g))
    const newGroups = []

    for (const group of v5Groups) {
      try {
        const groupInfo = await getGroup(group, m2mToken)
        if (!_.isEmpty(_.get(groupInfo, 'oldId'))) {
          newGroups.push(_.toString(_.get(groupInfo, 'oldId')))
        }
      } catch (e) {
        logger.warn(`Failed to load details for group ${group}`)
      }
    }
    groupsToBeAdded = _.difference(newGroups, oldGroups)
    groupsToBeDeleted = _.difference(oldGroups, newGroups)
    if (groupsToBeAdded.length > 0) {
      logger.debug(`parsePayload :: Adding Groups ${JSON.stringify(groupsToBeAdded)}`)
    }
    if (groupsToBeDeleted.length > 0) {
      logger.debug(`parsePayload :: Deleting Groups ${JSON.stringify(groupsToBeDeleted)}`)
    }
  } else if (v4GroupIds && v4GroupIds.length > 0) {
    groupsToBeDeleted = _.map(v4GroupIds, g => _.toString(g))
  }
  return {
    groupsToBeAdded,
    groupsToBeDeleted
  }
}

/**
 * Activate challenge
 * @param {Number} challengeId the challenge ID
 */
async function activateChallenge (challengeId) {
  const m2mToken = await helper.getM2MToken()
  return helper.postRequest(`${config.V4_CHALLENGE_API_URL}/${challengeId}/activate`, null, m2mToken)
}

/**
 * Close challenge
 * @param {Number} challengeId the challenge ID
 * @param {Number} winnerId the winner ID
 */
async function closeChallenge (challengeId, winnerId) {
  const m2mToken = await helper.getM2MToken()
  return helper.postRequest(`${config.V4_CHALLENGE_API_URL}/${challengeId}/close?winnerId=${winnerId}`, null, m2mToken)
}

/**
 * Repost challenge resources on kafka
 * @param {String} challengeUuid the V5 challenge UUID
 * @param {String} m2mToken the m2m token
 */
async function rePostResourcesOnKafka (challengeUuid, m2mToken) {
  const challengeResourcesResponse = await helper.getRequest(`${config.V5_RESOURCES_API_URL}?challengeId=${challengeUuid}&perPage=100`, m2mToken)
  for (const resource of (challengeResourcesResponse.body || [])) {
    await helper.postBusEvent(config.RESOURCE_CREATE_TOPIC, _.pick(resource, ['id', 'challengeId', 'memberId', 'memberHandle', 'roleId', 'created', 'createdBy', 'updated', 'updatedBy', 'legacyId']))
  }
}

/**
 * Process create challenge message
 * @param {Object} message the kafka message
 * @returns {Number} the created legacy id
 */
async function createChallenge (saveDraftContestDTO, challengeUuid, createdByUserId, v5legacyPayload, m2mToken) {
  // logger.debug('processCreate :: beforeTry')
  // try {
  logger.info(`processCreate :: ${config.V4_CHALLENGE_API_URL}?filter=skipForum=true body: ${JSON.stringify({ param: saveDraftContestDTO })}`)
  let newChallenge
  try {
    newChallenge = await helper.postRequest(`${config.V4_CHALLENGE_API_URL}?filter=skipForum=true`, { param: saveDraftContestDTO }, m2mToken)
  } catch (e) {
    throw new Error(`createChallenge - Calling POST v4 API Failed.
      Request URL: ${`${config.V4_CHALLENGE_API_URL}?filter=skipForum=true`}
      Params: ${JSON.stringify({ param: saveDraftContestDTO })}
      Error: ${JSON.stringify(e)}
      Token: ${JSON.stringify(m2mToken)}`)
  }

  const legacyId = newChallenge.body.result.content.id
  let forumId = 0
  forumId = _.get(newChallenge, 'body.result.content.forumId', forumId)
  try {
    await helper.forceV4ESFeeder(legacyId)
  } catch (e) {
    logger.error(`createChallenge - Error calling forceV4ESFeeder ${e}`)
  }

  await helper.patchRequest(`${config.V5_CHALLENGE_API_URL}/${challengeUuid}`, {
    legacy: {
      ...v5legacyPayload,
      track: saveDraftContestDTO.track,
      subTrack: saveDraftContestDTO.subTrack,
      isTask: saveDraftContestDTO.task || false,
      directProjectId: newChallenge.body.result.content.projectId,
      forumId
    },
    legacyId
  }, m2mToken)
  // Repost all challenge resource on Kafka so they will get created on legacy by the legacy-challenge-resource-processor
  await rePostResourcesOnKafka(challengeUuid, m2mToken)
  await timelineService.enableTimelineNotifications(legacyId, createdByUserId)
  await metadataService.createOrUpdateMetadata(legacyId, 9, 'On', createdByUserId) // autopilot
  return legacyId
}

/**
 * Process update challenge message
 * @param {Object} message the kafka message
 */
async function processMessage (message) {
  if (_.get(message, 'payload.legacy.pureV5Task') || _.get(message, 'payload.legacy.pureV5')) {
    logger.debug(`Challenge ${message.payload.id} is a pure v5 task or challenge. Will skip...`)
    return
  }

  if (message.payload.status === constants.challengeStatuses.New) {
    logger.debug(`Will skip creating on legacy as status is ${constants.challengeStatuses.New}`)
    return
  }

  if (message.payload.status === constants.challengeStatuses.Approved) {
    logger.debug(`Will skip updating on legacy as status is ${constants.challengeStatuses.Approved}`)
    return
  }

  logger.info(`Processing Kafka Message: ${JSON.stringify(message)}`)

  const createdByUserHandle = _.get(message, 'payload.createdBy')
  const updatedByUserHandle = _.get(message, 'payload.updatedBy')

  const createdByUserId = await helper.getMemberIdByHandle(createdByUserHandle)
  let updatedByUserId = createdByUserId
  if (updatedByUserHandle !== createdByUserHandle) {
    updatedByUserId = await helper.getMemberIdByHandle(updatedByUserHandle)
  }

  let legacyId = message.payload.legacyId
  const challengeUuid = message.payload.id
  const m2mToken = await helper.getM2MToken()

  const saveDraftContestDTO = await parsePayload(message.payload, m2mToken)

  if (!legacyId) {
    logger.debug('Legacy ID does not exist. Will create...')
    legacyId = await createChallenge(saveDraftContestDTO, challengeUuid, createdByUserId, message.payload.legacy, m2mToken)

    await recreatePhases(legacyId, message.payload.phases, updatedByUserId)

    if (_.get(message, 'payload.legacy.selfService')) {
      await disableTimelineNotifications(legacyId, createdByUserId) // disable
    }
  }

  logger.debug('Result from parsePayload:')
  logger.debug(JSON.stringify(saveDraftContestDTO))

  let metaValue
  for (const metadataKey of _.keys(constants.supportedMetadata)) {
    try {
      metaValue = constants.supportedMetadata[metadataKey].method(message.payload, constants.supportedMetadata[metadataKey].defaultValue)
      if (metaValue !== null && metaValue !== '') {
        logger.info(`Setting ${constants.supportedMetadata[metadataKey].description} to ${metaValue}`)
        await metadataService.createOrUpdateMetadata(legacyId, metadataKey, metaValue, updatedByUserId)
      }
    } catch (e) {
      logger.warn(`Failed to set ${constants.supportedMetadata[metadataKey].description} to ${metaValue}`)
    }
  }

  logger.info(`Set Associations for challenge ${legacyId}`)
  await updateMemberPayments(legacyId, message.payload.prizeSets, updatedByUserId)
  logger.info(`Associate groups for challenge ${legacyId}`)
  await associateChallengeGroups(message.payload.groups, legacyId, m2mToken)
  logger.info(`Associate challenge terms for challenge ${legacyId}`)
  await associateChallengeTerms(message.payload.terms, legacyId, createdByUserId, updatedByUserId)
  logger.info(`set copilot for challenge ${legacyId}`)
  await setCopilotPayment(challengeUuid, legacyId, _.get(message, 'payload.prizeSets'), createdByUserId, updatedByUserId, m2mToken)

  try {
    logger.info(`force V4 ES Feeder for the legacy challenge ${legacyId}`)
    await helper.forceV4ESFeeder(legacyId)
  } catch (e) {
    logger.warn(`Failed to call V4 ES Feeder ${JSON.stringify(e)}`)
  }

  let challenge
  try {
    challenge = await getChallengeById(m2mToken, legacyId)
  } catch (e) {
    throw new Error(`Error getting challenge by id - Error: ${JSON.stringify(e)}`)
  }

  // If iterative review is open
  if (_.find(_.get(message.payload, 'phases'), p => p.isOpen && p.name === 'Iterative Review')) {
    // Try to read reviews and insert them into informix DB
    if (message.payload.metadata && message.payload.legacy.reviewScorecardId) {
      let orReviewFeedback = _.find(message.payload.metadata, meta => meta.name === 'or_review_feedback')
      let orReviewScore = _.find(message.payload.metadata, meta => meta.name === 'or_review_score')
      if (!_.isUndefined(orReviewFeedback) && !_.isUndefined(orReviewScore)) {
        orReviewFeedback = JSON.parse(orReviewFeedback)
        const reviewResponses = []
        _.each(orReviewFeedback, (value, key) => {
          const questionId = _.get(_.find(constants.scorecardQuestionMapping[message.payload.legacy.reviewScorecardId], item => _.toString(item.questionId) === _.toString(key) || _.toLower(item.description) === _.toLower(key)), 'questionId')
          reviewResponses.push({
            questionId,
            answer: value
          })
        })
        orReviewScore = _.toNumber(orReviewFeedback)
        await legacyChallengeReviewService.insertReview(legacyId, message.payload.legacy.reviewScorecardId, orReviewScore, reviewResponses, createdByUserId)
      }
    }
  }

  if (message.payload.status && challenge) {
    // Whether we need to sync v4 ES again
    let needSyncV4ES = false
    // logger.info(`The status has changed from ${challenge.currentStatus} to ${message.payload.status}`)
    if (message.payload.status === constants.challengeStatuses.Active && challenge.currentStatus !== constants.challengeStatuses.Active) {
      logger.info('Activating challenge...')
      const activated = await activateChallenge(legacyId)
      logger.info(`Activated! ${JSON.stringify(activated)}`)
      // make sure autopilot is on
      await metadataService.createOrUpdateMetadata(legacyId, 9, 'On', createdByUserId) // autopilot
      // Repost all challenge resource on Kafka so they will get created on legacy by the legacy-challenge-resource-processor
      await rePostResourcesOnKafka(challengeUuid, m2mToken)
      needSyncV4ES = true
    }
    if (message.payload.status === constants.challengeStatuses.Completed && challenge.currentStatus !== constants.challengeStatuses.Completed) {
      if (message.payload.task.isTask) {
        logger.info('Challenge is a TASK')
        if (!message.payload.winners || message.payload.winners.length === 0) {
          throw new Error('Cannot close challenge without winners')
        }
        const winnerId = _.find(message.payload.winners, winner => winner.placement === 1).userId
        logger.info(`Will close the challenge with ID ${legacyId}. Winner ${winnerId}!`)
        await closeChallenge(legacyId, winnerId)
        needSyncV4ES = true
      } else {
        logger.info('Challenge type is not a task.. Skip closing challenge...')
      }
    }

    if (!_.get(message.payload, 'task.isTask')) {
      const numOfReviewers = 2
      await syncChallengePhases(legacyId, message.payload.phases, createdByUserId, _.get(message, 'payload.legacy.selfService'), numOfReviewers)
      needSyncV4ES = true
    } else {
      logger.info('Will skip syncing phases as the challenge is a task...')
    }
    if (message.payload.status === constants.challengeStatuses.CancelledClientRequest && challenge.currentStatus !== constants.challengeStatuses.CancelledClientRequest) {
      logger.info('Cancelling challenge...')
      await legacyChallengeService.cancelChallenge(legacyId, updatedByUserId)
      needSyncV4ES = true
    }
    if (needSyncV4ES) {
      try {
        logger.info(`Resync V4 ES for the legacy challenge ${legacyId}`)
        await helper.forceV4ESFeeder(legacyId)
      } catch (e) {
        logger.warn(`Resync V4 - Failed to call V4 ES Feeder ${JSON.stringify(e)}`)
      }
    }
  }
}

processMessage.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    key: Joi.string().allow(null),
    payload: Joi.object().keys({
      legacyId: Joi.number().integer().positive(),
      legacy: Joi.object().keys({
        track: Joi.string().required(),
        reviewType: Joi.string().required(),
        confidentialityType: Joi.string(),
        directProjectId: Joi.number(),
        forumId: Joi.number().integer().positive(),
        selfService: Joi.boolean()
      }).unknown(true),
      task: Joi.object().keys({
        isTask: Joi.boolean().default(false),
        isAssigned: Joi.boolean().default(false),
        memberId: Joi.string().allow(null)
      }),
      billingAccountId: Joi.number(),
      typeId: Joi.string().required(),
      trackId: Joi.string().required(),
      name: Joi.string(),
      description: Joi.string(),
      privateDescription: Joi.string(),
      phases: Joi.array().items(Joi.object().keys({
        id: Joi.string().required(),
        duration: Joi.number().positive().required()
      }).unknown(true)),
      prizeSets: Joi.array().items(Joi.object().keys({
        type: Joi.string().valid(_.values(constants.prizeSetTypes)).required(),
        prizes: Joi.array().items(Joi.object().keys({
          value: Joi.number().min(0).required()
        }).unknown(true))
      }).unknown(true)).min(1),
      tags: Joi.array().items(Joi.string().required()).min(1), // tag names
      projectId: Joi.number().integer().positive().allow(null),
      groups: Joi.array().items(Joi.string()),
      startDate: Joi.date()
    }).unknown(true).required()
  }).required()
}

module.exports = {
  // processCreate,
  processMessage
}

// logger.buildService(module.exports)
