/**
 * Timeline Service
 * Interacts with InformixDB
 */
const logger = require('../common/logger')
const helper = require('../common/helper')

const QUERY_ENABLE_TIMELINE_NOTIFICATIONS = 'INSERT INTO project_info (project_id, project_info_type_id, value, create_user, create_date, modify_user, modify_date) VALUES (?, "11", "On", ?, CURRENT, ?, CURRENT)'

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
 * Enable timeline notifications
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {String} createdBy the created by
 */
async function enableTimelineNotifications (challengeLegacyId, createdBy) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    // await connection.beginTransactionAsync()
    const query = await prepare(connection, QUERY_ENABLE_TIMELINE_NOTIFICATIONS)
    result = await query.executeAsync([challengeLegacyId, createdBy, createdBy])
    // await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'enableTimelineNotifications' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Notifications have been enabled for challenge ${challengeLegacyId}`)
    await connection.closeAsync()
  }
  return result
}

module.exports = {
  enableTimelineNotifications
}
