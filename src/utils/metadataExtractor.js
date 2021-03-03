/**
 * Metadata extractor
 */
const _ = require('lodash')

/**
 * Get metadata entry by key
 * @param {Array} metadata the metadata array
 * @param {String} key the metadata key
 */
const getMeta = (metadata = [], key) => _.find(metadata, meta => meta.name === key)

/**
 * Convert string to bool
 * @param {String} v the value
 */
const toBool = v => _.toString(v).toLowerCase() === 'true'

/**
 * Extract billing project
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractBillingProject (challenge, defaultValue) {
  return _.get(challenge, 'billingAccountId', _.get(challenge, 'billing.billingAccountId', defaultValue))
}

/**
 * Extract submission limit
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractSubmissionLimit (challenge, defaultValue) {
  const entry = getMeta(challenge.metadata, 'submissionLimit')
  if (!entry) return defaultValue
  try {
    const parsedEntryValue = JSON.parse(entry.value)
    if (parsedEntryValue.limit) {
      entry.value = parsedEntryValue.count
    } else {
      entry.value = null
    }
  } catch (e) {
    entry.value = null
  }
  return entry.value || defaultValue
}

/**
 * Extract spec review cost
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractSpecReviewCost (challenge, defaultValue) {
  return _.get(_.find(_.get(challenge, 'prizeSets', []), p => p.type === 'specReviewer') || {}, 'prizes[0].value', defaultValue)
}

/**
 * Extract DR points
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractDrPoints (challenge, defaultValue) {
  const entry = getMeta(challenge.metadata, 'drPoints')
  if (!entry) return defaultValue
  return entry.value || defaultValue
}

/**
 * Extract Approval required
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractApprovalRequired (challenge, defaultValue) {
  const entry = getMeta(challenge.metadata, 'approvalRequired')
  if (!entry) return defaultValue
  return toBool(entry.value)
}

/**
 * Extract Post-mortem required
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractPostMortemRequired (challenge, defaultValue) {
  const entry = getMeta(challenge.metadata, 'postMortemRequired')
  if (!entry) return defaultValue
  return toBool(entry.value)
}

/**
 * Extract track late deliverables required
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractTrackLateDeliverablesRequired (challenge, defaultValue) {
  const entry = getMeta(challenge.metadata, 'trackLateDeliverables')
  if (!entry) return defaultValue
  return toBool(entry.value)
}

/**
 * Extract allow stock art required
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractAllowStockArtRequired (challenge, defaultValue) {
  const entry = getMeta(challenge.metadata, 'allowStockArt')
  if (!entry) return defaultValue
  return toBool(entry.value)
}

/**
 * Extract submission viewable
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractSubmissionViewable (challenge, defaultValue) {
  const entry = getMeta(challenge.metadata, 'submissionViewable')
  if (!entry) return defaultValue
  return toBool(entry.value)
}

/**
 * Extract review feedback
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractReviewFeedback (challenge, defaultValue) {
  const entry = getMeta(challenge.metadata, 'reviewFeedback')
  if (!entry) return defaultValue
  return toBool(entry.value)
}

/**
 * Extract environment
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractEnvironment (challenge, defaultValue) {
  const entry = getMeta(challenge.metadata, 'environment')
  if (!entry) return defaultValue
  return entry.value
}

/**
 * Extract code repo
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractCodeRepo (challenge, defaultValue) {
  const entry = getMeta(challenge.metadata, 'codeRepo')
  if (!entry) return defaultValue
  return entry.value
}

/**
 * Extract estimate effort hours
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractEstimateEffortHours (challenge, defaultValue) {
  const entry = getMeta(challenge.metadata, 'effortHoursEstimate')
  if (!entry) return defaultValue
  return _.toNumber(entry.value)
}

/**
 * Extract estimate effort days offshore
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractEstimateEffortOffshore (challenge, defaultValue) {
  const entry = getMeta(challenge.metadata, 'effortHoursOffshore')
  if (!entry) return defaultValue
  return _.toNumber(entry.value)
}

/**
 * Extract estimate effort days Onsite
 * @param {Object} challenge the challenge object
 * @param {Any} defaultValue the default value
 */
function extractEstimateEffortOnsite (challenge, defaultValue) {
  const entry = getMeta(challenge.metadata, 'effortHoursOnshore')
  if (!entry) return defaultValue
  return _.toNumber(entry.value)
}

module.exports = {
  extractBillingProject,
  extractSubmissionLimit,
  extractSpecReviewCost,
  extractDrPoints,
  extractApprovalRequired,
  extractPostMortemRequired,
  extractTrackLateDeliverablesRequired,
  extractAllowStockArtRequired,
  extractSubmissionViewable,
  extractReviewFeedback,
  extractEnvironment,
  extractCodeRepo,
  extractEstimateEffortHours,
  extractEstimateEffortOffshore,
  extractEstimateEffortOnsite
}
