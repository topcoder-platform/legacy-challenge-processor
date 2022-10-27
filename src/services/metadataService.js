/**
 * Metadata Service
 * Interacts with InformixDB
 */
const util = require('util')
const logger = require('../common/logger')
const helper = require('../common/helper')

const QUERY_GET_ENTRY = 'SELECT value FROM project_info WHERE project_id = %d and project_info_type_id = %d'
const QUERY_CREATE = 'INSERT INTO project_info (project_id, project_info_type_id, value, create_user, create_date, modify_user, modify_date) VALUES (?, ?, ?, ?, CURRENT, ?, CURRENT)'
const QUERY_UPDATE = 'UPDATE project_info SET value = ?, modify_user = ?, modify_date = CURRENT WHERE project_info_type_id = ? AND project_id = ?'
const QUERY_DELETE = 'DELETE FROM project_info WHERE project_id = ? and project_info_type_id = ?'

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
 * Get project info entry entry
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} typeId the type ID
 */
async function getMetadataEntry (challengeLegacyId, typeId) {
  // logger.debug(`Getting Groups for Challenge ${challengeLegacyId}`)
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    result = await connection.queryAsync(util.format(QUERY_GET_ENTRY, challengeLegacyId, typeId))
  } catch (e) {
    logger.error(`Error in 'getMetadataEntry' ${e}`)
    throw e
  } finally {
    await connection.closeAsync()
  }
  return result
}

/**
 * Enable timeline notifications
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} typeId the type ID
 * @param {Any} value the value
 * @param {String} createdBy the created by
 */
async function createOrUpdateMetadata (challengeLegacyId, typeId, value, createdBy) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    // await connection.beginTransactionAsync()
    const [existing] = await getMetadataEntry(challengeLegacyId, typeId)
    if (existing) {
      if (value) {
        // logger.info(`Metadata ${typeId} exists. Will update`)
        const query = await prepare(connection, QUERY_UPDATE)
        result = await query.executeAsync([value, createdBy, typeId, challengeLegacyId])
      } else {
        // logger.info(`Metadata ${typeId} exists. Will delete`)
        const query = await prepare(connection, QUERY_DELETE)
        result = await query.executeAsync([challengeLegacyId, typeId])
      }
    } else {
      // logger.info(`Metadata ${typeId} does not exist. Will create`)
      const query = await prepare(connection, QUERY_CREATE)
      result = await query.executeAsync([challengeLegacyId, typeId, value, createdBy, createdBy])
    }
    // await connection.commitTransactionAsync()
    // logger.info(`Metadata with typeId ${typeId} has been enabled for challenge ${challengeLegacyId}`)
  } catch (e) {
    logger.error(`Error in 'createOrUpdateMetadata' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    await connection.closeAsync()
  }
  return result
}

module.exports = {
  getMetadataEntry,
  createOrUpdateMetadata
}

logger.buildService(module.exports, {
  validators: { enabled: true },
  logging: { enabled: true },
  tracing: { enabled: true, annotations: [], metadata: [] }
})
