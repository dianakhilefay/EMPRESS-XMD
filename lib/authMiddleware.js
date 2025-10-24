const jwt = require('jsonwebtoken');
const { User } = require('./userModel');
const { isDatabaseInitialized } = require('./database');

// JWT secret key - should be in environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'malvin-bot-secret-key-change-this-in-production';
const JWT_EXPIRY = '7d'; // Token expires in 7 days

/**
 * Generate JWT token for a user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateToken(user) {
    return jwt.sign(
        {
            id: user._id || user.id,
            username: user.username,
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
}

/**
 * Middleware to verify JWT token
 * Attaches user object to req.user if token is valid
 */
async function authenticateToken(req, res, next) {
    try {
        // Check if database is ready
        if (!isDatabaseInitialized()) {
            return res.status(503).json({ 
                error: 'Database is not ready',
                message: 'The database is still initializing. Please try again in a few moments.'
            });
        }

        // Get token from header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Get user from database - works with both MongoDB and Sequelize
        let user;
        if (User.findById) {
            // MongoDB
            user = await User.findById(decoded.id);
        } else {
            // Sequelize
            user = await User.findOne({ where: { id: decoded.id } });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid token - user not found' });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        console.error('Authentication error:', error);
        return res.status(500).json({ error: 'Authentication error' });
    }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            // Get user from database - works with both MongoDB and Sequelize
            let user;
            if (User.findById) {
                // MongoDB
                user = await User.findById(decoded.id);
            } else {
                // Sequelize
                user = await User.findOne({ where: { id: decoded.id } });
            }
            if (user) {
                req.user = user;
            }
        }
    } catch (error) {
        // Ignore errors for optional auth
    }
    next();
}

/**
 * Middleware to check if database is ready
 * Should be used before any database operations
 */
function requireDatabaseReady(req, res, next) {
    if (!isDatabaseInitialized()) {
        return res.status(503).json({ 
            error: 'Database is not ready',
            message: 'The database is still initializing. Please try again in a few moments.'
        });
    }
    next();
}

module.exports = {
    generateToken,
    authenticateToken,
    optionalAuth,
    requireDatabaseReady,
    JWT_SECRET
};
