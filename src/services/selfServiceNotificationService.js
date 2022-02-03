/**
 * timeline notification Service
 * Interacts with InformixDB
 */
const util = require('util')
const logger = require('../common/logger')
const helper = require('../common/helper')

const QUERY_GET_ENTRY = 'SELECT notification_type_id FROM notification WHERE external_ref_id = %d AND project_id = %d'
const QUERY_DELETE = 'DELETE FROM notification WHERE external_ref_id = ? AND project_id = ?'

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
 * @param {Number} legacyId the legacy challenge ID
 * @param {String} userId the userId
 */
async function getEntry (legacyId, userId) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    result = await connection.queryAsync(util.format(QUERY_GET_ENTRY, userId, legacyId))
  } catch (e) {
    logger.error(`Error in 'getEntry' ${e}`)
    throw e
  } finally {
    await connection.closeAsync()
  }
  return result
}

/**
 * Disable timeline notifications
 * @param {Number} legacyId the legacy challenge ID
 * @param {String} userId the userId
 */
async function disableTimelineNotifications (legacyId, userId) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    await connection.beginTransactionAsync()
    const [existing] = await getEntry(legacyId, userId)
    if (existing) {
      const query = await prepare(connection, QUERY_DELETE)
      result = await query.executeAsync([userId, legacyId])
    }
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'disableTimelineNotifications' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    await connection.closeAsync()
  }
  return result
}

module.exports = {
  getEntry,
  disableTimelineNotifications
}
