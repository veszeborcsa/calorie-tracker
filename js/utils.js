/**
 * Utils Module - Utility Functions Library
 * 
 * This module provides helper functions used throughout the application
 * for common tasks like date formatting, calculations, DOM manipulation,
 * and file handling.
 */
const Utils = {
    /**
     * Formats a date into a human-readable string.
     * 
     * @param {Date|string} date - The date to format (can be Date object or string)
     * @param {string} format - The format type: 'long', 'short', or 'iso'
     *   - 'long': "Sunday, December 29, 2024" (default)
     *   - 'short': "Dec 29"
     *   - 'iso': "2024-12-29"
     * @returns {string} The formatted date string
     */
    formatDate(date, format = 'long') {
        const d = new Date(date);

        // ISO format: YYYY-MM-DD (used for date inputs and storage)
        if (format === 'iso') return d.toISOString().split('T')[0];

        // Short format: "Dec 29" (used for chart labels)
        if (format === 'short') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Long format: "Sunday, December 29, 2024" (used for display headers)
        return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    },

    /**
     * Formats a date specifically for HTML date input elements.
     * HTML date inputs require the format: YYYY-MM-DD
     * 
     * @param {Date|string} date - The date to format
     * @returns {string} Date in YYYY-MM-DD format
     */
    formatDateForInput(date) {
        return new Date(date).toISOString().split('T')[0];
    },

    /**
     * Gets today's date in ISO format (YYYY-MM-DD).
     * This is the standard format used for storing and comparing dates.
     * 
     * @returns {string} Today's date in YYYY-MM-DD format
     */
    getToday() {
        return new Date().toISOString().split('T')[0];
    },

    /**
     * Calculates the start of the week (Monday) for a given date.
     * Used for weekly analytics calculations.
     * 
     * @param {Date} date - The reference date (defaults to today)
     * @returns {Date} The Monday of the week containing the given date
     */
    getWeekStart(date = new Date()) {
        const d = new Date(date);
        const day = d.getDay();  // 0 = Sunday, 1 = Monday, etc.

        // Calculate difference to get back to Monday
        // If it's Sunday (0), go back 6 days; otherwise go back (day - 1) days
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    },

    /**
     * Calculates the end of the week (Sunday) for a given date.
     * Used for weekly analytics date range queries.
     * 
     * @param {Date} date - The reference date (defaults to today)
     * @returns {Date} The Sunday of the week containing the given date
     */
    getWeekEnd(date = new Date()) {
        const start = this.getWeekStart(date);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);  // Add 6 days to Monday to get Sunday
        return end;
    },

    /**
     * Gets the first day of the month for a given date.
     * Used for monthly analytics calculations.
     * 
     * @param {Date} date - The reference date (defaults to today)
     * @returns {Date} The first day of the month
     */
    getMonthStart(date = new Date()) {
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), 1);  // Day 1 of current month
    },

    /**
     * Gets the last day of the month for a given date.
     * Uses a trick: day 0 of the next month equals the last day of current month.
     * 
     * @param {Date} date - The reference date (defaults to today)
     * @returns {Date} The last day of the month
     */
    getMonthEnd(date = new Date()) {
        const d = new Date(date);
        // Month + 1 with day 0 gives us the last day of the current month
        return new Date(d.getFullYear(), d.getMonth() + 1, 0);
    },

    /**
     * Adds or subtracts days from a date.
     * 
     * @param {Date|string} date - The starting date
     * @param {number} days - Number of days to add (negative to subtract)
     * @returns {Date} The resulting date
     */
    addDays(date, days) {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    },

    /**
     * Calculates the number of days between two dates (inclusive).
     * Used for calculating daily averages in analytics.
     * 
     * @param {Date|string} start - The start date
     * @param {Date|string} end - The end date
     * @returns {number} Number of days between the dates (inclusive)
     */
    getDaysBetween(start, end) {
        const diffTime = Math.abs(new Date(end) - new Date(start));
        // Convert milliseconds to days and add 1 to include both start and end dates
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    },

    /**
     * Sums up the total calories from an array of food entries.
     * 
     * @param {Object[]} entries - Array of food entry objects with 'calories' property
     * @returns {number} Total calories from all entries
     */
    calculateTotalCalories(entries) {
        // Use reduce to sum all calorie values, defaulting to 0 for invalid entries
        return entries.reduce((sum, e) => sum + (parseInt(e.calories) || 0), 0);
    },

    /**
     * Formats a number with locale-appropriate thousand separators.
     * Example: 12345 becomes "12,345" in US locale.
     * 
     * @param {number} num - The number to format
     * @returns {string} The formatted number string
     */
    formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    },

    /**
     * Converts a File object to a Base64 data URL string.
     * Used for storing recipe images in localStorage.
     * 
     * @param {File} file - The file to convert (typically an image)
     * @returns {Promise<string>} Promise that resolves to the Base64 data URL
     */
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);  // Read file as Base64 data URL
            reader.onload = () => resolve(reader.result);  // Resolve with result on success
            reader.onerror = reject;  // Reject promise on error
        });
    },

    /**
     * Shorthand for document.querySelector - finds a single element.
     * 
     * @param {string} sel - CSS selector string
     * @returns {Element|null} The first matching element or null
     */
    $(sel) { return document.querySelector(sel); },

    /**
     * Shorthand for document.querySelectorAll - finds all matching elements.
     * 
     * @param {string} sel - CSS selector string
     * @returns {NodeList} List of all matching elements
     */
    $$(sel) { return document.querySelectorAll(sel); }
};
