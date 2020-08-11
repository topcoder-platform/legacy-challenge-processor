const logger = require('../common/logger')
// const _ = require('lodash')
const util = require('util')
const helper = require('../common/helper')

const QUERY_GET_ELIGIBILITY_ID = 'SELECT limit 1 * FROM contest_eligibility WHERE contest_id = %d'
const QUERY_GET_GROUP_ELIGIBILITY_ID = 'SELECT limit 1 * FROM group_contest_eligibility WHERE contest_eligibility_id = %d AND group_id = %d'
const QUERY_GET_GROUPS_COUNT = 'SELECT count(*) as cnt FROM group_contest_eligibility WHERE contest_eligibility_id = %d'

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
    logger.error(`Error in 'addGroupToChallenge' ${e}, rolling back transaction`)
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

    const groupEligibilityRecord = await getGroupEligibility(connection, eligibilityId, groupLegacyId)

    if (groupEligibilityRecord) {
      await deleteGroupEligibilityRecord(connection, eligibilityId, groupLegacyId)
      logger.debug('Getting Groups Count')
      const { groupsCount } = await getCountOfGroupsInEligibilityRecord(connection, eligibilityId)
      logger.debug(`${groupsCount} groups exist`)
      if (groupsCount <= 0) {
        logger.debug('No groups exist, deleting')
        await deleteEligibilityRecord(connection, eligibilityId)
      }
    }

    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'removeGroupFromChallenge' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Group ${groupLegacyId} removed to challenge ${challengeLegacyId}`)
    await connection.closeAsync()
  }
}

async function getChallengeEligibilityId (connection, challengeLegacyId) {
  // get the challenge eligibility record, if one doesn't exist, create it and return the id
  let result = await connection.queryAsync(util.format(QUERY_GET_ELIGIBILITY_ID, challengeLegacyId))
  logger.info(`getChallengeEligibilityId Result ${JSON.stringify(result)}`)
  if (result.length === 0) {
    logger.debug(`getChallengeEligibility not found, creating ${challengeLegacyId}`)
    await createChallengeEligibilityRecord(connection, challengeLegacyId)
    result = await connection.queryAsync(util.format(QUERY_GET_ELIGIBILITY_ID, challengeLegacyId))
  }
  return { eligibilityId: result[0].contest_eligibility_id }
}

async function getGroupEligibility (connection, eligibilityId, groupLegacyId) {
  const result = await connection.queryAsync(util.format(QUERY_GET_GROUP_ELIGIBILITY_ID, eligibilityId, groupLegacyId))
  if (result.length === 0) {
    logger.debug(`getGroupEligibility not found, creating ${eligibilityId} ${groupLegacyId}`)
    return createGroupEligibilityRecord(connection, eligibilityId, groupLegacyId)
  }
  return result
}

async function createChallengeEligibilityRecord (connection, challengeLegacyId) {
  const query = await prepare(connection, QUERY_INSERT_CONTEST_ELIGIBILITY)
  const result = await query.executeAsync([challengeLegacyId])
  logger.debug(`Create Challenge Eligibility Record ${JSON.stringify(result)}`)
  return result
}

async function createGroupEligibilityRecord (connection, eligibilityId, groupLegacyId) {
  const query = await prepare(connection, QUERY_INSERT_GROUP_CONTEST_ELIGIBILITY)
  const result = await query.executeAsync([eligibilityId, groupLegacyId])
  logger.debug(`Create Group Eligibility Record ${JSON.stringify(result)}`)
  return result
}

async function deleteGroupEligibilityRecord (connection, eligibilityId, groupLegacyId) {
  const query = await prepare(connection, QUERY_DELETE_GROUP_CONTEST_ELIGIBILITY)
  const result = await query.executeAsync([eligibilityId, groupLegacyId])
  logger.debug(`deleteGroupEligibilityRecord ${JSON.stringify(result)}`)
  return result
}

async function deleteEligibilityRecord (connection, eligibilityId) {
  const query = await prepare(connection, QUERY_DELETE_CONTEST_ELIGIBILITY)
  logger.debug(`deleteEligibilityRecord Query ${JSON.stringify(query)}`)
  const result = await query.executeAsync([eligibilityId])
  logger.debug(`deleteEligibilityRecord ${JSON.stringify(result)}`)
  return result
}

async function getCountOfGroupsInEligibilityRecord (connection, eligibilityId) {
  const query = util.format(QUERY_GET_GROUPS_COUNT, eligibilityId)
  logger.debug(`Query! ${query}`)
  const result = await connection.queryAsync(query)
  logger.debug(`getCountOfGroupsInEligibilityRecord ${JSON.stringify(result)}`)
  return { groupsCount: result[0].cnt || 0 }
}

module.exports = {
  addGroupToChallenge,
  removeGroupFromChallenge
}
