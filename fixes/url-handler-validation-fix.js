/**
 * Claude URL Handler Error Fixes
 * Addresses 29% of Neuro system errors (URL Handler Type Errors)
 * 
 * PROBLEM: TypeError ERR_INVALID_URL in claudeURLHandler
 * LOCATION: handler function n4/bN/F8/X8 in index.js
 * FREQUENCY: 31 occurrences (2025-06-14 to 2025-07-03)
 * 
 * CAUSE: Protocol handler mis-parsing version strings and CLI flags as URLs
 * EXAMPLES: "0.10.38", "--fetch-schemes=sentry-ipc"
 * 
 * @author Jordan Paul Ehrig - Ehrig BIM & IT Consultation Inc.
 * @version 1.0.0 - Production Fix
 */

/**
 * Enhanced Claude URL Handler with Input Validation
 * Prevents TypeError when non-URL strings are passed to new URL()
 */
class SafeURLHandler {
    constructor(options = {}) {
        this.debug = options.debug || false;
        this.allowedProtocols = options.allowedProtocols || ['claude:', 'http:', 'https:'];
        this.errorCallback = options.errorCallback || this.defaultErrorHandler;
        
        // Validation patterns
        this.patterns = {
            // Valid URL with protocol
            validURL: /^[a-z][a-z0-9+.-]*:/i,
            // Version strings (semver-like)
            versionString: /^\d+\.\d+(\.\d+)?([+-][a-zA-Z0-9.-]+)?$/,
            // CLI flags
            cliFlag: /^--[a-zA-Z0-9-]+(=.*)?$/,
            // File paths
            filePath: /^[./\\]|^[a-zA-Z]:[\\]/,
            // IP addresses
            ipAddress: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
            // Port numbers only
            portOnly: /^\d{1,5}$/
        };

        this.init();
    }

    /**
     * Initialize the safe URL handler
     */
    init() {
        if (this.debug) {
            console.log('🔧 SafeURLHandler initialized with patterns:', Object.keys(this.patterns));
        }
    }

    /**
     * Safely handle Claude protocol URLs with comprehensive validation
     * @param {string} input - Input string that may or may not be a URL
     * @param {Object} options - Handler options
     * @returns {boolean} - Success status
     */
    handleClaudeURL(input, options = {}) {
        try {
            // Early validation - check if input should be processed
            const validationResult = this.validateInput(input);
            
            if (!validationResult.isValid) {
                if (this.debug) {
                    console.log(`🚫 Skipping non-URL input: "${input}" (${validationResult.reason})`);
                }
                return false;
            }

            // If we get here, it's a valid URL-like string
            return this.processValidURL(input, options);

        } catch (error) {
            this.errorCallback(error, input);
            return false;
        }
    }

    /**
     * Validate input to determine if it should be processed as a URL
     * @param {string} input - Input to validate
     * @returns {Object} - Validation result
     */
    validateInput(input) {
        // Null/undefined check
        if (!input || typeof input !== 'string') {
            return { isValid: false, reason: 'null_or_not_string' };
        }

        const trimmedInput = input.trim();

        // Empty string check
        if (!trimmedInput) {
            return { isValid: false, reason: 'empty_string' };
        }

        // Version string check (e.g., "0.10.38", "1.2.3-beta")
        if (this.patterns.versionString.test(trimmedInput)) {
            return { isValid: false, reason: 'version_string' };
        }

        // CLI flag check (e.g., "--fetch-schemes=sentry-ipc", "--verbose")
        if (this.patterns.cliFlag.test(trimmedInput)) {
            return { isValid: false, reason: 'cli_flag' };
        }

        // File path check (relative or absolute)
        if (this.patterns.filePath.test(trimmedInput)) {
            return { isValid: false, reason: 'file_path' };
        }

        // Bare IP address check (e.g., "192.168.1.1", "10.0.0.1:443")
        if (this.patterns.ipAddress.test(trimmedInput)) {
            return { isValid: false, reason: 'bare_ip_address' };
        }

        // Port number only check (e.g., "8080", "443")
        if (this.patterns.portOnly.test(trimmedInput)) {
            return { isValid: false, reason: 'port_number_only' };
        }

        // Must have protocol to be a valid URL
        if (!this.patterns.validURL.test(trimmedInput)) {
            return { isValid: false, reason: 'no_protocol' };
        }

        // Additional protocol validation
        const protocolMatch = trimmedInput.match(/^([a-z][a-z0-9+.-]*):(.*)$/i);
        if (!protocolMatch) {
            return { isValid: false, reason: 'invalid_protocol_format' };
        }

        const [, protocol, rest] = protocolMatch;
        
        // Check if protocol is allowed
        if (!this.allowedProtocols.includes(protocol.toLowerCase() + ':')) {
            return { isValid: false, reason: 'disallowed_protocol' };
        }

        // Ensure there's content after the protocol
        if (!rest || rest.trim() === '') {
            return { isValid: false, reason: 'no_content_after_protocol' };
        }

        return { isValid: true, reason: 'valid_url' };
    }

