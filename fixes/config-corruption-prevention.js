/**
 * Config File Corruption Prevention Fix
 * Addresses remaining Neuro system errors (JSON Config Corruption)
 * 
 * PROBLEM: SyntaxError from JSON.parse - malformed settings JSON
 * LOCATION: parser hDe → Or in index.js during app startup
 * FREQUENCY: 4 occurrences (2025-06-25 to 2025-07-03)
 * 
 * CAUSE: Concurrent writes, incomplete writes during crashes, encoding issues
 * EXAMPLE: "unexpected non-whitespace character at line 39"
 * 
 * @author Jordan Paul Ehrig - Ehrig BIM & IT Consultation Inc.
 * @version 1.0.0 - Production Fix
 */

const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');

/**
 * Safe Config Manager with Atomic Writes and Validation
 * Prevents JSON corruption through file locking and validation
 */
class SafeConfigManager {
    constructor(options = {}) {
        this.configPath = options.configPath || 'config.json';
        this.backupCount = options.backupCount || 3;
        this.lockTimeout = options.lockTimeout || 5000;
        this.validateOnRead = options.validateOnRead !== false;
        this.encoding = options.encoding || 'utf8';
        this.debug = options.debug || false;
        
        // File lock tracking
        this.locks = new Map();
        this.lockRetryDelay = 100;
        
        this.init();
    }

    /**
     * Initialize the config manager
     */
    async init() {
        try {
            // Ensure config directory exists
            const configDir = path.dirname(this.configPath);
            await fs.mkdir(configDir, { recursive: true });
            
            if (this.debug) {
                console.log('🔧 SafeConfigManager initialized for:', this.configPath);
            }
        } catch (error) {
            console.error('🚨 Failed to initialize config manager:', error);
        }
    }

    /**
     * Safely read config with corruption detection and recovery
     * @param {Object} options - Read options
     * @returns {Object} - Parsed config or default
     */
    async readConfig(options = {}) {
        const defaultConfig = options.defaultConfig || {};
        const enableRecovery = options.enableRecovery !== false;

        try {
            // Try to read the main config file
            const configData = await this.readConfigFile(this.configPath);
            
            if (this.validateOnRead) {
                this.validateConfig(configData);
            }
            
            if (this.debug) {
                console.log('✅ Config loaded successfully');
            }
            
            return configData;

        } catch (error) {
            console.error('🚨 Config read error:', error.message);
            
            if (enableRecovery) {
                return this.recoverConfig(defaultConfig, error);
            } else {
                throw error;
            }
        }
    }

    /**
     * Safely write config with atomic operations and backups
     * @param {Object} config - Config object to write
     * @param {Object} options - Write options
     * @returns {boolean} - Success status
     */
    async writeConfig(config, options = {}) {
        const createBackup = options.createBackup !== false;
        const validateBeforeWrite = options.validate !== false;

        try {
            // Validate config before writing
            if (validateBeforeWrite) {
                this.validateConfig(config);
            }

            // Acquire file lock
            await this.acquireLock(this.configPath);

            try {
                // Create backup if enabled
                if (createBackup) {
                    await this.createBackup();
                }

                // Perform atomic write
                await this.atomicWrite(config);
                
                if (this.debug) {
                    console.log('✅ Config written successfully');
                }
                
                return true;

            } finally {
                // Always release lock
                this.releaseLock(this.configPath);
            }

        } catch (error) {
            console.error('🚨 Config write error:', error.message);
            return false;
        }
    }

