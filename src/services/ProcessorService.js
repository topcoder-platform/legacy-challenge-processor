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
async function associateChallengeGroups (toBeAdded = [], toBeDeleted = [], legacyChallengeId) {
  for (const group of toBeAdded) {
    await groupService.addGroupToChallenge(legacyChallengeId, group)
  }
  for (const group of toBeDeleted) {
    await groupService.removeGroupFromChallenge(legacyChallengeId, group)
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
 * @param {Number|String} legacyChallengeId the legacy challenge ID
 * @param {Array} prizeSets the prizeSets array
 * @param {String} createdBy the created by handle
 * @param {String} updatedBy the updated by handle
 */
async function setCopilotPayment (legacyChallengeId, prizeSets = [], createdBy, updatedBy) {
  try {
    const copilotPayment = _.get(_.find(prizeSets, p => p.type === config.COPILOT_PAYMENT_TYPE), 'prizes[0].value', null)
    logger.debug(`Setting Copilot Payment: ${copilotPayment} for legacyId ${legacyChallengeId}`)
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
    query.push(`tags[]=${tag}`)
  })
  try {
    const res = await helper.getRequest(`${config.V5_CHALLENGE_MIGRATION_API_URL}/convert-to-v4?${query.join('&')}`, m2mToken)
    return {
      track: res.body.track,
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
async function parsePayload (payload, m2mToken, isCreated = true, informixGroupIds) {
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
      status: payload.status
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
    if (isCreated) {
      // hard code some required properties for v4 api
      data.confidentialityType = _.get(payload, 'legacy.confidentialityType', 'public')
      data.submissionGuidelines = 'Please read above'
      data.submissionVisibility = true
      data.milestoneId = 1
    }

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

      const platResult = await getPlatforms(m2mToken)
      data.platforms = _.filter(platResult.result.content, e => payload.tags.includes(e.name))
    }
    if (payload.groups && _.get(payload, 'groups.length', 0) > 0) {
      const oldGroups = _.map(informixGroupIds, g => _.toString(g))
      const newGroups = []

      for (const group of payload.groups) {
        try {
          const groupInfo = await getGroup(group, m2mToken)
          if (!_.isEmpty(_.get(groupInfo, 'oldId'))) {
            newGroups.push(_.toString(_.get(groupInfo, 'oldId')))
          }
        } catch (e) {
          logger.warn(`Failed to load details for group ${group}`)
        }
      }
      data.groupsToBeAdded = _.difference(newGroups, oldGroups)
      data.groupsToBeDeleted = _.difference(oldGroups, newGroups)
      if (data.groupsToBeAdded.length > 0) {
        logger.debug(`parsePayload :: Adding Groups ${JSON.stringify(data.groupsToBeAdded)}`)
      }
      if (data.groupsToBeDeleted.length > 0) {
        logger.debug(`parsePayload :: Deleting Groups ${JSON.stringify(data.groupsToBeAdded)}`)
      }
    } else if (informixGroupIds && informixGroupIds.length > 0) {
      data.groupsToBeDeleted = _.map(informixGroupIds, g => _.toString(g))
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
 * Process create challenge message
 * @param {Object} message the kafka message
 */
async function processCreate (message) {
  if (message.payload.status === constants.challengeStatuses.New) {
    logger.debug(`Will skip creating on legacy as status is ${constants.challengeStatuses.New}`)
    return
  }
  const m2mToken = await helper.getM2MToken()

  const saveDraftContestDTO = await parsePayload(message.payload, m2mToken)
  logger.debug('Parsed Payload', saveDraftContestDTO)
  const challengeUuid = message.payload.id

  logger.debug('processCreate :: beforeTry')
  try {
    const newChallenge = await helper.postRequest(`${config.V4_CHALLENGE_API_URL}`, { param: _.omit(saveDraftContestDTO, ['groupsToBeAdded', 'groupsToBeDeleted']) }, m2mToken)

    let forumId = 0
    if (message.payload.legacy && message.payload.legacy.forumId) {
      forumId = message.payload.legacy.forumId
    }
    forumId = _.get(newChallenge, 'body.result.content.forumId', forumId)
    await helper.forceV4ESFeeder(newChallenge.body.result.content.id)
    await associateChallengeGroups(saveDraftContestDTO.groupsToBeAdded, saveDraftContestDTO.groupsToBeDeleted, newChallenge.body.result.content.id)
    // await associateChallengeTerms(saveDraftContestDTO.termsToBeAdded, saveDraftContestDTO.termsToBeRemoved, newChallenge.body.result.content.id)
    await setCopilotPayment(newChallenge.body.result.content.id, _.get(message, 'payload.prizeSets'), _.get(message, 'payload.createdBy'), _.get(message, 'payload.updatedBy'))
    await helper.patchRequest(`${config.V5_CHALLENGE_API_URL}/${challengeUuid}`, {
      legacy: {
        ...message.payload.legacy,
        track: saveDraftContestDTO.track,
        subTrack: saveDraftContestDTO.subTrack,
        isTask: saveDraftContestDTO.task || false,
        directProjectId: newChallenge.body.result.content.projectId,
        forumId
      },
      legacyId: newChallenge.body.result.content.id
    }, m2mToken)
    // Repost all challenge resource on Kafka so they will get created on legacy by the legacy-challenge-resource-processor
    const challengeResourcesResponse = await helper.getRequest(`${config.V5_RESOURCES_API_URL}?challengeId=${challengeUuid}&perPage=100`, m2mToken)
    for (const resource of (challengeResourcesResponse.body || [])) {
      await helper.postBusEvent(config.RESOURCE_CREATE_TOPIC, _.pick(resource, ['id', 'challengeId', 'memberId', 'memberHandle', 'roleId', 'created', 'createdBy', 'updated', 'updatedBy', 'legacyId']))
    }
    await timelineService.enableTimelineNotifications(newChallenge.body.result.content.id, _.get(message, 'payload.createdBy'))
    logger.debug('End of processCreate')
  } catch (e) {
    logger.error('processCreate Catch', e)
    throw e
  }
}

processCreate.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      id: Joi.string().required(),
      typeId: Joi.string().required(),
      trackId: Joi.string().required(),
      legacy: Joi.object().keys({
        track: Joi.string().required(),
        reviewType: Joi.string().required(),
        confidentialityType: Joi.string(),
        directProjectId: Joi.number(),
        forumId: Joi.number().integer().positive()
      }).unknown(true),
      task: Joi.object().keys({
        isTask: Joi.boolean().default(false),
        isAssigned: Joi.boolean().default(false),
        memberId: Joi.string().allow(null)
      }),
      billingAccountId: Joi.number(),
      name: Joi.string().required(),
      description: Joi.string(),
      privateDescription: Joi.string(),
      phases: Joi.array().items(Joi.object().keys({
        id: Joi.string().required(),
        duration: Joi.number().positive().required()
      }).unknown(true)),
      prizeSets: Joi.array().items(Joi.object().keys({
        type: Joi.string().valid(_.values(constants.prizeSetTypes)).required(),
        prizes: Joi.array().items(Joi.object().keys({
          value: Joi.number().positive().required()
        }).unknown(true)).min(1).required()
      }).unknown(true)),
      tags: Joi.array().items(Joi.string().required()), // tag names
      projectId: Joi.number().integer().positive().required(),
      copilotId: Joi.number().integer().positive().optional(),
      status: Joi.string().valid(_.values(Object.keys(constants.createChallengeStatusesMap))).required(),
      groups: Joi.array().items(Joi.string()),
      startDate: Joi.date()
    }).unknown(true).required()
  }).required()
}

