require('../bootstrap')
const util = require('util')
const config = require('config')
const request = require('superagent')
const _ = require('lodash')
const logger = require('../common/logger')
const helper = require('../common/helper')

const QUERY_GET_ENTRIES = 'SELECT user_id FROM user_terms_of_use_xref WHERE terms_of_use_id = %d'
const QUERY_INSERT_ENTRY = 'INSERT INTO user_terms_of_use_xref (user_id, terms_of_use_id, create_date, modify_date) VALUES (?, ?, CURRENT, CURRENT)'

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
 * Gets the entries from ifx
 * @param {Number} termsOfUseId the legacy terms of use ID
 */
async function getTermsFromIfx (termsOfUseId) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    result = await connection.queryAsync(util.format(QUERY_GET_ENTRIES, termsOfUseId))
  } catch (e) {
    logger.error(`Error in 'getTermsFromIfx' ${e}`)
    throw e
  } finally {
    await connection.closeAsync()
  }
  return _.map(result, r => _.toInteger(r.user_id))
}

/**
 * Creates a new entry in IFX
 * @param {Number} termsOfUseId the legacy terms of use ID
 * @param {Number} memberId the member ID
 */
async function createEntry (termsOfUseId, memberId) {
  const connection = await helper.getInformixConnection()
  let result = null
  try {
    // await connection.beginTransactionAsync()
    const query = await prepare(connection, QUERY_INSERT_ENTRY)
    if (config.SYNC_V5_WRITE_ENABLED) {
      result = await query.executeAsync([memberId, termsOfUseId])
    } else {
      logger.debug(`INSERT INTO user_terms_of_use_xref (user_id, terms_of_use_id, create_date, modify_date) VALUES (${memberId}, ${termsOfUseId}, CURRENT, CURRENT)`)
    }
    // await connection.commitTransactionAsync()
  } catch (e) {
    logger.error(`Error in 'createEntry' ${e}, rolling back transaction`)
    await connection.rollbackTransactionAsync()
    throw e
  } finally {
    logger.info(`Entry for term ${termsOfUseId} and member ${memberId} has been created`)
    await connection.closeAsync()
  }
  return result
}

/**
 * Gets all paginated results from `/terms/:id/users`
 * @param {String} m2mToken the m2m token
 */
async function getAllTermUsers (m2mToken) {
  let allData = []
  // get search is paginated, we need to get all pages' data
  let page = 1
  while (true) {
    const result = await request
      .get(`${config.V5_TERMS_API_URL}/${config.SYNC_V5_TERM_UUID}/users`)
      .query({ page, perPage: 100 })
      .set('Authorization', `Bearer ${m2mToken}`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')

    const users = _.get(result, 'body.result', [])
    if (users.length === 0) {
      break
    }
    allData = allData.concat(users)
    page += 1
    if (result.headers['x-total-pages'] && page > Number(result.headers['x-total-pages'])) {
      break
    }
  }
  return allData
}

/**
 * Application entry point
 */
async function main () {
  try {
    const m2mToken = await helper.getM2MToken()
    logger.info(`Fetching details for term ${config.SYNC_V5_TERM_UUID}`)
    const res = await helper.getRequest(`${config.V5_TERMS_API_URL}/${config.SYNC_V5_TERM_UUID}`, m2mToken)
    const legacyTermId = _.get(res, 'body.legacyId')
    if (!legacyTermId) {
      throw new Error(`Term ${config.SYNC_V5_TERM_UUID} does not have a legacyId`)
    }
    logger.info(`Fetching users that have agreed to ${config.SYNC_V5_TERM_UUID}`)
    const v5Entries = await getAllTermUsers(m2mToken)
    logger.debug(`Found ${v5Entries.length} users`)

    logger.info(`Fetching users from legacy for ID: ${legacyTermId}`)
    const legacyIntries = await getTermsFromIfx(legacyTermId)
    logger.debug(`Found ${legacyIntries.length} users`)
    for (const memberId of v5Entries) {
      if (legacyIntries.indexOf(memberId) === -1) {
        await createEntry(legacyTermId, memberId)
      }
    }
    logger.info('Completed!')
  } catch (e) {
    logger.logFullError(e)
  }
}

main()
