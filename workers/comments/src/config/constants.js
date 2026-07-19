// ============================================================
// WretVision Comments — Configuration Constants
// ============================================================

export const COMMENT = {
  // Maximum characters allowed in a comment body
  MAX_BODY_LENGTH: 2000,
  // Minimum characters required (blocks "k", "lol", single-char spam)
  MIN_BODY_LENGTH: 10,
  // Maximum characters for a display name
  MAX_NAME_LENGTH: 32,
  MIN_NAME_LENGTH: 2,
};

export const PAGINATION = {
  // Default comments returned per page
  DEFAULT_LIMIT: 20,
  // Hard cap — never return more than this in one request
  MAX_LIMIT: 50,
};

export const RATE_LIMIT = {
  // Max new comments allowed per IP within the window
  POST_MAX:    3,
  POST_WINDOW: 60 * 10,   // 10 minutes in seconds

  // Max reports allowed per IP within the window
  REPORT_MAX:    5,
  REPORT_WINDOW: 60 * 60, // 1 hour in seconds
};

export const AUTO_HIDE = {
  // If a comment accumulates this many reports, auto-set status = 'rejected'
  REPORT_THRESHOLD: 5,
};

export const STATUS = {
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};
