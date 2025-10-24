const { DATABASE, DB_TYPE } = require('./database');
const mongoose = require('mongoose');
const Sequelize = require('sequelize');

let User;

if (DB_TYPE === 'mongodb') {
    // MongoDB User Schema
    const userSchema = new mongoose.Schema({
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        password: {
            type: String,
            required: true
        },
        phoneNumber: {
            type: String,
            default: null
        },
        accountType: {
            type: String,
            enum: ['free', 'premium'],
            default: 'free'
        },
        sessionActive: {
            type: Boolean,
            default: false
        },
        sessionPaused: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        lastLogin: {
            type: Date,
            default: null
        },
        credits: {
            type: Number,
            default: 65
        },
        referralCode: {
            type: String,
            unique: true,
            sparse: true
        },
        referredBy: {
            type: String,
            default: null
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        verificationCode: {
            type: String,
            default: null
        },
        verificationCodeExpiry: {
            type: Date,
            default: null
        },
        lastChargeTime: {
            type: Date,
            default: null
        },
        initialChargeApplied: {
            type: Boolean,
            default: false
        },
        // OAuth fields
        oauthProvider: {
            type: String,
            enum: ['local', 'google', 'github'],
            default: 'local'
        },
        oauthId: {
            type: String,
            default: null
        },
        oauthProfilePicture: {
            type: String,
            default: null
        }
    });

    User = mongoose.model('User', userSchema);
} else {
    // Sequelize User Model (PostgreSQL/SQLite)
    User = DATABASE.define('User', {
        username: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        email: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        password: {
            type: Sequelize.STRING,
            allowNull: false
        },
        phoneNumber: {
            type: Sequelize.STRING,
            allowNull: true
        },
        accountType: {
            type: Sequelize.ENUM('free', 'premium'),
            defaultValue: 'free'
        },
        sessionActive: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        sessionPaused: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        lastLogin: {
            type: Sequelize.DATE,
            allowNull: true
        },
        credits: {
            type: Sequelize.INTEGER,
            defaultValue: 65
        },
        referralCode: {
            type: Sequelize.STRING,
            unique: true,
            allowNull: true
        },
        referredBy: {
            type: Sequelize.STRING,
            allowNull: true
        },
        isEmailVerified: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        verificationCode: {
            type: Sequelize.STRING,
            allowNull: true
        },
        verificationCodeExpiry: {
            type: Sequelize.DATE,
            allowNull: true
        },
        lastChargeTime: {
            type: Sequelize.DATE,
            allowNull: true
        },
        initialChargeApplied: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        // OAuth fields
        oauthProvider: {
            type: Sequelize.ENUM('local', 'google', 'github'),
            defaultValue: 'local'
        },
        oauthId: {
            type: Sequelize.STRING,
            allowNull: true
        },
        oauthProfilePicture: {
            type: Sequelize.STRING,
            allowNull: true
        }
    }, {
        timestamps: true
    });
}

module.exports = { User };
