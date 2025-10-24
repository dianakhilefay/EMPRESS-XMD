const fs = require('fs');
const path = require('path');
const { SessionCredentials } = require('./sessionCredentials');
const { DB_TYPE } = require('./database');

/**
 * Session Manager
 * Handles saving and restoring session credentials from database
 */
class SessionManager {
    /**
     * Save session credentials to database
     * @param {string} sessionId - Phone number or session identifier
     * @param {string} sessionDir - Path to session directory
     */
    static async saveSessionToDatabase(sessionId, sessionDir) {
        try {
            const credsPath = path.join(sessionDir, 'creds.json');
            
            if (!fs.existsSync(credsPath)) {
                console.log(`⚠️ creds.json not found for session ${sessionId}, skipping DB save`);
                return false;
            }

            const credsContent = fs.readFileSync(credsPath, 'utf8');
            
            if (DB_TYPE === 'mongodb') {
                // MongoDB upsert
                await SessionCredentials.findOneAndUpdate(
                    { sessionId: sessionId },
                    {
                        sessionId: sessionId,
                        credsJson: credsContent,
                        lastUpdated: new Date()
                    },
                    { upsert: true, new: true }
                );
            } else {
                // Sequelize upsert
                await SessionCredentials.upsert({
                    sessionId: sessionId,
                    credsJson: credsContent,
                    lastUpdated: new Date()
                });
            }

            console.log(`💾 Saved credentials to database for session: ${sessionId}`);
            return true;
        } catch (error) {
            console.error(`❌ Error saving session ${sessionId} to database:`, error.message);
            return false;
        }
    }

    /**
     * Restore all sessions from database to file system (batch restore)
     * @param {string} sessionsBaseDir - Base directory for sessions
     * @returns {number} Number of sessions restored
     */
    static async restoreAllSessionsFromDatabase(sessionsBaseDir) {
        try {
            console.log('🔄 Starting batch restore of sessions from database...');
            
            let allSessions;
            if (DB_TYPE === 'mongodb') {
                // MongoDB find all
                allSessions = await SessionCredentials.find({});
            } else {
                // Sequelize findAll
                allSessions = await SessionCredentials.findAll();
            }
            
            if (allSessions.length === 0) {
                console.log('📭 No sessions found in database to restore');
                return 0;
            }

            console.log(`📦 Found ${allSessions.length} sessions in database`);
            
            let restoredCount = 0;
            
            for (const session of allSessions) {
                try {
                    const sessionDir = path.join(sessionsBaseDir, session.sessionId);
                    
                    // Create session directory if it doesn't exist
                    if (!fs.existsSync(sessionDir)) {
                        fs.mkdirSync(sessionDir, { recursive: true });
                    }

                    const credsPath = path.join(sessionDir, 'creds.json');
                    
                    // Only restore if creds.json doesn't exist (avoid overwriting active sessions)
                    if (!fs.existsSync(credsPath)) {
                        fs.writeFileSync(credsPath, session.credsJson, 'utf8');
                        console.log(`✅ Restored credentials for session: ${session.sessionId}`);
                        restoredCount++;
                    } else {
                        console.log(`⏭️ Session ${session.sessionId} already exists, skipping restore`);
                    }
                } catch (error) {
                    console.error(`❌ Error restoring session ${session.sessionId}:`, error.message);
                }
            }

            console.log(`✅ Batch restore completed: ${restoredCount}/${allSessions.length} sessions restored`);
            return restoredCount;
        } catch (error) {
            console.error('❌ Error during batch restore from database:', error.message);
            return 0;
        }
    }

    /**
     * Delete session from database
     * @param {string} sessionId - Phone number or session identifier
     */
    static async deleteSessionFromDatabase(sessionId) {
        try {
            if (DB_TYPE === 'mongodb') {
                // MongoDB delete
                await SessionCredentials.deleteOne({ sessionId });
            } else {
                // Sequelize destroy
                await SessionCredentials.destroy({
                    where: { sessionId }
                });
            }
            console.log(`🗑️ Deleted session ${sessionId} from database`);
            return true;
        } catch (error) {
            console.error(`❌ Error deleting session ${sessionId} from database:`, error.message);
            return false;
        }
    }

    /**
     * Get session count from database
     * @returns {number} Number of sessions in database
     */
    static async getSessionCount() {
        try {
            if (DB_TYPE === 'mongodb') {
                // MongoDB countDocuments
                return await SessionCredentials.countDocuments();
            } else {
                // Sequelize count
                return await SessionCredentials.count();
            }
        } catch (error) {
            console.error('❌ Error getting session count:', error.message);
            return 0;
        }
    }
}

module.exports = { SessionManager };
