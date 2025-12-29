/**
 * App Module - Main Application Controller
 * 
 * This is the central module that orchestrates the entire CalorieFlow application.
 * It handles:
 * - Navigation between different views (dashboard, food log, weight, analytics, recipes)
 * - Form submissions and data processing
 * - UI updates and rendering
 * - Modal dialogs for recipes
 * - Date picker functionality for the food log
 * 
 * Dependencies: Utils, Storage, Charts modules must be loaded before this file.
 */
const App = {
    /**
     * Tracks which view/page is currently active in the application.
     * Possible values: 'dashboard', 'food-log', 'weight', 'analytics', 'recipes'
     */
    currentView: 'dashboard',

    /**
     * The currently selected date in the food log view.
     * Initialized to today's date and can be changed with the date picker.
     */
    currentLogDate: Utils.getToday(),

    /**
     * Application entry point - called when the DOM is fully loaded.
     * Sets up all event listeners and initializes the dashboard view.
     */
    init() {
        this.bindNavigation();    // Set up sidebar navigation clicks
        this.bindForms();         // Set up form submission handlers
        this.bindModals();        // Set up recipe modal open/close handlers
        this.initDatePicker();    // Set up food log date navigation
        this.updateDashboard();   // Load initial dashboard data
        this.updateCurrentDate(); // Display today's date in the header
    },

    // ================================================================
    // NAVIGATION
    // Handles switching between different views/pages in the app
    // ================================================================

    /**
     * Binds click event listeners to all navigation items in the sidebar.
     * Each nav item has a data-view attribute indicating which view to show.
     */
    bindNavigation() {
        Utils.$$('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;  // Get the target view from data attribute
                this.switchView(view);
            });
        });
    },

    /**
     * Switches to a different view/page in the application.
     * Updates navigation active states and triggers view-specific data loading.
     * 
     * @param {string} view - The view to switch to (e.g., 'dashboard', 'food-log')
     */
    switchView(view) {
        // Remove 'active' class from all nav items and views
        Utils.$$('.nav-item').forEach(i => i.classList.remove('active'));
        Utils.$$('.view').forEach(v => v.classList.remove('active'));

        // Add 'active' class to the selected nav item and view
        Utils.$(`.nav-item[data-view="${view}"]`).classList.add('active');
        Utils.$(`#${view}`).classList.add('active');
        this.currentView = view;

        // Load data specific to each view
        // This ensures fresh data is displayed when switching views
        if (view === 'dashboard') this.updateDashboard();
        if (view === 'food-log') this.updateFoodLog();
        if (view === 'weight') this.updateWeightView();
        if (view === 'analytics') this.updateAnalytics();
        if (view === 'recipes') this.updateRecipes();
    },

    /**
     * Updates the current date display in the application header.
     * Shows the full formatted date (e.g., "Sunday, December 29, 2024").
     */
    updateCurrentDate() {
        Utils.$('#current-date').textContent = Utils.formatDate(new Date());
    },

    // ================================================================
    // DASHBOARD VIEW
    // Main overview page showing today's stats and quick actions
    // ================================================================

    /**
     * Refreshes all data displayed on the dashboard view.
     * Updates calorie progress, current weight, and today's food entries list.
     */
    updateDashboard() {
        const today = Utils.getToday();
        const entries = Storage.getFoodEntriesByDate(today);  // Get today's food entries
        const total = Utils.calculateTotalCalories(entries);   // Sum up calories
        const goal = Storage.getSettings().calorieGoal;        // Get user's daily goal

        // Update calorie display values
        Utils.$('#today-calories').textContent = Utils.formatNumber(total);
        Utils.$('#calorie-goal').textContent = Utils.formatNumber(goal);

        // Calculate and update the progress bar width
        // Cap at 100% to prevent overflow
        const progress = Math.min((total / goal) * 100, 100);
        Utils.$('#calorie-progress').style.width = `${progress}%`;

        // ===== WEIGHT SECTION =====
        // Display the most recent weight entry
        const latestWeight = Storage.getLatestWeight();
        Utils.$('#current-weight').textContent = latestWeight ? latestWeight.weight : '--';

        // Calculate and display weight change from previous entry
        const weights = Storage.getWeightEntries();
        if (weights.length >= 2) {
            // Compare the last two weight entries
            const diff = weights[weights.length - 1].weight - weights[weights.length - 2].weight;
            const change = Utils.$('#weight-change');
            // Format with +/- sign and color-coded class
            change.textContent = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg from last`;
            change.className = `weight-change ${diff > 0 ? 'positive' : 'negative'}`;
        }

        // Render today's food entries list
        this.renderTodayEntries(entries);
    },

    /**
     * Renders the list of today's food entries on the dashboard.
     * Shows an empty state message if no entries exist.
     * 
     * @param {Object[]} entries - Array of food entry objects for today
     */
    renderTodayEntries(entries) {
        const list = Utils.$('#today-entries');

        // Show empty state if no entries
        if (entries.length === 0) {
            list.innerHTML = '<li class="empty-state">No food entries yet today</li>';
            return;
        }

        // Generate HTML for each entry using template literals
        // Each entry shows food name, quantity, calories, and a delete button
        list.innerHTML = entries.map(e => `
            <li>
                <div class="food-info">
                    <span class="food-name">${e.name}</span>
                    <span class="food-quantity">${e.quantity || ''}</span>
                </div>
                <span class="food-calories">${e.calories} kcal</span>
                <div class="food-actions">
                    <button onclick="App.deleteFood('${e.id}')" title="Delete">🗑️</button>
                </div>
            </li>
        `).join('');
    },

    // ================================================================
    // FORM HANDLERS
    // Handles form submissions for adding food, weight, and recipes
    // ================================================================

    /**
     * Binds submit event listeners to all forms in the application.
     * Prevents default form submission and handles data saving.
     */
    bindForms() {
        // ===== QUICK ADD FORM (Dashboard) =====
        // Adds a food entry for today from the dashboard
        Utils.$('#quick-add-form').addEventListener('submit', (e) => {
            e.preventDefault();  // Prevent page reload

            // Build entry object from form values
            const entry = {
                name: Utils.$('#food-name').value,
                quantity: Utils.$('#food-quantity').value,
                calories: parseInt(Utils.$('#food-calories').value),
                date: Utils.getToday()  // Always use today's date for quick add
            };

            Storage.saveFoodEntry(entry);
            e.target.reset();         // Clear the form
            this.updateDashboard();   // Refresh the dashboard display
        });

        // ===== FOOD LOG FORM =====
        // Adds a food entry for the currently selected date in the food log
        Utils.$('#add-food-form').addEventListener('submit', (e) => {
            e.preventDefault();

            const entry = {
                name: Utils.$('#add-food-name').value,
                quantity: Utils.$('#add-food-quantity').value,
                calories: parseInt(Utils.$('#add-food-calories').value),
                date: this.currentLogDate  // Use the selected date, not today
            };

            Storage.saveFoodEntry(entry);
            e.target.reset();
            this.updateFoodLog();  // Refresh the food log display
        });

        // ===== WEIGHT FORM =====
        // Records a weight measurement for a specific date
        Utils.$('#weight-form').addEventListener('submit', (e) => {
            e.preventDefault();

            const entry = {
                date: Utils.$('#weight-date').value || Utils.getToday(),  // Default to today
                weight: parseFloat(Utils.$('#weight-value').value)
            };

            Storage.saveWeightEntry(entry);
            e.target.reset();
            Utils.$('#weight-date').value = Utils.getToday();  // Reset date to today
            this.updateWeightView();   // Refresh weight chart and list
            this.updateDashboard();    // Update dashboard weight display
        });

        // Set initial date value for weight form
        Utils.$('#weight-date').value = Utils.getToday();

        // ===== RECIPE FORM =====
        // Creates or updates a recipe (handles both new and edit operations)
        Utils.$('#recipe-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = Utils.$('#recipe-id').value;  // Hidden field for edit mode
            const imageFile = Utils.$('#recipe-image').files[0];
            let image = null;

            // Convert image file to Base64 if one was selected
            if (imageFile) {
                image = await Utils.fileToBase64(imageFile);
            }

            // Build recipe object from form values
            const recipe = {
                name: Utils.$('#recipe-name').value,
                calories: Utils.$('#recipe-calories').value,
                ingredients: Utils.$('#recipe-ingredients').value,
                instructions: Utils.$('#recipe-instructions').value,
                image: image
            };

            // Determine if this is an update or a new recipe
            if (id) {
                Storage.updateRecipe(id, recipe);  // Update existing
            } else {
                Storage.saveRecipe(recipe);  // Create new
            }

            this.closeModal();     // Close the recipe modal
            this.updateRecipes();  // Refresh the recipes grid
        });

        // ===== IMAGE PREVIEW =====
        // Shows a preview of the selected image before saving
        Utils.$('#recipe-image').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const base64 = await Utils.fileToBase64(file);
                Utils.$('#image-preview').innerHTML = `<img src="${base64}" alt="Preview">`;
            }
        });
    },

    /**
     * Deletes a food entry by ID and refreshes relevant views.
     * Called from delete buttons in the food lists.
     * 
     * @param {string} id - The ID of the food entry to delete
     */
    deleteFood(id) {
        Storage.deleteFoodEntry(id);
        this.updateDashboard();  // Refresh dashboard (might be today's entry)
        this.updateFoodLog();    // Refresh food log
    },

    // ================================================================
    // DATE PICKER
    // Handles date navigation in the food log view
    // ================================================================

    /**
     * Initializes the date picker controls in the food log view.
     * Sets up the date input and previous/next day navigation buttons.
     */
    initDatePicker() {
        const dateInput = Utils.$('#log-date');
        dateInput.value = this.currentLogDate;  // Set initial value

        // Handle direct date selection from the input
        dateInput.addEventListener('change', (e) => {
            this.currentLogDate = e.target.value;
            this.updateFoodLog();
        });

        // Handle "previous day" button click
        Utils.$('#prev-day').addEventListener('click', () => {
            const d = Utils.addDays(this.currentLogDate, -1);  // Subtract one day
            this.currentLogDate = Utils.formatDateForInput(d);
            dateInput.value = this.currentLogDate;
            this.updateFoodLog();
        });

        // Handle "next day" button click
        Utils.$('#next-day').addEventListener('click', () => {
            const d = Utils.addDays(this.currentLogDate, 1);  // Add one day
            this.currentLogDate = Utils.formatDateForInput(d);
            dateInput.value = this.currentLogDate;
            this.updateFoodLog();
        });
    },

    // ================================================================
    // FOOD LOG VIEW
    // Detailed view of food entries for a specific date
    // ================================================================

    /**
     * Updates the food log view with entries for the currently selected date.
     * Shows a table of entries with delete buttons.
     */
    updateFoodLog() {
        const entries = Storage.getFoodEntriesByDate(this.currentLogDate);
        const total = Utils.calculateTotalCalories(entries);

        // Update the total calories display
        Utils.$('#log-total-calories').textContent = `${Utils.formatNumber(total)} kcal`;

        const tbody = Utils.$('#food-log-body');

        // Show empty state if no entries
        if (entries.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No entries for this date</td></tr>';
            return;
        }

        // Generate table rows for each entry
        tbody.innerHTML = entries.map(e => `
            <tr>
                <td>${e.name}</td>
                <td>${e.quantity || '-'}</td>
                <td>${e.calories} kcal</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteFood('${e.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    },

    // ================================================================
    // WEIGHT VIEW
    // Weight tracking page with history list and progression chart
    // ================================================================

    /**
     * Updates the weight view with history list and line chart.
     * Shows the last 20 entries in the history and up to 30 on the chart.
     */
    updateWeightView() {
        const entries = Storage.getWeightEntries();

        // ===== HISTORY LIST =====
        const list = Utils.$('#weight-history');

        if (entries.length === 0) {
            list.innerHTML = '<li class="empty-state">No weight entries yet</li>';
        } else {
            // Show the 20 most recent entries (reversed to show newest first)
            list.innerHTML = entries.slice().reverse().slice(0, 20).map(e => `
                <li>
                    <span class="weight-date">${Utils.formatDate(e.date, 'short')}</span>
                    <span class="weight-kg">${e.weight} kg</span>
                    <button onclick="App.deleteWeight('${e.id}')" style="background:none;border:none;cursor:pointer;">🗑️</button>
                </li>
            `).join('');
        }

        // ===== WEIGHT CHART =====
        // Draw line chart with the last 30 entries
        if (entries.length > 0) {
            const data = entries.slice(-30).map(e => e.weight);
            const labels = entries.slice(-30).map(e => Utils.formatDate(e.date, 'short'));
            // Use setTimeout to ensure canvas is properly rendered before drawing
            setTimeout(() => Charts.drawLineChart('weight-chart', data, labels), 100);
        }
    },

    /**
     * Deletes a weight entry by ID and refreshes relevant views.
     * 
     * @param {string} id - The ID of the weight entry to delete
     */
    deleteWeight(id) {
        Storage.deleteWeightEntry(id);
        this.updateWeightView();
        this.updateDashboard();  // Update dashboard weight display
    },

    // ================================================================
    // ANALYTICS VIEW
    // Weekly and monthly calorie statistics with charts
    // ================================================================

    /**
     * Updates the analytics view with weekly and monthly summaries.
     * Displays total calories, daily averages, and bar charts.
     */
    updateAnalytics() {
        // ===== WEEKLY STATISTICS =====
        const weekStart = Utils.getWeekStart();
        const weekEnd = Utils.getWeekEnd();
        const weekEntries = Storage.getFoodEntriesByDateRange(weekStart, weekEnd);
        const weekTotal = Utils.calculateTotalCalories(weekEntries);
        const weekDays = Utils.getDaysBetween(weekStart, new Date());  // Days elapsed so far

        // Update weekly stats display
        Utils.$('#weekly-total').textContent = Utils.formatNumber(weekTotal);
        Utils.$('#weekly-avg').textContent = Utils.formatNumber(Math.round(weekTotal / weekDays));

        // Build weekly chart data (one bar per day of the week)
        const weekData = [];
        const weekLabels = [];
        for (let i = 0; i < 7; i++) {
            const d = Utils.addDays(weekStart, i);
            const dayEntries = Storage.getFoodEntriesByDate(d);
            weekData.push(Utils.calculateTotalCalories(dayEntries));
            weekLabels.push(Utils.formatDate(d, 'short'));
        }
        // Draw the weekly bar chart
        setTimeout(() => Charts.drawBarChart('weekly-chart', weekData, weekLabels), 100);

        // ===== MONTHLY STATISTICS =====
        const monthStart = Utils.getMonthStart();
        const monthEnd = Utils.getMonthEnd();
        const monthEntries = Storage.getFoodEntriesByDateRange(monthStart, monthEnd);
        const monthTotal = Utils.calculateTotalCalories(monthEntries);
        const monthDays = new Date().getDate();  // Current day of month

        // Update monthly stats display
        Utils.$('#monthly-total').textContent = Utils.formatNumber(monthTotal);
        Utils.$('#monthly-avg').textContent = Utils.formatNumber(Math.round(monthTotal / monthDays));

        // Build monthly chart data (one bar per week, last 4 weeks)
        const monthData = [];
        const monthLabels = [];
        for (let w = 3; w >= 0; w--) {
            // Calculate start/end of each past week
            const wStart = Utils.addDays(new Date(), -7 * (w + 1));
            const wEnd = Utils.addDays(wStart, 6);
            const wEntries = Storage.getFoodEntriesByDateRange(wStart, wEnd);
            monthData.push(Utils.calculateTotalCalories(wEntries));
            monthLabels.push(`Week ${4 - w}`);
        }
        // Draw the monthly bar chart
        setTimeout(() => Charts.drawBarChart('monthly-chart', monthData, monthLabels), 100);
    },

    // ================================================================
    // RECIPES VIEW
    // Recipe collection display and management
    // ================================================================

    /**
     * Updates the recipes view with the grid of recipe cards.
     * Shows an empty state if no recipes exist.
     */
    updateRecipes() {
        const recipes = Storage.getRecipes();
        const grid = Utils.$('#recipes-grid');

        // Show empty state if no recipes
        if (recipes.length === 0) {
            grid.innerHTML = `
                <div class="empty-state-large">
                    <span class="empty-icon">📖</span>
                    <p>No recipes yet. Create your first recipe!</p>
                </div>`;
            return;
        }

        // Generate recipe cards with image, name, calories, and action buttons
        // event.stopPropagation() prevents clicking edit/delete from opening the view modal
        grid.innerHTML = recipes.map(r => `
            <div class="recipe-card" onclick="App.viewRecipe('${r.id}')">
                <div class="recipe-image">
                    ${r.image ? `<img src="${r.image}" alt="${r.name}">` : '🍽️'}
                </div>
                <div class="recipe-content">
                    <h4 class="recipe-name">${r.name}</h4>
                    ${r.calories ? `<p class="recipe-calories">${r.calories} kcal</p>` : ''}
                    <div class="recipe-actions">
                        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); App.editRecipe('${r.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); App.deleteRecipe('${r.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // ================================================================
    // MODAL HANDLERS
    // Recipe modal dialogs for creating, editing, and viewing recipes
    // ================================================================

    /**
     * Binds event listeners for opening and closing modal dialogs.
     * Handles the recipe create/edit modal and the recipe view modal.
     */
    bindModals() {
        // Open new recipe modal
        Utils.$('#add-recipe-btn').addEventListener('click', () => this.openRecipeModal());

        // Close buttons for the create/edit modal
        Utils.$('#close-modal').addEventListener('click', () => this.closeModal());
        Utils.$('#cancel-recipe').addEventListener('click', () => this.closeModal());

        // Close button for the view modal
        Utils.$('#close-view-modal').addEventListener('click', () => this.closeViewModal());

        // Close modals when clicking outside the modal content (on the backdrop)
        Utils.$('#recipe-modal').addEventListener('click', (e) => {
            if (e.target.id === 'recipe-modal') this.closeModal();
        });
        Utils.$('#recipe-view-modal').addEventListener('click', (e) => {
            if (e.target.id === 'recipe-view-modal') this.closeViewModal();
        });
    },

    /**
     * Opens the recipe modal for creating or editing a recipe.
     * If a recipe object is passed, the form is pre-filled for editing.
     * 
     * @param {Object|null} recipe - Existing recipe to edit, or null for new recipe
     */
    openRecipeModal(recipe = null) {
        // Set modal title based on mode
        Utils.$('#modal-title').textContent = recipe ? 'Edit Recipe' : 'New Recipe';

        // Reset form and clear preview
        Utils.$('#recipe-form').reset();
        Utils.$('#image-preview').innerHTML = '';

        // Store recipe ID in hidden field (empty for new recipes)
        Utils.$('#recipe-id').value = recipe ? recipe.id : '';

        // Pre-fill form fields if editing an existing recipe
        if (recipe) {
            Utils.$('#recipe-name').value = recipe.name || '';
            Utils.$('#recipe-calories').value = recipe.calories || '';
            Utils.$('#recipe-ingredients').value = recipe.ingredients || '';
            Utils.$('#recipe-instructions').value = recipe.instructions || '';
            // Show existing image if present
            if (recipe.image) {
                Utils.$('#image-preview').innerHTML = `<img src="${recipe.image}" alt="Preview">`;
            }
        }

        // Show the modal by adding 'active' class
        Utils.$('#recipe-modal').classList.add('active');
    },

    /**
     * Closes the recipe create/edit modal.
     */
    closeModal() {
        Utils.$('#recipe-modal').classList.remove('active');
    },

    /**
     * Closes the recipe view modal.
     */
    closeViewModal() {
        Utils.$('#recipe-view-modal').classList.remove('active');
    },

    /**
     * Opens the recipe modal in edit mode for an existing recipe.
     * 
     * @param {string} id - The ID of the recipe to edit
     */
    editRecipe(id) {
        const recipe = Storage.getRecipeById(id);
        if (recipe) this.openRecipeModal(recipe);
    },

    /**
     * Deletes a recipe after user confirmation.
     * 
     * @param {string} id - The ID of the recipe to delete
     */
    deleteRecipe(id) {
        if (confirm('Delete this recipe?')) {
            Storage.deleteRecipe(id);
            this.updateRecipes();
        }
    },

    /**
     * Opens the view modal to display a recipe's full details.
     * Shows the recipe name, calories, image, ingredients, and instructions.
     * 
     * @param {string} id - The ID of the recipe to view
     */
    viewRecipe(id) {
        const recipe = Storage.getRecipeById(id);
        if (!recipe) return;

        // Build the recipe view HTML with conditional sections
        const body = Utils.$('#recipe-view-body');
        body.innerHTML = `
            <div class="recipe-header">
                <h2>${recipe.name}</h2>
                ${recipe.calories ? `<p class="recipe-calories">${recipe.calories} kcal</p>` : ''}
            </div>
            ${recipe.image ? `<img class="recipe-hero-image" src="${recipe.image}" alt="${recipe.name}">` : ''}
            ${recipe.ingredients ? `
                <div class="recipe-section">
                    <h3>Ingredients</h3>
                    <ul>${recipe.ingredients.split('\n').map(i => `<li>${i}</li>`).join('')}</ul>
                </div>
            ` : ''}
            ${recipe.instructions ? `
                <div class="recipe-section">
                    <h3>Instructions</h3>
                    <p>${recipe.instructions}</p>
                </div>
            ` : ''}
        `;

        // Show the view modal
        Utils.$('#recipe-view-modal').classList.add('active');
    }
};

// Note: App.init() is called from the PIN lock screen after authentication

