/**
 * Mocha tests of the Legacy Challenge Processor.
 */
require('../../src/bootstrap')
process.env.NODE_ENV = 'test'

const _ = require('lodash')
const config = require('config')
const should = require('should')
const logger = require('../../src/common/logger')
const service = require('../../src/services/ProcessorService')
const { requiredFields, stringFields, integerFields, arrayFields, testTopics } = require('../common/testData')
const { mockApi } = require('../mock/mock')

describe('Topcoder - Legacy Challenge Processor Unit Test', () => {
  let infoLogs = []
  let errorLogs = []
  let debugLogs = []
  const info = logger.info
  const error = logger.error
  const debug = logger.debug

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
   * Assert validation error
   * @param err the error
   * @param message the message
   */
  function assertValidationError (err, message) {
    err.isJoi.should.be.true()
    should.equal(err.name, 'ValidationError')
    err.details.map(x => x.message).should.containEql(message)
    errorLogs.should.not.be.empty()
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
  })

  beforeEach(() => {
    // clear logs
    infoLogs = []
    debugLogs = []
    errorLogs = []
  })

  it('process create challenge success', async () => {
    await service.processCreate(testTopics.create)
    should.equal(debugLogs[3], 'GET /v5/challenge-types/2f4ef3a8-ed35-40d1-b8a6-7371a700d098')
    should.equal(debugLogs[4], 'GET /v4/technologies')
    should.equal(debugLogs[5], 'GET /v4/platforms')
    should.equal(debugLogs[8], 'POST /v4/challenges')
    should.equal(debugLogs[10], 'PATCH /v5/challenges/1a4ef3a8-ed35-40d1-b8a6-7371a700d011')
    should.equal(debugLogs[11], '{"legacyId":30055016}')
    should.equal(infoLogs[0], 'Create challenge entity in legacy system, the legacy id is 30055016')
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
    try {
      await service.processCreate(message)
      throw new Error('should not throw error here')
    } catch (err) {
      assertValidationError(err, '"type" must be one of [Challenge prizes, Check Point]')
    }
  })

  it('failure - process create challenge, typeId parameter is invalid', async () => {
    const message = _.cloneDeep(testTopics.create)
    message.payload.typeId = '1f4ef3a8-ed35-40d1-b8a6-7371a700d098'
    try {
      await service.processCreate(message)
      throw new Error('should not throw error here')
    } catch (err) {
      should.equal(err.message, 'Challenge type with id: 1f4ef3a8-ed35-40d1-b8a6-7371a700d098 doesn\'t exist.')
    }
  })

  it('process update challenge success', async () => {
    await service.processUpdate(testTopics.update)
    should.equal(debugLogs[3], 'GET /v5/challenge-types/2f4ef3a8-ed35-40d1-b8a6-7371a700d098')
    should.equal(debugLogs[7], 'GET /v4/challenges/30055016')
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
    await service.processUpdate(message)
    should.equal(debugLogs[3], 'GET /v5/challenge-types/2f4ef3a8-ed35-40d1-b8a6-7371a700d098')
    should.equal(debugLogs[7], 'GET /v4/challenges/30055016')
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
    await service.processUpdate(message)
    should.equal(debugLogs[5], 'PUT /v4/challenges/30055016')
    const body = JSON.parse(debugLogs[6])
    should.equal(body.param.name, 'only update name')
  })

  it('fail - process update challenge, prizeSet parameter is invalid', async () => {
    const message = _.cloneDeep(testTopics.update)
    message.payload.prizeSets.push({ type: 'First to Finish', prizes: [{ type: 'first-place', value: 500 }] })
    try {
      await service.processUpdate(message)
      throw new Error('should not throw error here')
    } catch (err) {
      assertValidationError(err, '"type" must be one of [Challenge prizes, Check Point]')
    }
  })

  it('failure - process update challenge, typeId parameter is invalid', async () => {
    const message = _.cloneDeep(testTopics.update)
    message.payload.typeId = '1f4ef3a8-ed35-40d1-b8a6-7371a700d098'
    try {
      await service.processUpdate(message)
      throw new Error('should not throw error here')
    } catch (err) {
      should.equal(err.message, 'Challenge type with id: 1f4ef3a8-ed35-40d1-b8a6-7371a700d098 doesn\'t exist.')
    }
  })

  for (const requiredField of requiredFields) {
    it(`test invalid parameters, required field ${requiredField} is missing`, async () => {
      let message = _.cloneDeep(testTopics.create)
      message = _.omit(message, requiredField)
      try {
        await service.processCreate(message)
        throw new Error('should not throw error here')
      } catch (err) {
        assertValidationError(err, `"${_.last(requiredField.split('.'))}" is required`)
      }
    })
  }

  it('test invalid parameters, required field legacyId is missing', async () => {
    let message = _.cloneDeep(testTopics.update)
    message = _.omit(message, 'payload.legacyId')
    try {
      await service.processUpdate(message)
      throw new Error('should not throw error here')
    } catch (err) {
      assertValidationError(err, '"legacyId" is required')
    }
  })

  for (const op of ['Create', 'Update']) {
    for (const stringField of stringFields) {
      it(`test invalid parameters, invalid string type field ${stringField}`, async () => {
        const message = _.cloneDeep(testTopics[op.toLowerCase()])
        _.set(message, stringField, 123)
        try {
          await service[`process${op}`](message)
          throw new Error('should not throw error here')
        } catch (err) {
          assertValidationError(err, `"${_.last(stringField.split('.'))}" must be a string`)
        }
      })
    }

    for (const arrayField of arrayFields) {
      it(`test invalid parameters, invalid array type field ${arrayField}`, async () => {
        const message = _.cloneDeep(testTopics[op.toLowerCase()])
        _.set(message, arrayField, [])
        try {
          await service[`process${op}`](message)
          throw new Error('should not throw error here')
        } catch (err) {
          assertValidationError(err, `"${_.last(arrayField.split('.'))}" must contain at least 1 items`)
        }
      })
    }

    for (const integerField of integerFields) {
      it(`test invalid parameters, invalid integer type field ${integerField}(wrong number)`, async () => {
        const message = _.cloneDeep(testTopics[op.toLowerCase()])
        _.set(message, integerField, 'string')
        try {
          await service[`process${op}`](message)
          throw new Error('should not throw error here')
        } catch (err) {
          assertValidationError(err, `"${_.last(integerField.split('.'))}" must be a number`)
        }
      })

      it(`test invalid parameters, invalid integer type field ${integerField}(wrong integer)`, async () => {
        const message = _.cloneDeep(testTopics[op.toLowerCase()])
        _.set(message, integerField, 1.1)
        try {
          await service[`process${op}`](message)
          throw new Error('should not throw error here')
        } catch (err) {
          assertValidationError(err, `"${_.last(integerField.split('.'))}" must be an integer`)
        }
      })
    }

    it('test invalid parameters, prizeSets array contain invalid prize entity', async () => {
      const message = _.cloneDeep(testTopics[op.toLowerCase()])
      message.payload.prizeSets.push({ type: 'Invalid', prizes: [{ type: 'first-place', value: 1000 }] })
      try {
        await service[`process${op}`](message)
        throw new Error('should not throw error here')
      } catch (err) {
        assertValidationError(err, '"type" must be one of [Challenge prizes, Check Point]')
      }
    })

    it('test invalid parameters, prize value should be positive', async () => {
      const message = _.cloneDeep(testTopics[op.toLowerCase()])
      message.payload.prizeSets.push({ type: 'Challenge prizes', prizes: [{ type: 'first-place', value: 0 }] })
      try {
        await service[`process${op}`](message)
        throw new Error('should not throw error here')
      } catch (err) {
        assertValidationError(err, '"value" must be a positive number')
      }
    })

    it('test invalid parameters, duration value should be positive', async () => {
      const message = _.cloneDeep(testTopics[op.toLowerCase()])
      message.payload.phases.push({ id: '607e8f90-1ed6-49a3-b5a2-486b761a3def', name: 'invalid', duration: 0 })
      try {
        await service[`process${op}`](message)
        throw new Error('should not throw error here')
      } catch (err) {
        assertValidationError(err, '"duration" must be a positive number')
      }
    })
  }
})
