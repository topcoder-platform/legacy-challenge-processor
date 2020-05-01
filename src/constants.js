/**
 * constants
 */

const prizeSetTypes = {
  ChallengePrizes: 'Challenge prizes',
  CheckPoint: 'Check Point'
}

const EVENT_ORIGINATOR = 'legacy-challenge-processor'

const EVENT_MIME_TYPE = 'application/json'

const createChallengeStatusesMap = {
  Active: 1,
  Draft: 2,
  New: 2
}

const challengeStatuses = {
  New: 'New',
  Draft: 'Draft',
  Canceled: 'Canceled',
  Active: 'Active',
  Completed: 'Completed'
}

module.exports = {
  prizeSetTypes,
  EVENT_ORIGINATOR,
  EVENT_MIME_TYPE,
  createChallengeStatusesMap,
  challengeStatuses
}
