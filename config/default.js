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
  BUSAPI_URL: process.env.BUSAPI_URL || 'https://api.topcoder-dev.com/v5',
  MAX_RETRIES: process.env.MAX_RETRIES || 3,
  RETRY_TIMEOUT: process.env.RETRY_TIMEOUT || 10 * 1000,

  // Topics to listen
  CREATE_CHALLENGE_TOPIC: process.env.CREATE_CHALLENGE_TOPIC || 'challenge.notification.create',
  UPDATE_CHALLENGE_TOPIC: process.env.UPDATE_CHALLENGE_TOPIC || 'challenge.notification.update',
  RESOURCE_CREATE_TOPIC: process.env.RESOURCE_CREATE_TOPIC || 'challenge.action.resource.create',

  // Auth0 parameters
  AUTH0_URL: process.env.AUTH0_URL || 'https://topcoder-dev.auth0.com/oauth/token',
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://m2m.topcoder-dev.com/',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME || 90,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID || '',
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET || '',
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,

  INFORMIX: {
    SERVER: process.env.INFORMIX_SERVER || 'informixoltp_tcp', // informix server
    DATABASE: process.env.INFORMIX_DATABASE || 'tcs_catalog', // informix database
    HOST: process.env.INFORMIX_HOST || 'localhost', // host
    PROTOCOL: process.env.INFORMIX_PROTOCOL || 'onsoctcp',
    PORT: process.env.INFORMIX_PORT || '2021', // port
    DB_LOCALE: process.env.INFORMIX_DB_LOCALE || 'en_US.57372',
    USER: process.env.INFORMIX_USER || 'informix', // user
    PASSWORD: process.env.INFORMIX_PASSWORD || '1nf0rm1x', // password
    POOL_MAX_SIZE: parseInt(process.env.MAXPOOL, 10) || 60,
    maxsize: parseInt(process.env.MAXSIZE) || 0,
    minpool: parseInt(process.env.MINPOOL, 10) || 1,
    idleTimeout: parseInt(process.env.IDLETIMEOUT, 10) || 3600,
    timeout: parseInt(process.env.TIMEOUT, 10) || 30000
  },
  // Topcoder APIs
  V5_CHALLENGE_API_URL: process.env.V5_CHALLENGE_API_URL || 'http://localhost:4000/v5/challenges',
  V5_RESOURCES_API_URL: process.env.V5_RESOURCES_API_URL || 'http://localhost:4000/v5/resources',
  V5_TERMS_API_URL: process.env.V5_TERMS_API_URL || 'http://localhost:4000/v5/terms',
  V5_RESOURCE_ROLES_API_URL: process.env.V5_RESOURCE_ROLES_API_URL || 'http://localhost:4000/v5/resource-roles',

  V5_CHALLENGE_TYPE_API_URL: process.env.V5_CHALLENGE_TYPE_API_URL || 'http://localhost:4000/v5/challenge-types',
  V4_CHALLENGE_TYPE_API_URL: process.env.V4_CHALLENGE_TYPE_API_URL || 'http://localhost:4000/v4/challenge-types',
  V4_CHALLENGE_API_URL: process.env.V4_CHALLENGE_API_URL || 'http://localhost:4000/v4/challenges',
  V4_TECHNOLOGIES_API_URL: process.env.V4_TECHNOLOGIES_API_URL || 'http://localhost:4000/v4/technologies',
  V4_PLATFORMS_API_URL: process.env.V4_PLATFORMS_API_URL || 'http://localhost:4000/v4/platforms',
  V5_PROJECTS_API_URL: process.env.V5_PROJECTS_API_URL || 'https://api.topcoder-dev.com/v5/projects',
  V5_CHALLENGE_MIGRATION_API_URL: process.env.V5_CHALLENGE_MIGRATION_API_URL || 'https://api.topcoder-dev.com/v5/challenge-migration',
  V4_ES_FEEDER_API_URL: process.env.V4_ES_FEEDER_API_URL || 'https://api.topcoder-dev.com/v4/esfeeder/challenges',

  V5_GROUPS_API_URL: process.env.V5_GROUPS_API_URL || 'https://api.topcoder-dev.com/v5/groups',

  // PHASE IDs
  REGISTRATION_PHASE_ID: process.env.REGISTRATION_PHASE_ID || 'a93544bc-c165-4af4-b55e-18f3593b457a',
  SUBMISSION_PHASE_ID: process.env.SUBMISSION_PHASE_ID || '6950164f-3c5e-4bdc-abc8-22aaf5a1bd49',
  CHECKPOINT_SUBMISSION_PHASE_ID: process.env.CHECKPOINT_SUBMISSION_PHASE_ID || 'd8a2cdbe-84d1-4687-ab75-78a6a7efdcc8',

  V5_TERMS_NDA_ID: process.env.V5_TERMS_NDA_ID || 'e5811a7b-43d1-407a-a064-69e5015b4900',
  LEGACY_TERMS_NDA_ID: process.env.LEGACY_TERMS_NDA_ID || 21233,

  V5_TERMS_STANDARD_ID: process.env.V5_TERMS_STANDARD_ID || '317cd8f9-d66c-4f2a-8774-63c612d99cd4',
  LEGACY_TERMS_STANDARD_ID: process.env.LEGACY_TERMS_STANDARD_ID || 21305,

  LEGACY_SUBMITTER_ROLE_ID: process.env.LEGACY_SUBMITTER_ROLE_ID || 1,

  COPILOT_PAYMENT_TYPE: process.env.COPILOT_PAYMENT_TYPE || 'copilot',

  // V5 Term UUID
  SYNC_V5_TERM_UUID: process.env.SYNC_V5_TERM_UUID || '317cd8f9-d66c-4f2a-8774-63c612d99cd4',
  SYNC_V5_WRITE_ENABLED: process.env.SYNC_V5_WRITE_ENABLED === 'true' || false
}
