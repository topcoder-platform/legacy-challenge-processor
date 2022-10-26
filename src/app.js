/**
 * The application entry point
 */

require('./bootstrap')
const _ = require('lodash')
const config = require('config')
const Kafka = require('no-kafka')
const healthcheck = require('@topcoder-platform/topcoder-healthcheck-dropin')
const logger = require('./common/logger')
const helper = require('./common/helper')
const ProcessorService = require('./services/ProcessorService')

const AWSXRay = require('aws-xray-sdk')

// Start kafka consumer
logger.info('Starting kafka consumer')
// create consumer

const consumer = new Kafka.GroupConsumer(helper.getKafkaOptions())

/*
 * Data handler linked with Kafka consumer
 * Whenever a new message is received by Kafka consumer,
 * this function will be invoked
 */
const dataHandler = (messageSet, topic, partition) => Promise.each(messageSet, async (m) => {
  const message = m.message.value.toString('utf8')
  // logger.info(`Handle Kafka event message; Topic: ${topic}; Partition: ${partition}; Offset: ${
  //   m.offset}; Message: ${message}.`)
  let messageJSON
  try {
    messageJSON = JSON.parse(message)
  } catch (e) {
    logger.error('Invalid message JSON.')
    logger.logFullError(e)

    // commit the message and ignore it
    await consumer.commitOffset({ topic, partition, offset: m.offset })
    return
  }

  if (messageJSON.topic !== topic) {
    logger.error(`The message topic ${messageJSON.topic} doesn't match the Kafka topic ${topic}. Message: ${JSON.stringify(messageJSON)}`)

    // commit the message and ignore it
    await consumer.commitOffset({ topic, partition, offset: m.offset })
    return
  }

  if (_.includes(config.IGNORED_ORIGINATORS, messageJSON.originator)) {
    logger.error(`The message originator is in the ignored list. Originator: ${messageJSON.originator}`)

    // commit the message and ignore it
    await consumer.commitOffset({ topic, partition, offset: m.offset })
    return
  }

  const ns = AWSXRay.getNamespace();
  ns.run(async () => {

    const { traceInformation: {
      traceId,
      parentSegmentId,
    } = {
      traceId: null,
      parentSegmentId: null
    } } = messageJSON;

    console.log('tracing information', traceId, parentSegmentId);

    const segment = new AWSXRay.Segment('legacy-challenge-processor');

    if (traceId) {
      segment.trace_id = traceId;
      segment.id = parentSegmentId;
    }

    AWSXRay.setSegment(segment);

    // do not trust the message payload
    // the message.payload will be replaced with the data from the API
    try {
      const challengeUuid = _.get(messageJSON, 'payload.id')
      if (_.isEmpty(challengeUuid)) {
        segment.close();
        segment.addError(new Error(err));
        throw new Error('Invalid payload')
      }
      const m2mToken = await helper.getM2MToken()
      const v5Challenge = await helper.getRequest(`${config.V5_CHALLENGE_API_URL}/${challengeUuid}`, m2mToken)
      // TODO : Cleanup. Pulling the billingAccountId from the payload, it's not part of the challenge object
      messageJSON.payload = { billingAccountId: messageJSON.payload.billingAccountId, ...v5Challenge.body }
    } catch (err) {
      segment.addError(new Error(err));
      logger.debug('Failed to fetch challenge information')
      logger.logFullError(err)
    }

    try {
      await ProcessorService.processMessage(messageJSON)

      // logger.debug('Successfully processed message')
    } catch (err) {
      segment.addError(new Error(err));
      logger.error(`Error processing message ${JSON.stringify(messageJSON)}`)
      logger.logFullError(err)
    } finally {
      // Commit offset regardless of error
      await consumer.commitOffset({ topic, partition, offset: m.offset })
    }

    segment.close();
  })

})

// check if there is kafka connection alive
const check = () => {
  if (!consumer.client.initialBrokers && !consumer.client.initialBrokers.length) {
    return false
  }
  let connected = true
  consumer.client.initialBrokers.forEach(conn => {
    logger.debug(`url ${conn.server()} - connected=${conn.connected}`)
    connected = conn.connected & connected
  })
  return connected
}

const topics = [config.CREATE_CHALLENGE_TOPIC, config.UPDATE_CHALLENGE_TOPIC]

consumer
  .init([{
    subscriptions: topics,
    handler: dataHandler
  }])
  // consume configured topics
  .then(() => {
    logger.info('Initialized.......')
    healthcheck.init([check])
    logger.info('Adding topics successfully.......')
    logger.info(topics)
    logger.info('Kick Start.......')
  })
  .catch((err) => logger.error(err))

if (process.env.NODE_ENV === 'test') {
  module.exports = consumer
}
