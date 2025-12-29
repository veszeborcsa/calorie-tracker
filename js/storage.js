/**
 * Storage Module - LocalStorage Data Persistence Layer
 * 
 * This module handles all data persistence using the browser's localStorage API.
 * It provides CRUD (Create, Read, Update, Delete) operations for:
 * - Food entries (daily calorie tracking)
 * - Weight entries (weight progression tracking)
 * - Recipes (saved recipe collection)
 * - Settings (user preferences like calorie goals)
 * 
 * All data is stored as JSON strings in localStorage with specific keys.
 */
const Storage = {
    /**
     * Storage keys used to identify different data types in localStorage.
     * Using a prefix ('calorieflow_') prevents conflicts with other applications.
     */
    KEYS: {
        FOOD_ENTRIES: 'calorieflow_food_entries',    // Daily food/calorie logs
        WEIGHT_ENTRIES: 'calorieflow_weight_entries',// Weight tracking data
        RECIPES: 'calorieflow_recipes',              // Saved recipes
        SETTINGS: 'calorieflow_settings'             // User preferences
    },

    // ================================================================
    // GENERIC STORAGE METHODS
    // These are low-level methods used by all other storage operations
    // ================================================================

    /**
     * Retrieves and parses data from localStorage.
     * Handles errors gracefully to prevent app crashes.
     * 
     * @param {string} key - The localStorage key to read from
     * @returns {*} The parsed data, or null if not found or on error
     */
    get(key) {
        try {
            const data = localStorage.getItem(key);
            // Parse JSON if data exists, otherwise return null
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return null;
        }
    },

    /**
     * Serializes and stores data in localStorage.
     * Handles errors gracefully to prevent app crashes.
     * 
     * @param {string} key - The localStorage key to write to
     * @param {*} value - The data to store (will be JSON stringified)
     * @returns {boolean} True if successful, false on error
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Error writing to localStorage:', e);
            return false;
        }
    },

    // ================================================================
    // FOOD ENTRIES METHODS
    // Methods for managing daily food/calorie log entries
    // ================================================================

    /**
     * Gets all food entries from storage.
     * 
     * @returns {Object[]} Array of food entry objects, or empty array if none
     */
    getFoodEntries() {
        return this.get(this.KEYS.FOOD_ENTRIES) || [];
    },

    /**
     * Saves a new food entry to storage.
     * Automatically assigns an ID and creation timestamp.
     * 
     * @param {Object} entry - The food entry to save
     * @param {string} entry.name - Name of the food
     * @param {string} entry.quantity - Quantity/portion description
     * @param {number} entry.calories - Calorie count
     * @param {string} entry.date - Date of consumption (YYYY-MM-DD)
     * @returns {Object} The saved entry with added id and createdAt
     */
    saveFoodEntry(entry) {
        const entries = this.getFoodEntries();
        // Generate unique ID using timestamp
        entry.id = Date.now().toString();
        // Add creation timestamp for record keeping
        entry.createdAt = new Date().toISOString();
        entries.push(entry);
        this.set(this.KEYS.FOOD_ENTRIES, entries);
        return entry;
    },

    /**
     * Updates an existing food entry.
     * Uses spread operator to merge updates with existing data.
     * 
     * @param {string} id - The ID of the entry to update
     * @param {Object} updates - Object containing the fields to update
     * @returns {Object|null} The updated entry, or null if not found
     */
    updateFoodEntry(id, updates) {
        const entries = this.getFoodEntries();
        const index = entries.findIndex(e => e.id === id);
        if (index !== -1) {
            // Merge existing entry with updates
            entries[index] = { ...entries[index], ...updates };
            this.set(this.KEYS.FOOD_ENTRIES, entries);
            return entries[index];
        }
        return null;
    },

    /**
     * Deletes a food entry by ID.
     * 
     * @param {string} id - The ID of the entry to delete
     * @returns {boolean} Always returns true
     */
    deleteFoodEntry(id) {
        const entries = this.getFoodEntries();
        // Filter out the entry with matching ID
        const filtered = entries.filter(e => e.id !== id);
        this.set(this.KEYS.FOOD_ENTRIES, filtered);
        return true;
    },

    /**
     * Gets all food entries for a specific date.
     * Compares dates by converting to date string to ignore time component.
     * 
     * @param {string} date - The date to filter by (YYYY-MM-DD)
     * @returns {Object[]} Array of food entries for that date
     */
    getFoodEntriesByDate(date) {
        const entries = this.getFoodEntries();
        // Convert to date string format for comparison (ignores time)
        const targetDate = new Date(date).toDateString();
        return entries.filter(e => new Date(e.date).toDateString() === targetDate);
    },

    /**
     * Gets all food entries within a date range (inclusive).
     * Used for weekly and monthly analytics calculations.
     * 
     * @param {Date|string} startDate - Start of the date range
     * @param {Date|string} endDate - End of the date range
     * @returns {Object[]} Array of food entries within the range
     */
    getFoodEntriesByDateRange(startDate, endDate) {
        const entries = this.getFoodEntries();

        // Set start to beginning of day (00:00:00.000)
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        // Set end to end of day (23:59:59.999)
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Filter entries that fall within the date range
        return entries.filter(e => {
            const entryDate = new Date(e.date);
            return entryDate >= start && entryDate <= end;
        });
    },

    // ================================================================
    // WEIGHT ENTRIES METHODS
    // Methods for managing weight tracking data
    // ================================================================

    /**
     * Gets all weight entries from storage.
     * 
     * @returns {Object[]} Array of weight entry objects, or empty array if none
     */
    getWeightEntries() {
        return this.get(this.KEYS.WEIGHT_ENTRIES) || [];
    },

    /**
     * Saves or updates a weight entry.
     * If an entry for the same date exists, it updates it instead of creating a duplicate.
     * Entries are automatically sorted by date for proper chart display.
     * 
     * @param {Object} entry - The weight entry to save
     * @param {string} entry.date - Date of the weight measurement (YYYY-MM-DD)
     * @param {number} entry.weight - Weight value in kg
     * @returns {Object} The saved/updated entry
     */
    saveWeightEntry(entry) {
        const entries = this.getWeightEntries();
        // Generate unique ID using timestamp
        entry.id = Date.now().toString();
        entry.createdAt = new Date().toISOString();

        // Check if an entry for this date already exists
        // This prevents duplicate entries for the same day
        const existingIndex = entries.findIndex(e =>
            new Date(e.date).toDateString() === new Date(entry.date).toDateString()
        );

        if (existingIndex !== -1) {
            // Update the existing entry for this date
            entries[existingIndex] = { ...entries[existingIndex], ...entry };
        } else {
            // Add as a new entry
            entries.push(entry);
        }

        // Sort entries chronologically by date for proper chart display
        entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        this.set(this.KEYS.WEIGHT_ENTRIES, entries);
        return entry;
    },

    /**
     * Deletes a weight entry by ID.
     * 
     * @param {string} id - The ID of the entry to delete
     * @returns {boolean} Always returns true
     */
    deleteWeightEntry(id) {
        const entries = this.getWeightEntries();
        const filtered = entries.filter(e => e.id !== id);
        this.set(this.KEYS.WEIGHT_ENTRIES, filtered);
        return true;
    },

    /**
     * Gets the most recent weight entry.
     * Since entries are sorted by date, the last one is the most recent.
     * 
     * @returns {Object|null} The latest weight entry, or null if none exist
     */
    getLatestWeight() {
        const entries = this.getWeightEntries();
        if (entries.length === 0) return null;
        // Return the last entry (most recent due to sorting)
        return entries[entries.length - 1];
    },

    // ================================================================
    // RECIPES METHODS
    // Methods for managing the recipe collection
    // ================================================================

    /**
     * Gets all recipes from storage.
     * 
     * @returns {Object[]} Array of recipe objects, or empty array if none
     */
    getRecipes() {
        return this.get(this.KEYS.RECIPES) || [];
    },

    /**
     * Saves a new recipe to storage.
     * Automatically assigns an ID and creation timestamp.
     * 
     * @param {Object} recipe - The recipe to save
     * @param {string} recipe.name - Name of the recipe
     * @param {string} recipe.calories - Calorie information (optional)
     * @param {string} recipe.ingredients - List of ingredients (newline separated)
     * @param {string} recipe.instructions - Cooking instructions
     * @param {string} recipe.image - Base64-encoded image data (optional)
     * @returns {Object} The saved recipe with added id and createdAt
     */
    saveRecipe(recipe) {
        const recipes = this.getRecipes();
        recipe.id = Date.now().toString();
        recipe.createdAt = new Date().toISOString();
        recipes.push(recipe);
        this.set(this.KEYS.RECIPES, recipes);
        return recipe;
    },

    /**
     * Updates an existing recipe.
     * 
     * @param {string} id - The ID of the recipe to update
     * @param {Object} updates - Object containing the fields to update
     * @returns {Object|null} The updated recipe, or null if not found
     */
    updateRecipe(id, updates) {
        const recipes = this.getRecipes();
        const index = recipes.findIndex(r => r.id === id);
        if (index !== -1) {
            recipes[index] = { ...recipes[index], ...updates };
            this.set(this.KEYS.RECIPES, recipes);
            return recipes[index];
        }
        return null;
    },

    /**
     * Deletes a recipe by ID.
     * 
     * @param {string} id - The ID of the recipe to delete
     * @returns {boolean} Always returns true
     */
    deleteRecipe(id) {
        const recipes = this.getRecipes();
        const filtered = recipes.filter(r => r.id !== id);
        this.set(this.KEYS.RECIPES, filtered);
        return true;
    },

    /**
     * Finds a recipe by its ID.
     * 
     * @param {string} id - The ID of the recipe to find
     * @returns {Object|undefined} The recipe if found, undefined otherwise
     */
    getRecipeById(id) {
        const recipes = this.getRecipes();
        return recipes.find(r => r.id === id);
    },

    // ================================================================
    // SETTINGS METHODS
    // Methods for managing user preferences
    // ================================================================

    /**
     * Gets the user's settings.
     * Returns default values if no settings have been saved.
     * 
     * @returns {Object} Settings object with calorieGoal and weightUnit
     */
    getSettings() {
        return this.get(this.KEYS.SETTINGS) || {
            calorieGoal: 2000,  // Default daily calorie goal
            weightUnit: 'kg'   // Default weight unit
        };
    },

    /**
     * Saves user settings.
     * Merges new settings with existing ones to allow partial updates.
     * 
     * @param {Object} settings - Object containing settings to save/update
     */
    saveSettings(settings) {
        const current = this.getSettings();
        // Merge new settings with existing to preserve unchanged values
        this.set(this.KEYS.SETTINGS, { ...current, ...settings });
    }
};