    /**
     * Read and parse config file with error handling
     * @private
     */
    async readConfigFile(filePath) {
        try {
            const data = await fs.readFile(filePath, this.encoding);
            
            // Check for empty file
            if (!data.trim()) {
                throw new Error('Config file is empty');
            }

            // Parse JSON with detailed error info
            try {
                return JSON.parse(data);
            } catch (parseError) {
                throw new Error(`JSON parse error: ${parseError.message}\nFile content preview: ${data.substring(0, 200)}...`);
            }

        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error('Config file not found');
            }
            throw error;
        }
    }

    /**
     * Validate config structure and content
     * @private
     */
    validateConfig(config) {
        // Basic validation
        if (typeof config !== 'object' || config === null) {
            throw new Error('Config must be a valid object');
        }

        // Check for circular references
        try {
            JSON.stringify(config);
        } catch (error) {
            throw new Error('Config contains circular references');
        }

        // Additional custom validation can be added here
        // Example: required fields, data types, etc.
        
        if (this.debug) {
            console.log('✅ Config validation passed');
        }
    }

    /**
     * Attempt to recover from config corruption
     * @private
     */
    async recoverConfig(defaultConfig, originalError) {
        console.log('🔄 Attempting config recovery...');

        // Try backup files
        for (let i = 1; i <= this.backupCount; i++) {
            const backupPath = `${this.configPath}.backup.${i}`;
            
            try {
                const backupConfig = await this.readConfigFile(backupPath);
                console.log(`✅ Recovered from backup ${i}`);
                
                // Write recovered config back to main file
                await this.atomicWrite(backupConfig);
                return backupConfig;

            } catch (backupError) {
                if (this.debug) {
                    console.log(`❌ Backup ${i} also corrupted or missing`);
                }
            }
        }

        // If all backups fail, use default config
        console.log('⚠️ All recovery attempts failed, using default config');
        await this.atomicWrite(defaultConfig);
        
        // Log the original error for debugging
        console.error('Original config error:', originalError.message);
        
        return defaultConfig;
    }

    /**
     * Create backup of current config
     * @private
     */
    async createBackup() {
        try {
            // Rotate existing backups
            for (let i = this.backupCount; i >= 1; i--) {
                const currentBackup = `${this.configPath}.backup.${i}`;
                const nextBackup = `${this.configPath}.backup.${i + 1}`;
                
                try {
                    await fs.access(currentBackup);
                    if (i === this.backupCount) {
                        await fs.unlink(currentBackup);
                    } else {
                        await fs.rename(currentBackup, nextBackup);
                    }
                } catch (error) {
                    // Backup doesn't exist, continue
                }
            }

            // Create new backup
            const newBackup = `${this.configPath}.backup.1`;
            try {
                await fs.copyFile(this.configPath, newBackup);
                if (this.debug) {
                    console.log('📋 Config backup created');
                }
            } catch (error) {
                // Original file might not exist
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }

        } catch (error) {
            console.warn('⚠️ Failed to create backup:', error.message);
            // Don't fail the write operation for backup errors
        }
    }

    /**
     * Perform atomic write operation
     * @private
     */
    async atomicWrite(config) {
        const tempPath = `${this.configPath}.tmp.${Date.now()}`;
        
        try {
            // Serialize config with formatting
            const configData = JSON.stringify(config, null, 2);
            
            // Write to temporary file
            await fs.writeFile(tempPath, configData, this.encoding);
            
            // Verify the temporary file can be read and parsed
            const verifyData = await fs.readFile(tempPath, this.encoding);
            JSON.parse(verifyData); // This will throw if JSON is invalid
            
            // Atomic rename (move temp file to final location)
            await fs.rename(tempPath, this.configPath);
            
            if (this.debug) {
                console.log('💾 Atomic write completed');
            }

        } catch (error) {
            // Clean up temp file on error
            try {
                await fs.unlink(tempPath);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
            throw error;
        }
    }

    /**
     * Acquire file lock with timeout
     * @private
     */
    async acquireLock(filePath) {
        const lockKey = path.resolve(filePath);
        const startTime = Date.now();

        while (this.locks.has(lockKey)) {
            if (Date.now() - startTime > this.lockTimeout) {
                throw new Error(`Lock timeout for ${filePath}`);
            }
            await new Promise(resolve => setTimeout(resolve, this.lockRetryDelay));
        }

        this.locks.set(lockKey, Date.now());
        
        if (this.debug) {
            console.log('🔒 Lock acquired for:', filePath);
        }
    }

    /**
     * Release file lock
     * @private
     */
    releaseLock(filePath) {
        const lockKey = path.resolve(filePath);
        this.locks.delete(lockKey);
        
        if (this.debug) {
            console.log('🔓 Lock released for:', filePath);
        }
    }

    /**
     * Update specific config values safely
     * @param {Object} updates - Partial config updates
     * @param {Object} options - Update options
     * @returns {boolean} - Success status
     */
    async updateConfig(updates, options = {}) {
        try {
            const currentConfig = await this.readConfig(options);
            const mergedConfig = { ...currentConfig, ...updates };
            return await this.writeConfig(mergedConfig, options);
        } catch (error) {
            console.error('🚨 Config update error:', error.message);
            return false;
        }
    }

    /**
     * Check config file health
     * @returns {Object} - Health status
     */
    async checkHealth() {
        const health = {
            mainConfig: 'unknown',
            backups: [],
            locks: this.locks.size,
            recommendations: []
        };

        try {
            const config = await this.readConfigFile(this.configPath);
            this.validateConfig(config);
            health.mainConfig = 'healthy';
        } catch (error) {
            health.mainConfig = 'corrupted';
            health.recommendations.push('Main config file needs recovery');
        }

        // Check backups
        for (let i = 1; i <= this.backupCount; i++) {
            const backupPath = `${this.configPath}.backup.${i}`;
            try {
                await this.readConfigFile(backupPath);
                health.backups.push({ index: i, status: 'healthy' });
            } catch (error) {
                health.backups.push({ index: i, status: 'missing_or_corrupted' });
            }
        }

        if (health.locks > 0) {
            health.recommendations.push('File locks detected - check for stuck processes');
        }

        return health;
    }
}

