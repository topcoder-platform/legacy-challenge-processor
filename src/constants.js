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

const PhaseStatusTypes = {
  Scheduled: 1,
  Open: 2,
  Closed: 3
}

const prizeTypesIds = {
  Contest: 15,
  Checkpoint: 14
}

const supportedMetadata = {
  allowStockArt: 52,
  drPoints: 30,
  submissionViewable: 53,
  submissionLimit: 51,
  codeRepo: 85,
  environment: 84
}

module.exports = {
  prizeSetTypes,
  EVENT_ORIGINATOR,
  EVENT_MIME_TYPE,
  createChallengeStatusesMap,
  challengeStatuses,
  PhaseStatusTypes,
  prizeTypesIds,
  supportedMetadata
}
