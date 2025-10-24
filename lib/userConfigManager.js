const { UserConfig } = require('./userConfig');
const { DB_TYPE } = require('./database');

/**
 * User Config Manager
 * Handles user-specific configuration settings stored in database
 */
class UserConfigManager {
    /**
     * Get user configuration from database, or create default if not exists
     * @param {string} userId - User phone number or JID
     * @param {object} defaultConfig - Default configuration values
     * @returns {object} User configuration
     */
    static async getUserConfig(userId, defaultConfig = {}) {
        try {
            // Set default values from environment or passed defaults
            const defaults = {
                prefix: defaultConfig.prefix || process.env.PREFIX || '.',
                autoStatusSeen: defaultConfig.autoStatusSeen !== undefined ? defaultConfig.autoStatusSeen : (process.env.AUTO_STATUS_SEEN === 'true'),
                autoStatusReact: defaultConfig.autoStatusReact !== undefined ? defaultConfig.autoStatusReact : (process.env.AUTO_STATUS_REACT === 'true'),
                autoStatusReply: defaultConfig.autoStatusReply !== undefined ? defaultConfig.autoStatusReply : (process.env.AUTO_STATUS_REPLY === 'true'),
                autoStatusMsg: defaultConfig.autoStatusMsg || process.env.AUTO_STATUS_MSG || '_sᴛᴀᴛᴜs sᴇᴇɴ ʙʏ ᴍᴀʟᴠɪɴ xᴅ_',
                botMode: defaultConfig.botMode || 'public',
                authorizedUsers: defaultConfig.authorizedUsers || [],
                privateModePinCode: defaultConfig.privateModePinCode || null
            };

            if (DB_TYPE === 'mongodb') {
                // MongoDB findOneAndUpdate with upsert
                let config = await UserConfig.findOne({ userId });
                
                if (!config) {
                    // Create new config with defaults
                    config = new UserConfig({
                        userId,
                        ...defaults,
                        lastUpdated: new Date()
                    });
                    await config.save();
                    console.log(`📝 Created new user config for ${userId}`);
                }
                
                return config.toObject();
            } else {
                // Sequelize findOrCreate
                const [config, created] = await UserConfig.findOrCreate({
                    where: { userId },
                    defaults: {
                        userId,
                        ...defaults,
                        lastUpdated: new Date()
                    }
                });
                
                if (created) {
                    console.log(`📝 Created new user config for ${userId}`);
                }
                
                return config.toJSON();
            }
        } catch (error) {
            console.error(`❌ Error getting user config for ${userId}:`, error.message);
            // Return defaults if database operation fails
            return {
                userId,
                prefix: defaultConfig.prefix || process.env.PREFIX || '.',
                autoStatusSeen: defaultConfig.autoStatusSeen !== undefined ? defaultConfig.autoStatusSeen : (process.env.AUTO_STATUS_SEEN === 'true'),
                autoStatusReact: defaultConfig.autoStatusReact !== undefined ? defaultConfig.autoStatusReact : (process.env.AUTO_STATUS_REACT === 'true'),
                autoStatusReply: defaultConfig.autoStatusReply !== undefined ? defaultConfig.autoStatusReply : (process.env.AUTO_STATUS_REPLY === 'true'),
                autoStatusMsg: defaultConfig.autoStatusMsg || process.env.AUTO_STATUS_MSG || '_sᴛᴀᴛᴜs sᴇᴇɴ ʙʏ ᴍᴀʟᴠɪɴ xᴅ_'
            };
        }
    }

    /**
     * Update user configuration in database
     * @param {string} userId - User phone number or JID
     * @param {object} updates - Configuration updates
     * @returns {boolean} Success status
     */
    static async updateUserConfig(userId, updates) {
        try {
            if (DB_TYPE === 'mongodb') {
                // MongoDB update
                await UserConfig.findOneAndUpdate(
                    { userId },
                    {
                        ...updates,
                        lastUpdated: new Date()
                    },
                    { upsert: true, new: true }
                );
            } else {
                // Sequelize update
                await UserConfig.upsert({
                    userId,
                    ...updates,
                    lastUpdated: new Date()
                });
            }
            console.log(`✅ Updated user config for ${userId}`);
            return true;
        } catch (error) {
            console.error(`❌ Error updating user config for ${userId}:`, error.message);
            return false;
        }
    }

    /**
     * Update user configuration in database
     * @param {string} userId - User phone number or JID
     * @param {object} updates - Configuration updates
     * @returns {object} Updated configuration
     */
    static async updateUserConfig(userId, updates) {
        try {
            if (DB_TYPE === 'mongodb') {
                // MongoDB findOneAndUpdate
                const updatedConfig = await UserConfig.findOneAndUpdate(
                    { userId },
                    { 
                        ...updates,
                        lastUpdated: new Date()
                    },
                    { new: true, upsert: true }
                );
                console.log(`📝 Updated user config for ${userId}`);
                return updatedConfig.toObject();
            } else {
                // Sequelize update
                await UserConfig.update(
                    {
                        ...updates,
                        lastUpdated: new Date()
                    },
                    { where: { userId } }
                );
                
                const updatedConfig = await UserConfig.findOne({ where: { userId } });
                console.log(`📝 Updated user config for ${userId}`);
                return updatedConfig.dataValues;
            }
        } catch (error) {
            console.error(`❌ Error updating user config for ${userId}:`, error.message);
            throw error;
        }
    }

    /**
     * Delete user configuration from database
     * @param {string} userId - User phone number or JID
     * @returns {boolean} Success status
     */
    static async deleteUserConfig(userId) {
        try {
            if (DB_TYPE === 'mongodb') {
                // MongoDB delete
                await UserConfig.deleteOne({ userId });
            } else {
                // Sequelize destroy
                await UserConfig.destroy({
                    where: { userId }
                });
            }
            console.log(`🗑️ Deleted user config for ${userId}`);
            return true;
        } catch (error) {
            console.error(`❌ Error deleting user config for ${userId}:`, error.message);
            return false;
        }
    }

    /**
     * Get all user configurations
     * @returns {array} Array of user configurations
     */
    static async getAllUserConfigs() {
        try {
            if (DB_TYPE === 'mongodb') {
                return await UserConfig.find({});
            } else {
                return await UserConfig.findAll();
            }
        } catch (error) {
            console.error('❌ Error getting all user configs:', error.message);
            return [];
        }
    }

    /**
     * Get user count from database
     * @returns {number} Number of users in database
     */
    static async getUserCount() {
        try {
            if (DB_TYPE === 'mongodb') {
                return await UserConfig.countDocuments();
            } else {
                return await UserConfig.count();
            }
        } catch (error) {
            console.error('❌ Error getting user count:', error.message);
            return 0;
        }
    }
}

module.exports = { UserConfigManager };
