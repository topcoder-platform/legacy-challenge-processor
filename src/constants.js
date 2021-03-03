/**
 * constants
 */
const metadataExtractor = require('./utils/metadataExtractor')

const prizeSetTypes = {
  ChallengePrizes: 'placement',
  CopilotPayment: 'copilot',
  ReviewerPayment: 'reviewer',
  CheckPoint: 'checkpoint',
  SpecReview: 'specReviewer'
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
  32: {
    method: metadataExtractor.extractBillingProject,
    defaultValue: null,
    description: 'Billing Project'
  },
  30: {
    method: metadataExtractor.extractDrPoints,
    defaultValue: 0,
    description: 'DR points'
  },
  35: {
    method: metadataExtractor.extractSpecReviewCost,
    defaultValue: null,
    description: 'Spec review cost'
  },
  41: {
    method: metadataExtractor.extractApprovalRequired,
    defaultValue: true,
    description: 'Approval Required'
  },
  44: {
    method: metadataExtractor.extractPostMortemRequired,
    defaultValue: true,
    description: 'Post-Mortem Required'
  },
  48: {
    method: metadataExtractor.extractTrackLateDeliverablesRequired,
    defaultValue: true,
    description: 'Track Late Deliverables'
  },
  51: {
    method: metadataExtractor.extractSubmissionLimit,
    defaultValue: null,
    description: 'Maximum submissions'
  },
  52: {
    method: metadataExtractor.extractAllowStockArtRequired,
    defaultValue: false,
    description: 'Allow Stock Art'
  },
  53: {
    method: metadataExtractor.extractSubmissionViewable,
    defaultValue: false,
    description: 'Viewable Submissions Flag'
  },
  59: {
    method: metadataExtractor.extractReviewFeedback,
    defaultValue: true,
    description: 'Review Feedback Flag'
  },
  84: {
    method: metadataExtractor.extractEnvironment,
    defaultValue: null,
    description: 'Environment'
  },
  85: {
    method: metadataExtractor.extractCodeRepo,
    defaultValue: null,
    description: 'Code repo'
  },
  88: {
    method: metadataExtractor.extractEstimateEffortHours,
    defaultValue: 0,
    description: 'Effort Hours Estimate'
  },
  89: {
    method: metadataExtractor.extractEstimateEffortOffshore,
    defaultValue: 0,
    description: 'Estimate Effort Days offshore'
  },
  90: {
    method: metadataExtractor.extractEstimateEffortOnsite,
    defaultValue: 0,
    description: 'Estimate Effort Days Onsite'
  }
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
