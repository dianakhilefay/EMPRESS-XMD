const { User } = require('./userModel');
const { DB_TYPE } = require('./database');

// Credit deduction constants
const INITIAL_CHARGE = 0.3;
const PERIODIC_CHARGE = 0.25;
const CHARGE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

// Store active credit deduction timers for each session
const activeTimers = new Map();

/**
 * Apply initial charge when a session connects for the first time
 * This should NOT be called on reconnection/bot restart
 */
async function applyInitialCharge(phoneNumber, username) {
    try {
        let user;
        if (DB_TYPE === 'mongodb') {
            user = await User.findOne({ phoneNumber: phoneNumber });
        } else {
            user = await User.findOne({ where: { phoneNumber: phoneNumber } });
        }

        if (!user) {
            console.error(`❌ User not found for phone number: ${phoneNumber}`);
            return false;
        }

        // Check if initial charge was already applied
        if (user.initialChargeApplied) {
            console.log(`⏭️ Initial charge already applied for ${username}, skipping`);
            return false;
        }

        // Check if user has enough credits
        if (user.credits < INITIAL_CHARGE) {
            console.log(`⚠️ User ${username} has insufficient credits for initial charge`);
            return false;
        }

        // Deduct initial charge
        user.credits = Math.max(0, user.credits - INITIAL_CHARGE);
        user.initialChargeApplied = true;
        user.lastChargeTime = new Date();
        await user.save();

        console.log(`💰 Initial charge of ${INITIAL_CHARGE} credits applied to ${username}. New balance: ${user.credits}`);
        return true;
    } catch (error) {
        console.error(`❌ Error applying initial charge:`, error);
        return false;
    }
}

/**
 * Apply periodic charge (every 15 minutes)
 */
async function applyPeriodicCharge(phoneNumber, username) {
    try {
        let user;
        if (DB_TYPE === 'mongodb') {
            user = await User.findOne({ phoneNumber: phoneNumber });
        } else {
            user = await User.findOne({ where: { phoneNumber: phoneNumber } });
        }

        if (!user) {
            console.error(`❌ User not found for phone number: ${phoneNumber}`);
            return false;
        }

        // Check if user has enough credits
        if (user.credits < PERIODIC_CHARGE) {
            console.log(`⚠️ User ${username} has insufficient credits (${user.credits}). Stopping session...`);
            return false;
        }

        // Deduct periodic charge
        user.credits = Math.max(0, user.credits - PERIODIC_CHARGE);
        user.lastChargeTime = new Date();
        await user.save();

        console.log(`💰 Periodic charge of ${PERIODIC_CHARGE} credits applied to ${username}. New balance: ${user.credits}`);
        return true;
    } catch (error) {
        console.error(`❌ Error applying periodic charge:`, error);
        return false;
    }
}

/**
 * Start credit deduction for an active session
 * @param {string} phoneNumber - The session phone number
 * @param {string} username - The username
 * @param {boolean} isReconnection - Whether this is a reconnection (bot restart)
 * @param {Function} onInsufficientCredits - Callback when credits run out
 */
function startCreditDeduction(phoneNumber, username, isReconnection = false, onInsufficientCredits = null) {
    // Stop any existing timer for this session
    stopCreditDeduction(phoneNumber);

    console.log(`💳 Starting credit deduction for ${username} (${phoneNumber}), reconnection: ${isReconnection}`);

    // Apply initial charge only if NOT a reconnection and NOT already applied
    if (!isReconnection) {
        applyInitialCharge(phoneNumber, username).then(charged => {
            if (!charged && onInsufficientCredits) {
                // If initial charge failed due to insufficient credits, trigger callback
                onInsufficientCredits(phoneNumber);
            }
        });
    }

    // Set up periodic deduction every 15 minutes
    const timer = setInterval(async () => {
        const success = await applyPeriodicCharge(phoneNumber, username);
        
        if (!success) {
            // Stop the timer if charge failed (insufficient credits)
            stopCreditDeduction(phoneNumber);
            
            if (onInsufficientCredits) {
                onInsufficientCredits(phoneNumber);
            }
        }
    }, CHARGE_INTERVAL_MS);

    activeTimers.set(phoneNumber, timer);
    console.log(`✅ Credit deduction timer started for ${username}`);
}

/**
 * Stop credit deduction for a session
 */
function stopCreditDeduction(phoneNumber) {
    const timer = activeTimers.get(phoneNumber);
    if (timer) {
        clearInterval(timer);
        activeTimers.delete(phoneNumber);
        console.log(`⏹️ Credit deduction stopped for ${phoneNumber}`);
    }
}

/**
 * Reset initial charge flag (used when user explicitly logs out)
 */
async function resetInitialCharge(phoneNumber) {
    try {
        let user;
        if (DB_TYPE === 'mongodb') {
            user = await User.findOne({ phoneNumber: phoneNumber });
        } else {
            user = await User.findOne({ where: { phoneNumber: phoneNumber } });
        }

        if (user) {
            user.initialChargeApplied = false;
            await user.save();
            console.log(`🔄 Initial charge flag reset for ${phoneNumber}`);
        }
    } catch (error) {
        console.error(`❌ Error resetting initial charge flag:`, error);
    }
}

/**
 * Calculate estimated time until credits run out
 * @param {number} currentCredits - User's current credit balance
 * @returns {object} Object with days, hours, minutes
 */
function calculateTimeEstimate(currentCredits) {
    if (currentCredits <= 0) {
        return { days: 0, hours: 0, minutes: 0, totalMinutes: 0 };
    }

    // Calculate how many 15-minute intervals the user can afford
    const intervals = Math.floor(currentCredits / PERIODIC_CHARGE);
    const totalMinutes = intervals * 15;
    
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    return { days, hours, minutes, totalMinutes };
}

/**
 * Get credit info for a user
 */
async function getCreditInfo(phoneNumber) {
    try {
        let user;
        if (DB_TYPE === 'mongodb') {
            user = await User.findOne({ phoneNumber: phoneNumber });
        } else {
            user = await User.findOne({ where: { phoneNumber: phoneNumber } });
        }

        if (!user) {
            return null;
        }

        const timeEstimate = calculateTimeEstimate(user.credits);

        return {
            credits: user.credits,
            lastChargeTime: user.lastChargeTime,
            initialChargeApplied: user.initialChargeApplied,
            timeEstimate: timeEstimate
        };
    } catch (error) {
        console.error(`❌ Error getting credit info:`, error);
        return null;
    }
}

module.exports = {
    startCreditDeduction,
    stopCreditDeduction,
    resetInitialCharge,
    applyInitialCharge,
    applyPeriodicCharge,
    calculateTimeEstimate,
    getCreditInfo,
    INITIAL_CHARGE,
    PERIODIC_CHARGE,
    CHARGE_INTERVAL_MS
};
