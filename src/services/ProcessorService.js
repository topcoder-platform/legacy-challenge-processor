/**
 * Processor Service
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
 * Construct request body from Kafka message payload.
 * @params {Object} payload the Kafka message payload
 * @params {String} m2mToken the m2m token
 * @params {Boolean} isCreated flag indicate the request body is used in creating challenge endpoint
 * @returns the request body used in create/update challenge
 */
async function parsePayload (payload, m2mToken, isCreated = true) {
  const data = {
    subTrack: payload.track,
    name: payload.name,
    reviewType: payload.reviewType,
    projectId: payload.projectId,
    forumId: payload.forumId
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
    data.track = typeRes.body.name
  }
  if (payload.description) {
    data.detailedRequirements = payload.markdown ? converter.makeHtml(payload.description) : payload.description
  }
  if (payload.phases) {
    const registrationPhase = _.find(payload.phases, p => p.name.toLowerCase() === constants.phaseTypes.registration)
    const submissionPhase = _.find(payload.phases, p => p.name.toLowerCase() === constants.phaseTypes.submission)
    data.registrationStartsAt = new Date().toISOString()
    data.registrationEndsAt = new Date(Date.now() + registrationPhase.duration).toISOString()
    data.submissionEndsAt = new Date(Date.now() + submissionPhase.duration).toISOString()

    // Only Design can have checkpoint phase and checkpoint prizes
    const checkpointPhase = _.find(payload.phases, p => p.name.toLowerCase() === constants.phaseTypes.checkpoint)
    if (checkpointPhase) {
      data.checkpointSubmissionStartsAt = new Date().toISOString()
      data.checkpointSubmissionEndsAt = new Date(Date.now() + checkpointPhase.duration).toISOString()
    } else {
      data.checkpointSubmissionStartsAt = null
      data.checkpointSubmissionEndsAt = null
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

    // prize type can be Code/F2F/MM
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
    let res = await helper.getRequest(`${config.V4_TECHNOLOGIES_API_URL}`, m2mToken)
    const techResult = res.body.result.content
    const technologies = _.filter(techResult, e => e.status.description === 'Active' && payload.tags.includes(e.name))
    data.technologies = _.map(technologies, e => _.pick(e, 'id', 'name'))

    res = await helper.getRequest(`${config.V4_PLATFORMS_API_URL}`, m2mToken)
    const platResult = res.body.result.content
    data.platforms = _.filter(platResult, e => payload.tags.includes(e.name))
  }
  return data
}

/**
 * Process create challenge message
 * @param {Object} message the kafka message
 */
async function processCreate (message) {
  try {
    const m2mToken = await helper.getM2MToken()
    const body = await parsePayload(message.payload, m2mToken)

    // create challenge using v4 api and update legacy id using v5 api
    const challengeResponse = await helper.postRequest(`${config.V4_CHALLENGE_API_URL}`, { param: body }, m2mToken)
    const legacyId = challengeResponse.body.result.content.id

    logger.info(`Create challenge entity in legacy system, the legacy id is ${legacyId}`)

    await helper.patchRequest(`${config.V5_CHALLENGE_API_URL}/${message.payload.id}`, { legacyId }, m2mToken)
  } catch (err) {
    if (err.status) {
      // extract error message from V4 API(first _.get method) or V5 API(second _.get method)
      const message = _.get(err, 'response.body.result.content') || _.get(err, 'response.body.message')
      throw new Error(message)
    } else {
      throw err
    }
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
      track: Joi.string().required(),
      name: Joi.string().required(),
      description: Joi.string().required(),
      phases: Joi.array().items(Joi.object().keys({
        name: Joi.string().required(),
        duration: Joi.number().positive().required()
      }).unknown(true)).min(1).required(),
      prizeSets: Joi.array().items(Joi.object().keys({
        type: Joi.string().valid(_.values(constants.prizeSetTypes)).required(),
        prizes: Joi.array().items(Joi.object().keys({
          value: Joi.number().positive().required()
        }).unknown(true)).min(1).required()
      }).unknown(true)).min(1).required(),
      reviewType: Joi.string().required(),
      markdown: Joi.boolean().required(),
      tags: Joi.array().items(Joi.string().required()).min(1).required(), // tag names
      projectId: Joi.number().integer().positive().required(),
      forumId: Joi.number().integer().positive().required()
    }).unknown(true).required()
  }).required()
}

/**
 * Process update challenge message
 * @param {Object} message the kafka message
 */
async function processUpdate (message) {
  try {
    const m2mToken = await helper.getM2MToken()

    const body = await parsePayload(message.payload, m2mToken, false)

    await helper.putRequest(`${config.V4_CHALLENGE_API_URL}/${message.payload.legacyId}`, { param: body }, m2mToken)
  } catch (err) {
    if (err.status) {
      // extract error message from V4 API(first _.get method) or V5 API(second _.get method)
      const message = _.get(err, 'response.body.result.content') || _.get(err, 'response.body.message')
      throw new Error(message)
    } else {
      throw err
    }
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
      typeId: Joi.string(),
      track: Joi.string(),
      name: Joi.string(),
      description: Joi.string(),
      phases: Joi.array().items(Joi.object().keys({
        name: Joi.string().required(),
        duration: Joi.number().positive().required()
      }).unknown(true)).min(1),
      prizeSets: Joi.array().items(Joi.object().keys({
        type: Joi.string().valid(_.values(constants.prizeSetTypes)).required(),
        prizes: Joi.array().items(Joi.object().keys({
          value: Joi.number().positive().required()
        }).unknown(true)).min(1).required()
      }).unknown(true)).min(1),
      reviewType: Joi.string(),
      markdown: Joi.boolean(),
      tags: Joi.array().items(Joi.string().required()).min(1), // tag names
      projectId: Joi.number().integer().positive(),
      forumId: Joi.number().integer().positive()
    }).unknown(true).required()
  }).required()
}

module.exports = {
  processCreate,
  processUpdate
}

logger.buildService(module.exports)
