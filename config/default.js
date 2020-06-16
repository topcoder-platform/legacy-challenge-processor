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
  RETRY_TIMEOUT: process.env.RETRY_TIMEOUT || 10 * 1000,

  // Topics to listen
  CREATE_CHALLENGE_TOPIC: process.env.CREATE_CHALLENGE_TOPIC || 'challenge.notification.create',
  UPDATE_CHALLENGE_TOPIC: process.env.UPDATE_CHALLENGE_TOPIC || 'challenge.notification.update',

  // Auth0 parameters
  AUTH0_URL: process.env.AUTH0_URL || 'https://topcoder-dev.auth0.com/oauth/token',
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://m2m.topcoder-dev.com/',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME || 90,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID || '',
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET || '',
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,

  // Topcoder APIs
  V5_CHALLENGE_API_URL: process.env.V5_CHALLENGE_API_URL || 'http://localhost:4000/v5/challenges',
  V5_CHALLENGE_TYPE_API_URL: process.env.V5_CHALLENGE_TYPE_API_URL || 'http://localhost:4000/v5/challenge-types',
  V4_CHALLENGE_API_URL: process.env.V4_CHALLENGE_API_URL || 'http://localhost:4000/v4/challenges',
  V4_TECHNOLOGIES_API_URL: process.env.V4_TECHNOLOGIES_API_URL || 'http://localhost:4000/v4/technologies',
  V4_PLATFORMS_API_URL: process.env.V4_PLATFORMS_API_URL || 'http://localhost:4000/v4/platforms',
  V5_PROJECTS_API_URL: process.env.V5_PROJECTS_API_URL || 'https://api.topcoder-dev.com/v5/projects',

  // PHASE IDs
  REGISTRATION_PHASE_ID: process.env.REGISTRATION_PHASE_ID || 'a93544bc-c165-4af4-b55e-18f3593b457a',
  SUBMISSION_PHASE_ID: process.env.SUBMISSION_PHASE_ID || '6950164f-3c5e-4bdc-abc8-22aaf5a1bd49',
  CHECKPOINT_SUBMISSION_PHASE_ID: process.env.CHECKPOINT_SUBMISSION_PHASE_ID || 'd8a2cdbe-84d1-4687-ab75-78a6a7efdcc8',

  // Challenge Type IDs
  TASK_TYPE_ID: process.env.TASK_TYPE_ID || 'e885273d-aeda-42c0-917d-bfbf979afbba'
}
