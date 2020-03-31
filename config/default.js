/**
 * The default configuration file.
 */

module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',

  KAFKA_URL: process.env.KAFKA_URL || 'localhost:9092',
  // below are used for secure Kafka connection, they are optional
  // for the local Kafka, they are not needed
  KAFKA_CLIENT_CERT: process.env.KAFKA_CLIENT_CERT,
  KAFKA_CLIENT_CERT_KEY: process.env.KAFKA_CLIENT_CERT_KEY,

  // Kafka group id
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || 'legacy-challenge-processor',
  KAFKA_ERROR_TOPIC: process.env.KAFKA_ERROR_TOPIC || 'common.error.reporting',

  CREATE_CHALLENGE_TOPIC: process.env.CREATE_CHALLENGE_TOPIC || 'challenge.notification.create',
  UPDATE_CHALLENGE_TOPIC: process.env.UPDATE_CHALLENGE_TOPIC || 'challenge.notification.update',
  CREATE_CHALLENGE_RESOURCE_TOPIC: process.env.CREATE_CHALLENGE_RESOURCE_TOPIC || 'challenge.action.resource.create',

  OBSERVER_ROLE_UUID: process.env.OBSERVER_ROLE_UUID || 'bac822d2-725d-4973-9712-360918a09bc0',
  COPILOT_ROLE_UUID: process.env.COPILOT_ROLE_UUID || 'bac822d2-725d-4973-9714-360918a09bc0',

  // bus API config params
  BUSAPI_URL: process.env.BUSAPI_URL || 'https://api.topcoder-dev.com/v5',

  AUTH0_URL: process.env.AUTH0_URL || 'https://topcoder-dev.auth0.com/oauth/token',
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://m2m.topcoder-dev.com/',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME || 90,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID || '',
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET || '',
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,

  V4_ES_FEEDER_API_URL: process.env.V4_ES_FEEDER_API_URL || 'https://api.topcoder-dev.com/v4/esfeeder/challenges',
  V5_CHALLENGE_API_URL: process.env.V5_CHALLENGE_API_URL || 'http://localhost:4000/v5/challenges',
  V5_CHALLENGE_TYPE_API_URL: process.env.V5_CHALLENGE_TYPE_API_URL || 'http://localhost:4000/v5/challengeTypes',

  // informix database configuration
  INFORMIX: {
    SERVER: process.env.INFORMIX_SERVER || 'informixoltp_tcp', // informix server
    DATABASE: process.env.INFORMIX_DATABASE || 'tcs_catalog', // informix database
    HOST: process.env.INFORMIX_HOST || 'localhost', // host
    PROTOCOL: process.env.INFORMIX_PROTOCOL || 'onsoctcp',
    PORT: process.env.INFORMIX_PORT || '2021', // port
    DB_LOCALE: process.env.INFORMIX_DB_LOCALE || 'en_US.57372',
    USER: process.env.INFORMIX_USER || 'informix', // user
    PASSWORD: process.env.INFORMIX_PASSWORD || '1nf0rm1x', // password
    POOL_MAX_SIZE: parseInt(process.env.INFORMIX_POOL_MAX_SIZE) || 10 // use connection pool in processor, the pool size
  }
}
