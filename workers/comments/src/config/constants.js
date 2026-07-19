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
  POST_MAX:      3,
  POST_WINDOW:   60 * 10,   // 10 minutes in seconds
  REPORT_MAX:    5,
  REPORT_WINDOW: 60 * 60,   // 1 hour in seconds
};

export const AUTO_HIDE = {
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
  ADD_NOTE:       'add_note',
  EDIT_NOTE:      'edit_note',
  DELETE_NOTE:    'delete_note',
};

// Mod note categories. Mirrors DB CHECK constraint on mod_notes.category.
export const NOTE_CATEGORIES = ['spam', 'spoilers', 'abuse', 'general'];

// Mod note body length limits.
export const MOD_NOTE = {
  MIN_BODY_LENGTH: 5,
  MAX_BODY_LENGTH: 1000,
};
