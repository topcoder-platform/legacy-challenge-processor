const _ = require('lodash')

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

const challengeTypes = {
  TASK_TYPE_ID: 'e885273d-aeda-42c0-917d-bfbf979afbba',
  CHALLENGE_TYPE_ID: '94eee466-9255-4b60-88d8-4f59c1810dd0',
  FIRST_2_FINISH_TYPE_ID: '6950164f-3c5e-4bdc-abc8-22aaf5a1bd49'
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
    [challengeTypes.TASK_TYPE_ID]: challengeAbbreviations.FIRST_2_FINISH,
    [challengeTypes.CHALLENGE_TYPE_ID]: challengeAbbreviations.CODE,
    [challengeTypes.FIRST_2_FINISH_TYPE_ID]: challengeAbbreviations.FIRST_2_FINISH
  },
  [_.toLower(challengeTracks.DESIGN)]: {
    [challengeTypes.TASK_TYPE_ID]: challengeAbbreviations.DESIGN_FIRST_2_FINISH,
    [challengeTypes.CHALLENGE_TYPE_ID]: challengeAbbreviations.APPLICATION_FRONT_END_DESIGN,
    [challengeTypes.FIRST_2_FINISH_TYPE_ID]: challengeAbbreviations.DESIGN_FIRST_2_FINISH
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
  legacySubTrackMapping,
  challengeTypes
}
