/**
 * Enterprise Input Validation Utility
 * Client-side validation to prevent malicious input before API calls
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  numeric?: boolean;
  positiveNumber?: boolean;
  noSpecialChars?: boolean;
  sqlInjectionSafe?: boolean;
  xssSafe?: boolean;
}

export class InputValidator {
  static validate(value: any, rules: ValidationRules, fieldName: string = 'Field'): ValidationResult {
    const errors: string[] = [];

    if (rules.required && (!value || value.toString().trim() === '')) {
      errors.push(`${fieldName} is required`);
    }

    if (value && typeof value === 'string') {
      const strValue = value.trim();

      if (rules.minLength && strValue.length < rules.minLength) {
        errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
      }

      if (rules.maxLength && strValue.length > rules.maxLength) {
        errors.push(`${fieldName} must be no more than ${rules.maxLength} characters`);
      }

      if (rules.pattern && !rules.pattern.test(strValue)) {
        errors.push(`${fieldName} format is invalid`);
      }

      if (rules.email && !this.isValidEmail(strValue)) {
        errors.push(`${fieldName} must be a valid email address`);
      }

      if (rules.noSpecialChars && !this.isAlphanumericOnly(strValue)) {
        errors.push(`${fieldName} can only contain letters, numbers, and spaces`);
      }

      if (rules.sqlInjectionSafe && !this.isSQLSafe(strValue)) {
        errors.push(`${fieldName} contains invalid characters`);
      }

      if (rules.xssSafe && !this.isXSSSafe(strValue)) {
        errors.push(`${fieldName} contains potentially unsafe content`);
      }
    }

    if (rules.numeric && value !== null && value !== undefined) {
      if (isNaN(Number(value))) {
        errors.push(`${fieldName} must be a number`);
      } else if (rules.positiveNumber && Number(value) <= 0) {
        errors.push(`${fieldName} must be a positive number`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateObject(data: Record<string, any>, validationSchema: Record<string, ValidationRules>): ValidationResult {
    const allErrors: string[] = [];

    for (const [field, rules] of Object.entries(validationSchema)) {
      const result = this.validate(data[field], rules, this.formatFieldName(field));
      if (!result.isValid) {
        allErrors.push(...result.errors);
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isAlphanumericOnly(str: string): boolean {
    return /^[a-zA-Z0-9\s]+$/.test(str);
  }

  private static isSQLSafe(str: string): boolean {
    // Check for common SQL injection patterns
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
      /('|(\\x27)|(\\x2D\\x2D)|(\-\-)|(\\x3B)|(;))/i,
      /(<script|javascript:|vbscript:|onload=|onerror=)/i
    ];

    return !sqlPatterns.some(pattern => pattern.test(str));
  }

  private static isXSSSafe(str: string): boolean {
    // Check for common XSS patterns
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    return !xssPatterns.some(pattern => pattern.test(str));
  }

  private static formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  }
}

// Predefined validation schemas for common forms
export const ValidationSchemas = {
  maintenanceRequest: {
    title: { required: true, minLength: 5, maxLength: 200, sqlInjectionSafe: true, xssSafe: true },
    description: { maxLength: 1000, sqlInjectionSafe: true, xssSafe: true },
    asset_id: { numeric: true, positiveNumber: true },
    department_id: { numeric: true, positiveNumber: true },
    location: { maxLength: 100, sqlInjectionSafe: true, xssSafe: true }
  },

  user: {
    username: { required: true, minLength: 3, maxLength: 50, noSpecialChars: true },
    email: { required: true, email: true, maxLength: 100 },
    password: { required: true, minLength: 8, maxLength: 128 }
  },

  department: {
    name: { required: true, minLength: 2, maxLength: 100, sqlInjectionSafe: true, xssSafe: true },
    code: { required: true, minLength: 2, maxLength: 10, noSpecialChars: true }
  },

  asset: {
    name: { required: true, minLength: 2, maxLength: 100, sqlInjectionSafe: true, xssSafe: true },
    code: { required: true, minLength: 2, maxLength: 20, noSpecialChars: true },
    location: { maxLength: 100, sqlInjectionSafe: true, xssSafe: true }
  }
};