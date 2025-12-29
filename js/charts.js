/**
 * Charts Module - Canvas-based Chart Rendering System
 * 
 * This module provides methods for drawing line charts and bar charts
 * using the HTML5 Canvas API. It's used to visualize weight progression
 * and calorie consumption data throughout the application.
 */
const Charts = {
    /**
     * Color palette used throughout all charts for consistent styling.
     * These colors match the application's purple/indigo theme.
     */
    colors: {
        primary: '#8b5cf6',           // Main violet color for primary elements
        secondary: '#6366f1',         // Indigo blue for gradient endpoints
        grid: 'rgba(255,255,255,0.1)',// Semi-transparent white for grid lines
        text: '#a0a0b0'               // Muted gray for axis labels and text
    },

    /**
     * Draws a line chart on the specified canvas element.
     * Used primarily for visualizing weight changes over time.
     * 
     * @param {string} canvasId - The ID of the canvas HTML element
     * @param {number[]} data - Array of numeric values to plot
     * @param {string[]} labels - Array of labels for the x-axis (e.g., dates)
     */
    drawLineChart(canvasId, data, labels) {
        // Get the canvas element and verify it exists with data to display
        const canvas = document.getElementById(canvasId);
        if (!canvas || data.length === 0) return;

        // Get 2D rendering context for drawing
        const ctx = canvas.getContext('2d');

        // Resize canvas to match its container's dimensions
        // This ensures the chart fills its parent element properly
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Define padding around the chart area for labels and margins
        const padding = { top: 20, right: 20, bottom: 40, left: 50 };

        // Calculate the actual drawing area dimensions
        const chartW = canvas.width - padding.left - padding.right;
        const chartH = canvas.height - padding.top - padding.bottom;

        // Calculate the data range for proper scaling
        // Add 10% buffer above and below for visual breathing room
        const maxVal = Math.max(...data) * 1.1 || 100;  // Multiply by 1.1 to add top padding
        const minVal = Math.min(...data) * 0.9 || 0;   // Multiply by 0.9 to add bottom padding
        const range = maxVal - minVal || 1;             // Prevent division by zero

        // Clear the entire canvas before drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // ===== DRAW HORIZONTAL GRID LINES =====
        // Draw 5 horizontal lines (including top and bottom)
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            // Calculate y position for each grid line
            const y = padding.top + (chartH / 4) * i;

            // Draw the horizontal line
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(canvas.width - padding.right, y);
            ctx.stroke();

            // Draw the Y-axis value label on the left side
            ctx.fillStyle = this.colors.text;
            ctx.font = '11px Inter';
            ctx.textAlign = 'right';
            const val = maxVal - (range / 4) * i;  // Calculate value at this line
            ctx.fillText(val.toFixed(1), padding.left - 8, y + 4);
        }

        // ===== DRAW THE DATA LINE =====
        // Create a vertical gradient for the line (purple to indigo)
        const gradient = ctx.createLinearGradient(0, padding.top, 0, canvas.height - padding.bottom);
        gradient.addColorStop(0, this.colors.primary);
        gradient.addColorStop(1, this.colors.secondary);

        // Configure line styling
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';  // Smooth corners where line segments meet
        ctx.beginPath();

        // Calculate horizontal spacing between data points
        // Ensures points are evenly distributed across the chart width
        const stepX = chartW / Math.max(data.length - 1, 1);

        // Plot each data point and connect with lines
        data.forEach((val, i) => {
            // Calculate x position based on index
            const x = padding.left + i * stepX;
            // Calculate y position by normalizing the value within the range
            const y = padding.top + chartH - ((val - minVal) / range) * chartH;

            // Move to first point, then draw lines to subsequent points
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // ===== DRAW DATA POINT MARKERS =====
        // Draw circles at each data point for better visibility
        data.forEach((val, i) => {
            const x = padding.left + i * stepX;
            const y = padding.top + chartH - ((val - minVal) / range) * chartH;

            // Draw filled circle
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);  // 5px radius circle
            ctx.fillStyle = this.colors.primary;
            ctx.fill();

            // Draw white border around the circle for contrast
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // ===== DRAW X-AXIS LABELS =====
        ctx.fillStyle = this.colors.text;
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';

        // Calculate step to show max ~7 labels to avoid overcrowding
        const labelStep = Math.ceil(labels.length / 7);

        labels.forEach((label, i) => {
            // Only draw every Nth label based on labelStep
            if (i % labelStep === 0) {
                const x = padding.left + i * stepX;
                ctx.fillText(label, x, canvas.height - 10);
            }
        });
    },

    /**
     * Draws a bar chart on the specified canvas element.
     * Used for displaying weekly and monthly calorie summaries.
     * 
     * @param {string} canvasId - The ID of the canvas HTML element
     * @param {number[]} data - Array of numeric values (bar heights)
     * @param {string[]} labels - Array of labels for each bar (e.g., day names)
     */
    drawBarChart(canvasId, data, labels) {
        // Get the canvas element and verify it exists with data to display
        const canvas = document.getElementById(canvasId);
        if (!canvas || data.length === 0) return;

        // Get 2D rendering context for drawing
        const ctx = canvas.getContext('2d');

        // Resize canvas to match its container's dimensions
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Define padding (left padding larger to accommodate calorie numbers)
        const padding = { top: 20, right: 20, bottom: 40, left: 60 };

        // Calculate the actual drawing area dimensions
        const chartW = canvas.width - padding.left - padding.right;
        const chartH = canvas.height - padding.top - padding.bottom;

        // Calculate maximum value with 10% headroom for visual padding
        const maxVal = Math.max(...data) * 1.1 || 100;

        // Clear the entire canvas before drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // ===== DRAW HORIZONTAL GRID LINES =====
        ctx.strokeStyle = this.colors.grid;
        for (let i = 0; i <= 4; i++) {
            // Calculate y position for each grid line
            const y = padding.top + (chartH / 4) * i;

            // Draw the horizontal line
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(canvas.width - padding.right, y);
            ctx.stroke();

            // Draw the Y-axis value label (rounded to whole number for calories)
            ctx.fillStyle = this.colors.text;
            ctx.font = '11px Inter';
            ctx.textAlign = 'right';
            ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), padding.left - 8, y + 4);
        }

        // ===== DRAW THE BARS =====
        // Calculate bar width (70% of allocated space per bar)
        const barW = (chartW / data.length) * 0.7;
        // Calculate gap between bars (30% of allocated space per bar)
        const gap = (chartW / data.length) * 0.3;

        // Create a vertical gradient for the bars
        const gradient = ctx.createLinearGradient(0, padding.top, 0, canvas.height - padding.bottom);
        gradient.addColorStop(0, this.colors.primary);
        gradient.addColorStop(1, this.colors.secondary);

        // Draw each bar
        data.forEach((val, i) => {
            // Calculate bar height proportional to the value
            const barH = (val / maxVal) * chartH;
            // Calculate x position (with gap offset for centering)
            const x = padding.left + i * (barW + gap) + gap / 2;
            // Calculate y position (bars grow upward from bottom)
            const y = padding.top + chartH - barH;

            // Draw the filled rectangle for the bar
            ctx.fillStyle = gradient;
            ctx.beginRadius = 4;  // Note: This property doesn't do anything (left from original)
            ctx.fillRect(x, y, barW, barH);
        });

        // ===== DRAW X-AXIS LABELS =====
        ctx.fillStyle = this.colors.text;
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';

        // Draw label centered below each bar
        labels.forEach((label, i) => {
            // Calculate x position (center of the bar)
            const x = padding.left + i * (barW + gap) + gap / 2 + barW / 2;
            ctx.fillText(label, x, canvas.height - 10);
        });
    }
};
