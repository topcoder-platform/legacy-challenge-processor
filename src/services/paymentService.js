/**
 * Payment Service
 * Interacts with InformixDB
 */
const logger = require('../common/logger')
const util = require('util')
const helper = require('../common/helper')
const IDGenerator = require('../common/idGenerator')

const prizeIdGen = new IDGenerator('prize_id_seq')

const QUERY_GET_CHALLENGE_PRIZES = 'SELECT prize_id, place, prize_amount, number_of_submissions FROM prize WHERE prize_type_id = %d and project_id = %d'
const QUERY_UPDATE_CHALLENGE_PRIZE = 'UPDATE prize SET prize_amount = ?, number_of_submissions = ? WHERE prize_id = %d and project_id = %d'
const QUERY_CREATE_CHALLENGE_PRIZE = 'INSERT INTO prize (prize_id, project_id, place, prize_amount, prize_type_id, number_of_submissions, create_user, create_date, modify_user, modify_date) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
const QUERY_DELETE_CHALLENGE_PRIZE = 'DELETE FROM prize WHERE prize_id = %d and project_id = %d'

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
 * Gets the challenge phases from ifx
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} prizeTypeId the legacy challenge ID
 */
async function getChallengePrizes (challengeLegacyId, prizeTypeId) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    result = await connection.queryAsync(util.format(QUERY_GET_CHALLENGE_PRIZES, prizeTypeId, challengeLegacyId))
  } catch (e) {
    logger.error(`Error in 'getChallengePrizes' ${e}`)
    throw e
  } finally {
    await connection.closeAsync()
  }
  return result
}

/**
 * Update a prize in IFX
 * @param {Number} phaseId the phase ID
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} prizeAmount the prize amount
 * @param {Number} numberOfSubmissions the number of submissions to receive the prize
 */
async function updatePrize (prizeId, challengeLegacyId, prizeAmount, numberOfSubmissions) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    // await connection.beginTransactionAsync()
    const query = await prepare(connection, util.format(QUERY_UPDATE_CHALLENGE_PRIZE, prizeId, challengeLegacyId))
    result = await query.executeAsync([prizeAmount, numberOfSubmissions])
    // await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'updatePrize' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Prize ${prizeId} has been updated`)
    await connection.closeAsync()
  }
  return result
}

/**
 * Creates a new prize in IFX
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} place the placement
 * @param {Number} prizeAmount the prize amount
 * @param {Number} prizeTypeId the prize type ID
 * @param {Number} numberOfSubmissions the number of submissions that will receive the prize
 * @param {String} createdBy the creator user
 */
async function createPrize (challengeLegacyId, place, prizeAmount, prizeTypeId, numberOfSubmissions, createdBy) {
  const connection = await helper.getInformixConnection()
  let result = null
  let prizeId
  try {
    // await connection.beginTransactionAsync()
    prizeId = await prizeIdGen.getNextId()
    const currentDateIso = new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0]
    const query = await prepare(connection, QUERY_CREATE_CHALLENGE_PRIZE)
    result = await query.executeAsync([prizeId, challengeLegacyId, place, prizeAmount, prizeTypeId, numberOfSubmissions, createdBy, currentDateIso, createdBy, currentDateIso])
    // await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'createPrize' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Prize ${prizeId} has been updated`)
    await connection.closeAsync()
  }
  return result
}

/**
 * Deletes a prize from IFX
 * @param {Number} challengeLegacyId the legacy challenge ID
 * @param {Number} prizeId the prize ID
 */
async function deletePrize (challengeLegacyId, prizeId) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    // await connection.beginTransactionAsync()
    const query = await prepare(connection, QUERY_DELETE_CHALLENGE_PRIZE)
    result = await query.executeAsync([prizeId, challengeLegacyId])
    // await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'deletePrize' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Prize ${prizeId} has been deleted`)
    await connection.closeAsync()
  }
  return result
}

module.exports = {
  getChallengePrizes,
  updatePrize,
  createPrize,
  deletePrize
}
