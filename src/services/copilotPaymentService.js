const logger = require('../common/logger')
const _ = require('lodash')
const util = require('util')
const helper = require('../common/helper')

const COPILOT_PAYMENT_PROJECT_INFO_ID = 49
const COPILOT_PAYMENT_RESOURCE_INFO_ID = 7
const COPILOT_RESOURCE_ROLE_ID = 14

const QUERY_GET_COPILOT_RESOURCE_FOR_CHALLENGE = `SELECT limit 1 resource_id as resourceid FROM resource WHERE project_id = %d AND resource_role_id = ${COPILOT_RESOURCE_ROLE_ID}`
const QUERY_GET_COPILOT_PAYMENT = `SELECT limit 1 * FROM project_info WHERE project_info_type_id = ${COPILOT_PAYMENT_PROJECT_INFO_ID} AND project_id = %d`
const QUERY_INSERT_COPILOT_PAYMENT = `
  INSERT INTO project_info
    (
      project_id,
      project_info_type_id,
      value,
      create_user,
      create_date,
      modify_user,
      modify_date
    )
  VALUES
    (?, ${COPILOT_PAYMENT_PROJECT_INFO_ID}, ?, ?, CURRENT, ?, CURRENT)`
const QUERY_UPDATE_COPILOT_PAYMENT = `UPDATE project_info SET value = ?, modify_user = ?, modify_date = CURRENT WHERE project_info_type_id = ${COPILOT_PAYMENT_PROJECT_INFO_ID} AND project_id = ?`
const QUERY_DELETE_COPILOT_PAYMENT = `DELETE FROM project_info WHERE project_info_type_id = ${COPILOT_PAYMENT_PROJECT_INFO_ID} AND project_id = ?`

// const QUERY_GET_COPILOT_RESOURCE_PAYMENT = `select * from resource_info where resource_id = %d AND resource_info_type_id = ${COPILOT_PAYMENT_RESOURCE_INFO_ID}`
const QUERY_INSERT_COPILOT_RESOURCE_PAYMENT = `INSERT INTO resource_info (resource_id, resource_info_type_id, value, create_user, create_date, modify_user, modify_date) VALUES (?, ${COPILOT_PAYMENT_RESOURCE_INFO_ID}, ?, ?, CURRENT, ?, CURRENT)`
const QUERY_UPDATE_COPILOT_RESOURCE_PAYMENT = `UPDATE resource_info SET value = ?, modify_user = ?, modify_date = CURRENT WHERE resource_id = ? AND resource_info_type_id = ${COPILOT_PAYMENT_RESOURCE_INFO_ID}`
// const QUERY_DELETE_COPILOT_RESOURCE_PAYMENT = `DELETE FROM resource_info WHERE resource_id = ? AND resource_info_type_id = ${COPILOT_PAYMENT_RESOURCE_INFO_ID}`

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
 * Set the copilot payment
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} amount the $ amount of the copilot payment
 * @param {String} createdBy the create user handle
 * @param {String} updatedBy the update user handle
 */
