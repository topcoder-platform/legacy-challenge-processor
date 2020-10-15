const logger = require('../common/logger')
const _ = require('lodash')
const util = require('util')
const helper = require('../common/helper')

const QUERY_GET_CHALLENGE_TERMS = 'SELECT resource_role_id as roleId, terms_of_use_id as id FROM project_role_terms_of_use_xref WHERE project_id = %d'
const QUERY_INSERT_CHALLENGE_TERMS = `INSERT INTO project_role_terms_of_use_xref
  (project_id, resource_role_id, terms_of_use_id, create_date, modify_date, sort_order, group_ind) 
  VALUES (?, ?, ?, CURRENT, CURRENT, 1, 0)`
const QUERY_DELETE_CHALLENGE_TERMS = 'DELETE FROM project_role_terms_of_use_xref WHERE project_id = ? AND resource_role_id = ? AND terms_of_use_id = ?'

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

async function getTermsForChallenge (challengeLegacyId) {
  // logger.debug(`Getting Groups for Challenge ${challengeLegacyId}`)
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    result = await connection.queryAsync(util.format(QUERY_GET_CHALLENGE_TERMS, challengeLegacyId))
  } catch (e) {
    logger.error(`Error in 'getTermsForChallenge' ${e}`)
    throw e
  } finally {
    await connection.closeAsync()
  }
  return _.map(result, r => ({ termsId: r.terms_of_use_id, roleId: r.resource_role_id }))
}

async function addTermsToChallenge (challengeLegacyId, legacyTermsId, legacyResourceRoleId) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    // await connection.beginTransactionAsync()
    const query = await prepare(connection, QUERY_INSERT_CHALLENGE_TERMS)
    result = await query.executeAsync([challengeLegacyId, legacyResourceRoleId, legacyTermsId])
    // await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'addTermsToChallenge' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Terms ${legacyTermsId} added to challenge ${challengeLegacyId}`)
    await connection.closeAsync()
  }
  return result
}

async function removeTermsFromChallenge (challengeLegacyId, legacyTermsId, legacyResourceRoleId) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    // await connection.beginTransactionAsync()
    const query = await prepare(connection, QUERY_DELETE_CHALLENGE_TERMS)
    result = await query.executeAsync([challengeLegacyId, legacyResourceRoleId, legacyTermsId])
    // await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'removeTermsFromChallenge' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Terms ${legacyTermsId} removed from challenge ${challengeLegacyId}`)
    await connection.closeAsync()
  }
  return result
}

module.exports = {
  getTermsForChallenge,
  addTermsToChallenge,
  removeTermsFromChallenge
}
