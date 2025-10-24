const { DATABASE, DB_TYPE } = require('./database');
const mongoose = require('mongoose');
const Sequelize = require('sequelize');

let Ticket;

if (DB_TYPE === 'mongodb') {
    // MongoDB Ticket Schema
    const ticketSchema = new mongoose.Schema({
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        userEmail: {
            type: String,
            required: true
        },
        username: {
            type: String,
            required: true
        },
        ticketId: {
            type: String,
            required: true,
            unique: true
        },
        reason: {
            type: String,
            required: true,
            enum: ['About Website', 'Bot Command Problem', 'Command Request', 'Other Problem']
        },
        message: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['open', 'in-progress', 'closed'],
            default: 'open'
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    });

    ticketSchema.pre('save', function(next) {
        this.updatedAt = Date.now();
        next();
    });

    Ticket = mongoose.model('Ticket', ticketSchema);
} else {
    // Sequelize Ticket Model (PostgreSQL/SQLite)
    Ticket = DATABASE.define('Ticket', {
        userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        userEmail: {
            type: Sequelize.STRING,
            allowNull: false
        },
        username: {
            type: Sequelize.STRING,
            allowNull: false
        },
        ticketId: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        reason: {
            type: Sequelize.ENUM('About Website', 'Bot Command Problem', 'Command Request', 'Other Problem'),
            allowNull: false
        },
        message: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        status: {
            type: Sequelize.ENUM('open', 'in-progress', 'closed'),
            defaultValue: 'open'
        }
    }, {
        timestamps: true
    });
}

// Helper function to generate ticket ID
function generateTicketId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TICKET-${timestamp}-${random}`.toUpperCase();
}

// Get user's active ticket
async function getUserActiveTicket(userId) {
    try {
        if (DB_TYPE === 'mongodb') {
            return await Ticket.findOne({ 
                userId: userId,
                status: { $ne: 'closed' }
            }).sort({ createdAt: -1 });
        } else {
            return await Ticket.findOne({
                where: {
                    userId: userId,
                    status: { [Sequelize.Op.ne]: 'closed' }
                },
                order: [['createdAt', 'DESC']]
            });
        }
    } catch (error) {
        console.error('Error getting user active ticket:', error);
        return null;
    }
}

// Get all user tickets
async function getUserTickets(userId) {
    try {
        if (DB_TYPE === 'mongodb') {
            return await Ticket.find({ userId: userId })
                .sort({ createdAt: -1 });
        } else {
            return await Ticket.findAll({
                where: { userId: userId },
                order: [['createdAt', 'DESC']]
            });
        }
    } catch (error) {
        console.error('Error getting user tickets:', error);
        return [];
    }
}

// Create new ticket
async function createTicket(userId, userEmail, username, reason, message) {
    try {
        const ticketId = generateTicketId();
        
        if (DB_TYPE === 'mongodb') {
            const ticket = new Ticket({
                userId,
                userEmail,
                username,
                ticketId,
                reason,
                message,
                status: 'open'
            });
            return await ticket.save();
        } else {
            return await Ticket.create({
                userId,
                userEmail,
                username,
                ticketId,
                reason,
                message,
                status: 'open'
            });
        }
    } catch (error) {
        console.error('Error creating ticket:', error);
        throw error;
    }
}

module.exports = {
    Ticket,
    generateTicketId,
    getUserActiveTicket,
    getUserTickets,
    createTicket
};
