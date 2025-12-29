/**
 * Auth Module - Simple PIN/Password Protection
 * 
 * Provides local authentication using a PIN stored in localStorage.
 * The PIN is hashed before storage for basic security.
 */
const Auth = {
    STORAGE_KEY: 'calorieflow_pin_hash',

    /**
     * Simple hash function for PIN storage.
     * Note: This is basic protection, not cryptographically secure.
     * For a local-only app, this provides reasonable privacy.
     */
    hashPin(pin) {
        let hash = 0;
        for (let i = 0; i < pin.length; i++) {
            const char = pin.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        // Add salt and convert to string
        return 'cf_' + Math.abs(hash).toString(36) + '_' + pin.length;
    },

    /**
     * Check if a PIN has been set up.
     */
    isPinSet() {
        return localStorage.getItem(this.STORAGE_KEY) !== null;
    },

    /**
     * Set up a new PIN.
     */
    setPin(pin) {
        if (pin.length < 4) {
            return { success: false, error: 'PIN must be at least 4 characters' };
        }
        const hash = this.hashPin(pin);
        localStorage.setItem(this.STORAGE_KEY, hash);
        return { success: true };
    },

    /**
     * Verify the entered PIN against the stored hash.
     */
    verifyPin(pin) {
        const storedHash = localStorage.getItem(this.STORAGE_KEY);
        if (!storedHash) return false;
        return this.hashPin(pin) === storedHash;
    },

    /**
     * Check if user is currently authenticated (session).
     */
    isAuthenticated() {
        return sessionStorage.getItem('calorieflow_authenticated') === 'true';
    },

    /**
     * Mark user as authenticated for this session.
     */
    authenticate() {
        sessionStorage.setItem('calorieflow_authenticated', 'true');
    },

    /**
     * Log out (clear session).
     */
    logout() {
        sessionStorage.removeItem('calorieflow_authenticated');
    },

    /**
     * Reset PIN (removes it completely - requires re-setup).
     */
    resetPin() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.logout();
    }
};
