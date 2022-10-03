/**
 * Timeline Service
 * Interacts with InformixDB
 */
const _ = require('lodash')

const logger = require('../common/logger')
const util = require('util')
const config = require('config')
const momentTZ = require('moment-timezone')
const IDGenerator = require('../common/idGenerator')
const helper = require('../common/helper')

const phaseIdGen = new IDGenerator('project_phase_id_seq')

const QUERY_GET_PHASE_TYPES = 'SELECT phase_type_id, name FROM phase_type_lu'

const QUERY_GET_CHALLENGE_PHASES = 'SELECT project_phase_id, scheduled_start_time, scheduled_end_time, duration, phase_status_id, phase_type_id FROM project_phase WHERE project_id = %d'
const QUERY_DROP_CHALLENGE_PHASE = 'DELETE FROM project_phase WHERE project_id = ? AND project_phase_id = ?'
const QUERY_INSERT_CHALLENGE_PHASE = 'INSERT INTO project_phase (project_phase_id, project_id, phase_type_id, phase_status_id,  scheduled_start_time, scheduled_end_time, duration, create_user, create_date, modify_user, modify_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT, ?, CURRENT)'
const QUERY_UPDATE_CHALLENGE_PHASE = 'UPDATE project_phase SET scheduled_start_time = ?, scheduled_end_time = ?, duration = ?, phase_status_id = ? WHERE project_phase_id = %d and project_id = %d'

const QUERY_DROP_CHALLENGE_PHASE_CRITERIA = 'DELETE FROM phase_criteria WHERE project_phase_id = ?'

const QUERY_GET_TIMELINE_NOTIFICATION_SETTINGS = 'SELECT value FROM project_info WHERE project_id = %d and project_info_type_id = %d'

const QUERY_CREATE_TIMELINE_NOTIFICATIONS = 'INSERT INTO project_info (project_id, project_info_type_id, value, create_user, create_date, modify_user, modify_date) VALUES (?, "11", "On", ?, CURRENT, ?, CURRENT)'
const QUERY_UPDATE_TIMELINE_NOTIFICATIONS = 'UPDATE project_info SET value = "On", modify_user = ?, modify_date = CURRENT WHERE project_info_type_id = "11" AND project_id = ?'

const QUERY_INSERT_CHALLENGE_PHASE_DEPENDENCY = 'INSERT INTO phase_dependency (dependency_phase_id, dependent_phase_id, dependency_start, dependent_start, lag_time, create_user, create_date, modify_user, modify_date) VALUES (?, ?, ?, 1, 0, ?, CURRENT, ?, CURRENT)'
const QUERY_GET_PROJECT_PHASE_ID = 'SELECT project_phase_id FROM project_phase WHERE project_id = %d AND phase_type_id = %d'
/**
 * Formats a date into a format supported by ifx
 * @param {String} dateStr the date in string format
 */
function formatDate (dateStr) {
  const date = momentTZ.tz(dateStr, config.TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
  logger.info(`Formatting date ${dateStr} New Date ${date}`)
  return date
}

/**
 * Prepare Informix statement
 * @param {Object} connection the Informix connection
 * @param {String} sql the sql
 * @return {Object} Informix statement
 */
async function prepare (connection, sql) {
  // logger.debug(`Preparing SQL ${sql}`)
  const stmt = await connection.prepareAsync(sql)
  return Promise.promisifyAll(stmt)
}

/**
 * Gets the phase types from ifx
 */
async function getPhaseTypes () {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    result = await connection.queryAsync(QUERY_GET_PHASE_TYPES)
  } catch (e) {
    logger.error(`Error in 'getPhaseTypes' ${e}`)
    throw e
  } finally {
    await connection.closeAsync()
  }
  return result
}

async function insertPhaseDependency(dependencyPhaseId, dependentPhaseId, dependencyStart, createdBy){

  logger.info(`Creating phase dependency ${dependencyPhaseId} to ${dependentPhaseId} at ${dependencyStart}`)
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    let query = await prepare(connection, QUERY_INSERT_CHALLENGE_PHASE_DEPENDENCY)
    result = await query.executeAsync([dependencyPhaseId, dependentPhaseId, dependencyStart, createdBy, createdBy])
  } catch (e) {
    logger.error(`Error in 'insertPhaseDependency' ${e}`)
    throw e
  } finally {
    await connection.closeAsync()
  }
  return result
}
/**
 * Gets phase for the given phase type for the given challenge ID
 */
async function getProjectPhaseId(challengeLegacyId, phaseTypeId) {
  logger.info(`Getting project phase ID type ${phaseTypeId} for challenge ${challengeLegacyId}`)
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    await connection.beginTransactionAsync()
    result = await connection.queryAsync(util.format(QUERY_GET_PROJECT_PHASE_ID, challengeLegacyId, phaseTypeId))
  } catch (e) {
    logger.error(`Error in 'getProjectPhaseId' ${e}`)
    throw e
  } finally {
    await connection.closeAsync()
  }
  logger.info(`Query result: ${result}`)
  const project_phase_id = _.get(result, '[0]', null)
  logger.info(`Project phase ID: ${project_phase_id}`)
  return project_phase_id
}
/**
 * Drop challenge phase
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} projectPhaseId the phase ID
 */
