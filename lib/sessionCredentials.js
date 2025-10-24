const { DataTypes } = require('sequelize');
const { DATABASE, DB_TYPE } = require('./database');

let SessionCredentials;

if (DB_TYPE === 'mongodb') {
    // MongoDB Schema using Mongoose
    const mongoose = DATABASE;
    const sessionCredentialsSchema = new mongoose.Schema({
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        credsJson: {
            type: String,
            required: true
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }, {
        timestamps: true,
        collection: 'session_credentials'
    });

    SessionCredentials = mongoose.model('SessionCredentials', sessionCredentialsSchema);
} else {
    // Sequelize Model for PostgreSQL/SQLite
    /**
     * SessionCredentials Model
     * Stores WhatsApp session credentials in PostgreSQL/SQLite
     * This allows credentials to persist across server restarts and be restored on startup
     */
    SessionCredentials = DATABASE.define('SessionCredentials', {
        sessionId: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
            comment: 'Phone number or unique session identifier'
        },
        credsJson: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'JSON string of the creds.json file content'
        },
        lastUpdated: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            comment: 'Last time credentials were updated'
        }
    }, {
        tableName: 'session_credentials',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['sessionId']
            }
        ]
    });
}

module.exports = { SessionCredentials };
