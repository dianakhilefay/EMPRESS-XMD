const { DATABASE, DB_TYPE } = require('./database');
const mongoose = require('mongoose');
const Sequelize = require('sequelize');

let Notification;

if (DB_TYPE === 'mongodb') {
    // MongoDB Notification Schema
    const notificationSchema = new mongoose.Schema({
        userId: {
            type: String,
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: ['referral', 'system', 'info'],
            default: 'info'
        },
        title: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        read: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now,
            index: true
        }
    });

    // Index for efficient querying and cleanup
    notificationSchema.index({ userId: 1, createdAt: -1 });
    notificationSchema.index({ createdAt: 1 }); // For auto-deletion

    Notification = mongoose.model('Notification', notificationSchema);
} else {
    // Sequelize Notification Model (PostgreSQL/SQLite)
    Notification = DATABASE.define('Notification', {
        userId: {
            type: Sequelize.STRING,
            allowNull: false
        },
        type: {
            type: Sequelize.ENUM('referral', 'system', 'info'),
            defaultValue: 'info'
        },
        title: {
            type: Sequelize.STRING,
            allowNull: false
        },
        message: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        read: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        }
    }, {
        timestamps: true,
        indexes: [
            {
                fields: ['userId', 'createdAt']
            },
            {
                fields: ['createdAt']
            }
        ]
    });
}

// Helper function to create a notification
async function createNotification(userId, type, title, message) {
    try {
        const notification = new Notification({
            userId,
            type,
            title,
            message,
            read: false
        });
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

// Helper function to get unread count for a user
async function getUnreadCount(userId) {
    try {
        if (DB_TYPE === 'mongodb') {
            return await Notification.countDocuments({ userId, read: false });
        } else {
            return await Notification.count({ where: { userId, read: false } });
        }
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
}

// Helper function to get notifications for a user
async function getUserNotifications(userId, limit = 50) {
    try {
        if (DB_TYPE === 'mongodb') {
            return await Notification.find({ userId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();
        } else {
            return await Notification.findAll({
                where: { userId },
                order: [['createdAt', 'DESC']],
                limit: limit
            });
        }
    } catch (error) {
        console.error('Error getting user notifications:', error);
        return [];
    }
}

// Helper function to mark notifications as read
async function markAsRead(userId, notificationIds) {
    try {
        if (DB_TYPE === 'mongodb') {
            await Notification.updateMany(
                { userId, _id: { $in: notificationIds } },
                { $set: { read: true } }
            );
        } else {
            await Notification.update(
                { read: true },
                { where: { userId, id: notificationIds } }
            );
        }
        return true;
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        return false;
    }
}

// Helper function to mark all notifications as read
async function markAllAsRead(userId) {
    try {
        if (DB_TYPE === 'mongodb') {
            await Notification.updateMany(
                { userId, read: false },
                { $set: { read: true } }
            );
        } else {
            await Notification.update(
                { read: true },
                { where: { userId, read: false } }
            );
        }
        return true;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
    }
}

// Helper function to delete old notifications (older than 7 days)
async function deleteOldNotifications() {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (DB_TYPE === 'mongodb') {
            const result = await Notification.deleteMany({
                createdAt: { $lt: sevenDaysAgo }
            });
            return result.deletedCount;
        } else {
            const result = await Notification.destroy({
                where: {
                    createdAt: { [Sequelize.Op.lt]: sevenDaysAgo }
                }
            });
            return result;
        }
    } catch (error) {
        console.error('Error deleting old notifications:', error);
        return 0;
    }
}

module.exports = {
    Notification,
    createNotification,
    getUnreadCount,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteOldNotifications
};
