/**
 * E2E test of the Legacy Challenge Processor.
 */
require('../../src/bootstrap')
process.env.NODE_ENV = 'test'

const _ = require('lodash')
const config = require('config')
const should = require('should')
const request = require('superagent')
const Kafka = require('no-kafka')
const helper = require('../../src/common/helper')
const logger = require('../../src/common/logger')
const { requiredFields, stringFields, integerFields, arrayFields, testTopics } = require('../common/testData')
const { mockApi } = require('../mock/mock')

describe('Topcoder - Legacy Challenge Processor E2E Test', () => {
  let app
  let infoLogs = []
  let errorLogs = []
  let debugLogs = []
  const info = logger.info
  const error = logger.error
  const debug = logger.debug

  const producer = new Kafka.Producer(helper.getKafkaOptions())

  /**
   * Start http server with port
   * @param {Object} server the server
   * @param {Number} port the server port
   */
  function startServer (server, port) {
    return new Promise((resolve) => {
      server.listen(port, () => {
        resolve()
      })
    })
  }

  /**
   * Close http server
   * @param {Object} server the server
   */
  function closeServer (server) {
    return new Promise((resolve) => {
      server.close(() => {
        resolve()
      })
    })
  }

  /**
   * Sleep with time from input
   * @param time the time input
   */
  async function sleep (time) {
    await new Promise((resolve) => {
      setTimeout(resolve, time)
    })
  }

  /**
   * Send message
   * @param testMessage the test message
   */
  async function sendMessage (testMessage) {
    await producer.send({
      topic: testMessage.topic,
      message: {
        value: JSON.stringify(testMessage)
      }
    })
  }

  /**
   * Consume not committed messages before e2e test
   */
  async function consumeMessages () {
    // remove all not processed messages
    const consumer = new Kafka.GroupConsumer(helper.getKafkaOptions())
    await consumer.init([{
      subscriptions: [config.CREATE_CHALLENGE_TOPIC, config.UPDATE_CHALLENGE_TOPIC],
      handler: (messageSet, topic, partition) => Promise.each(messageSet,
        (m) => consumer.commitOffset({ topic, partition, offset: m.offset }))
    }])
    // make sure process all not committed messages before test
    await sleep(2 * config.WAIT_TIME)
    await consumer.end()
  }

  // the message patter to get topic/partition/offset
  const messagePattern = /^Handle Kafka event message; Topic: (.+); Partition: (.+); Offset: (.+); Message: (.+).$/
  /**
   * Wait job finished with successful log or error log is found
   */
  async function waitJob () {
    while (true) {
      if (errorLogs.length > 0) {
        if (infoLogs.length && messagePattern.exec(infoLogs[0])) {
          const matchResult = messagePattern.exec(infoLogs[0])
          // only manually commit for error message during test
          await app.commitOffset({
            topic: matchResult[1],
            partition: parseInt(matchResult[2]),
            offset: parseInt(matchResult[3])
          })
        }
        break
      }
      if (debugLogs.some(x => String(x).includes('Successfully processed message'))) {
        break
      }
      // use small time to wait job and will use global timeout so will not wait too long
      await sleep(config.WAIT_TIME)
    }
  }

  function assertErrorMessage (message) {
    errorLogs.should.not.be.empty()
    errorLogs.some(x => String(x).includes(message)).should.be.true()
  }

  before(async () => {
    // inject logger with log collector
    logger.info = (message) => {
      infoLogs.push(message)
      info(message)
    }
    logger.debug = (message) => {
      debugLogs.push(message)
      debug(message)
    }
    logger.error = (message) => {
      errorLogs.push(message)
      error(message)
    }
    await consumeMessages()
    // start kafka producer
    await producer.init()
    // start the application (kafka listener)
    app = require('../../src/app')
    // wait until consumer init successfully
    while (true) {
      if (infoLogs.some(x => String(x).includes('Kick Start'))) {
        break
      }
      await sleep(config.WAIT_TIME)
    }
    // start mock server
    await startServer(mockApi, config.MOCK_API_PORT)
  })

  after(async () => {
    // close server
    await closeServer(mockApi)

    // restore logger
    logger.error = error
    logger.info = info
    logger.debug = debug

    try {
      await producer.end()
    } catch (err) {
      // ignore
    }
    try {
      await app.end()
    } catch (err) {
      // ignore
    }
  })

  beforeEach(() => {
    // clear logs
    infoLogs = []
    debugLogs = []
    errorLogs = []
  })

  it('Should setup healthcheck with check on kafka connection', async () => {
    const healthcheckEndpoint = `http://localhost:${process.env.PORT || 3000}/health`
    const result = await request.get(healthcheckEndpoint)
    should.equal(result.status, 200)
    should.deepEqual(result.body, { checksRun: 1 })
    debugLogs.should.match(/connected=true/)
  })

  it('Should handle invalid json message', async () => {
    await producer.send({
      topic: testTopics.create.topic,
      message: {
        value: '[ invalid'
      }
    })
    await waitJob()
    should.equal(errorLogs[0], 'Invalid message JSON.')
  })

  it('Should handle incorrect topic field message', async () => {
    const message = _.cloneDeep(testTopics.create)
    message.topic = 'invalid'
    await producer.send({
      topic: testTopics.create.topic,
      message: {
        value: JSON.stringify(message)
      }
    })
    await waitJob()
    should.equal(errorLogs[0], 'The message topic invalid doesn\'t match the Kafka topic challenge.notification.create.')
  })

  it('process create challenge success', async () => {
    await sendMessage(testTopics.create)
    await waitJob()

    should.equal(debugLogs[3], 'GET /v5/challenge-types/2f4ef3a8-ed35-40d1-b8a6-7371a700d098')
    should.equal(debugLogs[4], 'GET /v4/technologies')
    should.equal(debugLogs[5], 'GET /v4/platforms')
    should.equal(debugLogs[8], 'POST /v4/challenges')
    should.equal(debugLogs[10], 'PATCH /v5/challenges/1a4ef3a8-ed35-40d1-b8a6-7371a700d011')
    should.equal(debugLogs[11], '{"legacyId":30055016}')
    should.equal(infoLogs[1], 'Create challenge entity in legacy system, the legacy id is 30055016')
    const body = JSON.parse(debugLogs[9])
    should.equal(body.param.detailedRequirements, '<p>test</p>')
    should.equal(body.param.numberOfCheckpointPrizes, 3)
    should.equal(body.param.checkpointPrize, 200)
    should.exist(body.param.checkpointSubmissionStartsAt)
    should.exist(body.param.checkpointSubmissionEndsAt)
    should.exist(body.param.registrationStartsAt)
    should.exist(body.param.registrationEndsAt)
    should.exist(body.param.submissionEndsAt)
    should.equal(body.param.prizes.length, 2)
    should.equal(body.param.prizes[0], 1000)
    should.equal(body.param.prizes[1], 500)
  })

  it('fail - process create challenge, prizeSet parameter is invalid', async () => {
    const message = _.cloneDeep(testTopics.create)
    message.payload.prizeSets.push({ type: 'First to Finish', prizes: [{ type: 'first-place', value: 500 }] })
    await sendMessage(message)
    await waitJob()

    assertErrorMessage('"type" must be one of [Challenge prizes, Check Point]')
  })

  it('failure - process create challenge, typeId parameter is invalid', async () => {
    const message = _.cloneDeep(testTopics.create)
    message.payload.typeId = '1f4ef3a8-ed35-40d1-b8a6-7371a700d098'
    await sendMessage(message)
    await waitJob()

    assertErrorMessage('Challenge type with id: 1f4ef3a8-ed35-40d1-b8a6-7371a700d098 doesn\'t exist.')
  })

  it('process update challenge success', async () => {
    await sendMessage(testTopics.update)
    await waitJob()

    should.equal(debugLogs[3], 'GET /v5/challenge-types/2f4ef3a8-ed35-40d1-b8a6-7371a700d098')
    should.equal(debugLogs[4], 'GET /v4/technologies')
    should.equal(debugLogs[5], 'GET /v4/platforms')
    should.equal(debugLogs[8], 'PUT /v4/challenges/30055016')
    const body = JSON.parse(debugLogs[9])
    should.equal(body.param.detailedRequirements, '<h1 id="title">Title</h1>\n<h2 id="subtitle1">sub title 1</h2>\n<p>text</p>\n<h2 id="subtitle2">sub title2</h2>\n<p>another text</p>')
    should.equal(body.param.numberOfCheckpointPrizes, 0)
    should.equal(body.param.checkpointPrize, 0)
    should.equal(body.param.checkpointSubmissionStartsAt, null)
    should.equal(body.param.checkpointSubmissionEndsAt, null)
    should.equal(body.param.prizes.length, 2)
    should.equal(body.param.prizes[0], 800)
    should.equal(body.param.prizes[1], 400)
  })

  it('process update challenge success again, no normal challenge prizes(safeguard for edge case)', async () => {
    const message = _.cloneDeep(testTopics.update)
    message.payload.prizeSets = [{ type: 'Check Point', prizes: [{ type: 'first-place', value: 1 }] }]
    await sendMessage(message)
    await waitJob()

    should.equal(debugLogs[3], 'GET /v5/challenge-types/2f4ef3a8-ed35-40d1-b8a6-7371a700d098')
    should.equal(debugLogs[4], 'GET /v4/technologies')
    should.equal(debugLogs[5], 'GET /v4/platforms')
    should.equal(debugLogs[8], 'PUT /v4/challenges/30055016')
    const body = JSON.parse(debugLogs[9])
    should.equal(body.param.detailedRequirements, '<h1 id="title">Title</h1>\n<h2 id="subtitle1">sub title 1</h2>\n<p>text</p>\n<h2 id="subtitle2">sub title2</h2>\n<p>another text</p>')
    should.equal(body.param.checkpointSubmissionStartsAt, null)
    should.equal(body.param.checkpointSubmissionEndsAt, null)
    should.equal(body.param.prizes.length, 1)
    should.equal(body.param.prizes[0], 0)
  })

  it('process update challenge success, partial update ', async () => {
    const message = _.cloneDeep(testTopics.update)
    message.payload = {
      legacyId: 30055016,
      name: 'only update name'
    }
    await sendMessage(message)
    await waitJob()

    should.equal(debugLogs[5], 'PUT /v4/challenges/30055016')
    const body = JSON.parse(debugLogs[6])
    should.equal(body.param.name, 'only update name')
  })

  it('fail - process update challenge, prizeSet parameter is invalid', async () => {
    const message = _.cloneDeep(testTopics.update)
    message.payload.prizeSets.push({ type: 'First to Finish', prizes: [{ type: 'first-place', value: 500 }] })
    await sendMessage(message)
    await waitJob()

    assertErrorMessage('"type" must be one of [Challenge prizes, Check Point]')
  })

  it('failure - process update challenge, typeId parameter is invalid', async () => {
    const message = _.cloneDeep(testTopics.update)
    message.payload.typeId = '1f4ef3a8-ed35-40d1-b8a6-7371a700d098'
    await sendMessage(message)
    await waitJob()

    assertErrorMessage('Challenge type with id: 1f4ef3a8-ed35-40d1-b8a6-7371a700d098 doesn\'t exist.')
  })

  for (const requiredField of requiredFields) {
    it(`test invalid parameters, required field ${requiredField} is missing`, async () => {
      let message = _.cloneDeep(testTopics.create)
      message = _.omit(message, requiredField)
      await sendMessage(message)
      await waitJob()

      assertErrorMessage(`"${_.last(requiredField.split('.'))}" is required`)
    })
  }

  it('test invalid parameters, required field legacyId is missing', async () => {
    let message = _.cloneDeep(testTopics.update)
    message = _.omit(message, 'payload.legacyId')
    await sendMessage(message)
    await waitJob()

    assertErrorMessage('"legacyId" is required')
  })

  for (const op of ['Create', 'Update']) {
    for (const stringField of stringFields) {
      it(`test invalid parameters, invalid string type field ${stringField}`, async () => {
        const message = _.cloneDeep(testTopics[op.toLowerCase()])
        _.set(message, stringField, 123)
        await sendMessage(message)
        await waitJob()

        assertErrorMessage(`"${_.last(stringField.split('.'))}" must be a string`)
      })
    }

    for (const arrayField of arrayFields) {
      it(`test invalid parameters, invalid array type field ${arrayField}`, async () => {
        const message = _.cloneDeep(testTopics[op.toLowerCase()])
        _.set(message, arrayField, [])
        await sendMessage(message)
        await waitJob()

        assertErrorMessage(`"${_.last(arrayField.split('.'))}" must contain at least 1 items`)
      })
    }

    for (const integerField of integerFields) {
      it(`test invalid parameters, invalid integer type field ${integerField}(wrong number)`, async () => {
        const message = _.cloneDeep(testTopics[op.toLowerCase()])
        _.set(message, integerField, 'string')
        await sendMessage(message)
        await waitJob()

        assertErrorMessage(`"${_.last(integerField.split('.'))}" must be a number`)
      })

      it(`test invalid parameters, invalid integer type field ${integerField}(wrong integer)`, async () => {
        const message = _.cloneDeep(testTopics[op.toLowerCase()])
        _.set(message, integerField, 1.1)
        await sendMessage(message)
        await waitJob()

        assertErrorMessage(`"${_.last(integerField.split('.'))}" must be an integer`)
      })
    }

    it('test invalid parameters, prizeSets array contain invalid prize entity', async () => {
      const message = _.cloneDeep(testTopics[op.toLowerCase()])
      message.payload.prizeSets.push({ type: 'Invalid', prizes: [{ type: 'first-place', value: 1000 }] })
      await sendMessage(message)
      await waitJob()

      assertErrorMessage('"type" must be one of [Challenge prizes, Check Point]')
    })

    it('test invalid parameters, prize value should be positive', async () => {
      const message = _.cloneDeep(testTopics[op.toLowerCase()])
      message.payload.prizeSets.push({ type: 'Challenge prizes', prizes: [{ type: 'first-place', value: 0 }] })
      await sendMessage(message)
      await waitJob()

      assertErrorMessage('"value" must be a positive number')
    })

    it('test invalid parameters, duration value should be positive', async () => {
      const message = _.cloneDeep(testTopics[op.toLowerCase()])
      message.payload.phases.push({ id: '607e8f90-1ed6-49a3-b5a2-486b761a3def', name: 'invalid', duration: 0 })
      await sendMessage(message)
      await waitJob()

      assertErrorMessage('"duration" must be a positive number')
    })
  }
})
