// Input Validation and Sanitization Middleware
const Logger = require('../utils/logger');
const logger = new Logger('Validator');

/**
 * Common SQL injection patterns to detect
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(OR|AND)\b\s*\d+\s*=\s*\d+)/i, // OR 1=1, AND 1=1
  /(\b(OR|AND)\b\s*'[^']*'\s*=\s*'[^']*')/i, // OR 'a'='a'
  /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i, // SQL keywords
  /(--|\||;|\/\*|\*\/|@@|@|char|nchar|varchar|nvarchar|alter|begin|cast|create|cursor|declare|delete|drop|end|exec|execute|fetch|insert|kill|select|sys|sysobjects|syscolumns|table|update)/i,
  /(<script|javascript:|onerror|onload|eval\(|alert\()/i, // XSS patterns
];

/**
 * Check if value contains SQL injection patterns
 */
function containsSQLInjection(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Validation rules for different input types
 */
const validationRules = {
  // Numeric validations
  teamId: {
    type: 'number',
    min: 1,
    max: 999999,
    required: true,
    preValidate: value => {
      // Check for SQL injection before sanitization
      if (containsSQLInjection(String(value))) {
        return { valid: false, error: 'Invalid input detected' };
      }
      return { valid: true };
    },
    sanitize: value => parseInt(value, 10),
    validate: value => !isNaN(value) && value > 0,
    errorMessage: 'Team ID must be a positive number',
  },

  leagueId: {
    type: 'number',
    min: 1,
    max: 999999,
    required: true,
    preValidate: value => {
      if (containsSQLInjection(String(value))) {
        return { valid: false, error: 'Invalid input detected' };
      }
      return { valid: true };
    },
    sanitize: value => parseInt(value, 10),
    validate: value => !isNaN(value) && value > 0,
    errorMessage: 'League ID must be a positive number',
  },

  seasonId: {
    type: 'number',
    min: 1,
    max: 999999,
    required: false,
    preValidate: value => {
      if (value && containsSQLInjection(String(value))) {
        return { valid: false, error: 'Invalid input detected' };
      }
      return { valid: true };
    },
    sanitize: value => parseInt(value, 10),
    validate: value => !value || (!isNaN(value) && value > 0),
    errorMessage: 'Season ID must be a positive number',
  },

  // Date validations
  date: {
    type: 'string',
    required: true,
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    sanitize: value => value.trim(),
    validate: value => {
      if (!value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return false;
      }
      const date = new Date(value);
      return date instanceof Date && !isNaN(date);
    },
    errorMessage: 'Date must be in YYYY-MM-DD format',
  },

  // String validations
  status: {
    type: 'string',
    required: false,
    enum: ['scheduled', 'in_play', 'finished', 'postponed', 'cancelled'],
    sanitize: value => value?.toLowerCase().trim(),
    validate: value =>
      !value || ['scheduled', 'in_play', 'finished', 'postponed', 'cancelled'].includes(value),
    errorMessage: 'Invalid status value',
  },

  timezone: {
    type: 'string',
    required: false,
    maxLength: 50,
    pattern: /^[A-Za-z_\/]+$/,
    sanitize: value => value?.trim(),
    validate: value => !value || (value.length <= 50 && /^[A-Za-z_\/]+$/.test(value)),
    errorMessage: 'Invalid timezone format',
  },

  // Pagination
  page: {
    type: 'number',
    min: 1,
    max: 1000,
    default: 1,
    sanitize: value => parseInt(value, 10) || 1,
    validate: value => !isNaN(value) && value > 0 && value <= 1000,
    errorMessage: 'Page must be between 1 and 1000',
  },

  limit: {
    type: 'number',
    min: 1,
    max: 100,
    default: 20,
    sanitize: value => parseInt(value, 10) || 20,
    validate: value => !isNaN(value) && value > 0 && value <= 100,
    errorMessage: 'Limit must be between 1 and 100',
  },
};

/**
 * Sanitize input value
 */
function sanitizeValue(value, rule) {
  if (rule.sanitize) {
    return rule.sanitize(value);
  }

  switch (rule.type) {
    case 'number':
      return parseInt(value, 10);
    case 'string':
      return String(value).trim();
    default:
      return value;
  }
}

/**
 * Validate single field
 */
function validateField(fieldName, value, rule) {
  // Check required
  if (rule.required && (value === undefined || value === null || value === '')) {
    return {
      valid: false,
      error: `${fieldName} is required`,
    };
  }

  // Skip validation if not required and empty
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return { valid: true };
  }

  // Apply custom validation
  if (rule.validate && !rule.validate(value)) {
    return {
      valid: false,
      error: rule.errorMessage || `Invalid ${fieldName}`,
    };
  }

  // Check enum
  if (rule.enum && !rule.enum.includes(value)) {
    return {
      valid: false,
      error: `${fieldName} must be one of: ${rule.enum.join(', ')}`,
    };
  }

  // Check pattern
  if (rule.pattern && !rule.pattern.test(value)) {
    return {
      valid: false,
      error: rule.errorMessage || `Invalid ${fieldName} format`,
    };
  }

  // Check min/max for numbers
  if (rule.type === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      return {
        valid: false,
        error: `${fieldName} must be at least ${rule.min}`,
      };
    }
    if (rule.max !== undefined && value > rule.max) {
      return {
        valid: false,
        error: `${fieldName} must be at most ${rule.max}`,
      };
    }
  }

  // Check length for strings
  if (rule.type === 'string') {
    if (rule.minLength && value.length < rule.minLength) {
      return {
        valid: false,
        error: `${fieldName} must be at least ${rule.minLength} characters`,
      };
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      return {
        valid: false,
        error: `${fieldName} must be at most ${rule.maxLength} characters`,
      };
    }
  }

  return { valid: true };
}

