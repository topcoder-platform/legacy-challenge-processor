const logger = require('../common/logger')
const { executeQueryAsync } = require('../common/informixWrapper')

async function addGroupToChallenge (challengeLegacyId, groupLegacyId) {
  // get eligibility record
  const eligibilityId = await getChallengeEligibilityId(challengeLegacyId)
  const groupEligibilityRecord = await getGroupEligibility(eligibilityId, groupLegacyId)
  if (groupEligibilityRecord) {
    logger.info(`Group ${groupLegacyId} already exists for ${challengeLegacyId}`)
    return true
  }
  return createGroupEligibilityRecord(eligibilityId, groupLegacyId)
}

async function removeGroupFromChallenge (challengeLegacyId, groupLegacyId) {
  const eligibilityId = await getChallengeEligibilityId(challengeLegacyId)
  const groupEligibilityRecord = await getGroupEligibility(eligibilityId, groupLegacyId)
  if (groupEligibilityRecord) {
    return deleteGroupEligibilityRecord(groupEligibilityRecord)
  }
  logger.info(`Group ${groupLegacyId} does not exist for ${challengeLegacyId}`)
  return true
}

async function getChallengeEligibilityId (challengeLegacyId) {
  // get the challenge eligibility record, if one doesn't exist, create it and return the id
  const sql = `SELECT limit 1 * FROM contest_eligibility WHERE contest_id = ${challengeLegacyId}`
  const eligibilityRecord = await execQuery(sql)
  if (!eligibilityRecord) {
    return eligibilityRecord.contest_eligibility_id
  } else {
    const newRecordObj = await createChallengeEligibilityRecord(challengeLegacyId)
    return newRecordObj.contest_eligibility_id
  }
}

async function getGroupEligibility (eligibilityId, groupLegacyId) {
  // get group eligibility and return the object
  const sql = `SELECT * FROM group_contest_eligibility WHERE contest_eligibility_id = ${eligibilityId} AND group_id = ${groupLegacyId}`
  const obj = await execQuery(sql)
  if (obj) {
    return obj
  } else {
    logger.debug(`getGroupEligibility ${eligibilityId} ${groupLegacyId} - not found`)
    return null
  }
}

async function createChallengeEligibilityRecord (challengeId) {
  // get sequence number?
  const sequence = 1
  const sql = `INSERT INTO contest_eligibility (contest_eligibility_id, contest_id, is_studio) VALUES(${sequence}, ${challengeLegacyId}, 0)`
  return execQuery(sql)
}

async function createGroupEligibilityRecord (eligibilityId, groupLegacyId) {
  const sql = `INSERT INTO group_contest_eligibility (contest_eligibility_id, group_id) VALUES(${eligibilityId}, ${groupLegacyId})`
  return execQuery(sql)
}

async function deleteGroupEligibilityRecord (eligibilityId, groupLegacyId) {
  const sql = `DELETE FROM group_contest_eligibility WHERE contest_eligibility_id = ${eligibilityId} AND group_id = ${groupLegacyId}`
  return execQuery(sql)
}

async function execQuery (sql) {
  // logger.debug('challenge execQuery start')
  const result = await executeQueryAsync('common_oltp', sql)
  // logger.debug('challenge execQuery end')
  return result
}

module.exports = {
  addGroupToChallenge,
  removeGroupFromChallenge
}