async function setCopilotPayment (challengeLegacyId, amount, createdBy, updatedBy) {
  const connection = await helper.getInformixConnection()
  try {
    await connection.beginTransactionAsync()
    const copilotResourceId = await getCopilotResourceId(connection, challengeLegacyId)
    const copilotPayment = await getCopilotPayment(connection, challengeLegacyId)
    if (copilotResourceId) {
      if (copilotPayment && amount != null && amount >= 0) {
        logger.debug(`Copilot payment exists, updating: ${challengeLegacyId}`)
        return updateCopilotPayment(connection, copilotResourceId, challengeLegacyId, amount, updatedBy)
      }
      logger.debug(`NO Copilot payment exists, creating: ${challengeLegacyId}`)
      return createCopilotPayment(connection, copilotResourceId, challengeLegacyId, amount, createdBy)
    }
    logger.debug(`No copilot assigned, removing any payments for legacy ID: ${challengeLegacyId}`)
    return deleteCopilotPayment(connection, copilotResourceId, challengeLegacyId)
  } catch (e) {
    logger.error(`Error in 'setCopilotPayment' ${e}`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    await connection.closeAsync()
  }
}

/**
 * Gets the copilot payment for a legacyId
 * @param {Object} connection
 * @param {Number} challengeLegacyId
 */
async function getCopilotPayment (connection, challengeLegacyId) {
  const result = await connection.queryAsync(util.format(QUERY_GET_COPILOT_PAYMENT, challengeLegacyId))
  return _.get(result, '[0]', null)
}

/**
 * Gets the copilot resource id to use in creating resource payment
 * @param {Object} connection
 * @param {Number} challengeLegacyId
 */
async function getCopilotResourceId (connection, challengeLegacyId) {
  const result = await connection.queryAsync(util.format(QUERY_GET_COPILOT_RESOURCE_FOR_CHALLENGE, challengeLegacyId))
  return _.get(result, '[0].resourceid', null)
}

/**
 * Create the copilot payment record
 * @param {Object} connection the connection
 * @param {Number} challengeLegacyId the legacy challenge id
 * @param {Number} amount the $ amount of the copilot payment
 * @param {String} createdBy the create user handle
 */
async function createCopilotPayment (connection, copilotResourceId, challengeLegacyId, amount, createdBy) {
  const query = await prepare(connection, QUERY_INSERT_COPILOT_PAYMENT)
  logger.debug(`Create Copilot Payment Values: ${[challengeLegacyId, amount, createdBy, createdBy]}`)
  await query.executeAsync([challengeLegacyId, amount, createdBy, createdBy])

  const resourceQuery = await prepare(connection, QUERY_INSERT_COPILOT_RESOURCE_PAYMENT)
  logger.debug(`Create Copilot Resource Payment Values: ${[copilotResourceId, amount, createdBy, createdBy]}`)
  return resourceQuery.executeAsync([copilotResourceId, amount, createdBy, createdBy])
}

/**
 * Update the existing copilot payment for a legacyId
 * @param {Object} connection
 * @param {Number} challengeLegacyId
 * @param {*} updatedBy the update user handle
 */
async function updateCopilotPayment (connection, copilotResourceId, challengeLegacyId, newValue, updatedBy) {
  const query = await prepare(connection, QUERY_UPDATE_COPILOT_PAYMENT)
  logger.debug(`Update Copilot Payment Query Values: ${[newValue, updatedBy, challengeLegacyId]}`)
  await query.executeAsync([newValue, updatedBy, challengeLegacyId])

  const resourceQuery = await prepare(connection, QUERY_UPDATE_COPILOT_RESOURCE_PAYMENT)
  logger.debug(`Update Copilot Resource Payment Values: ${[newValue, updatedBy, copilotResourceId]}`)
  return resourceQuery.executeAsync([newValue, updatedBy, copilotResourceId])
}

/**
 * Delete the existing copilot payment for a legacyId
 * @param {Object} connection
 * @param {Number} challengeLegacyId
 */
async function deleteCopilotPayment (connection, copilotResourceId, challengeLegacyId) {
  const query = await prepare(connection, QUERY_DELETE_COPILOT_PAYMENT)
  logger.debug(`Delete Copilot Payment Values: ${[challengeLegacyId]}`)
  await query.executeAsync([challengeLegacyId])

  // the function checks if there's a copilot. If there's no copilot, you can't delete the resource for the challenge because there's no resource id
  // const resourceQuery = await prepare(connection, QUERY_DELETE_COPILOT_RESOURCE_PAYMENT)
  // logger.debug(`Delete Copilot Resource Values: ${[copilotResourceId]}`)
  // return resourceQuery.executeAsync([copilotResourceId])
}

module.exports = {
  setCopilotPayment
}
