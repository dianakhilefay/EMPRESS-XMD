const { DATABASE, DB_TYPE } = require('./database');
const mongoose = require('mongoose');
const Sequelize = require('sequelize');

let DeletedAccount;

if (DB_TYPE === 'mongodb') {
    // MongoDB DeletedAccount Schema
    const deletedAccountSchema = new mongoose.Schema({
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true
        },
        username: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        deletedAt: {
            type: Date,
            default: Date.now
        },
        reason: {
            type: String,
            default: 'User requested account deletion'
        }
    });

    DeletedAccount = mongoose.model('DeletedAccount', deletedAccountSchema);
} else {
    // Sequelize DeletedAccount Model (PostgreSQL/SQLite)
    DeletedAccount = DATABASE.define('DeletedAccount', {
        email: {
            type: Sequelize.STRING,
            allowNull: false
        },
        username: {
            type: Sequelize.STRING,
            allowNull: false
        },
        deletedAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        },
        reason: {
            type: Sequelize.STRING,
            defaultValue: 'User requested account deletion'
        }
    }, {
        timestamps: true,
        indexes: [
            {
                fields: ['email']
            },
            {
                fields: ['username']
            }
        ]
    });
}

module.exports = { DeletedAccount };
