const logger = require('../common/logger')
const { executeQueryAsync } = require('../common/informixWrapper')

async function addGroupToChallenge (challengeLegacyId, groupLegacyId) {
  logger.debug(`addGroupToChallenge ${challengeLegacyId} ${groupLegacyId}`)
  // get eligibility record
  const eligibilityId = await getChallengeEligibilityId(challengeLegacyId)
  const groupEligibilityRecord = await getGroupEligibility(eligibilityId, groupLegacyId)
  if (groupEligibilityRecord) {
    logger.info(`Group ${groupLegacyId} already exists for ${challengeLegacyId}`)
    return true
  }
  logger.info(`No group record found: ${groupLegacyId} does not exist ${challengeLegacyId}`)
  return createGroupEligibilityRecord(eligibilityId, groupLegacyId)
}

async function removeGroupFromChallenge (challengeLegacyId, groupLegacyId) {
  logger.debug(`removeGroupFromChallenge ${challengeLegacyId} ${groupLegacyId}`)
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
  logger.debug(`getChallengeEligibilityId ${sql} - ${JSON.stringify(eligibilityRecord)}`)
  if (eligibilityRecord && eligibilityRecord.length > 0) {
    return eligibilityRecord[0].contest_eligibility_id
  } else {
    const newRecordObj = await createChallengeEligibilityRecord(challengeLegacyId)
    if (newRecordObj) {
      const newEligibilityRecord = await execQuery(sql)
      return newEligibilityRecord[0].contest_eligibility_id
    } else {
      logger.error('Could not create Eligibility Record ')
    }
  }
}

async function getGroupEligibility (eligibilityId, groupLegacyId) {
  // get group eligibility and return the object
  const sql = `SELECT limit 1 * FROM group_contest_eligibility WHERE contest_eligibility_id = ${eligibilityId} AND group_id = ${groupLegacyId}`
  const obj = await execQuery(sql)
  logger.debug(`getGroupEligibility ${sql} - ${JSON.stringify(obj)}`)
  if (obj) {
    return obj[0]
  } else {
    logger.debug(`getGroupEligibility ${eligibilityId} ${groupLegacyId} - not found`)
    return null
  }
}

async function createChallengeEligibilityRecord (challengeId) {
  // get sequence number?
  const sql = `INSERT INTO contest_eligibility (contest_eligibility_id, contest_id, is_studio) VALUES(contest_eligibility_seq.NEXTVAL, ${challengeId}, 0)`
  const obj = await execQuery(sql)
  logger.debug(`createChallengeEligibilityRecord ${sql} - ${JSON.stringify(obj)}`)
  return obj
}

async function createGroupEligibilityRecord (eligibilityId, groupLegacyId) {
  const sql = `INSERT INTO group_contest_eligibility (contest_eligibility_id, group_id) VALUES(${eligibilityId}, ${groupLegacyId})`
  const obj = await execQuery(sql)
  logger.debug(`createGroupEligibilityRecord ${sql} - ${JSON.stringify(obj)}`)
  return obj
}

async function deleteGroupEligibilityRecord (eligibilityId, groupLegacyId) {
  const sql = `DELETE FROM group_contest_eligibility WHERE contest_eligibility_id = ${eligibilityId} AND group_id = ${groupLegacyId}`
  const obj = await execQuery(sql)
  logger.debug(`deleteGroupEligibilityRecord ${sql} - ${JSON.stringify(obj)}`)
  return obj
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
