/**
 * Number of reviewers Service
 * Interacts with InformixDB
 */
const util = require('util')
const logger = require('../common/logger')
const helper = require('../common/helper')

const QUERY_GET_PHASE_CRITERIA = 'SELECT phase_criteria_type_id, name FROM phase_criteria_type_lu;'
const QUERY_CREATE = 'INSERT INTO phase_criteria (project_phase_id, phase_criteria_type_id, parameter, create_user, create_date, modify_user, modify_date) VALUES (?, ?, ?, ?, CURRENT, ?, CURRENT)'
const QUERY_DELETE = 'DELETE FROM phase_criteria WHERE project_phase_id = ? AND phase_criteria_type_id = ?'

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

async function getPhaseCriteria () {
 const connection = await helper.getInformixConnection()
 let result = null
 try {
   result = await connection.queryAsync(QUERY_GET_PHASE_CRITERIA)
 } catch (e) {
   logger.error(`Error in 'getPhaseCriteria' ${e}`)
   throw e
 } finally {
   await connection.closeAsync()
 }
 return result
}

async function dropPhaseCriteria(phaseId, phaseCriteriaTypeId) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    await connection.beginTransactionAsync()
    const query = await prepare(connection, QUERY_DELETE)
    result = await query.executeAsync([phaseId, phaseCriteriaTypeId])
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'dropPhaseCriteria' ${e}`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    await connection.closeAsync()
  }
  return result
}

async function createPhaseCriteria(phaseId, phaseCriteriaTypeId, value, createdBy) {
    const connection = await helper.getInformixConnection()
    let result = null
    try {
        await connection.beginTransactionAsync()
        const query = await prepare(connection, QUERY_CREATE)
        result = await query.executeAsync([phaseId, phaseCriteriaTypeId, value, createdBy, createdBy])
        await connection.commitTransactionAsync()
    } catch (e) {
        logger.error(`Error in 'createPhaseCriteria' ${e}`)
        await connection.rollbackTransactionAsync()
        throw e
    } finally {
        await connection.closeAsync()
    }
    return result
}



module.exports = {
  getPhaseCriteria,
  createPhaseCriteria,
  dropPhaseCriteria
}
