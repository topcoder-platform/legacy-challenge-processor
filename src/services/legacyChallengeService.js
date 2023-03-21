/**
 * Legacy Challenge Service
 * Interacts with InformixDB
 */
const logger = require('../common/logger')
const util = require('util')
const helper = require('../common/helper')
const { createChallengeStatusesMap } = require('../constants')

const QUERY_UPDATE_PROJECT = 'UPDATE project SET project_status_id = ?, modify_user = ?, modify_date = ? WHERE project_id = %d'
const QUERY_UPDATE_PROJECT_AUDIT = 'UPDATE project SET modify_user = ?, modify_date = ? WHERE project_id = %d'

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
 * Update a challenge in IFX
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} updatedBy the user ID
 * @param {String} updatedAt the challenge modified time
 */
async function cancelChallenge (challengeLegacyId, updatedBy, updatedAt) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    await connection.beginTransactionAsync()
    const query = await prepare(connection, util.format(QUERY_UPDATE_PROJECT, challengeLegacyId))
    result = await query.executeAsync([createChallengeStatusesMap.CancelledClientRequest, updatedBy, helper.formatDate(updatedAt)])
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'cancelChallenge' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Challenge ${challengeLegacyId} has been cancelled`)
    await connection.closeAsync()
  }
  return result
}

/**
 * Update a challenge audit fields in IFX
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} updatedBy the user ID
 * @param {String} updatedAt the challenge modified time
 */
async function updateChallengeAudit (challengeLegacyId, updatedBy, updatedAt) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    const query = await prepare(connection, util.format(QUERY_UPDATE_PROJECT_AUDIT, challengeLegacyId))
    result = await query.executeAsync([updatedBy, helper.formatDate(updatedAt)])
  } catch (e) {
    logger.error(`Error in 'updateChallengeAudit' ${e}`)
    throw e
  } finally {
    logger.info(`Challenge audit for ${challengeLegacyId} has been updated`)
    await connection.closeAsync()
  }
  return result
}

module.exports = {
  cancelChallenge,
  updateChallengeAudit
}
