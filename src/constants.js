const _ = require('lodash')
const config = require('config')

/**
 * constants
 */

const prizeSetTypes = {
  ChallengePrizes: 'placement',
  CopilotPayment: 'copilot',
  ReviewerPayment: 'reviewer',
  CheckPoint: 'checkpoint'
}

const EVENT_ORIGINATOR = 'legacy-challenge-processor'

const EVENT_MIME_TYPE = 'application/json'

const createChallengeStatusesMap = {
  Active: 1,
  Draft: 2,
  New: 2,
  Cancelled: 9,
  Completed: 7,
  Deleted: 3,
  CancelledFailedReview: 4,
  CancelledFailedScreening: 5,
  CancelledZeroSubmissions: 6,
  CancelledWinnerUnresponsive: 8,
  CancelledClientRequest: 9,
  CancelledRequirementsInfeasible: 10,
  CancelledZeroRegistrations: 11
}

const challengeStatuses = {
  New: 'New',
  Draft: 'Draft',
  Canceled: 'Canceled',
  Active: 'Active',
  Completed: 'Completed',
  Deleted: 'Deleted',
  CancelledFailedReview: 'Cancelled - Failed Review',
  CancelledFailedScreening: 'Cancelled - Failed Screening',
  CancelledZeroSubmissions: 'Cancelled - Zero Submissions',
  CancelledWinnerUnresponsive: 'Cancelled - Winner Unresponsive',
  CancelledClientRequest: 'Cancelled - Client Request',
  CancelledRequirementsInfeasible: 'Cancelled - Requirements Infeasible',
  CancelledZeroRegistrations: 'Cancelled - Zero Registrations'
}

const challengeTracks = {
  DEVELOP: 'DEVELOP',
  DESIGN: 'DESIGN',
  DATA_SCIENCE: 'DATA_SCIENCE',
  QA: 'QA'
}

const challengeAbbreviations = {
  TASK: 'TASK',
  FIRST_2_FINISH: 'FIRST_2_FINISH',
  DESIGN_FIRST_2_FINISH: 'DESIGN_FIRST_2_FINISH',
  CODE: 'CODE',
  APPLICATION_FRONT_END_DESIGN: 'APPLICATION_FRONT_END_DESIGN'
}

const legacySubTrackMapping = {
  [_.toLower(challengeTracks.DEVELOP)]: {
    [config.TASK_TYPE_IDS.DEVELOP]: challengeAbbreviations.FIRST_2_FINISH,
    [config.CHALLENGE_TYPE_ID]: challengeAbbreviations.CODE,
    [config.FIRST_2_FINISH_TYPE_ID]: challengeAbbreviations.FIRST_2_FINISH
  },
  [_.toLower(challengeTracks.DESIGN)]: {
    [config.TASK_TYPE_IDS.DESIGN]: challengeAbbreviations.DESIGN_FIRST_2_FINISH,
    [config.CHALLENGE_TYPE_ID]: challengeAbbreviations.APPLICATION_FRONT_END_DESIGN,
    [config.FIRST_2_FINISH_TYPE_ID]: challengeAbbreviations.DESIGN_FIRST_2_FINISH
  },
  [_.toLower(challengeTracks.QA)]: {
    [config.TASK_TYPE_IDS.QA]: challengeAbbreviations.FIRST_2_FINISH
  },
  [_.toLower(challengeTracks.DATA_SCIENCE)]: {
    [config.TASK_TYPE_IDS.DATA_SCIENCE]: challengeAbbreviations.FIRST_2_FINISH
  }
}

module.exports = {
  prizeSetTypes,
  EVENT_ORIGINATOR,
  EVENT_MIME_TYPE,
  createChallengeStatusesMap,
  challengeStatuses,
  challengeAbbreviations,
  challengeTracks,
  legacySubTrackMapping
}
