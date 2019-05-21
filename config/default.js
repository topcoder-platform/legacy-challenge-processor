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

  CREATE_CHALLENGE_TOPIC: process.env.CREATE_CHALLENGE_TOPIC || 'challenge.notification.create',
  UPDATE_CHALLENGE_TOPIC: process.env.UPDATE_CHALLENGE_TOPIC || 'challenge.notification.update',

  AUTH0_URL: process.env.AUTH0_URL || 'https://topcoder-dev.auth0.com/oauth/token',
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://m2m.topcoder-dev.com/',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME || 90,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID || 'e6oZAxnoFvjdRtjJs1Jt3tquLnNSTs0e',
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET || 'OGCzOnQkhYTQpZM3NI0sD--JJ_EPcm2E7707_k6zX11m223LrRK1-QZL4Pon4y-D',
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,

  V4_CHALLENGE_API_URL: process.env.V4_CHALLENGE_API_URL || 'https://api.topcoder-dev.com/v4/challenges',
  V4_PLATFORMS_API_URL: process.env.V4_PLATFORMS_API_URL || 'https://api.topcoder-dev.com/v4/platforms',
  V4_TECHNOLOGIES_API_URL: process.env.V4_TECHNOLOGIES_API_URL || 'https://api.topcoder-dev.com/v4/technologies',
  V5_CHALLENGE_API_URL: process.env.V5_CHALLENGE_API_URL || 'http://localhost:4000/v5/challenges',
  V5_CHALLENGE_TYPE_API_URL: process.env.V5_CHALLENGE_TYPE_API_URL || 'http://localhost:4000/v5/challengeTypes'
}
