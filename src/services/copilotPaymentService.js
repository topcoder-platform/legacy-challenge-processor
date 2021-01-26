const logger = require('../common/logger')
const _ = require('lodash')
const util = require('util')
const helper = require('../common/helper')

const COPILOT_PAYMENT_PROJECT_INFO_ID = 49
const COPILOT_PAYMENT_RESOURCE_INFO_ID = 7
const COPILOT_PAYMENT_TYPE_ID = 15
const COPILOT_RESOURCE_ROLE_ID = 14

const QUERY_GET_COPILOT_RESOURCE_FOR_CHALLENGE = `SELECT limit 1 resource_id as resourceid FROM resource WHERE project_id = %d AND resource_role_id = ${COPILOT_RESOURCE_ROLE_ID}`
// const QUERY_GET_COPILOT_PROJECT_INFO = `select * from resource_info where resource_id = ? AND resource_info_type_id = ${COPILOT_PAYMENT_RESOURCE_INFO_ID}`

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
// const QUERY_INSERT_COPILOT_RESOURCE_PAYMENT = `INSERT INTO resource_info (resource_id, resource_info_type_id, value, create_user, create_date, modify_user, modify_date) VALUES (?, ${COPILOT_PAYMENT_RESOURCE_INFO_ID}, ?, ?, CURRENT, ?, CURRENT)`
const QUERY_UPDATE_COPILOT_RESOURCE_PAYMENT = `UPDATE resource_info SET value = ?, modify_user = ?, modify_date = CURRENT WHERE resource_id = ? AND resource_info_type_id = ${COPILOT_PAYMENT_RESOURCE_INFO_ID}`
// const QUERY_DELETE_COPILOT_RESOURCE_PAYMENT = `DELETE FROM resource_info WHERE resource_id = ? AND resource_info_type_id = ${COPILOT_PAYMENT_RESOURCE_INFO_ID}`

const QUERY_SELECT_PAYMENT_TYPE = `SELECT value FROM resource_info WHERE resource_info_type_id = ${COPILOT_PAYMENT_TYPE_ID} AND resource_id = %d`
const QUERY_INSERT_PAYMENT_TYPE = `INSERT INTO resource_info (resource_id, resource_info_type_id, value, create_user, create_date, modify_user, modify_date) VALUES (?, ${COPILOT_PAYMENT_TYPE_ID}, ?, ?, CURRENT, ?, CURRENT)`
const QUERY_UPDATE_PAYMENT_TYPE = `UPDATE resource_info SET value = ?, modify_user = ?, modify_date = CURRENT WHERE resource_id = ? AND resource_info_type_id = ${COPILOT_PAYMENT_TYPE_ID}`

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
    if (amount != null && amount >= 0) {
      // Make sure the payment type is set to manual
      // TODO: Figure out why data is not saved in IFX even when there are no errors
      const paymentType = await getCopilotPaymentType(connection, copilotResourceId)
      if (!paymentType) {
        await createCopilotPaymentType(connection, copilotResourceId, 'TRUE', updatedBy || createdBy)
      } else if (_.toLower(_.toString(paymentType.value)) !== 'true') {
        await updateCopilotPaymentType(connection, copilotResourceId, 'TRUE', updatedBy || createdBy)
      }
      if (copilotPayment) {
        logger.debug(`Copilot payment exists, updating: ${challengeLegacyId}`)
        return updateCopilotPayment(connection, copilotResourceId, challengeLegacyId, amount, updatedBy)
      } else {
        logger.debug(`NO Copilot payment exists, creating: ${challengeLegacyId}`)
        await createCopilotPayment(connection, challengeLegacyId, amount, createdBy)
      }
    } else {
      logger.debug(`No copilot assigned, removing any payments for legacy ID: ${challengeLegacyId}`)
      return deleteCopilotPayment(connection, challengeLegacyId)
    }
  } catch (e) {
    logger.error(`Error in 'setCopilotPayment' ${e}`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    await connection.closeAsync()
  }
}

/**
 * Gets the copilot payment type for a legacyId
 * @param {Object} connection the connection
 * @param {Number} resourceId the resource ID
 */
async function getCopilotPaymentType (connection, resourceId) {
  const result = await connection.queryAsync(util.format(QUERY_SELECT_PAYMENT_TYPE, resourceId))
  logger.debug(`Result: ${JSON.stringify(result, null, 2)}`)
  return _.get(result, '[0]', null)
}

/**
 * Create the copilot payment type record
 * @param {Object} connection the connection
 * @param {Number} resourceId the resource ID
 * @param {Boolean} value the value
 * @param {String} createdBy the create user handle
 */
async function createCopilotPaymentType (connection, resourceId, value, createdBy) {
  const query = await prepare(connection, QUERY_INSERT_PAYMENT_TYPE)
  logger.debug(`Create Copilot Payment Type Values: ${[resourceId, value, createdBy, createdBy]}`)
  await query.executeAsync([resourceId, value, createdBy, createdBy])
}

/**
 * Update the copilot payment type record
 * @param {Object} connection the connection
 * @param {Number} resourceId the resource ID
 * @param {Boolean} value the value
 * @param {String} createdBy the create user handle
 */
async function updateCopilotPaymentType (connection, resourceId, value, createdBy) {
  const query = await prepare(connection, QUERY_UPDATE_PAYMENT_TYPE)
  logger.debug(`Update Copilot Payment Type Values: ${[value, createdBy, resourceId]}`)
  await query.executeAsync([value, createdBy, resourceId])
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
async function createCopilotPayment (connection, challengeLegacyId, amount, createdBy) {
  const query = await prepare(connection, QUERY_INSERT_COPILOT_PAYMENT)
  logger.debug(`Create Copilot Payment Values: ${[challengeLegacyId, amount, createdBy, createdBy]}`)
  await query.executeAsync([challengeLegacyId, amount, createdBy, createdBy])
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

  if (copilotResourceId && copilotResourceId !== null) {
    const resourceQuery = await prepare(connection, QUERY_UPDATE_COPILOT_RESOURCE_PAYMENT)
    logger.debug(`Update Copilot Resource Payment Values: ${[newValue, updatedBy, copilotResourceId]}`)
    return resourceQuery.executeAsync([newValue, updatedBy, copilotResourceId])
  } else {
    logger.debug('No Copilot ResourceID, can\'t update project_info')
  }
}

/**
 * Delete the existing copilot payment for a legacyId
 * @param {Object} connection
 * @param {Number} challengeLegacyId
 */
async function deleteCopilotPayment (connection, challengeLegacyId) {
  const query = await prepare(connection, QUERY_DELETE_COPILOT_PAYMENT)
  logger.debug(`Delete Copilot Payment Values: ${[challengeLegacyId]}`)
  await query.executeAsync([challengeLegacyId])
}

module.exports = {
  setCopilotPayment
}
