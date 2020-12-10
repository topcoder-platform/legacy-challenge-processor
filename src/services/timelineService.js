/**
 * Timeline Service
 * Interacts with InformixDB
 */
const util = require('util')
const logger = require('../common/logger')
const helper = require('../common/helper')

const QUERY_GET_TIMELINE_NOTIFICATION_SETTINGS = 'SELECT value FROM project_info WHERE project_id = %d and project_info_type_id = %d'
const QUERY_CREATE_TIMELINE_NOTIFICATIONS = 'INSERT INTO project_info (project_id, project_info_type_id, value, create_user, create_date, modify_user, modify_date) VALUES (?, "11", "On", ?, CURRENT, ?, CURRENT)'
const QUERY_UPDATE_TIMELINE_NOTIFICATIONS = 'UPDATE project_info SET value = "On", modify_user = ?, modify_date = CURRENT WHERE project_info_type_id = "11" AND project_id = ?'

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
  getTimelineNotifications,
  enableTimelineNotifications
}
