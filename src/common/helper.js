/**
 * Contains generic helper methods
 */

const elasticsearch = require('elasticsearch')
const AWS = require('aws-sdk')
const _ = require('lodash')
const config = require('config')
const ifxnjs = require('ifxnjs')
const request = require('superagent')
const m2mAuth = require('tc-core-library-js').auth.m2m
const busApi = require('@topcoder-platform/topcoder-bus-api-wrapper')
const constants = require('../constants')
const m2m = m2mAuth(_.pick(config, ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME', 'AUTH0_PROXY_SERVER_URL']))

const Pool = ifxnjs.Pool
const pool = Promise.promisifyAll(new Pool())
pool.setMaxPoolSize(config.get('INFORMIX.POOL_MAX_SIZE'))

AWS.config.region = config.get('V4_ES.AWS_REGION')
// ES Client
let esClient

// Bus API Client
let busApiClient

/**
 * Get ES Client
 * @return {Object} Elastic Host Client Instance
 */
function getESClient () {
  const esHost = config.get('V4_ES.HOST')
  if (!esClient) {
    // AWS ES configuration is different from other providers
    if (/.*amazonaws.*/.test(esHost)) {
      esClient = elasticsearch.Client({
        apiVersion: config.get('V4_ES.API_VERSION'),
        hosts: esHost,
        connectionClass: require('http-aws-es'), // eslint-disable-line global-require
        amazonES: {
          region: config.get('V4_ES.AWS_REGION'),
          credentials: new AWS.EnvironmentCredentials('AWS')
        }
      })
    } else {
      esClient = new elasticsearch.Client({
        apiVersion: config.get('V4_ES.API_VERSION'),
        hosts: esHost
      })
    }
  }
  return esClient
}

/**
 * Get Informix connection using the configured parameters
 * @return {Object} Informix connection
 */
async function getInformixConnection () {
  // construct the connection string from the configuration parameters.
  const connectionString = 'SERVER=' + config.get('INFORMIX.SERVER') +
                           ';DATABASE=' + config.get('INFORMIX.DATABASE') +
                           ';HOST=' + config.get('INFORMIX.HOST') +
                           ';Protocol=' + config.get('INFORMIX.PROTOCOL') +
                           ';SERVICE=' + config.get('INFORMIX.PORT') +
                           ';DB_LOCALE=' + config.get('INFORMIX.DB_LOCALE') +
                           ';UID=' + config.get('INFORMIX.USER') +
                           ';PWD=' + config.get('INFORMIX.PASSWORD')
  const conn = await pool.openAsync(connectionString)
  return Promise.promisifyAll(conn)
}

/**
 * Get Kafka options
 * @return {Object} the Kafka options
 */
function getKafkaOptions () {
  const options = { connectionString: config.KAFKA_URL, groupId: config.KAFKA_GROUP_ID }
  if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
    options.ssl = { cert: config.KAFKA_CLIENT_CERT, key: config.KAFKA_CLIENT_CERT_KEY }
  }
  return options
}

/**
 * Get the m2m token
 * @returns {String} the mem token
 */
async function getM2MToken () {
  return m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET)
}

/**
 * Uses superagent to proxy patch request
 * @param {String} url the url
 * @param {Object} body the body
 * @param {String} m2mToken the m2m token
 * @returns {Object} the response
 */
async function patchRequest (url, body, m2mToken) {
  return request
    .patch(url)
    .send(body)
    .set('Authorization', `Bearer ${m2mToken}`)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
}

/**
 * Uses superagent to proxy get request
 * @param {String} url the url
 * @param {String} m2mToken the M2M token
 * @returns {Object} the response
 */
async function getRequest (url, m2mToken) {
  return request
    .get(url)
    .set('Authorization', `Bearer ${m2mToken}`)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
}

/**
 * Uses superagent to proxy put request
 * @param {String} url the url
 * @param {Object} body the body
 * @param {String} m2mToken the M2M token
 * @returns {Object} the response
 */
async function putRequest (url, body, m2mToken) {
  return request
    .put(url)
    .send(body)
    .set('Authorization', `Bearer ${m2mToken}`)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
}

/**
 * Uses superagent to proxy post request
 * @param {String} url the url
 * @param {Object} body the body
 * @param {String} m2mToken the M2M token
 * @returns {Object} the response
 */
async function postRequest (url, body, m2mToken) {
  return request
    .post(url)
    .send(body)
    .set('Authorization', `Bearer ${m2mToken}`)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
}

/**
 * Get Bus API Client
 * @return {Object} Bus API Client Instance
 */
function getBusApiClient () {
  // if there is no bus API client instance, then create a new instance
  if (!busApiClient) {
    busApiClient = busApi(_.pick(config,
      ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME',
        'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'BUSAPI_URL',
        'KAFKA_ERROR_TOPIC', 'AUTH0_PROXY_SERVER_URL']))
  }

  return busApiClient
}

/**
 * Post bus event.
 * @param {String} topic the event topic
 * @param {Object} payload the event payload
 */
async function postBusEvent (topic, payload) {
  const client = getBusApiClient()
  await client.postEvent({
    topic,
    originator: constants.EVENT_ORIGINATOR,
    timestamp: new Date().toISOString(),
    'mime-type': constants.EVENT_MIME_TYPE,
    payload
  })
}

module.exports = {
  getInformixConnection,
  getKafkaOptions,
  getM2MToken,
  patchRequest,
  getRequest,
  putRequest,
  postRequest,
  postBusEvent,
  getESClient
}
