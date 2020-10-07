const logger = require('../common/logger')
const _ = require('lodash')
const util = require('util')
const helper = require('../common/helper')

const QUERY_GET_COPILOT_PAYMENT = 'SELECT limit 1 * FROM project_info WHERE project_info_type_id = 49 AND project_id = %d'
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
    (?, 49, ?, ?, CURRENT, ?, CURRENT)`
const QUERY_UPDATE_COPILOT_PAYMENT = 'UPDATE project_info SET value = ?, modify_user = ?, modify_date = CURRENT WHERE project_info_type_id = 49 AND project_id = ?'
const QUERY_DELETE_COPILOT_PAYMENT = 'DELETE FROM project_info WHERE project_info_type_id = 49 AND project_id = ?'

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
    // await connection.beginTransactionAsync()
    const copilotPayment = await getCopilotPayment(connection, challengeLegacyId)
    if (copilotPayment) {
      if (!amount) {
        await deleteCopilotPayment(connection, challengeLegacyId)
      } else if (_.toString(copilotPayment.value) !== _.toString(amount)) {
        await updateCopilotPayment(connection, challengeLegacyId, amount, updatedBy)
      }
    } else {
      await createCopilotPayment(connection, challengeLegacyId, amount, createdBy)
    }
  } catch (e) {
    logger.error(`Error in 'setCopilotPayment' ${e}`)
    // await connection.rollbackTransactionAsync()
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
 * Create the copilot payment record
 * @param {Object} connection the connection
 * @param {Number} challengeLegacyId the legacy challenge id
 * @param {Number} amount the $ amount of the copilot payment
 * @param {String} createdBy the create user handle
 */
async function createCopilotPayment (connection, challengeLegacyId, amount, createdBy) {
  const query = await prepare(connection, QUERY_INSERT_COPILOT_PAYMENT)
  return query.executeAsync([challengeLegacyId, amount, createdBy, createdBy])
}

/**
 * Update the existing copilot payment for a legacyId
 * @param {Object} connection
 * @param {Number} challengeLegacyId
 * @param {*} updatedBy the update user handle
 */
async function updateCopilotPayment (connection, challengeLegacyId, newValue, updatedBy) {
  const query = await prepare(connection, QUERY_UPDATE_COPILOT_PAYMENT)
  return query.executeAsync([newValue, updatedBy, challengeLegacyId])
}

/**
 * Delete the existing copilot payment for a legacyId
 * @param {Object} connection
 * @param {Number} challengeLegacyId
 */
async function deleteCopilotPayment (connection, challengeLegacyId) {
  const query = await prepare(connection, QUERY_DELETE_COPILOT_PAYMENT)
  return query.executeAsync([challengeLegacyId])
}

module.exports = {
  setCopilotPayment
}
