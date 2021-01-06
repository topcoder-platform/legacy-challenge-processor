const logger = require('../common/logger')
const _ = require('lodash')
const util = require('util')
const helper = require('../common/helper')

const QUERY_GET_CONTEST_ELIGIBILITIES_IDS = 'SELECT contest_eligibility_id FROM contest_eligibility WHERE contest_id = %d'
const QUERY_INSERT_CONTEST_ELIGIBILITY = 'INSERT INTO contest_eligibility (contest_eligibility_id, contest_id, is_studio) VALUES(contest_eligibility_seq.NEXTVAL, ?, 0)'

const QUERY_GET_GROUPS = 'SELECT contest_eligibility_id, group_id FROM group_contest_eligibility WHERE contest_eligibility_id in'
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
  // logger.debug(`Preparing SQL ${sql}`)
  const stmt = await connection.prepareAsync(sql)
  return Promise.promisifyAll(stmt)
}

/**
 * Get groups for a challenge
 * @param {Number} challengeLegacyId the legacy challenge ID
 */
async function getGroupsForChallenge (challengeLegacyId) {
  // logger.debug(`Getting Groups for Challenge ${challengeLegacyId}`)
  const connection = await helper.getInformixConnection()
  let groupIds = []
  try {
    // await connection.beginTransactionAsync()
    const eligibilityIds = await getChallengeEligibilityIds(connection, challengeLegacyId)
    if (eligibilityIds && eligibilityIds.length > 0) {
      const groups = await getGroupsForEligibilityIds(connection, eligibilityIds)
      groupIds = _.map(groups, g => g.group_id)
      // logger.debug(`Groups Found for ${challengeLegacyId} - ${JSON.stringify(groupIds)}`)
    }
    // logger.debug(`No groups Found for ${challengeLegacyId}`)
    // await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'getGroupsForChallenge' ${e}`)
    // await connection.rollbackTransactionAsync()
    throw e
  } finally {
    await connection.closeAsync()
  }
  return groupIds
}

/**
 * Add a group to a challenge
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} groupLegacyId the legacy group ID
 */
async function addGroupToChallenge (challengeLegacyId, groupLegacyId) {
  const existingGroups = await getGroupsForChallenge(challengeLegacyId)
  if (existingGroups.indexOf(groupLegacyId) > -1) {
    logger.info(`Group ${groupLegacyId} is already assigned to challenge ${challengeLegacyId}. Skipping...`)
    return
  }
  const connection = await helper.getInformixConnection()

  try {
    await connection.beginTransactionAsync()
    // create eligibility entry
    const eligibilityId = await createContestEligibility(connection, challengeLegacyId)
    // create group association
    await createGroupContestEligibility(connection, eligibilityId, groupLegacyId)
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

/**
 * Remove group from a challenge
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} groupLegacyId the group ID
 */
async function removeGroupFromChallenge (challengeLegacyId, groupLegacyId) {
  const connection = await helper.getInformixConnection()

  try {
    await connection.beginTransactionAsync()
    const eligibilityIds = await getChallengeEligibilityIds(connection, challengeLegacyId)
    if (eligibilityIds && eligibilityIds.length > 0) {
      const groups = await getGroupsForEligibilityIds(connection, eligibilityIds)
      const groupToRemove = _.find(groups, g => g.group_id === groupLegacyId)
      if (groupToRemove) {
        await clearData(connection, groupToRemove.contest_eligibility_id, groupToRemove.group_id)
      }
    }
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'removeGroupFromChallenge' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Group ${groupLegacyId} removed from challenge ${challengeLegacyId}`)
    await connection.closeAsync()
  }
}

/**
 * Get group IDs
 * @param {Object} connection the connection
 * @param {Array} eligibilityIds the eligibility IDs
 */
async function getGroupsForEligibilityIds (connection, eligibilityIds) {
  const query = `${QUERY_GET_GROUPS} (${eligibilityIds.join(', ')})`
  // logger.debug(`getGroupIdsForEligibilityId ${query}`)
  const result = await connection.queryAsync(query)
  return result
}

/**
 * Gets the eligibility IDs
 * @param {Object} connection the connection
 * @param {Number} challengeLegacyId the legacy challenge ID
 */
async function getChallengeEligibilityIds (connection, challengeLegacyId) {
  const query = util.format(QUERY_GET_CONTEST_ELIGIBILITIES_IDS, challengeLegacyId)
  // logger.debug(`getGroupIdsForEligibilityId ${query}`)
  const result = await connection.queryAsync(query)
  return _.map(result, r => r.contest_eligibility_id)
}

/**
 * Create a contest eligibility
 * @param {Object} connection the connection
 * @param {Number} legacyChallengeId the legacy challenge ID
 */
async function createContestEligibility (connection, legacyChallengeId) {
  const query = await prepare(connection, QUERY_INSERT_CONTEST_ELIGIBILITY)
  await query.executeAsync([legacyChallengeId])
  const ids = await getChallengeEligibilityIds(connection, legacyChallengeId)
  const groups = await getGroupsForEligibilityIds(connection, ids)
  return _.get(_.filter(ids, id => !_.find(groups, g => g.contest_eligibility_id === id)), '[0]')
}

/**
 * Create group contest eligibility
 * @param {Object} connection the connection
 * @param {Number} eligibilityId the eligibility ID
 * @param {Number} groupId the group ID
 */
async function createGroupContestEligibility (connection, eligibilityId, groupId) {
  const query = await prepare(connection, QUERY_INSERT_GROUP_CONTEST_ELIGIBILITY)
  return await query.executeAsync([eligibilityId, groupId])
}

/**
 * Removes entries from group_contest_eligibility and contest_eligibility
 * @param {Object} connection the connection
 * @param {Number} eligibilityId the eligibility ID
 * @param {Number} groupId the group ID
 */
async function clearData (connection, eligibilityId, groupId) {
  let query
  query = await prepare(connection, QUERY_DELETE_GROUP_CONTEST_ELIGIBILITY)
  await query.executeAsync([eligibilityId, groupId])

  query = await prepare(connection, QUERY_DELETE_CONTEST_ELIGIBILITY)
  await query.executeAsync([eligibilityId])
}

module.exports = {
  getGroupsForChallenge,
  addGroupToChallenge,
  removeGroupFromChallenge
}
