const logger = require('../common/logger')
const _ = require('lodash')
const util = require('util')
const helper = require('../common/helper')
const { config } = require('process')

const QUERY_GET_CHALLENGE_TERMS = 'SELECT resource_role_id, terms_of_use_id FROM project_role_terms_of_use_xref WHERE project_id = %d'
const QUERY_INSERT_CHALLENGE_TERMS = `INSERT INTO project_role_terms_of_use_xref
  (project_id, resource_role_id, terms_of_use_id, create_date, modify_date, sort_order, group_ind) 
  VALUES (?, ?, ?, CURRENT, CURRENT, 1, 0)`

const QUERY_INSERT_PROJECT_INFO_CHALLENGE_TERMS = `INSERT INTO project_info 
  (project_id, project_info_type_id, value, create_user, create_date, modify_user, modify_date) 
  VALUES (?, 34, ?, ?, CURRENT, ?, CURRENT)`
const QUERY_DELETE_CHALLENGE_TERMS = 'DELETE FROM project_role_terms_of_use_xref WHERE project_id = ? AND resource_role_id = ? AND terms_of_use_id = ?'
const QUERY_DELETE_PROJECT_INFO_CHALLENGE_TERMS = 'DELETE FROM project_info WHERE project_id = ? AND project_info_type_id = 34'

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
  return _.map(result, r => ({ id: r.terms_of_use_id, roleId: r.resource_role_id }))
}

async function addTermsToChallenge (challengeLegacyId, legacyTermsId, legacyResourceRoleId, createdBy, updatedBy) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    logger.debug(`Creating Terms ${legacyTermsId} for Challenge ${challengeLegacyId}`)
    await connection.beginTransactionAsync()
    // create association
    const query = await prepare(connection, QUERY_INSERT_CHALLENGE_TERMS)
    result = await query.executeAsync([challengeLegacyId, legacyResourceRoleId, legacyTermsId])

    logger.debug(`Creating Terms - deleting project info record for ${challengeLegacyId}`)
    // make sure there are no project info records
    const piqueryDelete = await prepare(connection, QUERY_DELETE_PROJECT_INFO_CHALLENGE_TERMS)
    await piqueryDelete.executeAsync([challengeLegacyId])

    logger.debug(`Creating Terms - adding project info record for ${challengeLegacyId} ${legacyTermsId} === ${config.LEGACY_TERMS_NDA_ID}`)
    // add the project info record for the `Confidentiality Type`
    const termsProjectInfoValue = (legacyTermsId.toString() === config.LEGACY_TERMS_NDA_ID.toString()) ? 'stanard_cca' : 'public'
    const piquery = await prepare(connection, QUERY_INSERT_PROJECT_INFO_CHALLENGE_TERMS)
    await piquery.executeAsync([challengeLegacyId, termsProjectInfoValue, createdBy, updatedBy])

    await connection.commitTransactionAsync()
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
    await connection.beginTransactionAsync()
    const query = await prepare(connection, QUERY_DELETE_CHALLENGE_TERMS)
    result = await query.executeAsync([challengeLegacyId, legacyResourceRoleId, legacyTermsId])

    const piquery = await prepare(connection, QUERY_DELETE_PROJECT_INFO_CHALLENGE_TERMS)
    await piquery.executeAsync([challengeLegacyId])

    await connection.commitTransactionAsync()
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
