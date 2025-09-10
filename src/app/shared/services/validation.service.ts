import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  constructor() { }

  /**
   * Password validator that checks for:
   * - At least 8 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one digit
   * - At least one special character
   */
  passwordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const value = control.value as string;
      
      // Check minimum length
      if (value.length < 8) {
        return { invalidPassword: true };
      }

      // Check for uppercase letter
      if (!/[A-Z]/.test(value)) {
        return { invalidPassword: true };
      }

      // Check for lowercase letter
      if (!/[a-z]/.test(value)) {
        return { invalidPassword: true };
      }

      // Check for digit
      if (!/\d/.test(value)) {
        return { invalidPassword: true };
      }

      // Check for special character
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(value)) {
        return { invalidPassword: true };
      }

      return null;
    };
  }

  /**
   * URL validator that checks for valid URL format
   */
  urlValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const value = control.value as string;
      
      try {
        new URL(value);
        return null;
      } catch {
        return { invalidUrl: true };
      }
    };
  }

  /**
   * Phone number validator that checks for valid phone format
   */
  phoneValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const value = control.value as string;
      
      // Basic phone number pattern (supports various international formats)
      const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
      
      // Remove common phone number separators for validation
      const cleanValue = value.replace(/[\s\-\(\)\.]/g, '');
      
      if (!phonePattern.test(cleanValue)) {
        return { invalidPhone: true };
      }

      return null;
    };
  }

  /**
   * Alphanumeric validator
   */
  alphanumericValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const value = control.value as string;
      const pattern = /^[a-zA-Z0-9]+$/;
      
      if (!pattern.test(value)) {
        return { invalidAlphanumeric: true };
      }

      return null;
    };
  }

  /**
   * Numeric validator
   */
  numericValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const value = control.value as string;
      
      if (isNaN(Number(value))) {
        return { invalidNumeric: true };
      }

      return null;
    };
  }

  /**
   * Decimal validator with specified precision
   */
  decimalValidator(precision: number = 2): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const value = control.value as string;
      const pattern = new RegExp(`^\\d+(\\.\\d{1,${precision}})?$`);
      
      if (!pattern.test(value)) {
        return { invalidDecimal: true };
      }

      return null;
    };
  }

  /**
   * Date validator that checks if date is in the past
   */
  pastDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const inputDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (inputDate >= today) {
        return { invalidPastDate: true };
      }

      return null;
    };
  }

  /**
   * Date validator that checks if date is in the future
   */
  futureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const inputDate = new Date(control.value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (inputDate <= today) {
        return { invalidFutureDate: true };
      }

      return null;
    };
  }

  /**
   * Date range validator that checks if end date is after start date
   */
  dateRangeValidator(startDateControlName: string, endDateControlName: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const startDate = formGroup.get(startDateControlName)?.value;
      const endDate = formGroup.get(endDateControlName)?.value;

      if (!startDate || !endDate) {
        return null;
      }

      if (new Date(endDate) <= new Date(startDate)) {
        return { invalidDateRange: true };
      }

      return null;
    };
  }

  /**
   * Whitespace validator that checks for non-empty strings after trimming
   */
  noWhitespaceValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const value = control.value as string;
      
      if (value.trim().length === 0) {
        return { whitespace: true };
      }

      return null;
    };
  }

  /**
   * Custom pattern validator with error message
   */
  patternValidator(pattern: RegExp, errorName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const value = control.value as string;
      
      if (!pattern.test(value)) {
        const error: ValidationErrors = {};
        error[errorName] = true;
        return error;
      }

      return null;
    };
  }

  /**
   * File extension validator
   */
  fileExtensionValidator(allowedExtensions: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const fileName = control.value as string;
      const extension = fileName.split('.').pop()?.toLowerCase();
      
      if (!extension || !allowedExtensions.includes(extension)) {
        return { invalidFileExtension: true };
      }

      return null;
    };
  }

  /**
   * File size validator (size in bytes)
   */
  fileSizeValidator(maxSize: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const file = control.value as File;
      
      if (file.size > maxSize) {
        return { invalidFileSize: true };
      }

      return null;
    };
  }

  /**
   * Minimum age validator
   */
  minAgeValidator(minAge: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const birthDate = new Date(control.value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        const actualAge = age - 1;
        if (actualAge < minAge) {
          return { minAge: { requiredAge: minAge, actualAge } };
        }
      } else if (age < minAge) {
        return { minAge: { requiredAge: minAge, actualAge: age } };
      }

      return null;
    };
  }

  /**
   * Get user-friendly error message for validation errors
   */
  getErrorMessage(fieldName: string, errors: ValidationErrors): string {
    const fieldDisplayName = this.getFieldDisplayName(fieldName);

    if (errors['required']) {
      return `${fieldDisplayName} is required`;
    }
    if (errors['email']) {
      return 'Please enter a valid email address';
    }
    if (errors['minlength']) {
      return `${fieldDisplayName} must be at least ${errors['minlength'].requiredLength} characters`;
    }
    if (errors['maxlength']) {
      return `${fieldDisplayName} must not exceed ${errors['maxlength'].requiredLength} characters`;
    }
    if (errors['min']) {
      return `${fieldDisplayName} must be at least ${errors['min'].min}`;
    }
    if (errors['max']) {
      return `${fieldDisplayName} must not exceed ${errors['max'].max}`;
    }
    if (errors['pattern']) {
      return `${fieldDisplayName} format is invalid`;
    }
    if (errors['invalidPassword']) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }
    if (errors['invalidUrl']) {
      return 'Please enter a valid URL';
    }
    if (errors['invalidPhone']) {
      return 'Please enter a valid phone number';
    }
    if (errors['invalidAlphanumeric']) {
      return `${fieldDisplayName} must contain only letters and numbers`;
    }
    if (errors['invalidNumeric']) {
      return `${fieldDisplayName} must be a valid number`;
    }
    if (errors['invalidDecimal']) {
      return `${fieldDisplayName} must be a valid decimal number`;
    }
    if (errors['invalidPastDate']) {
      return `${fieldDisplayName} must be a past date`;
    }
    if (errors['invalidFutureDate']) {
      return `${fieldDisplayName} must be a future date`;
    }
    if (errors['invalidDateRange']) {
      return 'End date must be after start date';
    }
    if (errors['whitespace']) {
      return `${fieldDisplayName} cannot be empty or contain only whitespace`;
    }
    if (errors['invalidFileExtension']) {
      return 'Invalid file type';
    }
    if (errors['invalidFileSize']) {
      return 'File size is too large';
    }
    if (errors['minAge']) {
      return `Minimum age required is ${errors['minAge'].requiredAge}`;
    }

    return `${fieldDisplayName} is invalid`;
  }

  /**
   * Convert field name to display name
   */
  private getFieldDisplayName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}
