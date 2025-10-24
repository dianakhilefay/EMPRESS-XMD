const Sequelize = require('sequelize');
const mongoose = require('mongoose');

class DatabaseManager {
    static instance = null;
    static dbType = null;

    static getInstance() {
        if (!DatabaseManager.instance) {
            const DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/malvin';

            // Determine database type
            const isMongoDB = DATABASE_URL.startsWith('mongodb://') || DATABASE_URL.startsWith('mongodb+srv://');
            const isPostgres = DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://');
            const isSQLite = !isMongoDB && !isPostgres;

            if (isMongoDB) {
                // MongoDB connection using Mongoose
                DatabaseManager.dbType = 'mongodb';
                DatabaseManager.instance = mongoose;
                console.log('🔄 Using MongoDB database');
            } else if (isPostgres) {
                // PostgreSQL connection using Sequelize
                DatabaseManager.dbType = 'postgres';
                DatabaseManager.instance = new Sequelize(DATABASE_URL, {
                    dialect: 'postgres',
                    ssl: true,
                    protocol: 'postgres',
                    dialectOptions: {
                        native: true,
                        ssl: { require: true, rejectUnauthorized: false },
                    },
                    logging: false,
                });
                console.log('🔄 Using PostgreSQL database');
            } else {
                // SQLite connection using Sequelize
                DatabaseManager.dbType = 'sqlite';
                DatabaseManager.instance = new Sequelize({
                    dialect: 'sqlite',
                    storage: DATABASE_URL,
                    logging: false,
                });
                console.log('🔄 Using SQLite database');
            }
        }
        return DatabaseManager.instance;
    }

    static getDbType() {
        return DatabaseManager.dbType;
    }
}

const DATABASE = DatabaseManager.getInstance();
const DB_TYPE = DatabaseManager.getDbType();

// Flag to track if database is initialized
let isDatabaseInitialized = false;

// Sync database and set initialized flag
const initializeDatabase = async () => {
    try {
        if (DB_TYPE === 'mongodb') {
            // MongoDB connection
            const DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/malvin';
            await mongoose.connect(DATABASE_URL, {
                bufferCommands: false, // Disable buffering to fail fast instead of timing out
                serverSelectionTimeoutMS: 30000, // Timeout after 30s instead of 10s
                socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
                family: 4 // Use IPv4, skip trying IPv6
            });
            isDatabaseInitialized = true;
            console.log('✅ MongoDB connected successfully.');
        } else {
            // Sequelize (PostgreSQL or SQLite)
            await DATABASE.sync();
            isDatabaseInitialized = true;
            console.log('✅ Database synchronized successfully.');
        }
        return true;
    } catch (error) {
        console.error('❌ Error synchronizing the database:', error);
        isDatabaseInitialized = false;
        return false;
    }
};

// Initialize database
initializeDatabase();

module.exports = { 
    DATABASE,
    DB_TYPE,
    initializeDatabase,
    isDatabaseInitialized: () => isDatabaseInitialized
};

// xdking