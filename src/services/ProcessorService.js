/**
 * Processor Service
 */

const _ = require('lodash')
const Joi = require('@hapi/joi')
const config = require('config')
const logger = require('../common/logger')
const helper = require('../common/helper')
const IDGenerator = require('../common/IdGenerator')
const constants = require('../constants')
const showdown = require('showdown')
const converter = new showdown.Converter()

const compCategoryIdGen = new IDGenerator('COMPCATEGORY_SEQ')
const compVersionIdGen = new IDGenerator('COMPVERSION_SEQ')
const componentIdGen = new IDGenerator('COMPONENT_SEQ')
const compVersionDatesIdGen = new IDGenerator('COMPVERSIONDATES_SEQ')
const compTechIdGen = new IDGenerator('COMPTECH_SEQ')
const projectIdGen = new IDGenerator('project_id_seq')
const prizeIdGen = new IDGenerator('prize_id_seq')
const fileTypeIdGen = new IDGenerator('file_type_id_seq')

/**
 * Prepare Informix statement
 * @param {Object} connection the Informix connection
 * @param {String} sql the sql
 * @return {Object} Informix statement
 */
async function prepare (connection, sql) {
  const stmt = await connection.prepareAsync(sql)
  return Promise.promisifyAll(stmt)
}

/**
 * Insert a record in specified table
 * @param {Object} connection the Informix connection
 * @param {String} tableName the table name
 * @param {Object} columnValues the column key-value map
 */
async function insertRecord (connection, tableName, columnValues) {
  const keys = Object.keys(columnValues)
  const values = _.fill(Array(keys.length), '?')
  const insertRecordStmt = await prepare(connection, `insert into ${tableName} (${keys.join(', ')}) values (${values.join(', ')})`)

  await insertRecordStmt.executeAsync(Object.values(columnValues))
}

/**
 * Update a record in specified table
 * @param {Object} connection the Informix connection
 * @param {String} tableName the table name
 * @param {Object} columnValues the column key-value map
 * @param {String} whereCaluse the where clause
 */
async function updateRecord (connection, tableName, columnValues, whereCaluse) {
  const keys = Object.keys(columnValues)
  const fieldsStatement = keys.map(key => `${key} = ?`).join(', ')
  const updateRecordStmt = await prepare(connection, `update ${tableName} set ${fieldsStatement} where ${whereCaluse}`)

  await updateRecordStmt.executeAsync(Object.values(columnValues))
}

/**
 * Get technologies
 * @param {Object} connection the Informix connection
 * @returns {Array} the technologies
 */
async function getTechnologies (connection) {
  const result = await connection.queryAsync('select technology_type_id as id, technology_name as name from technology_types where status_id = 1')
  _.each(result, e => { e.id = Number(e.id) })
  return result
}

/**
 * Get platforms
 * @param {Object} connection the Informix connection
 * @returns {Array} the platforms
 */
async function getPlatforms (connection) {
  const result = await connection.queryAsync('select project_platform_id as id, name from project_platform_lu')
  _.each(result, e => { e.id = Number(e.id) })
  return result
}

/**
 * Get challenge by id
 * @param {Object} connection the Informix connection
 * @param {Number} id the challenge id
 * @param {Object} the challenge
 */
async function getChallengeById (connection, id) {
  const result = await connection.queryAsync(`select * from project where project_id = ${id}`)
  if (result.length > 0) {
    return result[0]
  } else {
    throw new Error(`Challenge with id: ${id} doesn't existed`)
  }
}

/**
 * Get component version id by challenge id
 * @param {Object} connection the Informix connection
 * @param {Number} challengeId the challenge id
 * @param {Object} the component version id
 */
async function getComponentVersionId (connection, challengeId) {
  const result = await connection.queryAsync(`select value from project_info where project_id = ${challengeId} and project_info_type_id = 1`)
  if (result.length > 0) {
    return Number(result[0].value)
  } else {
    throw new Error(`No component version found for challenge with id: ${challengeId}`)
  }
}

/**
 * Get component id by component version id
 * @param {Object} connection the Informix connection
 * @param {Number} componentVersionId the component version id
 * @param {Object} the component id
 */
