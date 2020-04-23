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
const showdown = require('showdown')
const converter = new showdown.Converter()

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
  return response.body
}

/**
 * Construct DTO from Kafka message payload.
 * @param {Object} payload the Kafka message payload
 * @param {String} m2mToken the m2m token
 * @param {Boolean} isCreated flag indicate the DTO is used in creating challenge
 * @returns the DTO for saving a draft contest.(refer SaveDraftContestDTO in ap-challenge-microservice)
 */
async function parsePayload (payload, m2mToken, isCreated = true) {
  try {
    const data = {
      track: payload.legacy.track, // FIXME: thomas
      name: payload.name,
      reviewType: payload.legacy.reviewType,
      projectId: payload.projectId,
      status: payload.status
    }
    if (payload.legacy.forumId) {
      data.forumId = payload.legacy.forumId
    }
    if (payload.copilotId) {
      data.copilotId = payload.copilotId
    }
    if (isCreated) {
      // hard code some required properties for v4 api
      data.confidentialityType = 'public'
      data.submissionGuidelines = 'Please read above'
      data.submissionVisibility = true
      data.milestoneId = 1
    }
    if (payload.typeId) {
      const typeRes = await helper.getRequest(`${config.V5_CHALLENGE_TYPE_API_URL}/${payload.typeId}`, m2mToken)
      data.subTrack = typeRes.body.name // FIXME: thomas
      data.legacyTypeId = typeRes.body.legacyId
    }
    if (payload.description) {
      try {
        data.detailedRequirements = converter.makeHtml(payload.description)
      } catch (e) {
        data.detailedRequirements = payload.description
      }
    }
    if (payload.privateDescription) {
      try {
        data.privateDescription = converter.makeHtml(payload.privateDescription)
      } catch (e) {
        data.privateDescription = payload.privateDescription
      }
    }
    if (payload.phases) {
      const registrationPhase = _.find(payload.phases, p => p.name.toLowerCase() === constants.phaseTypes.registration)
      const submissionPhase = _.find(payload.phases, p => p.name.toLowerCase() === constants.phaseTypes.submission)
      data.registrationStartsAt = new Date().toISOString()
      data.registrationEndsAt = new Date(Date.now() + registrationPhase.duration).toISOString()
      data.registrationDuration = registrationPhase.duration
      data.submissionEndsAt = new Date(Date.now() + submissionPhase.duration).toISOString()
      data.submissionDuration = submissionPhase.duration

      // Only Design can have checkpoint phase and checkpoint prizes
      const checkpointPhase = _.find(payload.phases, p => p.name.toLowerCase() === constants.phaseTypes.checkpoint)
      if (checkpointPhase) {
        data.checkpointSubmissionStartsAt = new Date().toISOString()
        data.checkpointSubmissionEndsAt = new Date(Date.now() + checkpointPhase.duration).toISOString()
        data.checkpointSubmissionDuration = checkpointPhase.duration
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

      // prize type can be Challenge prizes/Check Point
      const challengePrizes = _.filter(payload.prizeSets, p => p.type !== constants.prizeSetTypes.CheckPoint)
      if (challengePrizes.length > 1) {
        throw new Error('Challenge prize information is invalid.')
      }
      if (challengePrizes.length === 0) {
        // learning challenge has no prizes, for safeguard
        data.prizes = [0]
      } else {
        data.prizes = _.map(challengePrizes[0].prizes, 'value').sort((a, b) => b - a)
      }
    }
    if (payload.tags) {
      const techResult = await getTechnologies(m2mToken)
      data.technologies = _.filter(techResult.result.content, e => payload.tags.includes(e.name))

      const platResult = await getPlatforms(m2mToken)
      data.platforms = _.filter(platResult.result.content, e => payload.tags.includes(e.name))
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
 * Process create challenge message
 * @param {Object} message the kafka message
 */
async function processCreate (message) {
  const m2mToken = await helper.getM2MToken()

  const saveDraftContestDTO = await parsePayload(message.payload, m2mToken)
  logger.debug('Parsed Payload', saveDraftContestDTO)
  const challengeUuid = message.payload.id

  logger.debug('processCreate :: beforeTry')
  try {
    const newChallenge = await helper.postRequest(`${config.V4_CHALLENGE_API_URL}`, { param: saveDraftContestDTO }, m2mToken)
    await helper.patchRequest(`${config.V5_CHALLENGE_API_URL}/${challengeUuid}`, { legacyId: newChallenge.body.result.content.id }, m2mToken)
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
      legacy: Joi.object().keys({
        track: Joi.string().required(),
        reviewType: Joi.string().required(),
        forumId: Joi.number().integer().positive()
      }).required(),
      name: Joi.string().required(),
      description: Joi.string().required(),
      privateDescription: Joi.string(),
      phases: Joi.array().items(Joi.object().keys({
        id: Joi.string().required(),
        name: Joi.string().required(),
        duration: Joi.number().positive().required()
      }).unknown(true)).min(1).required(),
      prizeSets: Joi.array().items(Joi.object().keys({
        type: Joi.string().valid(_.values(constants.prizeSetTypes)).required(),
        prizes: Joi.array().items(Joi.object().keys({
          value: Joi.number().positive().required()
        }).unknown(true)).min(1).required()
      }).unknown(true)).min(1).required(),
      tags: Joi.array().items(Joi.string().required()).min(1).required(), // tag names
      projectId: Joi.number().integer().positive().required(),
      copilotId: Joi.number().integer().positive().optional(),
      status: Joi.string().valid(_.values(Object.keys(constants.createChallengeStatusesMap))).required()
    }).unknown(true).required()
  }).required()
}

/**
 * Process update challenge message
 * @param {Object} message the kafka message
 */
async function processUpdate (message) {
  const m2mToken = await helper.getM2MToken()

  const saveDraftContestDTO = await parsePayload(message.payload, m2mToken, false)
  logger.debug('Parsed Payload', saveDraftContestDTO)
  try {
    // ensure challenge existed
    const challenge = await getChallengeById(m2mToken, message.payload.legacyId)
    // we can't switch the challenge type
    if (message.payload.legacy.track) {
      const newTrack = message.payload.legacy.track
      // track information is stored in subTrack of V4 API
      if (challenge.result.content.track !== newTrack) {
        // refer ContestDirectManager.prepare in ap-challenge-microservice
        throw new Error('You can\'t change challenge track')
      }
    }

    await helper.putRequest(`${config.V4_CHALLENGE_API_URL}/${message.payload.legacyId}`, { param: saveDraftContestDTO })
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
      legacyId: Joi.number().integer().positive().required(),
      legacy: Joi.object().keys({
        track: Joi.string().required(),
        reviewType: Joi.string().required(),
        forumId: Joi.number().integer().positive()
      }).required(),
      typeId: Joi.string(),
      name: Joi.string(),
      description: Joi.string(),
      privateDescription: Joi.string(),
      phases: Joi.array().items(Joi.object().keys({
        id: Joi.string().required(),
        name: Joi.string().required(),
        duration: Joi.number().positive().required()
      }).unknown(true)).min(1),
      prizeSets: Joi.array().items(Joi.object().keys({
        type: Joi.string().valid(_.values(constants.prizeSetTypes)).required(),
        prizes: Joi.array().items(Joi.object().keys({
          value: Joi.number().positive().required()
        }).unknown(true)).min(1).required()
      }).unknown(true)).min(1),
      tags: Joi.array().items(Joi.string().required()).min(1), // tag names
      projectId: Joi.number().integer().positive()
    }).unknown(true).required()
  }).required()
}

module.exports = {
  processCreate,
  processUpdate
}

logger.buildService(module.exports)
