/**
 * Number of reviewers Service
 * Interacts with InformixDB
 */
const util = require('util')
const logger = require('../common/logger')
const helper = require('../common/helper')

const QUERY_GET_ENTRY = 'SELECT parameter FROM phase_criteria WHERE project_phase_id = %d AND phase_criteria_type_id = 6'
const QUERY_CREATE = 'INSERT INTO phase_criteria (project_phase_id, phase_criteria_type_id, parameter, create_user, create_date, modify_user, modify_date) VALUES (?, 6, ?, ?, CURRENT, ?, CURRENT)'
const QUERY_UPDATE = 'UPDATE phase_criteria SET parameter = ?, modify_user = ?, modify_date = CURRENT WHERE project_phase_id = ? AND phase_criteria_type_id = 6'
const QUERY_DELETE = 'DELETE FROM phase_criteria WHERE project_phase_id = ? AND phase_criteria_type_id = 6'

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
 * Get entry
 * @param {Number} phaseId the phase ID
 */
async function getEntry (phaseId) {
  // logger.debug(`Getting Groups for Challenge ${challengeLegacyId}`)
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    result = await connection.queryAsync(util.format(QUERY_GET_ENTRY, phaseId))
  } catch (e) {
    logger.error(`Error in 'getEntry' ${e}`)
    throw e
  } finally {
    await connection.closeAsync()
  }
  return result
}

/**
 * Merge number of reviewers
 * @param {Number} phaseId the legacy challenge ID
 * @param {Number=} value the value
 * @param {String} createdBy the created by
 */
async function createOrSetNumberOfReviewers (phaseId, value, createdBy) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    await connection.beginTransactionAsync()
    const [existing] = await getEntry(phaseId)
    if (existing) {
      if (value) {
        const query = await prepare(connection, QUERY_UPDATE)
        logger.info(`Will update with values: ${value}, ${createdBy}, ${phaseId}`)
        result = await query.executeAsync([value, createdBy, phaseId])
      } else {
        const query = await prepare(connection, QUERY_DELETE)
        logger.info(`Will delete with values: ${phaseId}`)
        result = await query.executeAsync([phaseId])
      }
    } else {
      const query = await prepare(connection, QUERY_CREATE)
      logger.info(`Will create with values: ${phaseId}, ${value}, ${createdBy}, ${createdBy}`)
      result = await query.executeAsync([phaseId, value, createdBy, createdBy])
    }
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'createOrSetNumberOfReviewers' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    await connection.closeAsync()
  }
  return result
}

module.exports = {
  getEntry,
  createOrSetNumberOfReviewers
}

logger.buildService(module.exports, {
  validators: { enabled: true },
  logging: { enabled: true },
  tracing: { enabled: true, annotations: [], metadata: [] }
})