async function getComponentId (connection, componentVersionId) {
  const result = await connection.queryAsync(`select component_id from comp_versions where comp_vers_id = ${componentVersionId}`)
  return Number(result[0].component_id)
}

/**
 * Get userIds with permissions on TC direct project
 * @param {Object} connection the Informix connection
 * @param {Number} tcDirectProjectId The TC Direct project id.
 * @returns {Array} the ids of users who have permissions on tc direct project.
 */
async function getUserIdsWithTcDirectProjectPermissions (connection, tcDirectProjectId) {
  const results = await connection.queryAsync(`select user_id as id from user_permission_grant where resource_id = ${tcDirectProjectId}`)
  _.each(results, e => { e.id = Number(e.id) })
  return _.map(results, 'id')
}

/**
 * Posts an event to event bus for creating a Challenge resource.
 *
 * @param {String} challengeId The challenge UUID.
 * @param {String} roleId The resource role UUID.
 * @param {Number} memberId The id of the member.
 */
async function _postCreateResourceBusEvent (challengeId, roleId, memberId) {
  await helper.postBusEvent(config.CREATE_CHALLENGE_RESOURCE_TOPIC, {
    challengeId, roleId, memberId
  })
}

/**
 * Construct DTO from Kafka message payload.
 * @param {Object} payload the Kafka message payload
 * @param {String} m2mToken the m2m token
 * @param {Object} connection the Informix connection
 * @param {Boolean} isCreated flag indicate the DTO is used in creating challenge
 * @returns the DTO for saving a draft contest.(refer SaveDraftContestDTO in ap-challenge-microservice)
 */
