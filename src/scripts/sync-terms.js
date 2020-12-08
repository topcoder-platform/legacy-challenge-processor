require('../bootstrap')
const util = require('util')
const config = require('config')
const _ = require('lodash')
const logger = require('../common/logger')
const helper = require('../common/helper')

const QUERY_GET_ENTRIES = 'SELECT user_id FROM user_terms_of_use_xref WHERE terms_of_use_id = %d'
const QUERY_INSERT_ENTRY = 'INSERT INTO user_terms_of_use_xref (user_id, terms_of_use_id, create_date, modify_date) VALUES (?, ?, ?, ?)'

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
    const currentDateIso = new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0]
    const query = await prepare(connection, QUERY_INSERT_ENTRY)
    result = await query.executeAsync([termsOfUseId, memberId, currentDateIso, currentDateIso])
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
 * Application entry point
 */
async function main () {
  try {
    let res
    const m2mToken = await helper.getM2MToken()
    logger.info(`Fetching details for term ${config.SYNC_V5_TERM_UUID}`)
    res = await helper.getRequest(`${config.V5_TERMS_API_URL}/${config.SYNC_V5_TERM_UUID}`, m2mToken)
    const legacyTermId = _.get(res, 'body.legacyId')
    if (!legacyTermId) {
      throw new Error(`Term ${config.SYNC_V5_TERM_UUID} does not have a legacyId`)
    }
    logger.info(`Fetching users that have agreed to ${config.SYNC_V5_TERM_UUID}`)
    res = await helper.getRequest(`${config.V5_TERMS_API_URL}/${config.SYNC_V5_TERM_UUID}/users`, m2mToken)
    const v5Entries = _.get(res, 'body.result', [])
    logger.debug(`Found ${v5Entries.length} users`)

    logger.info(`Fetching users from legacy for ID: ${legacyTermId}`)
    const legacyIntries = await getTermsFromIfx(legacyTermId)
    logger.debug(`Found ${legacyIntries.length} users`)
    for (const memberId of v5Entries) {
      if (legacyIntries.indexOf(memberId) === -1) {
        if (config.SYNC_V5_WRITE_ENABLED) {
          await createEntry(legacyTermId, memberId)
        } else {
          const currentDateIso = new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0]
          logger.debug(`INSERT INTO user_terms_of_use_xref (user_id, terms_of_use_id, create_date, modify_date) VALUES (${legacyTermId}, ${memberId}, ${currentDateIso}, ${currentDateIso})`)
        }
      }
    }
    logger.info('Completed!')
  } catch (e) {
    logger.logFullError(e)
  }
}

main()
