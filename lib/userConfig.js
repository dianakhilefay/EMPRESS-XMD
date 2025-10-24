const { DataTypes } = require('sequelize');
const { DATABASE, DB_TYPE } = require('./database');

let UserConfig;

if (DB_TYPE === 'mongodb') {
    // MongoDB Schema using Mongoose
    const mongoose = DATABASE;
    const userConfigSchema = new mongoose.Schema({
        userId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            comment: 'User phone number or JID'
        },
        prefix: {
            type: String,
            default: '.',
            comment: 'User-specific command prefix'
        },
        autoStatusSeen: {
            type: Boolean,
            default: true,
            comment: 'Auto view status'
        },
        autoStatusReact: {
            type: Boolean,
            default: false,
            comment: 'Auto react to status'
        },
        autoStatusReply: {
            type: Boolean,
            default: false,
            comment: 'Auto reply to status'
        },
        autoStatusMsg: {
            type: String,
            default: '_sᴛᴀᴛᴜs sᴇᴇɴ ʙʏ ᴍᴀʟᴠɪɴ xᴅ_',
            comment: 'Auto status reply message'
        },
        autoRead: {
            type: Boolean,
            default: false,
            comment: 'Auto read all incoming messages'
        },
        botMode: {
            type: String,
            enum: ['public', 'private'],
            default: 'public',
            comment: 'Bot accessibility mode - public (everyone) or private (authorized only)'
        },
        authorizedUsers: {
            type: [String],
            default: [],
            comment: 'List of authorized user JIDs for private mode'
        },
        privateModePinCode: {
            type: String,
            default: null,
            comment: 'PIN code for users to request access in private mode'
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }, {
        timestamps: true,
        collection: 'user_configs'
    });

    UserConfig = mongoose.model('UserConfig', userConfigSchema);
} else {
    // Sequelize Model for PostgreSQL/SQLite
    /**
     * UserConfig Model
     * Stores per-user bot configuration settings
     */
    UserConfig = DATABASE.define('UserConfig', {
        userId: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
            comment: 'User phone number or JID'
        },
        prefix: {
            type: DataTypes.STRING,
            defaultValue: '.',
            comment: 'User-specific command prefix'
        },
        autoStatusSeen: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Auto view status'
        },
        autoStatusReact: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Auto react to status'
        },
        autoStatusReply: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Auto reply to status'
        },
        autoStatusMsg: {
            type: DataTypes.TEXT,
            defaultValue: '_sᴛᴀᴛᴜs sᴇᴇɴ ʙʏ ᴍᴀʟᴠɪɴ xᴅ_',
            comment: 'Auto status reply message'
        },
        autoRead: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Auto read all incoming messages'
        },
        botMode: {
            type: DataTypes.ENUM('public', 'private'),
            defaultValue: 'public',
            comment: 'Bot accessibility mode - public (everyone) or private (authorized only)'
        },
        authorizedUsers: {
            type: DataTypes.JSON,
            defaultValue: [],
            comment: 'List of authorized user JIDs for private mode'
        },
        privateModePinCode: {
            type: DataTypes.STRING,
            defaultValue: null,
            comment: 'PIN code for users to request access in private mode'
        },
        lastUpdated: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            comment: 'Last time configuration was updated'
        }
    }, {
        tableName: 'user_configs',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['userId']
            }
        ]
    });
}

module.exports = { UserConfig };