async function parsePayload (payload, m2mToken, connection, isCreated = true) {
  try {
    const data = {
      subTrack: payload.track,
      name: payload.name,
      reviewType: payload.reviewType,
      projectId: payload.projectId,
      forumId: payload.forumId,
      status: payload.status
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
      data.track = typeRes.body.name
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
      data.registrationPhaseId = registrationPhase.id
      data.registrationStartsAt = new Date().toISOString()
      data.registrationEndsAt = new Date(Date.now() + registrationPhase.duration).toISOString()
      data.submissionPhaseId = submissionPhase.id
      data.submissionEndsAt = new Date(Date.now() + submissionPhase.duration).toISOString()

      // Only Design can have checkpoint phase and checkpoint prizes
      const checkpointPhase = _.find(payload.phases, p => p.name.toLowerCase() === constants.phaseTypes.checkpoint)
      if (checkpointPhase) {
        data.checkpointSubmissionPhaseId = checkpointPhase.id
        data.checkpointSubmissionStartsAt = new Date().toISOString()
        data.checkpointSubmissionEndsAt = new Date(Date.now() + checkpointPhase.duration).toISOString()
      } else {
        data.checkpointSubmissionPhaseId = null
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
      const techResult = await getTechnologies(connection)
      data.technologies = _.filter(techResult, e => payload.tags.includes(e.name))

      const platResult = await getPlatforms(connection)
      data.platforms = _.filter(platResult, e => payload.tags.includes(e.name))
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
 * Get the component category based on challenge track
 * @param {String} track the challenge track
 * @param {Boolean} isStudio the boolean flag indicate the challenge is studio challenge or not
 * @returns {Object} the root category and category of given challenge track
 */
function getCategory (track, isStudio) {
  const result = {}
  result.rootCategory = constants.componentCategories.NotSetParent
  result.category = constants.componentCategories.NotSet
  if (!_.includes(['MARATHON_MATCH', 'DESIGN', 'DEVELOPMENT'], track) && !isStudio) {
    result.rootCategory = constants.componentCategories.Application
    result.category = constants.componentCategories.BusinessLayer
  }
  return result
}

/**
 * Process create challenge message
 * @param {Object} message the kafka message
 */
async function processCreate (message) {
  // initialize informix database connection and m2m token
  const connection = await helper.getInformixConnection()
  const m2mToken = await helper.getM2MToken()

  const saveDraftContestDTO = await parsePayload(message.payload, m2mToken, connection)
  const track = message.payload.track
  const isStudio = constants.projectCategories[track].projectType === constants.projectTypes.Studio
  const category = getCategory(track, isStudio)

  try {
    // begin transaction
    await connection.beginTransactionAsync()

    // generate component id
    const componentId = await componentIdGen.getNextId()

    // insert record into comp_catalog table
    await insertRecord(connection, 'comp_catalog', {
      component_id: componentId,
      current_version: 1,
      short_desc: 'NA',
      component_name: saveDraftContestDTO.name,
      description: 'NA',
      function_desc: 'NA',
      status_id: 102,
      root_category_id: category.rootCategory.id
    })
    console.log('Insert into comp_categories')
    // insert record into comp_categories table
    await insertRecord(connection, 'comp_categories', {
      comp_categories_id: await compCategoryIdGen.getNextId(),
      component_id: componentId,
      category_id: category.category.id
    })

    // generate component version id
    const componentVersionId = await compVersionIdGen.getNextId()

    // insert record into comp_versions table
    console.log('Insert into comp_versions')
    await insertRecord(connection, 'comp_versions', {
      comp_vers_id: componentVersionId,
      component_id: componentId,
      version: 1,
      version_text: '1.0',
      phase_id: 112,
      phase_time: '1976-05-04 00:00:00', // dummy date value
      price: 0
    })

    // insert record into comp_version_dates table, uses dummy date value
    const dummyDateValue = '2000-01-01'
    console.log('Insert into comp_version_dates')
    await insertRecord(connection, 'comp_version_dates', {
      comp_version_dates_id: await compVersionDatesIdGen.getNextId(),
      comp_vers_id: componentVersionId,
      phase_id: 112,
      total_submissions: 0,
      level_id: 100,
      posting_date: '1976-05-04',
      aggregation_complete_date: dummyDateValue,
      estimated_dev_date: dummyDateValue,
      initial_submission_date: dummyDateValue,
      phase_complete_date: dummyDateValue,
      screening_complete_date: dummyDateValue,
      review_complete_date: dummyDateValue,
      winner_announced_date: dummyDateValue,
      final_submission_date: dummyDateValue,
      production_date: saveDraftContestDTO.registrationStartsAt.slice(0, 10) // convert ISO format to informix date format
    })

    if (!_.includes(['MARATHON_MATCH', 'CONCEPTUALIZATION', 'SPECIFICATION'], track) && !isStudio && saveDraftContestDTO.technologies) {
      for (let tech of saveDraftContestDTO.technologies) {
        // insert record into comp_technology table
        console.log('Insert into comp_technology')
        await insertRecord(connection, 'comp_technology', {
          comp_tech_id: await compTechIdGen.getNextId(),
          comp_vers_id: componentVersionId,
          technology_type_id: tech.id
        })
      }
    }

    // Get the challenge legacy id ( The id in tcs_catalog:project table)
    const legacyId = await projectIdGen.getNextId()
    const currentDateIso = new Date().toISOString().replace('T', ' ').replace('Z', '')

    // Create the Challenge record in tcs_catalog:project table
    console.log('Insert into project')
    await insertRecord(connection, 'project', {
      project_id: legacyId,
      project_status_id: constants.createChallengeStatusesMap[message.payload.status],
      project_category_id: constants.projectCategories[saveDraftContestDTO.subTrack].id,
      create_user: constants.processorUserId,
      create_date: currentDateIso,
      modify_user: constants.processorUserId,
      modify_date: currentDateIso,
      tc_direct_project_id: saveDraftContestDTO.projectId,
      project_studio_spec_id: null, // 'N/A',
      project_mm_spec_id: null, // 'N/A',
    })

    // TODO: this is a lookup table. Should not insert records

    // await insertRecord(connection, 'project_category_lu', {
    //   project_type_id: constants.projectCategories[saveDraftContestDTO.subTrack].id,
    //   description: constants.projectCategories[saveDraftContestDTO.subTrack].name,
    // })

    console.log('Insert into project_info')
    console.log({
      project_id: legacyId,
      project_info_type_id: saveDraftContestDTO.typeId,
      value: saveDraftContestDTO.name
    })
    await insertRecord(connection, 'project_info', {
      project_id: legacyId,
      project_info_type_id: saveDraftContestDTO.typeId,
      value: saveDraftContestDTO.name
    })

    console.log('Insert into project_studio_specification')
    await insertRecord(connection, 'project_studio_specification', {
      project_studio_spec_id: null, // 'N/A',
      contest_description_text: saveDraftContestDTO.detailedRequirements,
      contest_introduction: 'N/A',
      round_one_introduction: 'N/A',
      round_two_introduction: 'N/A'
    })

    console.log('Insert into project_spec')
    await insertRecord(connection, 'project_spec', {
      project_id: legacyId,
      detailed_requirements_text: saveDraftContestDTO.detailedRequirements,
      private_description_text: saveDraftContestDTO.privateDescription,
      final_submission_guidelines_text: 'N/A',
      version: 'N/A'
    })

    // TODO: Not needed?
    // await insertRecord(connection, 'project_mm_specification', {
    //   project_mm_spec_id: null, // 'N/A',
    //   match_details: 'N/A',
    //   match_rules: 'N/A',
    //   problem_id: null // 'N/A',
    // })

    // TODO: Not needed?
    // await insertRecord(connection, 'phase_criteria', {
    //   phase_criteria_type_id: 'N/A',
    //   parameter: 'N/A'
    // })

    console.log('Insert into project_phase')
    await insertRecord(connection, 'project_phase', {
      project_id: legacyId,
      project_phase_id: data.registrationPhaseId,
      phase_type_id: null,
      phase_status_id: null, // 'N/A',
      actual_start_time: data.registrationStartsAt,
      actual_end_time: data.registrationEndsAt
    })

    console.log('Insert into project_phase')
    await insertRecord(connection, 'project_phase', {
      project_id: legacyId,
      project_phase_id: data.registrationPhaseId,
      phase_type_id: null,
      phase_status_id: null, // 'N/A',
      actual_start_time: data.registrationStartsAt,
      actual_end_time: data.registrationEndsAt
    })

    console.log('Insert into project_phase')
    await insertRecord(connection, 'project_phase', {
      project_id: legacyId,
      project_phase_id: data.submissionPhaseId,
      phase_type_id: null,
      phase_status_id: null, // 'N/A',
      actual_start_time: data.registrationEndsAt,
      actual_end_time: data.submissionEndsAt
    })

    if (data.checkpointSubmissionStartsAt && data.checkpointSubmissionEndsAt) {
      console.log('Insert into project_phase')
      await insertRecord(connection, 'project_phase', {
        project_id: legacyId,
        project_phase_id: data.checkpointSubmissionPhaseId,
        phase_type_id: null,
        phase_status_id: null, // 'N/A',
        actual_start_time: data.checkpointSubmissionStartsAt,
        actual_end_time: data.checkpointSubmissionEndsAt
      })
    }

    // TODO: this is a lookup table. Should not insert records
    // await insertRecord(connection, 'project_status_lu', {
    //   name: data.status,
    //   project_status_id: constants.createChallengeStatusesMap[message.payload.status],
    // })

    let fileTypeId = await fileTypeIdGen.getNextId()

    // TODO: this is a lookup table. Should not insert records
    // await insertRecord(connection, 'file_type_lu', {
    //   file_type_id: fileTypeId
    // })

    console.log('Insert into project_file_type_xref')
    await insertRecord(connection, 'project_file_type_xref', {
      contest_id: legacyId,
      project_id: legacyId,
      file_type_id: fileTypeId,
      description: 'N/A'
    })

    console.log('Insert into contest')
    await insertRecord(connection, 'contest', {
      contest_id: legacyId,
    })

    // TODO: Not needed?
    // await insertRecord(connection, 'event', {
    //   event_id: 'N/A',
    //   event_desc: 'N/A',
    //   event_short_desc: 'N/A'
    // })

    let prizeId

    // Create the challenge contest prizes
    _.each(saveDraftContestDTO.prizes, async (prize, i) => {
      prizeId = await prizeIdGen.getNextId()
      console.log('Insert into prize')

      await insertRecord(connection, 'prize', {
        prize_id: prizeId,
        project_id: legacyId,
        place: i + 1,
        prize_amount: prize,
        prize_type_id: constants.prizeTypesIds.Contest,
        number_of_submissions: 1,
        create_user: constants.processorUserId,
        create_date: currentDateIso,
        modify_user: constants.processorUserId,
        modify_date: currentDateIso
      })
    })

    // Create challenge checkpoint prize
    if (saveDraftContestDTO.numberOfCheckpointPrizes > 0) {
      console.log('Insert into prize')
      await insertRecord(connection, 'prize', {
        prize_id: await prizeIdGen.getNextId(),
        project_id: legacyId,
        place: 1,
        prize_amount: saveDraftContestDTO.checkpointPrize,
        prize_type_id: constants.prizeTypesIds.Checkpoint,
        number_of_submissions: saveDraftContestDTO.numberOfCheckpointPrizes,
        create_user: constants.processorUserId,
        create_date: currentDateIso,
        modify_user: constants.processorUserId,
        modify_date: currentDateIso
      })
    }

    // Post the bus event for adding the Copilot resource
    if (saveDraftContestDTO.copilotId) {
      await _postCreateResourceBusEvent(message.payload.id, config.COPILOT_ROLE_UUID, saveDraftContestDTO.copilotId)
    }

    // Get the list of user ids who have permissions on TC direct project to which the challenge is associated
    // These users should be added as obesrvers for the challenge
    let observersIds = await getUserIdsWithTcDirectProjectPermissions(connection, saveDraftContestDTO.projectId)

    // filter out the Callenge Copilot from the observers id array
    if (saveDraftContestDTO.copilotId) {
      observersIds = observersIds.filter((id) => id !== Number(saveDraftContestDTO.copilotId))
    }

    // Post the events for adding the observers to the challenge
    const promises = observersIds.map(observerId => {
      _postCreateResourceBusEvent(message.payload.id, config.OBSERVER_ROLE_UUID, observerId)
    })
    await Promise.all(promises)

    // commit the transaction
    await connection.commitTransactionAsync()
    await helper.putRequest(`${config.V4_ES_FEEDER_API_URL}`, { param: { challengeIds: [legacyId] } },m2mToken)
  } catch (e) {
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    await connection.closeAsync()
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
      privateDescription: Joi.string(),
      status: Joi.string().required(),
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
      reviewType: Joi.string().required(),
      tags: Joi.array().items(Joi.string().required()).min(1).required(), // tag names
      projectId: Joi.number().integer().positive().required(),
      forumId: Joi.number().integer().positive().required(),
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
  // initialize informix database connection and m2m token
  const connection = await helper.getInformixConnection()
  const m2mToken = await helper.getM2MToken()

  const saveDraftContestDTO = await parsePayload(message.payload, m2mToken, connection, false)

  try {
    // begin transaction
    await connection.beginTransactionAsync()

    // ensure challenge existed
    const challenge = await getChallengeById(connection, message.payload.legacyId)
    // get the challenge category
    const category = _.find(constants.projectCategories, { id: Number(challenge.project_category_id) })
    // check the challenge is studio challenge
    const isStudio = category.projectType === constants.projectTypes.Studio

    // we can't switch the challenge type
    if (message.payload.track) {
      const newTrack = message.payload.track
      if (constants.projectCategories[newTrack].id !== category.id) {
        // refer ContestDirectManager.prepare in ap-challenge-microservice
        throw new Error(`You can't change challenge type`)
      }
    }

    const isUpdateTechs = !_.includes(['Marathon Match', 'Conceptualization', 'Specification'], category.name) && !isStudio && saveDraftContestDTO.technologies

    if (message.payload.name || isUpdateTechs) {
      const componentVersionId = await getComponentVersionId(connection, Number(challenge.project_id))

      // update component name
      if (message.payload.name) {
        const componentId = await getComponentId(connection, componentVersionId)
        await updateRecord(connection, 'comp_catalog', { component_name: message.payload.name }, `component_id = ${componentId}`)
      }

      // update component technologies
      if (isUpdateTechs) {
        // clear technologies of specified component version first
        await connection.queryAsync(`delete from comp_technology where comp_vers_id = ${componentVersionId}`)

        for (let tech of saveDraftContestDTO.technologies) {
          // insert record into comp_technology table
          await insertRecord(connection, 'comp_technology', {
            comp_tech_id: await compTechIdGen.getNextId(),
            comp_vers_id: componentVersionId,
            technology_type_id: tech.id
          })
        }
      }
    }

    // commit the transaction
    await connection.commitTransactionAsync()
  } catch (e) {
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    await connection.closeAsync()
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
      privateDescription: Joi.string(),
      status: Joi.string(),
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
      reviewType: Joi.string(),
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
