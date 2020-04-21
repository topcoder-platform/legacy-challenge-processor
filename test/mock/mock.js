/**
 * The mock challenge API.
 */

const config = require('config')
const http = require('http')
const send = require('http-json-response')
const logger = require('../../src/common/logger')
const response = require('./response')

const mockApi = http.createServer((req, res) => {
  logger.debug(`${req.method} ${req.url}`)
  if (req.method === 'GET' && req.url.match(/^\/v5\/challenge-types\/.+$/)) {
    const list = req.url.split('/')
    const typeId = list[3]
    if (typeId === '1f4ef3a8-ed35-40d1-b8a6-7371a700d098') {
      return send(res, 404, { message: `Challenge type with id: ${typeId} doesn't exist.` })
    } else {
      const name = typeId === '2f4ef3a8-ed35-40d1-b8a6-7371a700d098' ? 'DEVELOP' : 'DESIGN'
      return send(res, 200, { name })
    }
  } else if (req.method === 'PATCH' && req.url.match(/^\/v5\/challenges\/.+$/)) {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString() // convert Buffer to string
    })
    req.on('end', () => {
      logger.debug(body)
      res.end()
    })
  } else if (req.method === 'POST' && req.url.match(/^\/v4\/challenges$/)) {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString() // convert Buffer to string
    })
    req.on('end', () => {
      logger.info('Create challenge entity in legacy system, the legacy id is 30055016')
      logger.debug(body)
      return send(res, 200, response.challenge)
    })
  } else if (req.method === 'PUT' && req.url.match(/^\/v4\/challenges\/.+$/)) {
    const list = req.url.split('/')
    const challengeId = list[3]
    if (challengeId === '30055016') {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString() // convert Buffer to string
      })
      req.on('end', () => {
        logger.debug(body)
        send(res, 200, response.challenge)
      })
    } else {
      return send(res, 404, { result: { status: 404, content: `No challenge can be found by the challenge id ${challengeId}` } })
    }
  } else if (req.method === 'GET' && req.url.match(/^\/v4\/challenges\/.+$/)) {
    const list = req.url.split('/')
    const challengeId = list[3]
    if (challengeId === '30055016') {
      return send(res, 200, response.challenge)
    } else {
      return send(res, 404, { result: { status: 404, content: `No challenge can be found by the challenge id ${challengeId}` } })
    }
  } else if (req.method === 'GET' && req.url.match(/^\/v4\/technologies$/)) { // Technologies response
    return send(res, 200, response.technologies)
  } else if (req.method === 'GET' && req.url.match(/^\/v4\/platforms$/)) { // Platforms response
    return send(res, 200, response.platforms)
  } else {
    // 404 for other routes
    res.statusCode = 404
    res.end('Not Found')
  }
})

if (!module.parent) {
  const port = config.MOCK_API_PORT
  mockApi.listen(port)
  console.log(`mock api is listen port ${port}`)
}

module.exports = {
  mockApi
}