/**
 * Wrapper function for easy integration
 */
function createSafeConfig(configPath, options = {}) {
    return new SafeConfigManager({ configPath, ...options });
}

/**
 * Quick utility functions
 */
const ConfigUtils = {
    /**
     * Check if JSON string is valid
     */
    isValidJSON: (str) => {
        try {
            JSON.parse(str);
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Repair common JSON issues
     */
    repairJSON: (str) => {
        // Remove trailing commas
        let repaired = str.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix unquoted keys (basic pattern)
        repaired = repaired.replace(/(\w+)(\s*:)/g, '"$1"$2');
        
        return repaired;
    },

    /**
     * Get JSON parse error location
     */
    getParseErrorLocation: (jsonString, error) => {
        const match = error.message.match(/position\s+(\d+)/);
        if (match) {
            const position = parseInt(match[1]);
            const lines = jsonString.substring(0, position).split('\n');
            return {
                line: lines.length,
                column: lines[lines.length - 1].length + 1,
                context: jsonString.substring(Math.max(0, position - 50), position + 50)
            };
        }
        return null;
    }
};

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SafeConfigManager, createSafeConfig, ConfigUtils };
} else if (typeof window !== 'undefined') {
    window.SafeConfigManager = SafeConfigManager;
    window.createSafeConfig = createSafeConfig;
    window.ConfigUtils = ConfigUtils;
}

/**
 * INTEGRATION INSTRUCTIONS:
 * 
 * 1. Replace existing config operations:
 *    OLD: JSON.parse(fs.readFileSync('config.json'))
 *    NEW: await configManager.readConfig()
 * 
 * 2. Replace config writes:
 *    OLD: fs.writeFileSync('config.json', JSON.stringify(config))
 *    NEW: await configManager.writeConfig(config)
 * 
 * 3. For the specific error location (parser hDe → Or):
 *    Wrap JSON.parse calls with error handling:
 *    try {
 *        config = JSON.parse(data);
 *    } catch (error) {
 *        config = await configManager.recoverConfig(defaultConfig, error);
 *    }
 * 
 * 4. Initialize at app startup:
 *    const configManager = createSafeConfig('./config.json', { debug: true });
 *    const config = await configManager.readConfig({ defaultConfig: DEFAULT_CONFIG });
 * 
 * 5. Health check during startup:
 *    const health = await configManager.checkHealth();
 *    if (health.mainConfig !== 'healthy') {
 *        console.warn('Config health issues detected');
 *    }
 */
