/**
 * Toast Notification Error Fixes
 * Addresses 66% of Neuro system errors (Toast Timeout Issues)
 * 
 * PROBLEM: TimeoutError in toast API notification system
 * LOCATION: index.js t/e._execute → flush
 * FREQUENCY: 71 occurrences (2025-06-14 to 2025-07-03)
 * 
 * @author Jordan Paul Ehrig - Ehrig BIM & IT Consultation Inc.
 * @version 1.0.0 - Production Fix
 */

/**
 * Enhanced Toast Notification System with Timeout Handling
 * Prevents UI blocking and provides graceful fallback
 */
class ToastManager {
    constructor(options = {}) {
        this.defaultTimeout = options.timeout || 5000; // 5 second timeout
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.queue = [];
        this.isProcessing = false;
        this.fallbackContainer = null;
        
        this.initializeFallbackContainer();
    }

    /**
     * Create fallback container for when toast system fails
     */
    initializeFallbackContainer() {
        if (typeof document !== 'undefined') {
            this.fallbackContainer = document.createElement('div');
            this.fallbackContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 300px;
                pointer-events: none;
            `;
            document.body.appendChild(this.fallbackContainer);
        }
    }

    /**
     * Safe toast with timeout wrapper and queue management
     * @param {string} message - Toast message
     * @param {Object} options - Toast options
     * @returns {Promise<boolean>} - Success status
     */
    async showToast(message, options = {}) {
        const toastConfig = {
            message,
            type: options.type || 'info',
            duration: options.duration || 3000,
            timeout: options.timeout || this.defaultTimeout,
            retries: 0,
            maxRetries: this.maxRetries
        };

        // Add to queue if currently processing
        if (this.isProcessing) {
            this.queue.push(toastConfig);
            return true;
        }

        return this.processToast(toastConfig);
    }

    /**
     * Process individual toast with timeout protection
     * @private
     */
    async processToast(config) {
        this.isProcessing = true;

        try {
            // Create toast promise with timeout wrapper
            const toastPromise = this.createToastPromise(config);
            const timeoutPromise = this.createTimeoutPromise(config.timeout);

            // Race between toast execution and timeout
            const result = await Promise.race([
                toastPromise,
                timeoutPromise
            ]);

            if (result === 'timeout') {
                console.warn(`🚨 Toast timeout after ${config.timeout}ms, using fallback`);
                this.showFallbackNotification(config);
                return false;
            }

            return true;

        } catch (error) {
            console.error('🚨 Toast execution error:', error);
            
            // Retry logic
            if (config.retries < config.maxRetries) {
                config.retries++;
                console.log(`🔄 Retrying toast (attempt ${config.retries}/${config.maxRetries})`);
                await this.delay(this.retryDelay);
                return this.processToast(config);
            }

            // Final fallback
            this.showFallbackNotification(config);
            return false;

        } finally {
            this.isProcessing = false;
            this.processQueue();
        }
    }

    /**
     * Create the actual toast promise (replace with your toast implementation)
     * @private
     */
    async createToastPromise(config) {
        // INTEGRATION POINT: Replace this with your actual toast system
        // Example for different toast libraries:
        
        // For react-hot-toast:
        // return toast[config.type](config.message, { duration: config.duration });
        
        // For notification API:
        // return new Notification(config.message);
        
        // For custom toast system - replace this section:
        if (typeof window !== 'undefined' && window.showToastNotification) {
            return window.showToastNotification(config.message, config.type, config.duration);
        }
        
        // Fallback simulation for testing
        await this.delay(100);
        return 'success';
    }

    /**
     * Create timeout promise
     * @private
     */
    createTimeoutPromise(timeout) {
        return new Promise((resolve) => {
            setTimeout(() => resolve('timeout'), timeout);
        });
    }

    /**
     * Fallback notification when toast system fails
     * @private
     */
    showFallbackNotification(config) {
        if (!this.fallbackContainer) return;

        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${this.getTypeColor(config.type)};
            color: white;
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 4px;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease-out;
            pointer-events: auto;
            cursor: pointer;
        `;
        
        notification.textContent = config.message;
        notification.onclick = () => notification.remove();
        
        this.fallbackContainer.appendChild(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, config.duration);
    }

    /**
     * Get color for notification type
     * @private
     */
    getTypeColor(type) {
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };
        return colors[type] || colors.info;
    }

    /**
     * Process queued toasts
     * @private
     */
    async processQueue() {
        if (this.queue.length > 0 && !this.isProcessing) {
            const nextToast = this.queue.shift();
            await this.processToast(nextToast);
        }
    }

    /**
     * Utility delay function
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear all pending toasts
     */
    clearQueue() {
        this.queue = [];
    }

    /**
     * Silent log for debugging without toast
     */
    silentLog(message, level = 'info') {
        const timestamp = new Date().toISOString();
        console[level](`[${timestamp}] Silent Toast: ${message}`);
    }
}

/**
 * Global toast instance
 */
const toastManager = new ToastManager({
    timeout: 5000,
    maxRetries: 3,
    retryDelay: 1000
});

/**
 * Wrapper functions for easy integration
 */
const safeToast = {
    success: (message, options) => toastManager.showToast(message, { ...options, type: 'success' }),
    error: (message, options) => toastManager.showToast(message, { ...options, type: 'error' }),
    warning: (message, options) => toastManager.showToast(message, { ...options, type: 'warning' }),
    info: (message, options) => toastManager.showToast(message, { ...options, type: 'info' }),
    clear: () => toastManager.clearQueue(),
    silent: (message, level) => toastManager.silentLog(message, level)
};

// CSS for animations
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ToastManager, safeToast };
} else if (typeof window !== 'undefined') {
    window.ToastManager = ToastManager;
    window.safeToast = safeToast;
}

/**
 * INTEGRATION INSTRUCTIONS:
 * 
 * 1. Replace existing toast calls:
 *    OLD: toast.success("Message")
 *    NEW: safeToast.success("Message")
 * 
 * 2. For Promise.race pattern in existing code:
 *    OLD: await someToastFunction()
 *    NEW: await safeToast.info("Processing...") 
 * 
 * 3. For error-prone areas (index.js t/e._execute → flush):
 *    wrap with: Promise.race([originalPromise, timeout(5000)]).catch(() => safeToast.silent("Operation failed"))
 * 
 * 4. Monitor console for timeout warnings to identify problematic areas
 */
