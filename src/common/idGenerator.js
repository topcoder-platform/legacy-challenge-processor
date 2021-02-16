/**
 * The ID generator service
 */
const util = require('util')
const Mutex = require('async-mutex').Mutex
const logger = require('./logger')
const helper = require('./helper')

/**
 * Main class of IDGenerator
 */
class IDGenerator {
  /**
   * Constructor
   * @param {Informix} db database
   * @param {String} seqName sequence name
   */
  constructor (seqName) {
    this.seqName = seqName
    this._availableId = 0
    this.mutex = new Mutex()
  }

  /**
   * Get next id
   * @returns {Number} next id
   */
  async getNextId () {
    const release = await this.mutex.acquire()
    try {
      logger.debug('Getting nextId')
      --this._availableId
      logger.debug(`this._availableId = ${this._availableId}`)

      if (this._availableId <= 0) {
        const connection = await helper.getInformixConnection()
        try {
          // begin transaction
          await connection.beginTransactionAsync()

          const [nextId, availableId] = await this.getNextBlock(connection)
          await this.updateNextBlock(connection, nextId + availableId + 1)

          // commit the transaction
          await connection.commitTransactionAsync()

          // Only set to this's properties after successful commit
          this._nextId = nextId
          this._availableId = availableId
        } catch (e) {
          await connection.rollbackTransactionAsync()
          throw e
        } finally {
          await connection.closeAsync()
        }
      }

      logger.debug(`this._availableId = ${this._availableId}`)
      return ++this._nextId
    } finally {
      release()
    }
  }

  /**
   * Fetch next block from id_sequence
   * @param {Object} connection the Informix connection
   * @returns {Array} [nextId, availableId]
   * @private
   */
  async getNextBlock (connection) {
    try {
      const result = await connection.queryAsync(`select next_block_start, block_size from id_sequences where name = '${this.seqName}'`)
      if (result.length > 0) {
        return [Number(result[0].next_block_start) - 1, Number(result[0].block_size)]
      } else {
        throw new Error(`null or empty result for ${this.seqName}`)
      }
    } catch (e) {
      logger.error(util.inspect(e))
      throw e
    }
  }

  /**
   * Update id_sequence
   * @param {Object} connection the Informix connection
   * @param {Number} nextStart next start id
   * @private
   */
  async updateNextBlock (connection, nextStart) {
    try {
      await connection.queryAsync(`update id_sequences set next_block_start = ${nextStart} where name = '${this.seqName}'`)
    } catch (e) {
      logger.error('Failed to update id sequence: ' + this.seqName)
      logger.error(util.inspect(e))
      throw e
    }
  }
}

module.exports = IDGenerator