    /**
     * Process a validated URL-like string
     * @param {string} input - Validated input
     * @param {Object} options - Processing options
     * @returns {boolean} - Success status
     */
    processValidURL(input, options) {
        try {
            // Create URL object (now safe to do)
            const url = new URL(input);
            
            if (this.debug) {
                console.log('✅ Successfully parsed URL:', {
                    protocol: url.protocol,
                    hostname: url.hostname,
                    pathname: url.pathname
                });
            }

            // Delegate to the appropriate handler based on protocol
            switch (url.protocol) {
                case 'claude:':
                    return this.handleClaudeProtocol(url, options);
                case 'http:':
                case 'https:':
                    return this.handleHTTPProtocol(url, options);
                default:
                    console.warn(`⚠️ Unhandled protocol: ${url.protocol}`);
                    return false;
            }

        } catch (error) {
            // This should rarely happen due to pre-validation, but safety first
            console.error('🚨 URL parsing failed despite validation:', error.message);
            this.errorCallback(error, input);
            return false;
        }
    }

    /**
     * Handle claude: protocol URLs
     * @param {URL} url - Parsed URL object
     * @param {Object} options - Handler options
     * @returns {boolean} - Success status
     */
    handleClaudeProtocol(url, options) {
        // INTEGRATION POINT: Replace with your actual Claude protocol handling
        if (this.debug) {
            console.log('🎯 Handling Claude protocol:', url.href);
        }

        // Example Claude protocol handling:
        // - claude://chat/new
        // - claude://settings/open
        // - claude://file/import?path=...

        try {
            // Add your Claude-specific URL handling logic here
            if (typeof window !== 'undefined' && window.handleClaudeProtocolURL) {
                return window.handleClaudeProtocolURL(url, options);
            }

            // Fallback for testing/development
            console.log('🔧 Claude protocol handler not implemented, would handle:', url.href);
            return true;

        } catch (error) {
            console.error('🚨 Claude protocol handling error:', error);
            return false;
        }
    }

    /**
     * Handle http/https protocol URLs
     * @param {URL} url - Parsed URL object
     * @param {Object} options - Handler options
     * @returns {boolean} - Success status
     */
    handleHTTPProtocol(url, options) {
        if (this.debug) {
            console.log('🌐 Handling HTTP protocol:', url.href);
        }

        try {
            // INTEGRATION POINT: Replace with your actual HTTP URL handling
            if (typeof window !== 'undefined' && window.handleHTTPURL) {
                return window.handleHTTPURL(url, options);
            }

            // Default behavior - open in browser
            if (options.openInBrowser !== false && typeof window !== 'undefined') {
                window.open(url.href, '_blank');
                return true;
            }

            return true;

        } catch (error) {
            console.error('🚨 HTTP protocol handling error:', error);
            return false;
        }
    }

