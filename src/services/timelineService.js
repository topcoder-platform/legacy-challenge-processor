/**
 * Timeline Service
 * Interacts with InformixDB
 */
const logger = require('../common/logger')
const util = require('util')
const _ = require('lodash')
const config = require('config')
const constants = require('../constants')
const momentTZ = require('moment-timezone')
const IDGenerator = require('../common/idGenerator')
const helper = require('../common/helper')

const phaseIdGen = new IDGenerator('prize_id_seq')

const QUERY_GET_PHASE_TYPES = 'SELECT phase_type_id, name FROM phase_type_lu'

const QUERY_GET_CHALLENGE_PHASES = 'SELECT project_phase_id, scheduled_start_time, scheduled_end_time, duration, phase_status_id, phase_type_id FROM project_phase WHERE project_id = %d'
const QUERY_DROP_CHALLENGE_PHASE = 'DELETE FROM project_phase WHERE project_id = ? AND project_phase_id = ?'
const QUERY_INSERT_CHALLENGE_PHASE = 'INSERT INTO project_phase (project_phase_id, project_id, phase_type_id, phase_status_id, fixed_start_time, scheduled_start_time, scheduled_end_time, actual_start_time, actual_end_time, duration, create_user, create_date, modify_user, modify_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT, ?, CURRENT)'
const QUERY_UPDATE_CHALLENGE_PHASE = 'UPDATE project_phase SET scheduled_start_time = ?, scheduled_end_time = ?, duration = ?, phase_status_id = ? WHERE project_phase_id = %d and project_id = %d'

const QUERY_INSERT_PHASE_DEPENDENCY = `INSERT INTO phase_dependency
  (dependency_phase_id, dependent_phase_id, dependency_start, dependent_start, lag_time, create_user, create_date, modify_user, modify_date) 
  VALUES(?, ?, ?, ?, 0, ?, CURRENT, ?, CURRENT)`
const QUERY_DROP_PHASE_DEPENDENCY = 'DELETE FROM phase_dependency WHERE dependency_phase_id = ?'

const QUERY_INSERT_CHALLENGE_PHASE_CRITERIA = `INSERT INTO phase_criteria
  (project_phase_id, phase_criteria_type_id, parameter, create_user, create_date, modify_user, modify_date)
  VALUES(?, ?, ?, ?, CURRENT, ?, CURRENT)`

const QUERY_DROP_CHALLENGE_PHASE_CRITERIA = 'DELETE FROM phase_criteria WHERE project_phase_id = ?'

const QUERY_GET_TIMELINE_NOTIFICATION_SETTINGS = 'SELECT value FROM project_info WHERE project_id = %d and project_info_type_id = %d'

const QUERY_CREATE_TIMELINE_NOTIFICATIONS = 'INSERT INTO project_info (project_id, project_info_type_id, value, create_user, create_date, modify_user, modify_date) VALUES (?, "11", "On", ?, CURRENT, ?, CURRENT)'
const QUERY_UPDATE_TIMELINE_NOTIFICATIONS = 'UPDATE project_info SET value = "On", modify_user = ?, modify_date = CURRENT WHERE project_info_type_id = "11" AND project_id = ?'

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

/**
 * Drop challenge phase
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} projectPhaseId the phase ID
 */
