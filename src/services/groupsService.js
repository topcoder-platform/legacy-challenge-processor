const logger = require('../common/logger')
const _ = require('lodash')
const helper = require('../common/helper')

const QUERY_GET_ELIGIBILITY_ID = 'SELECT limit 1 * FROM contest_eligibility WHERE contest_id = ?'
const QUERY_GET_GROUP_ELIGIBILITY_ID = 'SELECT limit 1 * FROM group_contest_eligibility WHERE contest_eligibility_id = ? AND group_id = ?'
const QUERY_INSERT_CONTEST_ELIGIBILITY = 'INSERT INTO contest_eligibility (contest_eligibility_id, contest_id, is_studio) VALUES(contest_eligibility_seq.NEXTVAL, ?, 0)'
const QUERY_INSERT_GROUP_CONTEST_ELIGIBILITY = 'INSERT INTO group_contest_eligibility (contest_eligibility_id, group_id) VALUES(?, ?)'
const QUERY_DELETE_GROUP_CONTEST_ELIGIBILITY = 'DELETE FROM group_contest_eligibility WHERE contest_eligibility_id = ? AND group_id = ?'
const QUERY_DELETE_CONTEST_ELIGIBILITY = 'DELETE FROM contest_eligibility WHERE contest_eligibility_id = ?'

/**
 * Prepare Informix statement
 * @param {Object} connection the Informix connection
 * @param {String} sql the sql
 * @return {Object} Informix statement
 */
async function prepare (connection, sql) {
  const stmt = await connection.prepareAsync(sql)
  return Promise.promisifyAll(stmt)
}

// /**
//  * Insert a record in specified table
//  * @param {Object} connection the Informix connection
//  * @param {String} tableName the table name
//  * @param {Object} columnValues the column key-value map
//  */
// async function insertRecord (connection, tableName, columnValues) {
//   const normalizedColumnValues = _.omitBy(columnValues, _.isNil)
//   const keys = Object.keys(normalizedColumnValues)
//   const values = _.fill(Array(keys.length), '?')

//   const insertRecordStmt = await prepare(connection, `insert into ${tableName} (${keys.join(', ')}) values (${values.join(', ')})`)

//   await insertRecordStmt.executeAsync(Object.values(normalizedColumnValues))
// }

async function addGroupToChallenge (challengeLegacyId, groupLegacyId) {
  const connection = await helper.getInformixConnection()

  try {
    await connection.beginTransactionAsync()
    const {
      eligibilityId
    } = await getChallengeEligibilityId(connection, challengeLegacyId)

    await getGroupEligibility(connection, eligibilityId, groupLegacyId)

    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'addGroupToChallenge' ${e}`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Group ${groupLegacyId} added to challenge ${challengeLegacyId}`)
    await connection.closeAsync()
  }
}

async function removeGroupFromChallenge (challengeLegacyId, groupLegacyId) {
  const connection = await helper.getInformixConnection()

  try {
    await connection.beginTransactionAsync()
    const {
      eligibilityId
    } = await getChallengeEligibilityId(connection, challengeLegacyId)

    const {
      groupEligibilityId
    } = await getGroupEligibility(connection, eligibilityId, groupLegacyId)

    if (groupEligibilityId) {
      await deleteGroupEligibilityRecord(connection, eligibilityId, groupLegacyId)
      await deleteEligibilityRecord(connection, eligibilityId)
    }

    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'removeGroupFromChallenge' ${e}`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Group ${groupLegacyId} added to challenge ${challengeLegacyId}`)
    await connection.closeAsync()
  }
}

async function getChallengeEligibilityId (connection, challengeLegacyId) {
  // get the challenge eligibility record, if one doesn't exist, create it and return the id
  const query = await prepare(connection, QUERY_GET_ELIGIBILITY_ID)
  const result = await query.executeAsync([challengeLegacyId])
  // const result = await connection.queryAsync(query)
  if (result.length === 0) {
    logger.debug(`getChallengeEligibility not found, creating ${challengeLegacyId}`)
    return createChallengeEligibilityRecord(connection, challengeLegacyId)
  }
  return result[0].contest_eligibility_id
}

async function getGroupEligibility (connection, eligibilityId, groupLegacyId) {
  const query = await prepare(connection, QUERY_GET_GROUP_ELIGIBILITY_ID)
  const result = await query.executeAsync([eligibilityId, groupLegacyId])
  // const result = await connection.queryAsync(query)
  if (result.length === 0) {
    logger.debug(`getGroupEligibility not found, creating ${eligibilityId} ${groupLegacyId}`)
    return createGroupEligibilityRecord(connection, eligibilityId, groupLegacyId)
  }
  return result[0]
}

async function createChallengeEligibilityRecord (connection, challengeLegacyId) {
  const query = await prepare(connection, QUERY_INSERT_CONTEST_ELIGIBILITY)
  const result = await query.executeAsync([challengeLegacyId])
  logger.debug(`Create Challenge Eligibility Record ${JSON.stringify(result)}`)
  return result[0].contest_eligibility_id
}

async function createGroupEligibilityRecord (connection, eligibilityId, groupLegacyId) {
  const query = await prepare(connection, QUERY_INSERT_GROUP_CONTEST_ELIGIBILITY)
  const result = await query.executeAsync([eligibilityId, groupLegacyId])
  logger.debug(`Create Group Eligibility Record ${JSON.stringify(result)}`)
  return result[0]
}

async function deleteGroupEligibilityRecord (connection, eligibilityId, groupLegacyId) {
  const query = await prepare(connection, QUERY_DELETE_GROUP_CONTEST_ELIGIBILITY)
  const result = await query.executeAsync([eligibilityId, groupLegacyId])
  logger.debug(`deleteGroupEligibilityRecord ${JSON.stringify(result)}`)
  return result[0]
}

async function deleteEligibilityRecord (connection, eligibilityId) {
  const query = await prepare(connection, QUERY_DELETE_CONTEST_ELIGIBILITY)
  const result = await query.executeAsync([eligibilityId])
  logger.debug(`deleteEligibilityRecord ${JSON.stringify(result)}`)
  return result[0]
}

module.exports = {
  addGroupToChallenge,
  removeGroupFromChallenge
}