async function dropPhase (challengeLegacyId, projectPhaseId) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    await connection.beginTransactionAsync()
    let query = await prepare(connection, QUERY_DROP_CHALLENGE_PHASE_CRITERIA)
    result = await query.executeAsync([projectPhaseId])
    query = await prepare(connection, QUERY_DROP_CHALLENGE_PHASE)
    result = await query.executeAsync([challengeLegacyId, projectPhaseId])
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'dropPhase' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info('Phases have been deleted')
    await connection.closeAsync()
  }
  return result
}

/**
 * Gets the challenge phases from ifx
 * @param {Number} challengeLegacyId the legacy challenge ID
 */
async function getChallengePhases (challengeLegacyId) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    result = await connection.queryAsync(util.format(QUERY_GET_CHALLENGE_PHASES, challengeLegacyId))
  } catch (e) {
    logger.error(`Error in 'getChallengePhases' ${e}`)
    throw e
  } finally {
    await connection.closeAsync()
  }
  return result
}

/**
 * Create a phase in IFX
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} phaseTypeId the legacy phase type ID
 * @param {Number} statusTypeId the status type ID
 * @param {Date} scheduledStartDate the scheduled start date
 * @param {Date} actualStartDate the actual start date
 * @param {Date} scheduledEndDate the scheduled end date
 * @param {Date} actualEndDate the actual end date
 * @param {Date} duration the duration
 * @param {String} createdBy the createdBy
 */
async function createPhase (challengeLegacyId, phaseTypeId, statusTypeId, scheduledStartDate, actualStartDate, scheduledEndDate, actualEndDate, duration, createdBy) {
  const nextId = await phaseIdGen.getNextId()
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    await connection.beginTransactionAsync()
    const query = await prepare(connection, QUERY_INSERT_CHALLENGE_PHASE)
    logger.debug(`Query data: ${JSON.stringify([
      nextId,
      challengeLegacyId,
      phaseTypeId,
      statusTypeId,
      formatDate(scheduledStartDate),
      formatDate(scheduledEndDate),
      duration,
      createdBy,
      createdBy
    ])}`)
    result = await query.executeAsync([
      nextId,
      challengeLegacyId,
      phaseTypeId,
      statusTypeId,
      formatDate(scheduledStartDate),
      formatDate(scheduledEndDate),
      duration,
      createdBy,
      createdBy
    ])
    await connection.commitTransactionAsync()

  } catch (e) {
    logger.error(`Error in 'createPhase' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Phase ${phaseTypeId} has been created`)
    await connection.closeAsync()
  }
  return result
}

/**
 * Update a phase in IFX
 * @param {Number} phaseId the phase ID
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Date} startTime the scheduled start date
 * @param {Date} endTime the scheduled end date
 * @param {Date} duration the duration
 * @param {Number} statusTypeId the status type ID
 */
async function updatePhase (phaseId, challengeLegacyId, startTime, endTime, duration, statusTypeId) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    // await connection.beginTransactionAsync()
    const query = await prepare(connection, util.format(QUERY_UPDATE_CHALLENGE_PHASE, phaseId, challengeLegacyId))
    result = await query.executeAsync([formatDate(startTime), formatDate(endTime), duration, statusTypeId])
    // await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'updatePhase' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Phase ${phaseId} has been updated`)
    await connection.closeAsync()
  }
  return result
}

/**
 * Get teh timeline notification settings entry
 * @param {Number} challengeLegacyId the legacy challenge ID
 */
async function getTimelineNotifications (challengeLegacyId) {
  // logger.debug(`Getting Groups for Challenge ${challengeLegacyId}`)
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    result = await connection.queryAsync(util.format(QUERY_GET_TIMELINE_NOTIFICATION_SETTINGS, challengeLegacyId, 11))
  } catch (e) {
    logger.error(`Error in 'getTermsForChallenge' ${e}`)
    throw e
  } finally {
    await connection.closeAsync()
  }
  return result
}

/**
 * Enable timeline notifications
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {String} createdBy the created by
 */
async function enableTimelineNotifications (challengeLegacyId, createdBy) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    // await connection.beginTransactionAsync()
    const [existing] = await getTimelineNotifications(challengeLegacyId)
    if (existing) {
      const query = await prepare(connection, QUERY_UPDATE_TIMELINE_NOTIFICATIONS)
      result = await query.executeAsync([createdBy, challengeLegacyId])
    } else {
      const query = await prepare(connection, QUERY_CREATE_TIMELINE_NOTIFICATIONS)
      result = await query.executeAsync([challengeLegacyId, createdBy, createdBy])
    }
    // await connection.commitTransactionAsync()
    logger.info(`Notifications have been enabled for challenge ${challengeLegacyId}`)
  } catch (e) {
    logger.error(`Error in 'enableTimelineNotifications' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    await connection.closeAsync()
  }
  return result
}

module.exports = {
  getChallengePhases,
  getPhaseTypes,
  updatePhase,
  enableTimelineNotifications,
  createPhase,
  dropPhase,
  insertPhaseDependency,
  getProjectPhaseId
}