async function dropPhase (connection, challengeLegacyId, projectPhaseId) {
  let result = null
  let query = await prepare(connection, QUERY_DROP_CHALLENGE_PHASE_CRITERIA)
  result = await query.executeAsync([projectPhaseId])

  query = await prepare(connection, QUERY_DROP_CHALLENGE_PHASE)
  result = await query.executeAsync([challengeLegacyId, projectPhaseId])

  query = await prepare(connection, QUERY_DROP_PHASE_DEPENDENCY)
  result = await query.executeAsync([projectPhaseId])
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

async function recreatePhases (legacyId, v5Phases, createdBy) {
  logger.info(`createPhases :: start ${legacyId} ${JSON.stringify(v5Phases)}`)
  const phaseTypes = await getPhaseTypes()
  const phasesFromIFx = await getChallengePhases(legacyId)
  logger.debug('Creating phases that exist on v5 and not on legacy...')
  const phaseMapV5UUIDtoLegacyID = []
  const connection = await helper.getInformixConnection()
  try {
    await connection.beginTransactionAsync()

    for (const phase of v5Phases) {
      const phaseLegacyId = _.get(_.find(phaseTypes, pt => pt.name === phase.name), 'phase_type_id')
      const existingLegacyPhase = _.find(phasesFromIFx, p => p.phase_type_id === phaseLegacyId)
      logger.debug(`Phase ${phase.name} has legacy phase type id ${phaseLegacyId} - Existing Phase ${JSON.stringify(existingLegacyPhase)}`)
      if (!existingLegacyPhase && phaseLegacyId) {
        const statusTypeId = phase.isOpen
          ? constants.PhaseStatusTypes.Open
          : (new Date().getTime() <= new Date(phase.scheduledEndDate).getTime() ? constants.PhaseStatusTypes.Scheduled : constants.PhaseStatusTypes.Closed)
        logger.debug(`Will create phase ${phase.name}/${phaseLegacyId} with duration ${phase.duration} seconds - ${(phase.predecessor !== null) ? 'Has Predecessor' : 'No Predecessor'}`)
        const result = await createPhase(
          connection,
          legacyId,
          phaseLegacyId,
          statusTypeId,
          (phase.predecessor !== null),
          phase.scheduledStartDate,
          phase.actualStartDate,
          phase.scheduledEndDate,
          phase.actualEndDate,
          phase.duration * 1000,
          createdBy
        )
        logger.debug(`createPhase Result: ${JSON.stringify(result)}`)
        phaseMapV5UUIDtoLegacyID[phase.id] = result.id
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
        await dropPhase(connection, legacyId, phase.project_phase_id)
      }
    }

    logger.debug(`V5 Phase Map: ${JSON.stringify(phaseMapV5UUIDtoLegacyID)}`)
    for (const v5Phase of v5Phases) {
      const { id, predecessor, name } = v5Phase
      /**
       * v5Phase {
       *   id = unique UUID for this challenge's phase
       *   phaseId = UUID for the phase type (submission, registration)
       *   predecessor = UUID of the previous phase
       * }
       */
      const hasPredecessor = (predecessor === null)
      const legacyPhaseId = phaseMapV5UUIDtoLegacyID[id]
      const dependentPhaseLegacyId = phaseMapV5UUIDtoLegacyID[predecessor]

      logger.debug(`Creating Phase Dependency for phase ${name} ${legacyPhaseId} ${dependentPhaseLegacyId} ${(hasPredecessor === true) ? 'Yes' : 'No'}`)

      await createPhaseDependency(
        connection,
        legacyPhaseId,
        dependentPhaseLegacyId,
        hasPredecessor
      )
    }

    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'recreatePhases' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    await connection.closeAsync()
  }

  logger.info('recreatePhases :: end')
}

/**
 * Create a phase in IFX
 * @param {Object} connection db connection for transactions
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} phaseTypeId the legacy phase type ID
 * @param {Number} statusTypeId the status type ID
 * @param {Boolean} hasPredecessor whether there's a predecessor or not. Sets fixed start date
 * @param {Date} scheduledStartDate the scheduled start date
 * @param {Date} scheduledEndDate the scheduled end date
 * @param {Date} duration the duration
 * @param {String} createdBy the createdBy
 */
async function createPhase (connection, challengeLegacyId, phaseTypeId, statusTypeId, hasPredecessor, scheduledStartDate, scheduledEndDate, duration, createdBy) {
  const nextId = await phaseIdGen.getNextId()
  let result = null

  const query = await prepare(connection, QUERY_INSERT_CHALLENGE_PHASE)
  // logger.debug(`Query data: ${JSON.stringify([
  //   nextId,
  //   challengeLegacyId,
  //   phaseTypeId,
  //   statusTypeId,
  //   hasPredecessor ? formatDate(scheduledStartDate) : null,
  //   formatDate(scheduledStartDate),
  //   formatDate(scheduledEndDate),
  //   null, // hasPredecessor ? formatDate(actualStartDate) : null,
  //   null, // hasPredecessor ? formatDate(actualEndDate) : null,
  //   duration,
  //   createdBy,
  //   createdBy
  // ])}`)
  result = await query.executeAsync([
    nextId,
    challengeLegacyId,
    phaseTypeId,
    statusTypeId,
    hasPredecessor ? formatDate(scheduledStartDate) : null,
    formatDate(scheduledStartDate),
    formatDate(scheduledEndDate),
    null, // hasPredecessor ? formatDate(actualStartDate) : null,
    null, // hasPredecessor ? formatDate(actualEndDate) : null,
    duration,
    createdBy,
    createdBy
  ])
  // TODO Add Phase Criteria

  logger.info(`Phase ${phaseTypeId} has been created`)
  return result
}

async function createPhaseDependency (connection, phaseId, dependentPhaseLegacyId, hasPredecessor, createdBy) {
  const query = await prepare(connection, QUERY_INSERT_PHASE_DEPENDENCY)
  const result = await query.executeAsync([
    phaseId,
    dependentPhaseLegacyId,
    (hasPredecessor) ? '0' : '1',
    '1',
    createdBy,
    createdBy
  ])

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
  recreatePhases,
  createPhaseDependency,
  dropPhase
}
