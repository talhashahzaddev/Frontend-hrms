import { Injectable } from '@angular/core';

/**
 * Date Utility Service
 * Provides consistent date formatting methods to ensure compatibility with .NET DateTime parsing
 */
@Injectable({
  providedIn: 'root'
})
export class DateUtilsService {

  /**
   * Formats a Date object to YYYY-MM-DD string for API requests
   * This format is compatible with .NET DateTime parameter binding
   * @param date - JavaScript Date object
   * @returns Formatted date string (YYYY-MM-DD) or null if invalid
   */
  formatDateForAPI(date: Date | null | undefined): string | null {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('⚠️ Invalid date provided to formatDateForAPI:', date);
      return null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const formatted = `${year}-${month}-${day}`;
    console.log('📅 Formatted date:', { input: date, output: formatted });
    
    return formatted;
  }

  /**
   * Formats a Date object to YYYY-MM-DD HH:mm:ss for detailed timestamps
   * @param date - JavaScript Date object
   * @returns Formatted datetime string or null if invalid
   */
  formatDateTimeForAPI(date: Date | null | undefined): string | null {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('⚠️ Invalid date provided to formatDateTimeForAPI:', date);
      return null;
    }

    const datePart = this.formatDateForAPI(date);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${datePart} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Gets the first day of a given month and year
   * @param month - Month (1-12)
   * @param year - Full year (e.g., 2026)
   * @returns First day of the month in YYYY-MM-DD format
   */
  getFirstDayOfMonth(month: number, year: number): string {
    const date = new Date(year, month - 1, 1);
    return this.formatDateForAPI(date)!;
  }

  /**
   * Gets the last day of a given month and year
   * @param month - Month (1-12)
   * @param year - Full year (e.g., 2026)
   * @returns Last day of the month in YYYY-MM-DD format
   */
  getLastDayOfMonth(month: number, year: number): string {
    const date = new Date(year, month, 0); // Day 0 of next month = last day of current month
    return this.formatDateForAPI(date)!;
  }

  /**
   * Gets the first day of the current month
   * @returns First day of current month in YYYY-MM-DD format
   */
  getCurrentMonthStart(): string {
    const now = new Date();
    return this.getFirstDayOfMonth(now.getMonth() + 1, now.getFullYear());
  }

  /**
   * Gets the last day of the current month
   * @returns Last day of current month in YYYY-MM-DD format
   */
  getCurrentMonthEnd(): string {
    const now = new Date();
    return this.getLastDayOfMonth(now.getMonth() + 1, now.getFullYear());
  }

  /**
   * Validates if a string is in YYYY-MM-DD format
   * @param dateString - Date string to validate
   * @returns True if valid format, false otherwise
   */
  isValidAPIDateFormat(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Parses a .NET DateTime string to JavaScript Date
   * @param dotNetDate - Date string from .NET API
   * @returns JavaScript Date object
   */
  parseDotNetDate(dotNetDate: string): Date | null {
    if (!dotNetDate) return null;
    
    const date = new Date(dotNetDate);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Gets month name from month number
   * @param month - Month number (1-12)
   * @returns Full month name (e.g., "January")
   */
  getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
  }
}
