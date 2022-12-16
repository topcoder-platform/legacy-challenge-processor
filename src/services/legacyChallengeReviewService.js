/**
 * Legacy Challenge Service
 * Interacts with InformixDB
 * Note: this is built to work for topgear challenges and iterative review phases
 */
const _ = require('lodash')
const logger = require('../common/logger')
const util = require('util')
const helper = require('../common/helper')
const IDGenerator = require('../common/idGenerator')
const reviewIdGen = new IDGenerator('review_id_seq')
const reviewItemIdGen = new IDGenerator('review_item_id_seq')

const ITERATIVE_REVIEWER_RESOURCE_ROLE_ID = 21
const QUERY_GET_ITERATIVE_REVIEW_RESOURCE_FOR_CHALLENGE = `SELECT limit 1 resource_id as resourceid FROM resource WHERE project_id = %d AND resource_role_id = ${ITERATIVE_REVIEWER_RESOURCE_ROLE_ID}`

const QUERY_CREATE_REVIEW = 'INSERT INTO review (review_id, resource_id, submission_id, project_phase_id, scorecard_id, committed, score, initial_score, create_user, create_date, modify_user, modify_date) values (?,?,?,?,?,?,?,?,?,CURRENT,?,CURRENT)'

const QUERY_CREATE_REVIEW_ITEM = 'INSERT INTO review_item (review_item_id, review_id, scorecard_question_id, upload_id, answer, sort, create_user, create_date, modify_user, modify_date) values (?,?,?,?,?,?,?,CURRENT,?,CURRENT)'

const QUERY_GET_SUBMISSION = 'SELECT FIRST 1 * FROM submission s INNER JOIN upload u on s.upload_id = u.upload_id WHERE u.project_id = %d AND upload_status_id = 1 AND submission_status_id = 1 ORDER BY u.CREATE_DATE ASC'

const QUERY_GET_PROJECT_PHASE = 'select pc.parameter scorecard_id, pp.project_phase_id project_phase_id from project_phase pp inner join phase_criteria pc on pc.project_phase_id = pp.project_phase_id where pp.project_id = %d and pp.phase_type_id = 18 and phase_criteria_type_id = 1'

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
 * Insert review in IFX
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} createdBy the scorecard ID
 * @param {Number} score the review score
 * @param {Array} responses the review responses
 * @param {Number} createdBy the creator user ID
 */
async function insertReview (challengeLegacyId, scorecardId, score, responses, createdBy) {
  const connection = await helper.getInformixConnection()
  let result = null
  let reviewId
  try {
    const resourceId = await getIterativeReviewerResourceId(connection, challengeLegacyId)
    if (!resourceId) throw new Error('Cannot find Iterative Reviewer')
    const submissionId = await getSubmissionId(connection, challengeLegacyId)
    if (!submissionId) throw new Error('Cannot find Submission')
    const projectPhaseId = await getProjectPhaseId(connection, challengeLegacyId)
    if (!projectPhaseId) throw new Error('Cannot find Project Phase Id')
    reviewId = await reviewIdGen.getNextId()
    await connection.beginTransactionAsync()
    const query = await prepare(connection, QUERY_CREATE_REVIEW)
    result = await query.executeAsync([reviewId, resourceId, submissionId, projectPhaseId, scorecardId, 1, score, score, createdBy, createdBy])
    for (let i = 0; i < responses.length; i += 1) {
      await insertReviewItem(connection, reviewId, responses[i], i, createdBy)
    }
    await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'insertReview' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Review ${challengeLegacyId} has been created`)
    await connection.closeAsync()
  }
  return result
}

/**
 * Insert review item in IFX
 * @param {Object} connection
 * @param {Number} reviewId the review ID
 * @param {Object} response the response
 * @param {Number} sort the sort
 * @param {Number} createdBy the creator user ID
 */
async function insertReviewItem (connection, reviewId, response, sort, createdBy) {
  let result = null
  const reviewItemId = await reviewItemIdGen.getNextId()
  await connection.beginTransactionAsync()
  const query = await prepare(connection, QUERY_CREATE_REVIEW_ITEM)
  result = await query.executeAsync([reviewItemId, reviewId, response.questionId, null, response.answer, sort, createdBy, createdBy])
  return result
}

/**
 * Gets the iterative reviewer resource id
 * @param {Object} connection
 * @param {Number} challengeLegacyId
 */
async function getIterativeReviewerResourceId (connection, challengeLegacyId) {
  const result = await connection.queryAsync(util.format(QUERY_GET_ITERATIVE_REVIEW_RESOURCE_FOR_CHALLENGE, challengeLegacyId))
  return _.get(result, '[0].resourceid', null)
}

/**
 * Gets the submission id
 * @param {Object} connection
 * @param {Number} challengeLegacyId
 */
async function getSubmissionId (connection, challengeLegacyId) {
  const result = await connection.queryAsync(util.format(QUERY_GET_SUBMISSION, challengeLegacyId))
  return _.get(result, '[0].submission_id', null)
}

/**
 * Gets the submission id
 * @param {Object} connection
 * @param {Number} challengeLegacyId
 */
async function getProjectPhaseId (connection, challengeLegacyId) {
  const result = await connection.queryAsync(util.format(QUERY_GET_PROJECT_PHASE, challengeLegacyId))
  return _.get(result, '[0].project_phase_id', null)
}

module.exports = {
  insertReview
}
