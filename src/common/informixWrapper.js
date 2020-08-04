const _ = require('lodash')
const config = require('config')
const Wrapper = require('informix-wrapper')
const settings = config.INFORMIX
const logger = require('./logger')

/**
 * Create informix connection
 * @param database the database.
 * @param isWrite the write sql flag.
 * @param reject the reject function.
 */
const createConnection = (database, isWrite, reject) => {
  // logger.debug(`Creating Informix Connection ${JSON.stringify(database)}`)
  // logger.debug(`Settings ${JSON.stringify(_.extend(settings, { database }))}`)
  const jdbc = new Wrapper(_.extend(settings, { database }), e => logger.debug)
  // logger.debug(`DB Connection Created ${JSON.stringify(jdbc)}`)
  jdbc.on('error', (err) => {
    if (isWrite) {
      jdbc.endTransaction(err, (error) => {
        jdbc.disconnect()
        reject(error)
      })
    } else {
      jdbc.disconnect()
      reject(err)
    }
  })
  // logger.debug('DB - before return/initialize')
  const init = jdbc.initialize()
  // logger.debug(`DB - after return/initialize ${JSON.stringify(init)}`)
  return init
}

/**
 * Extract informix tables information from database.
 * @param database the database.
 */
const extractInformixTablesInfoAsync = (database) => new Promise((resolve, reject) => {
  const connection = createConnection(database, false, reject)
  connection.connect((error) => {
    if (error) {
      connection.disconnect()
      reject(error)
    } else {
      connection._conn.getMetaData((ermd, md) => {
        if (ermd) {
          connection.disconnect()
          reject(ermd)
        } else {
          const infos = []
          const tablesMeta = md.getTablesSync(null, null, '%', ['TABLE'])
          while (true) {
            if (!tablesMeta.nextSync()) {
              break
            }
            const tableName = tablesMeta.getStringSync('TABLE_NAME')
            const columnsMeta = md.getColumnsSync(null, null, tableName, null)
            const columnNames = []
            const columnTypes = []
            while (true) {
              if (!columnsMeta.nextSync()) {
                break
              }
              columnNames.push(columnsMeta.getStringSync('COLUMN_NAME'))
              columnTypes.push(columnsMeta.getStringSync('TYPE_NAME'))
            }
            const pks = []
            const pksMeta = md.getPrimaryKeysSync(null, null, tableName)
            while (true) {
              if (!pksMeta.nextSync()) {
                break
              }
              pks.push(pksMeta.getStringSync('COLUMN_NAME'))
            }
            const uniques = []
            const uniquesMeta = md.getIndexInfoSync(null, null, tableName, true, false)
            while (true) {
              if (!uniquesMeta.nextSync()) {
                break
              }
              // The first valid column in the index is 1.
              if (uniquesMeta.getIntSync('ORDINAL_POSITION') >= 1 && !uniquesMeta.getBooleanSync('NON_UNIQUE')) {
                uniques.push({
                  columnName: uniquesMeta.getStringSync('COLUMN_NAME'),
                  indexName: uniquesMeta.getStringSync('INDEX_NAME')
                })
              }
            }
            infos.push({
              tableName,
              columnNames,
              columnTypes,
              uniques,
              pks
            })
          }
          connection.disconnect()
          resolve(infos)
        }
      })
    }
  })
})

/**
 * Execute query in informix database.
 * @param database the database.
 * @param sql the sql.
 * @param params the sql params.
 */
const executeQueryAsync = (database, sql, params) => new Promise((resolve, reject) => {
  // logger.debug(`Execute Query ${JSON.stringify(sql)} params: ${JSON.stringify(params)}`)
  let isWrite = false
  if (sql.trim().toLowerCase().indexOf('insert') === 0 ||
      sql.trim().toLowerCase().indexOf('update') === 0 ||
      sql.trim().toLowerCase().indexOf('delete') === 0 ||
      sql.trim().toLowerCase().indexOf('create') === 0) {
    isWrite = true
  }
  const connection = createConnection(database, isWrite, reject)
  connection.connect((error) => {
    if (error) {
      connection.disconnect()
      reject(error)
    } else {
      if (isWrite) {
        connection.beginTransaction(() => {
          connection.query(sql, (err, result) => {
            if (err) {
              reject(err)
            } else {
              resolve(result)
            }
          }, {
            start: (q) => {
              // logger.debug(`Start to execute ${q}`)
            },
            finish: (f) => {
              connection.endTransaction(null, () => {
                connection.disconnect()
                // logger.debug(`Finish executing ${f}`)
              })
            }
          }).execute(params)
        })
      } else {
        connection.query(sql, (err, result) => {
          if (err) {
            reject(err)
          } else {
            resolve(result)
          }
        }, {
          start: function (q) {
            // logger.debug(`Start to execute ${q}`)
          },
          finish: (f) => {
            connection.disconnect()
            // logger.debug(`Finish executing ${f}`)
          }
        }).execute(params)
      }
    }
  })
})

module.exports = {
  extractInformixTablesInfoAsync,
  executeQueryAsync
}