/**
 * Process update challenge message
 * @param {Object} message the kafka message
 */
async function processUpdate (message) {
  if (message.payload.status === constants.challengeStatuses.New) {
    logger.debug(`Will skip creating on legacy as status is ${constants.challengeStatuses.New}`)
    return
  } else if (!message.payload.legacyId) {
    logger.debug('Legacy ID does not exist. Will create...')
    return processCreate(message)
  }
  const m2mToken = await helper.getM2MToken()

  let challenge
  try {
    // ensure challenge existed
    challenge = await getChallengeById(m2mToken, message.payload.legacyId)
    if (!challenge) {
      throw new Error(`Could not find challenge ${message.payload.legacyId}`)
    }
  } catch (e) {
    // postponne kafka event
    logger.warn(`Error getting challenge by id, RETRY TURNED OFF ${JSON.stringify(e)}`)
    // logger.info('Challenge does not exist yet. Will post the same message back to the bus API')
    // logger.error(`Error: ${JSON.stringify(e)}`)

    // const retryCountIdentifier = `${config.KAFKA_GROUP_ID.split(' ').join('_')}_retry_count`
    // let currentRetryCount = parseInt(_.get(message.payload, retryCountIdentifier, 1), 10)
    // if (currentRetryCount <= config.MAX_RETRIES) {
    //   await new Promise((resolve) => {
    //     setTimeout(async () => {
    //       currentRetryCount += 1
    //       await helper.postBusEvent(config.UPDATE_CHALLENGE_TOPIC, { ...message.payload, [retryCountIdentifier]: currentRetryCount })
    //       resolve()
    //     }, config.RETRY_TIMEOUT * currentRetryCount)
    //   })
    // } else {
    //   logger.error(`Failed to process message after ${config.MAX_RETRIES} retries. Aborting...`)
    // }
    // return
  }

  const v4GroupIds = await groupService.getGroupsForChallenge(message.payload.legacyId)
  logger.info(`GroupIDs Found in Informix: ${JSON.stringify(v4GroupIds)}`)
  // const v4TermsIds = await termsService.getTermsForChallenge(message.payload.legacyId)

  const saveDraftContestDTO = await parsePayload(message.payload, m2mToken, false, v4GroupIds)
  // logger.debug('Parsed Payload', saveDraftContestDTO)
  try {
    await helper.putRequest(`${config.V4_CHALLENGE_API_URL}/${message.payload.legacyId}`, { param: _.omit(saveDraftContestDTO, ['groupsToBeAdded', 'groupsToBeDeleted']) }, m2mToken)
    await associateChallengeGroups(saveDraftContestDTO.groupsToBeAdded, saveDraftContestDTO.groupsToBeDeleted, message.payload.legacyId)
    await associateChallengeTerms(message.payload.terms, message.payload.legacyId, _.get(message, 'payload.createdBy'), _.get(message, 'payload.updatedBy'))
    await setCopilotPayment(message.payload.legacyId, _.get(message, 'payload.prizeSets'), _.get(message, 'payload.createdBy'), _.get(message, 'payload.updatedBy'))

    if (message.payload.status) {
      // logger.info(`The status has changed from ${challenge.currentStatus} to ${message.payload.status}`)
      if (message.payload.status === constants.challengeStatuses.Active && challenge.currentStatus !== constants.challengeStatuses.Active) {
        logger.info('Activating challenge...')
        await activateChallenge(message.payload.legacyId)
        logger.info('Activated!')
      }
      if (message.payload.status === constants.challengeStatuses.Completed && challenge.currentStatus !== constants.challengeStatuses.Completed) {
        if (message.payload.task.isTask) {
          logger.info('Challenge is a TASK')
          if (!message.payload.winners || message.payload.winners.length === 0) {
            throw new Error('Cannot close challenge without winners')
          }
          const winnerId = _.find(message.payload.winners, winner => winner.placement === 1).userId
          logger.info(`Will close the challenge with ID ${message.payload.legacyId}. Winner ${winnerId}!`)
          await closeChallenge(message.payload.legacyId, winnerId)
        } else {
          logger.info('Challenge type is not a task.. Skip closing challenge...')
        }
      }
    }
    await helper.forceV4ESFeeder(message.payload.legacyId)
  } catch (e) {
    logger.error('processUpdate Catch', e)
    throw e
  }
}

processUpdate.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      legacyId: Joi.number().integer().positive(),
      legacy: Joi.object().keys({
        track: Joi.string().required(),
        reviewType: Joi.string().required(),
        confidentialityType: Joi.string(),
        directProjectId: Joi.number(),
        forumId: Joi.number().integer().positive()
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
          value: Joi.number().positive().required()
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
  processCreate,
  processUpdate
}

// logger.buildService(module.exports)