/**
 * Create validation middleware
 */
function createValidator(rules) {
  return (req, res, next) => {
    const errors = [];
    const sanitized = {};

    // Validate each field
    for (const [fieldName, rule] of Object.entries(rules)) {
      // Get value from params, query, or body
      let value = req.params[fieldName] || req.query[fieldName] || req.body[fieldName];

      // Apply default if not provided
      if (value === undefined && rule.default !== undefined) {
        value = rule.default;
      }

      // Pre-validation check (before sanitization)
      if (rule.preValidate && value !== undefined) {
        const preValidation = rule.preValidate(value);
        if (!preValidation.valid) {
          errors.push({
            field: fieldName,
            message: preValidation.error || `Invalid ${fieldName}`,
          });
          continue; // Skip sanitization and further validation
        }
      }

      // Sanitize value
      if (value !== undefined) {
        value = sanitizeValue(value, rule);
        sanitized[fieldName] = value;
      }

      // Validate
      const validation = validateField(fieldName, value, rule);
      if (!validation.valid) {
        errors.push({
          field: fieldName,
          message: validation.error,
        });
      }
    }

    // If errors, return 400
    if (errors.length > 0) {
      logger.warn('Validation failed', {
        path: req.path,
        errors,
        ip: req.ip,
      });

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
        },
      });
    }

    // Attach sanitized values to request
    req.validated = sanitized;

    // Merge sanitized values back to params/query
    Object.keys(sanitized).forEach(key => {
      if (req.params[key] !== undefined) {
        req.params[key] = sanitized[key];
      } else if (req.query[key] !== undefined) {
        req.query[key] = sanitized[key];
      } else if (req.body && req.body[key] !== undefined) {
        req.body[key] = sanitized[key];
      }
    });

    next();
  };
}

/**
 * Pre-built validators for common endpoints
 */
const validators = {
  teamData: createValidator({
    teamId: validationRules.teamId,
  }),

  leagueTeams: createValidator({
    leagueId: validationRules.leagueId,
    seasonId: validationRules.seasonId,
  }),

  matchesByDate: createValidator({
    date: validationRules.date,
    timezone: validationRules.timezone,
  }),

  matchesRange: createValidator({
    from: validationRules.date,
    to: validationRules.date,
  }),

  leagueMatches: createValidator({
    leagueId: validationRules.leagueId,
    status: validationRules.status,
    page: validationRules.page,
    limit: validationRules.limit,
  }),

  pagination: createValidator({
    page: validationRules.page,
    limit: validationRules.limit,
  }),
};

module.exports = {
  createValidator,
  validators,
  validationRules,
};