    /**
     * Default error handler
     * @param {Error} error - The error that occurred
     * @param {string} input - The input that caused the error
     */
    defaultErrorHandler(error, input) {
        console.error('🚨 URL Handler Error:', {
            message: error.message,
            input: input,
            timestamp: new Date().toISOString()
        });

        // Optional: Report to error tracking service
        if (typeof window !== 'undefined' && window.reportError) {
            window.reportError('url_handler_error', error, { input });
        }
    }

    /**
     * Batch validate multiple inputs (useful for processing lists)
     * @param {string[]} inputs - Array of inputs to validate
     * @returns {Object} - Validation results
     */
    batchValidate(inputs) {
        const results = {
            valid: [],
            invalid: [],
            summary: {}
        };

        inputs.forEach(input => {
            const validation = this.validateInput(input);
            if (validation.isValid) {
                results.valid.push(input);
            } else {
                results.invalid.push({ input, reason: validation.reason });
                results.summary[validation.reason] = (results.summary[validation.reason] || 0) + 1;
            }
        });

        return results;
    }

    /**
     * Get statistics about validation patterns
     * @returns {Object} - Pattern statistics
     */
    getValidationStats() {
        return {
            patterns: Object.keys(this.patterns),
            allowedProtocols: this.allowedProtocols,
            debug: this.debug
        };
    }
}

/**
 * Wrapper function for easy integration - replaces problematic claudeURLHandler calls
 * @param {string} input - Input that may be a URL
 * @param {Object} options - Handler options
 * @returns {boolean} - Success status
 */
function safeClaudeURLHandler(input, options = {}) {
    // Create instance if needed (singleton pattern)
    if (!safeClaudeURLHandler._instance) {
        safeClaudeURLHandler._instance = new SafeURLHandler({
            debug: options.debug || false,
            allowedProtocols: options.allowedProtocols,
            errorCallback: options.errorCallback
        });
    }

    return safeClaudeURLHandler._instance.handleClaudeURL(input, options);
}

/**
 * Utility functions for common validation scenarios
 */
const URLValidationUtils = {
    /**
     * Quick check if string is likely a version number
     */
    isVersionString: (str) => /^\d+\.\d+(\.\d+)?([+-][a-zA-Z0-9.-]+)?$/.test(str),

    /**
     * Quick check if string is a CLI flag
     */
    isCLIFlag: (str) => /^--[a-zA-Z0-9-]+(=.*)?$/.test(str),

    /**
     * Quick check if string has URL protocol
     */
    hasProtocol: (str) => /^[a-z][a-z0-9+.-]*:/i.test(str),

    /**
     * Safe URL constructor with validation
     */
    safeURL: (input) => {
        const handler = new SafeURLHandler();
        const validation = handler.validateInput(input);
        if (!validation.isValid) {
            throw new Error(`Invalid URL input: ${validation.reason}`);
        }
        return new URL(input);
    }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SafeURLHandler, safeClaudeURLHandler, URLValidationUtils };
} else if (typeof window !== 'undefined') {
    window.SafeURLHandler = SafeURLHandler;
    window.safeClaudeURLHandler = safeClaudeURLHandler;
    window.URLValidationUtils = URLValidationUtils;
}

/**
 * INTEGRATION INSTRUCTIONS:
 * 
 * 1. Replace existing URL handler calls:
 *    OLD: claudeURLHandler(input)
 *    NEW: safeClaudeURLHandler(input)
 * 
 * 2. For areas where new URL() is called directly:
 *    OLD: new URL(input)
 *    NEW: URLValidationUtils.safeURL(input)
 * 
 * 3. For the specific error location (n4/bN/F8/X8):
 *    Add validation before URL processing:
 *    if (!URLValidationUtils.hasProtocol(input) || 
 *        URLValidationUtils.isVersionString(input) || 
 *        URLValidationUtils.isCLIFlag(input)) {
 *        return; // Skip processing
 *    }
 * 
 * 4. Enable debug mode during testing:
 *    safeClaudeURLHandler(input, { debug: true })
 * 
 * 5. Monitor console for validation patterns to fine-tune rules
 */
