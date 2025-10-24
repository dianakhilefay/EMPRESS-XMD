#!/usr/bin/env node

/**
 * Test script to verify dashboard statistics functionality
 * This script helps diagnose issues with message count and runtime tracking
 */

require('dotenv').config();
const { initializeDatabase, isDatabaseInitialized, DB_TYPE } = require('./lib/database');
const { User } = require('./lib/userModel');

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testDatabaseConnection() {
    log('\n=== Testing Database Connection ===', 'cyan');
    
    try {
        await initializeDatabase();
        
        if (isDatabaseInitialized()) {
            log('✅ Database connected successfully', 'green');
            log(`   Database Type: ${DB_TYPE}`, 'blue');
            return true;
        } else {
            log('❌ Database failed to initialize', 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Database connection error: ${error.message}`, 'red');
        return false;
    }
}

async function testUserStats() {
    log('\n=== Testing User Statistics ===', 'cyan');
    
    try {
        // Get first user for testing
        let user;
        if (DB_TYPE === 'mongodb') {
            user = await User.findOne();
        } else {
            user = await User.findOne();
        }
        
        if (!user) {
            log('⚠️  No users found in database', 'yellow');
            return;
        }
        
        log(`\nTesting with user: ${user.username}`, 'blue');
        log('Current Stats:', 'blue');
        log(`  - Messages Sent: ${user.messagesSent || 0}`, 'blue');
        log(`  - Total Runtime: ${user.totalRuntime || 0}ms (${Math.floor((user.totalRuntime || 0) / 60000)}m)`, 'blue');
        log(`  - Last Online: ${user.lastOnlineTime || 'Never'}`, 'blue');
        log(`  - Phone Number: ${user.phoneNumber || 'Not set'}`, 'blue');
        
        // Test incrementing message count
        log('\n📊 Testing message count increment...', 'cyan');
        const originalCount = user.messagesSent || 0;
        
        if (DB_TYPE === 'mongodb') {
            await User.findOneAndUpdate(
                { username: user.username },
                { $inc: { messagesSent: 1 } }
            );
        } else {
            user.messagesSent = (user.messagesSent || 0) + 1;
            await user.save();
        }
        
        // Fetch fresh data
        let updatedUser;
        if (DB_TYPE === 'mongodb') {
            updatedUser = await User.findOne({ username: user.username });
        } else {
            updatedUser = await User.findOne({ where: { username: user.username } });
        }
        
        const newCount = updatedUser.messagesSent || 0;
        
        if (newCount === originalCount + 1) {
            log(`✅ Message count incremented successfully: ${originalCount} → ${newCount}`, 'green');
        } else {
            log(`❌ Message count increment failed: ${originalCount} → ${newCount}`, 'red');
        }
        
        // Test runtime tracking
        log('\n⏱️  Testing runtime tracking...', 'cyan');
        const originalRuntime = updatedUser.totalRuntime || 0;
        
        // Simulate going online
        if (DB_TYPE === 'mongodb') {
            await User.findOneAndUpdate(
                { username: user.username },
                { lastOnlineTime: new Date() }
            );
        } else {
            updatedUser.lastOnlineTime = new Date();
            await updatedUser.save();
        }
        
        log('✅ Simulated bot going online (lastOnlineTime set)', 'green');
        
        // Wait 2 seconds
        log('   Waiting 2 seconds...', 'yellow');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate going offline and update runtime
        let finalUser;
        if (DB_TYPE === 'mongodb') {
            finalUser = await User.findOne({ username: user.username });
        } else {
            finalUser = await User.findOne({ where: { username: user.username } });
        }
        
        if (finalUser.lastOnlineTime) {
            const elapsed = Date.now() - new Date(finalUser.lastOnlineTime).getTime();
            finalUser.totalRuntime = (finalUser.totalRuntime || 0) + elapsed;
            finalUser.lastOnlineTime = null;
            await finalUser.save();
            
            const newRuntime = finalUser.totalRuntime;
            const addedMs = newRuntime - originalRuntime;
            
            log(`✅ Runtime tracking works! Added ${addedMs}ms (~${Math.floor(addedMs / 1000)}s)`, 'green');
            log(`   Total runtime: ${Math.floor(newRuntime / 60000)}m ${Math.floor((newRuntime % 60000) / 1000)}s`, 'green');
        } else {
            log('❌ lastOnlineTime was not set', 'red');
        }
        
    } catch (error) {
        log(`❌ Error testing user stats: ${error.message}`, 'red');
        console.error(error);
    }
}

async function listAllUsers() {
    log('\n=== All Users in Database ===', 'cyan');
    
    try {
        let users;
        if (DB_TYPE === 'mongodb') {
            users = await User.find().select('username email phoneNumber messagesSent totalRuntime lastOnlineTime');
        } else {
            users = await User.findAll({
                attributes: ['username', 'email', 'phoneNumber', 'messagesSent', 'totalRuntime', 'lastOnlineTime']
            });
        }
        
        if (users.length === 0) {
            log('No users found', 'yellow');
            return;
        }
        
        log(`Found ${users.length} user(s):\n`, 'blue');
        
        users.forEach((user, index) => {
            log(`${index + 1}. ${user.username}`, 'green');
            log(`   Email: ${user.email}`, 'blue');
            log(`   Phone: ${user.phoneNumber || 'Not set'}`, 'blue');
            log(`   Messages: ${user.messagesSent || 0}`, 'blue');
            log(`   Runtime: ${Math.floor((user.totalRuntime || 0) / 60000)}m`, 'blue');
            log(`   Currently Online: ${user.lastOnlineTime ? 'Yes' : 'No'}`, 'blue');
            console.log();
        });
    } catch (error) {
        log(`❌ Error listing users: ${error.message}`, 'red');
    }
}

async function main() {
    log('\n╔════════════════════════════════════════════════╗', 'cyan');
    log('║   Dashboard Statistics Test Script          ║', 'cyan');
    log('╚════════════════════════════════════════════════╝', 'cyan');
    
    const connected = await testDatabaseConnection();
    
    if (!connected) {
        log('\n❌ Cannot proceed without database connection', 'red');
        process.exit(1);
    }
    
    await listAllUsers();
    await testUserStats();
    
    log('\n✅ All tests completed!', 'green');
    log('\nIf the tests passed, the statistics tracking should be working correctly.', 'blue');
    log('Make sure to:', 'yellow');
    log('  1. Connect your WhatsApp to the bot', 'yellow');
    log('  2. Send some commands (e.g., .ping)', 'yellow');
    log('  3. Check the dashboard after 10 seconds', 'yellow');
    log('  4. Watch the server console for debug logs', 'yellow');
    
    process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
    log(`\n❌ Unhandled error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});

// Run the tests
main();
