// ============================================================
// WretVision Comments — Configuration Constants
// ============================================================

export const COMMENT = {
  MAX_BODY_LENGTH: 2000,
  MIN_BODY_LENGTH: 10,
  MAX_NAME_LENGTH: 32,
  MIN_NAME_LENGTH: 2,
};

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT:     50,
};

export const RATE_LIMIT = {
  // Max new comments per IP (or fingerprint) within the window
  POST_MAX:    3,
  POST_WINDOW: 60 * 10,   // 10 minutes in seconds

  // Max reports per IP (or fingerprint) within the window
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

// Moderator actions recorded in mod_audit_log.
// This list is the authority — the DB CHECK constraint mirrors it.
export const MOD_ACTIONS = {
  APPROVE:        'approve',
  REJECT:         'reject',
  HIDE:           'hide',
  RESTORE:        'restore',
  DELETE:         'delete',
  PIN:            'pin',
  UNPIN:          'unpin',
  LOCK:           'lock',
  UNLOCK:         'unlock',
  SPOILER:        'spoiler',
  UNSPOILER:      'unspoiler',
  SHADOW_HIDE:    'shadow_hide',
  SHADOW_RESTORE: 'shadow_restore',
  BAN:            'ban',
  UNBAN:          'unban',
  AUTO_REJECT:    'auto_reject',
};
