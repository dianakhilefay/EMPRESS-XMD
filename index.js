
const express = require("express");
const http = require("http");
require("dotenv").config();
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");
const { useMultiFileAuthState, makeWASocket, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require("@whiskeysockets/baileys");
const P = require("pino");
const fakevCard = require('./lib/fakevcard');
const { initializeDatabase, isDatabaseInitialized, DB_TYPE } = require('./lib/database');
const { SessionManager } = require('./lib/sessionManager');
const { UserConfigManager } = require('./lib/userConfigManager');
const bcrypt = require('bcryptjs');
const { User } = require('./lib/userModel');
const { DeletedAccount } = require('./lib/deletedAccountModel');
const { 
    Ticket,
    getUserActiveTicket,
    getUserTickets,
    createTicket
} = require('./lib/ticketModel');
const { generateToken, authenticateToken, requireDatabaseReady } = require('./lib/authMiddleware');
const { 
    Notification, 
    createNotification, 
    getUnreadCount, 
    getUserNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteOldNotifications 
} = require('./lib/notificationModel');
const {
    isEmailConfigured,
    generateVerificationCode,
    sendVerificationEmail,
    sendWelcomeEmail,
    sendEmailChangeNotification,
    sendPasswordChangeNotification,
    sendAccountDeletionNotification,
    sendTicketConfirmationEmail
} = require('./lib/emailService');
const {
    startCreditDeduction,
    stopCreditDeduction,
    resetInitialCharge,
    getCreditInfo
} = require('./lib/creditManager');
const session = require('express-session');
const passport = require('./lib/oauthConfig');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3000;

const GroupEvents = require("./data/groupevents");
const runtimeTracker = require('./plugins/runtime');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Session middleware for OAuth
app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Store active connections
const activeConnections = new Map();
const pairingCodes = new Map();
const userPrefixes = new Map();

// Store connection timestamps for each session
const connectionTimestamps = new Map();

// Store paused state for each session (to prevent auto-reconnect)
const pausedSessions = new Map();

// Store status media for forwarding
const statusMediaStore = new Map();

let activeSockets = 0;
let totalUsers = 0;

// Persistent data file path
const DATA_FILE = path.join(__dirname, 'data.json');

// Load persistent data
function loadPersistentData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            totalUsers = data.totalUsers || 0;
            
            // Restore paused sessions state
            if (data.pausedSessions && Array.isArray(data.pausedSessions)) {
                data.pausedSessions.forEach(sessionId => {
                    pausedSessions.set(sessionId, true);
                });
                console.log(`⏸️ Restored ${data.pausedSessions.length} paused sessions`);
            }
            
            console.log(`📊 Loaded persistent data: ${totalUsers} total users`);
        } else {
            console.log("📊 No existing persistent data found, starting fresh");
            savePersistentData(); // Create initial file
        }
    } catch (error) {
        console.error("❌ Error loading persistent data:", error);
        totalUsers = 0;
    }
}

// Save persistent data
function savePersistentData() {
    try {
        // Convert pausedSessions Map to array
        const pausedSessionsArray = Array.from(pausedSessions.keys()).filter(key => pausedSessions.get(key));
        
        const data = {
            totalUsers: totalUsers,
            pausedSessions: pausedSessionsArray,
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log(`💾 Saved persistent data: ${totalUsers} total users, ${pausedSessionsArray.length} paused sessions`);
    } catch (error) {
        console.error("❌ Error saving persistent data:", error);
    }
}

// Initialize persistent data
loadPersistentData();

// Auto-save persistent data every 30 seconds
setInterval(() => {
    savePersistentData();
}, 30000);

// Auto-cleanup old notifications (older than 7 days) - runs every hour
setInterval(async () => {
    try {
        const deletedCount = await deleteOldNotifications();
        if (deletedCount > 0) {
            console.log(`🗑️ Cleaned up ${deletedCount} old notifications`);
        }
    } catch (error) {
        console.error('Error in notification cleanup:', error);
    }
}, 3600000); // Every hour

// Run initial cleanup on startup
setTimeout(async () => {
    try {
        const deletedCount = await deleteOldNotifications();
        if (deletedCount > 0) {
            console.log(`🗑️ Initial cleanup: removed ${deletedCount} old notifications`);
        }
    } catch (error) {
        console.error('Error in initial notification cleanup:', error);
    }
}, 5000); // 5 seconds after startup

// Stats broadcasting helper
function broadcastStats() {
    io.emit("statsUpdate", { activeSockets, totalUsers });
}

// Track frontend connections (stats dashboard)
io.on("connection", (socket) => {
    console.log("📊 Frontend connected for stats");
    socket.emit("statsUpdate", { activeSockets, totalUsers });
    
    socket.on("disconnect", () => {
        console.log("📊 Frontend disconnected from stats");
    });
});

// Channel configuration - Updated with new JID and better formatting
const CHANNEL_JIDS = process.env.CHANNEL_JIDS ? process.env.CHANNEL_JIDS.split(',') : [
    "120363402507750390@newsletter",
    "120363419136706156@newsletter",
    "120363420989526190@newsletter"
];

// Default prefix for bot commands
let PREFIX = process.env.PREFIX || ".";

// Bot configuration from environment variables
const BOT_NAME = process.env.BOT_NAME || "ᴍᴀʟᴠɪɴ - ʟɪᴛᴇ";
const OWNER_NAME = process.env.OWNER_NAME || "ᴍᴀʟᴠɪɴ ᴋɪɴɢ";
const REPO_LINK = process.env.REPO_LINK || "https://github.com/XdKing2/MALVIN-XD";

// Auto-status configuration
const AUTO_STATUS_SEEN = process.env.AUTO_STATUS_SEEN || "true";
const AUTO_STATUS_REACT = process.env.AUTO_STATUS_REACT || "false";
const AUTO_STATUS_REPLY = process.env.AUTO_STATUS_REPLY || "false";
const AUTO_STATUS_MSG = process.env.AUTO_STATUS_MSG || "_sᴛᴀᴛᴜs sᴇᴇɴ ʙʏ ᴍᴀʟᴠɪɴ xᴅ_";
const DEV = process.env.DEV || 'XdKing2';

// Newsletter react configuration
const NEWSLETTER_REACT = process.env.NEWSLETTER_REACT || "true";
const NEWSLETTER_REACT_EMOJIS = process.env.NEWSLETTER_REACT_EMOJIS || "💦,🧚‍♂️,🧚‍♀️,🫂";

// Track login state globally
let isUserLoggedIn = false;

// Load commands from commands folder
const commands = new Map();
const commandsPath = path.join(__dirname, 'plugins');

// Modified loadCommands function to handle multi-command files
function loadCommands() {
    commands.clear();
    
    if (!fs.existsSync(commandsPath)) {
        console.log("❌ Commands directory not found:", commandsPath);
        fs.mkdirSync(commandsPath, { recursive: true });
        console.log("✅ Created commands directory");
        return;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => 
        file.endsWith('.js') && !file.startsWith('.')
    );

    console.log(`📂 Loading commands from ${commandFiles.length} files...`);

    for (const file of commandFiles) {
        try {
            const filePath = path.join(commandsPath, file);
            // Clear cache to ensure fresh load
            if (require.cache[require.resolve(filePath)]) {
                delete require.cache[require.resolve(filePath)];
            }
            
            const commandModule = require(filePath);
            
            // Handle array-based command files (e.g., groups-cmds.js)
            if (Array.isArray(commandModule)) {
                commandModule.forEach(commandData => {
                    if ((commandData.pattern || commandData.name) && commandData.execute) {
                        const commandKey = commandData.pattern || commandData.name;
                        commands.set(commandKey, commandData);
                        console.log(`✅ Loaded command: ${commandKey}`);
                        
                        // Also add aliases if they exist
                        if (commandData.alias && Array.isArray(commandData.alias)) {
                            commandData.alias.forEach(alias => {
                                commands.set(alias, commandData);
                                console.log(`✅ Loaded alias: ${alias} -> ${commandKey}`);
                            });
                        }
                        if (commandData.aliases && Array.isArray(commandData.aliases)) {
                            commandData.aliases.forEach(alias => {
                                commands.set(alias, commandData);
                                console.log(`✅ Loaded alias: ${alias} -> ${commandKey}`);
                            });
                        }
                    }
                });
            } else if ((commandModule.pattern || commandModule.name) && commandModule.execute) {
                // Single command file
                const commandKey = commandModule.pattern || commandModule.name;
                commands.set(commandKey, commandModule);
                console.log(`✅ Loaded command: ${commandKey}`);
                
                // Also add aliases if they exist
                if (commandModule.aliases && Array.isArray(commandModule.aliases)) {
                    commandModule.aliases.forEach(alias => {
                        commands.set(alias, commandModule);
                        console.log(`✅ Loaded alias: ${alias} -> ${commandKey}`);
                    });
                }
            } else if (typeof commandModule === 'object') {
                // Multi-command file (like your structure)
                for (const [commandName, commandData] of Object.entries(commandModule)) {
                    if ((commandData.pattern || commandData.name) && commandData.execute) {
                        const commandKey = commandData.pattern || commandData.name;
                        commands.set(commandKey, commandData);
                        console.log(`✅ Loaded command: ${commandKey}`);
                        
                        // Also add aliases if they exist
                        if (commandData.alias && Array.isArray(commandData.alias)) {
                            commandData.alias.forEach(alias => {
                                commands.set(alias, commandData);
                                console.log(`✅ Loaded alias: ${alias} -> ${commandKey}`);
                            });
                        }
                        if (commandData.aliases && Array.isArray(commandData.aliases)) {
                            commandData.aliases.forEach(alias => {
                                commands.set(alias, commandData);
                                console.log(`✅ Loaded alias: ${alias} -> ${commandKey}`);
                            });
                        }
                    }
                }
            } else {
                console.log(`⚠️ Skipping ${file}: invalid command structure`);
            }
        } catch (error) {
            console.error(`❌ Error loading commands from ${file}:`, error.message);
        }
    }

    // Add runtime command
    const runtimeCommand = runtimeTracker.getRuntimeCommand();
    if (runtimeCommand.pattern && runtimeCommand.execute) {
        commands.set(runtimeCommand.pattern, runtimeCommand);
    }
}

// Initial command load
loadCommands();

// Watch for changes in commands directory
if (fs.existsSync(commandsPath)) {
    fs.watch(commandsPath, (eventType, filename) => {
        if (filename && filename.endsWith('.js')) {
            console.log(`🔄 Reloading command: ${filename}`);
            loadCommands();
        }
    });
}

// Serve the main page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve login page
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Serve register page
app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "register.html"));
});

// Serve verify-email page
app.get("/verify-email", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "verify-email.html"));
});

// Serve dashboard page
app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Serve profile page
app.get("/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "profile.html"));
});

// Serve settings page
app.get("/settings", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "settings.html"));
});

// Serve ticket page
app.get("/ticket", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "ticket.html"));
});

// API endpoint for user login
app.post("/api/auth/login", requireDatabaseReady, async (req, res) => {
    try {
        const { username, password, keepSignedIn } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        // Check if username is blacklisted
        const blacklistedUsername = await DeletedAccount.findOne({ username });
        if (blacklistedUsername) {
            return res.status(403).json({ error: "This account was deleted and cannot be accessed" });
        }

        // Find user by username
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            return res.status(403).json({ 
                error: "Email not verified. Please check your email for verification code.",
                requiresVerification: true,
                email: user.email,
                username: user.username
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const token = generateToken(user);

        console.log(`✅ User ${username} logged in successfully`);

        res.json({
            success: true,
            token,
            user: {
                id: user._id || user.id,
                username: user.username,
                email: user.email,
                accountType: user.accountType,
                sessionActive: user.sessionActive
            },
            redirectUrl: '/dashboard'
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ 
            error: "Internal server error",
            details: error.message 
        });
    }
});

// API endpoint for user registration
app.post("/api/auth/register", requireDatabaseReady, async (req, res) => {
    try {
        const { email, username, password, referralCode } = req.body;
        
        if (!email || !username || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Validate username
        if (username.length < 6) {
            return res.status(400).json({ error: "Username must be at least 6 characters" });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({ error: "Username can only contain letters, numbers and underscores" });
        }

        // Validate password
        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        // Check if email or username is blacklisted
        const blacklistedEmail = await DeletedAccount.findOne({ email: email.toLowerCase() });
        if (blacklistedEmail) {
            return res.status(403).json({ error: "This account was previously deleted and cannot be registered again" });
        }

        const blacklistedUsername = await DeletedAccount.findOne({ username });
        if (blacklistedUsername) {
            return res.status(403).json({ error: "This username was previously used by a deleted account and cannot be registered again" });
        }

        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ error: "Username already taken" });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return res.status(400).json({ error: "Email already registered" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate unique referral code based on username
        const generateReferralCode = (username) => {
            const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            return `${username.substring(0, 4).toUpperCase()}${hash}${Date.now().toString(36).substring(5)}`;
        };

        let userReferralCode = generateReferralCode(username);
        // Ensure uniqueness
        let codeExists = await User.findOne({ referralCode: userReferralCode });
        while (codeExists) {
            userReferralCode = generateReferralCode(username + Math.random().toString(36).substring(7));
            codeExists = await User.findOne({ referralCode: userReferralCode });
        }

        // Process referral if provided
        let referredByUsername = null;
        if (referralCode) {
            const referrer = await User.findOne({ referralCode: referralCode.trim() });
            if (referrer) {
                // Award 1 credit to referrer
                referrer.credits = (referrer.credits || 0) + 1;
                await referrer.save();
                referredByUsername = referrer.username;
                console.log(`💰 Referral bonus: ${referrer.username} earned 1 credit`);
                
                // Create notification for referrer
                try {
                    await createNotification(
                        referrer.username,
                        'referral',
                        'New Referral! 🎉',
                        `${username} just signed up using your referral code! You earned 1 credit.`
                    );
                    console.log(`🔔 Notification created for ${referrer.username}`);
                    
                    // Emit real-time notification via socket
                    io.emit('new-notification', {
                        userId: referrer.username,
                        type: 'referral',
                        title: 'New Referral! 🎉',
                        message: `${username} just signed up using your referral code! You earned 1 credit.`
                    });
                } catch (notifError) {
                    console.error('Error creating referral notification:', notifError);
                }
            }
        }

        // Generate verification code
        const verificationCode = generateVerificationCode();
        const verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Create new user with 65 default credits (not verified yet)
        const newUser = new User({
            username,
            email: email.toLowerCase(),
            password: hashedPassword,
            accountType: 'free',
            sessionActive: false,
            credits: 65,
            referralCode: userReferralCode,
            referredBy: referredByUsername,
            isEmailVerified: false,
            verificationCode: verificationCode,
            verificationCodeExpiry: verificationCodeExpiry
        });

        await newUser.save();

        console.log(`✅ New user registered: ${username} with referral code: ${userReferralCode}`);

        // Send verification email
        if (isEmailConfigured()) {
            const emailResult = await sendVerificationEmail(email.toLowerCase(), username, verificationCode);
            if (emailResult !== true && emailResult.success === false) {
                console.warn('⚠️ Failed to send verification email, but user was created');
                console.warn('⚠️ Email error:', emailResult.error);
            }
        } else {
            console.warn('⚠️ Email service not configured. User created without verification email.');
        }

        res.status(201).json({
            success: true,
            message: "Account created successfully. Please check your email for verification code.",
            requiresVerification: true,
            user: {
                username: newUser.username,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ 
            error: "Internal server error",
            details: error.message 
        });
    }
});

// API endpoint to verify email
app.post("/api/auth/verify-email", requireDatabaseReady, async (req, res) => {
    try {
        const { email, username, verificationCode } = req.body;
        
        if (!email || !username || !verificationCode) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Find user
        const user = await User.findOne({ 
            email: email.toLowerCase(),
            username: username
        });
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if already verified
        if (user.isEmailVerified) {
            return res.status(400).json({ error: "Email already verified" });
        }

        // Check if code matches
        if (user.verificationCode !== verificationCode) {
            return res.status(400).json({ error: "Invalid verification code" });
        }

        // Check if code expired
        if (!user.verificationCodeExpiry || new Date() > user.verificationCodeExpiry) {
            return res.status(400).json({ error: "Verification code expired. Please request a new one." });
        }

        // Update user as verified
        user.isEmailVerified = true;
        user.verificationCode = null;
        user.verificationCodeExpiry = null;
        await user.save();

        console.log(`✅ Email verified for user ${username}`);

        // Send welcome email
        if (isEmailConfigured()) {
            await sendWelcomeEmail(email.toLowerCase(), username);
        }

        res.json({
            success: true,
            message: "Email verified successfully! You can now login."
        });

    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ 
            error: "Internal server error",
            details: error.message 
        });
    }
});

// API endpoint to resend verification code
app.post("/api/auth/resend-verification", requireDatabaseReady, async (req, res) => {
    try {
        const { email, username } = req.body;
        
        if (!email || !username) {
            return res.status(400).json({ error: "Email and username are required" });
        }

        // Find user
        const user = await User.findOne({ 
            email: email.toLowerCase(),
            username: username
        });
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if already verified
        if (user.isEmailVerified) {
            return res.status(400).json({ error: "Email already verified" });
        }

        // Generate new verification code
        const verificationCode = generateVerificationCode();
        const verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Save verification code to database first
        user.verificationCode = verificationCode;
        user.verificationCodeExpiry = verificationCodeExpiry;
        await user.save();
        
        console.log(`📝 New verification code generated for ${username}: ${verificationCode}`);
        console.log(`⏰ Code expires at: ${verificationCodeExpiry.toISOString()}`);

        // Send verification email
        if (isEmailConfigured()) {
            console.log(`📧 Attempting to send verification email to ${email.toLowerCase()}...`);
            const emailResult = await sendVerificationEmail(email.toLowerCase(), username, verificationCode);
            
            // Check if email sending failed
            if (emailResult !== true && emailResult.success === false) {
                console.error(`❌ Failed to send verification email to ${email}:`, emailResult.error);
                console.error(`❌ Full error details:`, emailResult.details);
                return res.status(500).json({ 
                    error: "Failed to send verification email",
                    details: emailResult.error,
                    note: "Your verification code has been saved. You can try requesting a new code in a moment, or contact support if the issue persists."
                });
            }
            
            console.log(`✅ Verification email sent successfully to ${email}`);
        } else {
            console.error(`❌ Email service not configured - cannot send verification email`);
            return res.status(503).json({ error: "Email service not configured" });
        }

        console.log(`✅ Verification code resent to ${email}`);

        res.json({
            success: true,
            message: "Verification code sent to your email"
        });

    } catch (error) {
        console.error("Resend verification error:", error);
        res.status(500).json({ 
            error: "Internal server error",
            details: error.message 
        });
    }
});

// ===================================
// OAuth Routes (Google & GitHub)
// ===================================

// Google OAuth - Initiate authentication
app.get("/api/auth/google", passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Google OAuth - Callback handler
app.get("/api/auth/google/callback", 
    passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
    async (req, res) => {
        try {
            // Generate JWT token for the user
            const token = generateToken(req.user);
            
            // Redirect to dashboard with token
            res.redirect(`/dashboard?token=${token}&oauth=google`);
        } catch (error) {
            console.error('Google OAuth callback error:', error);
            res.redirect('/login?error=oauth_error');
        }
    }
);

// GitHub OAuth - Initiate authentication
app.get("/api/auth/github", passport.authenticate('github', {
    scope: ['user:email']
}));

// GitHub OAuth - Callback handler
app.get("/api/auth/github/callback",
    passport.authenticate('github', { failureRedirect: '/login?error=github_auth_failed' }),
    async (req, res) => {
        try {
            // Generate JWT token for the user
            const token = generateToken(req.user);
            
            // Redirect to dashboard with token
            res.redirect(`/dashboard?token=${token}&oauth=github`);
        } catch (error) {
            console.error('GitHub OAuth callback error:', error);
            res.redirect('/login?error=oauth_error');
        }
    }
);

// API endpoint to request pairing code
app.post("/api/pair", authenticateToken, async (req, res) => {
    let conn;
    try {
        const { number } = req.body;
        const user = req.user;
        
        if (!number) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        // Normalize phone number
        const normalizedNumber = number.replace(/\D/g, "");
        
        // Update user's phone number in database
        try {
            const dbUser = await User.findOne({ username: user.username });
            if (dbUser) {
                dbUser.phoneNumber = normalizedNumber;
                dbUser.sessionActive = true;
                await dbUser.save();
                console.log(`📱 Updated phone number for user ${user.username}: ${normalizedNumber}`);
            }
        } catch (dbError) {
            console.error("Error updating user phone number:", dbError);
        }
        
        // Create a session directory for this user (if it doesn't exist)
        const sessionDir = path.join(__dirname, "sessions", normalizedNumber);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
            console.log(`📁 Created session directory: ${sessionDir}`);
        } else {
            console.log(`📁 Using existing session directory: ${sessionDir}`);
        }

        // Initialize WhatsApp connection
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();
        
        conn = makeWASocket({
            logger: P({ level: "silent" }),
            printQRInTerminal: false,
            auth: state,
            version,
            browser: Browsers.macOS("Safari"),
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            maxIdleTimeMs: 60000,
            maxRetries: 10,
            markOnlineOnConnect: true,
            emitOwnEvents: true,
            defaultQueryTimeoutMs: 60000,
            syncFullHistory: false,
            transactionOpts: {
                maxCommitRetries: 10,
                delayBetweenTriesMs: 3000
            }
        });

        // Check if this is a new user (first time connection)
        const isNewUser = !activeConnections.has(normalizedNumber) && 
                         !fs.existsSync(path.join(sessionDir, 'creds.json'));

        // Store the connection and saveCreds function with user info
        activeConnections.set(normalizedNumber, { 
            conn, 
            saveCreds, 
            hasLinked: activeConnections.get(normalizedNumber)?.hasLinked || false,
            username: user.username  // Link to authenticated user
        });

        // Count this user in totalUsers only if it's a new user
        if (isNewUser) {
            totalUsers++;
            activeConnections.get(normalizedNumber).hasLinked = true;
            console.log(`👤 New user connected! Total users: ${totalUsers}`);
            savePersistentData(); // Save immediately for new users
        }
        
        broadcastStats();

        // Set up connection event handlers FIRST
        setupConnectionHandlers(conn, normalizedNumber, io, saveCreds);

        // Wait a moment for the connection to initialize
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Request pairing code
        const pairingCode = await conn.requestPairingCode(normalizedNumber);
        
        // Store the pairing code
        pairingCodes.set(normalizedNumber, { code: pairingCode, timestamp: Date.now() });

        // Return the pairing code to the frontend
        res.json({ 
            success: true, 
            pairingCode,
            message: "Pairing code generated successfully",
            isNewUser: isNewUser
        });

    } catch (error) {
        console.error("Error generating pairing code:", error);
        
        if (conn) {
            try {
                conn.ws.close();
            } catch (e) {}
        }
        
        res.status(500).json({ 
            error: "Failed to generate pairing code",
            details: error.message 
        });
    }
});

// NEW: API endpoint for explicit logout with session deletion
app.post("/api/logout", authenticateToken, async (req, res) => {
    try {
        const { number } = req.body;
        const user = req.user;
        
        if (!number) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        const normalizedNumber = number.replace(/\D/g, "");
        const sessionDir = path.join(__dirname, "sessions", normalizedNumber);
        
        // Check if session exists
        if (!fs.existsSync(sessionDir)) {
            return res.status(404).json({ error: "Session not found" });
        }

        // Stop credit deduction
        stopCreditDeduction(normalizedNumber);
        
        // Reset initial charge flag on explicit logout
        await resetInitialCharge(normalizedNumber);
        
        // Close the connection if active
        if (activeConnections.has(normalizedNumber)) {
            const connectionData = activeConnections.get(normalizedNumber);
            
            try {
                connectionData.conn.ws.close();
            } catch (e) {
                console.error("Error closing connection:", e);
            }
            activeConnections.delete(normalizedNumber);
        }
        
        // Clear paused state on explicit logout
        pausedSessions.delete(normalizedNumber);

        // Delete the session folder (only when user explicitly logs out)
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log(`🗑️ Session folder deleted for ${normalizedNumber} (explicit logout)`);
        
        // Also delete from database
        await SessionManager.deleteSessionFromDatabase(normalizedNumber);
        
        // Update user's session status and clear paused state
        try {
            const dbUser = await User.findOne({ username: user.username });
            if (dbUser) {
                dbUser.sessionActive = false;
                dbUser.sessionPaused = false;
                await dbUser.save();
                console.log(`📱 Updated session status for user ${user.username}`);
            }
        } catch (dbError) {
            console.error("Error updating user session status:", dbError);
        }
        
        // Update stats
        activeSockets = Math.max(0, activeSockets - 1);
        broadcastStats();
        
        res.json({ 
            success: true, 
            message: "Logged out successfully and session deleted" 
        });
        
    } catch (error) {
        console.error("Error during logout:", error);
        res.status(500).json({ 
            error: "Failed to logout",
            details: error.message 
        });
    }
});

// API endpoint to get user settings
app.get("/api/user/settings", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        // IMPORTANT: Use user.username to ensure all sessions from same account share settings
        const userConfig = await UserConfigManager.getUserConfig(user.username);
        
        const settings = {
            autoStatusView: userConfig?.autoStatusSeen !== undefined ? userConfig.autoStatusSeen : true,
            autoStatusReact: userConfig?.autoStatusReact !== undefined ? userConfig.autoStatusReact : false,
            autoStatusReply: userConfig?.autoStatusReply !== undefined ? userConfig.autoStatusReply : false,
            statusMessage: userConfig?.autoStatusMsg || '_status seen by Void V4_',
            botMode: userConfig?.botMode || 'public',
            commandPrefix: userConfig?.prefix || '.',
            authorizedUsers: userConfig?.authorizedUsers || [],
            autoRead: userConfig?.autoRead !== undefined ? userConfig.autoRead : false
        };

        res.json({ success: true, settings });
    } catch (error) {
        console.error("Error getting settings:", error);
        res.status(500).json({ 
            error: "Failed to get settings",
            details: error.message 
        });
    }
});

// API endpoint to update user settings
app.post("/api/user/settings", authenticateToken, async (req, res) => {
    try {
        const settings = req.body;
        const user = req.user;
        
        // Map frontend field names to database field names
        const dbSettings = {
            prefix: settings.commandPrefix,
            autoStatusSeen: settings.autoStatusView,
            autoStatusReact: settings.autoStatusReact,
            autoStatusReply: settings.autoStatusReply,
            autoStatusMsg: settings.statusMessage,
            botMode: settings.botMode,
            authorizedUsers: settings.authorizedUsers || [],
            autoRead: settings.autoRead !== undefined ? settings.autoRead : false
        };
        
        // IMPORTANT: Use user.username to ensure all sessions from same account share settings
        await UserConfigManager.updateUserConfig(user.username, dbSettings);
        
        console.log(`✅ Settings updated for user ${user.username}:`, dbSettings);

        res.json({ 
            success: true, 
            message: "Settings updated successfully",
            settings 
        });
    } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({ 
            error: "Failed to update settings",
            details: error.message 
        });
    }
});

// API endpoint to get user profile
app.get("/api/user/profile", authenticateToken, async (req, res) => {
    try {
        const user = req.user;

        // Format member since date
        const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });

        const profile = {
            username: user.username,
            email: user.email,
            accountType: user.accountType,
            memberSince: memberSince,
            phoneNumber: user.phoneNumber,
            sessionActive: user.sessionActive,
            lastLogin: user.lastLogin,
            credits: user.credits || 0,
            referralCode: user.referralCode || null,
            referredBy: user.referredBy || null
        };

        res.json({ success: true, profile });
    } catch (error) {
        console.error("Error getting profile:", error);
        res.status(500).json({ 
            error: "Failed to get profile",
            details: error.message 
        });
    }
});

// API endpoint to get referral statistics
app.get("/api/user/referral-stats", authenticateToken, async (req, res) => {
    try {
        const user = req.user;

        let referralCount = 0;

        // Count how many users were referred by this user's referral code
        if (DB_TYPE === 'mongodb') {
            referralCount = await User.countDocuments({ 
                referredBy: user.username 
            });
        } else {
            // Sequelize (PostgreSQL/SQLite)
            referralCount = await User.count({ 
                where: { referredBy: user.username }
            });
        }

        // Each referral earns 1 credit, so earned credits = referral count
        const earnedCredits = referralCount;

        res.json({ 
            success: true, 
            stats: {
                referralCount,
                earnedCredits
            }
        });
    } catch (error) {
        console.error("Error getting referral stats:", error);
        res.status(500).json({ 
            error: "Failed to get referral stats",
            details: error.message 
        });
    }
});

// API endpoint to update user email
app.post("/api/user/email", authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newEmail } = req.body;
        const user = req.user;
        
        if (!currentPassword || !newEmail) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Incorrect password" });
        }

        // Check if email is already in use by another user
        const existingEmail = await User.findOne({ 
            email: newEmail.toLowerCase(),
            _id: { $ne: user._id }
        });
        
        if (existingEmail) {
            return res.status(400).json({ error: "Email already in use" });
        }

        // Store old email for notification
        const oldEmail = user.email;

        // Update email
        user.email = newEmail.toLowerCase();
        await user.save();

        console.log(`✅ Email updated for user ${user.username}`);

        // Send email change notification
        if (isEmailConfigured()) {
            await sendEmailChangeNotification(oldEmail, user.username, newEmail.toLowerCase());
        }

        // Create in-app notification
        try {
            await createNotification(
                user.username,
                'system',
                'Email Updated',
                `Your email address has been changed to ${newEmail.toLowerCase()}`
            );
        } catch (notifError) {
            console.error('Error creating email change notification:', notifError);
        }

        res.json({ 
            success: true, 
            message: "Email updated successfully" 
        });
    } catch (error) {
        console.error("Error updating email:", error);
        res.status(500).json({ 
            error: "Failed to update email",
            details: error.message 
        });
    }
});

// API endpoint to update user password
app.post("/api/user/password", authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = req.user;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "All fields are required" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Incorrect current password" });
        }

        // Check if new password is same as current
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ error: "New password must be different from current password" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        user.password = hashedPassword;
        await user.save();

        console.log(`✅ Password updated for user ${user.username}`);

        // Send password change notification
        if (isEmailConfigured()) {
            await sendPasswordChangeNotification(user.email, user.username);
        }

        // Create in-app notification
        try {
            await createNotification(
                user.username,
                'system',
                'Password Changed',
                'Your password has been successfully changed'
            );
        } catch (notifError) {
            console.error('Error creating password change notification:', notifError);
        }

        res.json({ 
            success: true, 
            message: "Password updated successfully" 
        });
    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ 
            error: "Failed to update password",
            details: error.message 
        });
    }
});

// API endpoint to delete user account permanently
app.delete("/api/user/account", authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        const user = req.user;
        
        if (!password) {
            return res.status(400).json({ error: "Password is required to delete account" });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Incorrect password" });
        }

        const username = user.username;
        const email = user.email;
        const phoneNumber = user.phoneNumber;

        console.log(`🗑️ Starting account deletion for user: ${username}`);

        // 1. Delete all sessions associated with this user
        if (phoneNumber) {
            const normalizedNumber = phoneNumber.replace(/\D/g, "");
            const sessionDir = path.join(__dirname, "sessions", normalizedNumber);
            
            // Close active connection if exists
            if (activeConnections.has(normalizedNumber)) {
                const { conn } = activeConnections.get(normalizedNumber);
                try {
                    conn.ws.close();
                } catch (e) {
                    console.error("Error closing connection:", e);
                }
                activeConnections.delete(normalizedNumber);
            }
            
            // Clear paused state
            pausedSessions.delete(normalizedNumber);
            
            // Delete session folder
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                console.log(`🗑️ Deleted session folder for ${normalizedNumber}`);
            }
            
            // Delete from session database
            await SessionManager.deleteSessionFromDatabase(normalizedNumber);
        }

        // 2. Delete user configuration
        if (phoneNumber) {
            const normalizedNumber = phoneNumber.replace(/\D/g, "");
            await UserConfigManager.deleteUserConfig(normalizedNumber);
        }

        // 3. Delete user notifications
        if (DB_TYPE === 'mongodb') {
            await Notification.deleteMany({ userId: username });
        } else {
            await Notification.destroy({
                where: { userId: username }
            });
        }
        console.log(`🗑️ Deleted notifications for ${username}`);

        // 4. Add to blacklist
        const deletedAccount = new DeletedAccount({
            email: email.toLowerCase(),
            username: username,
            deletedAt: new Date(),
            reason: 'User requested account deletion'
        });
        await deletedAccount.save();
        console.log(`🚫 Added ${email} and ${username} to blacklist`);

        // 5. Send account deletion notification email
        if (isEmailConfigured()) {
            await sendAccountDeletionNotification(email, username);
        }

        // 6. Delete the user account
        if (DB_TYPE === 'mongodb') {
            await User.deleteOne({ _id: user._id });
        } else {
            await User.destroy({
                where: { id: user.id }
            });
        }
        console.log(`✅ User account ${username} deleted successfully`);

        // Update stats
        if (activeSockets > 0) {
            activeSockets--;
            broadcastStats();
        }

        res.json({ 
            success: true, 
            message: "Account deleted successfully" 
        });

    } catch (error) {
        console.error("Error deleting account:", error);
        res.status(500).json({ 
            error: "Failed to delete account",
            details: error.message 
        });
    }
});

// API endpoint to get current domain
app.get("/api/domain", (req, res) => {
    try {
        const protocol = req.protocol;
        const host = req.get('host');
        const domain = `${protocol}://${host}`;
        
        res.json({ 
            success: true, 
            domain: domain 
        });
    } catch (error) {
        console.error("Error getting domain:", error);
        res.status(500).json({ 
            error: "Failed to get domain",
            details: error.message 
        });
    }
});

// API endpoint to add credits (admin feature)
app.post("/api/user/credits/add", authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;
        const user = req.user;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Invalid credit amount" });
        }

        // For now, allow any user to add credits (you can add admin check later)
        user.credits = (user.credits || 0) + amount;
        await user.save();

        console.log(`💰 ${amount} credits added to user ${user.username}`);

        res.json({ 
            success: true, 
            message: `${amount} credits added successfully`,
            newBalance: user.credits
        });
    } catch (error) {
        console.error("Error adding credits:", error);
        res.status(500).json({ 
            error: "Failed to add credits",
            details: error.message 
        });
    }
});

// API endpoint to get credit info including time estimate
app.get("/api/user/credits/info", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { calculateTimeEstimate } = require('./lib/creditManager');
        
        if (!user.phoneNumber) {
            // Calculate time estimate directly without database lookup
            const timeEstimate = calculateTimeEstimate(user.credits || 0);
            return res.json({
                success: true,
                credits: user.credits || 0,
                lastChargeTime: user.lastChargeTime,
                timeEstimate: timeEstimate
            });
        }
        
        const normalizedNumber = user.phoneNumber.replace(/\D/g, "");
        const creditInfo = await getCreditInfo(normalizedNumber);
        
        if (!creditInfo) {
            // Calculate time estimate directly if getCreditInfo fails
            const timeEstimate = calculateTimeEstimate(user.credits || 0);
            return res.json({
                success: true,
                credits: user.credits || 0,
                lastChargeTime: null,
                timeEstimate: timeEstimate
            });
        }
        
        res.json({
            success: true,
            credits: creditInfo.credits,
            lastChargeTime: creditInfo.lastChargeTime,
            initialChargeApplied: creditInfo.initialChargeApplied,
            timeEstimate: creditInfo.timeEstimate
        });
    } catch (error) {
        console.error("Error getting credit info:", error);
        res.status(500).json({
            error: "Failed to get credit info",
            details: error.message
        });
    }
});

// PayPal Payment endpoints
const paypalService = require('./lib/paypalService');

// Get available packages
app.get("/api/paypal/packages", authenticateToken, async (req, res) => {
    try {
        if (!paypalService.isPayPalConfigured()) {
            return res.status(503).json({ 
                error: "PayPal is not configured",
                configured: false
            });
        }

        res.json({
            success: true,
            packages: paypalService.PACKAGES,
            mode: paypalService.PAYPAL_MODE,
            configured: true
        });
    } catch (error) {
        console.error("Error getting PayPal packages:", error);
        res.status(500).json({
            error: "Failed to get packages",
            details: error.message
        });
    }
});

// Create PayPal order
app.post("/api/paypal/create-order", authenticateToken, async (req, res) => {
    try {
        const { packageId } = req.body;
        const user = req.user;

        if (!packageId) {
            return res.status(400).json({ error: "Package ID is required" });
        }

        if (!paypalService.isPayPalConfigured()) {
            return res.status(503).json({ error: "PayPal is not configured" });
        }

        // Get domain for return URLs
        const protocol = req.protocol;
        const host = req.get('host');
        const domain = `${protocol}://${host}`;

        const returnUrl = `${domain}/api/paypal/capture-order`;
        const cancelUrl = `${domain}/dashboard`;

        const orderData = await paypalService.createOrder(packageId, returnUrl, cancelUrl);

        // Store order details in user session for later verification
        req.session.pendingPayPalOrder = {
            orderId: orderData.orderId,
            packageId: packageId,
            userId: user._id,
            username: user.username,
            coins: orderData.package.coins,
            price: orderData.package.price
        };

        console.log(`💳 PayPal order created for ${user.username}: ${packageId} (${orderData.package.coins} coins)`);

        res.json({
            success: true,
            orderId: orderData.orderId,
            approvalUrl: orderData.approvalUrl
        });
    } catch (error) {
        console.error("Error creating PayPal order:", error);
        res.status(500).json({
            error: "Failed to create order",
            details: error.message
        });
    }
});

// Capture PayPal order (after user approves payment)
app.get("/api/paypal/capture-order", async (req, res) => {
    try {
        const { token: orderId } = req.query;

        if (!orderId) {
            return res.redirect('/dashboard?payment=error&reason=missing_order_id');
        }

        // Get pending order from session
        const pendingOrder = req.session.pendingPayPalOrder;
        
        if (!pendingOrder || pendingOrder.orderId !== orderId) {
            return res.redirect('/dashboard?payment=error&reason=invalid_order');
        }

        // Capture the payment
        const captureData = await paypalService.captureOrder(orderId);

        if (captureData.success && captureData.status === 'COMPLETED') {
            // Add credits to user account
            const user = await User.findById(pendingOrder.userId);
            
            if (user) {
                user.credits = (user.credits || 0) + pendingOrder.coins;
                await user.save();

                // Create notification
                await createNotification(
                    user.username,
                    'payment_success',
                    `Payment successful! ${pendingOrder.coins} coins added to your account.`,
                    {
                        coins: pendingOrder.coins,
                        amount: pendingOrder.price,
                        orderId: orderId
                    }
                );

                console.log(`✅ Payment captured for ${user.username}: +${pendingOrder.coins} coins (Order: ${orderId})`);

                // Clear pending order from session
                delete req.session.pendingPayPalOrder;

                return res.redirect('/dashboard?payment=success&coins=' + pendingOrder.coins);
            }
        }

        res.redirect('/dashboard?payment=error&reason=capture_failed');
    } catch (error) {
        console.error("Error capturing PayPal order:", error);
        res.redirect('/dashboard?payment=error&reason=capture_exception');
    }
});

// Check payment status
app.get("/api/paypal/order-status/:orderId", authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        
        if (!paypalService.isPayPalConfigured()) {
            return res.status(503).json({ error: "PayPal is not configured" });
        }

        const orderDetails = await paypalService.getOrderDetails(orderId);

        res.json({
            success: true,
            order: orderDetails.order
        });
    } catch (error) {
        console.error("Error getting PayPal order status:", error);
        res.status(500).json({
            error: "Failed to get order status",
            details: error.message
        });
    }
});

// Notification endpoints
// Get user notifications
app.get("/api/notifications", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const notifications = await getUserNotifications(user.username);
        const unreadCount = await getUnreadCount(user.username);
        
        res.json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error("Error getting notifications:", error);
        res.status(500).json({
            error: "Failed to get notifications",
            details: error.message
        });
    }
});

// Get unread notification count
app.get("/api/notifications/count", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const unreadCount = await getUnreadCount(user.username);
        
        res.json({
            success: true,
            unreadCount
        });
    } catch (error) {
        console.error("Error getting notification count:", error);
        res.status(500).json({
            error: "Failed to get notification count",
            details: error.message
        });
    }
});

// Mark notification(s) as read
app.post("/api/notifications/read", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { notificationIds } = req.body;
        
        if (!notificationIds || !Array.isArray(notificationIds)) {
            return res.status(400).json({ error: "Invalid notification IDs" });
        }
        
        await markAsRead(user.username, notificationIds);
        const unreadCount = await getUnreadCount(user.username);
        
        res.json({
            success: true,
            message: "Notifications marked as read",
            unreadCount
        });
    } catch (error) {
        console.error("Error marking notifications as read:", error);
        res.status(500).json({
            error: "Failed to mark notifications as read",
            details: error.message
        });
    }
});

// Mark all notifications as read
app.post("/api/notifications/read-all", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        await markAllAsRead(user.username);
        
        res.json({
            success: true,
            message: "All notifications marked as read",
            unreadCount: 0
        });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({
            error: "Failed to mark all notifications as read",
            details: error.message
        });
    }
});

// Ticket endpoints
// Create a new ticket
app.post("/api/ticket/create", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { reason, message } = req.body;
        
        // Validate input
        if (!reason || !message) {
            return res.status(400).json({ 
                error: "Reason and message are required" 
            });
        }
        
        if (message.trim().length < 10) {
            return res.status(400).json({ 
                error: "Message must be at least 10 characters long" 
            });
        }
        
        // Check if user already has an active ticket
        const activeTicket = await getUserActiveTicket(user.id);
        if (activeTicket) {
            return res.status(400).json({ 
                error: "You already have an active ticket. Please wait for it to be resolved.",
                activeTicket: {
                    ticketId: activeTicket.ticketId,
                    reason: activeTicket.reason,
                    status: activeTicket.status,
                    createdAt: activeTicket.createdAt
                }
            });
        }
        
        // Create the ticket
        const ticket = await createTicket(
            user.id,
            user.email,
            user.username,
            reason,
            message.trim()
        );
        
        // Send confirmation email
        await sendTicketConfirmationEmail(
            user.email,
            user.username,
            ticket.ticketId,
            reason,
            message.trim()
        );
        
        console.log(`🎫 Ticket ${ticket.ticketId} created by ${user.username}`);
        
        res.json({
            success: true,
            message: "Ticket created successfully. Check your email for confirmation.",
            ticket: {
                ticketId: ticket.ticketId,
                reason: ticket.reason,
                status: ticket.status,
                createdAt: ticket.createdAt
            }
        });
    } catch (error) {
        console.error("Error creating ticket:", error);
        res.status(500).json({
            error: "Failed to create ticket",
            details: error.message
        });
    }
});

// Get user's tickets
app.get("/api/ticket/my-tickets", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const tickets = await getUserTickets(user.id);
        
        res.json({
            success: true,
            tickets: tickets.map(ticket => ({
                ticketId: ticket.ticketId,
                reason: ticket.reason,
                message: ticket.message,
                status: ticket.status,
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt
            }))
        });
    } catch (error) {
        console.error("Error getting tickets:", error);
        res.status(500).json({
            error: "Failed to get tickets",
            details: error.message
        });
    }
});

// Get active ticket
app.get("/api/ticket/active", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const activeTicket = await getUserActiveTicket(user.id);
        
        if (!activeTicket) {
            return res.json({
                success: true,
                activeTicket: null
            });
        }
        
        res.json({
            success: true,
            activeTicket: {
                ticketId: activeTicket.ticketId,
                reason: activeTicket.reason,
                message: activeTicket.message,
                status: activeTicket.status,
                createdAt: activeTicket.createdAt,
                updatedAt: activeTicket.updatedAt
            }
        });
    } catch (error) {
        console.error("Error getting active ticket:", error);
        res.status(500).json({
            error: "Failed to get active ticket",
            details: error.message
        });
    }
});

// API endpoint to get dashboard stats
// Global stats endpoint (for landing page - no auth required)
app.get("/api/stats/global", async (req, res) => {
    try {
        const stats = {
            totalUsers: totalUsers,
            activeSessions: activeSockets,
            botStatus: activeSockets > 0 ? 'online' : 'offline'
        };

        res.json({ success: true, stats });
    } catch (error) {
        console.error("Error getting global stats:", error);
        res.status(500).json({ 
            error: "Failed to get global stats",
            details: error.message 
        });
    }
});

// User-specific dashboard stats endpoint (requires authentication)
app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        console.log(`📊 Dashboard stats requested for user: ${user.username}`);
        
        // Get user-specific session count and paused state
        let userActiveSessions = 0;
        let isPaused = false;
        if (user.phoneNumber) {
            const normalizedNumber = user.phoneNumber.replace(/\D/g, "");
            if (activeConnections.has(normalizedNumber)) {
                userActiveSessions = 1;
            }
            isPaused = pausedSessions.get(normalizedNumber) || false;
        }
        
        // Determine bot status: online if active, paused if paused, offline otherwise
        let botStatus = 'offline';
        if (userActiveSessions > 0) {
            botStatus = 'online';
        } else if (isPaused) {
            botStatus = 'paused';
            // When paused, count it as 1 active session (just in paused state)
            userActiveSessions = 1;
        }
        
        const stats = {
            activeSessions: userActiveSessions,  // User-specific session count
            botStatus: botStatus,
            accountType: user.accountType || 'free'
        };

        console.log(`📊 Returning stats for ${user.username}:`, {
            botStatus: stats.botStatus
        });

        res.json({ success: true, stats });
    } catch (error) {
        console.error("❌ Error getting stats:", error);
        res.status(500).json({ 
            error: "Failed to get stats",
            details: error.message 
        });
    }
});

// Get user session info endpoint
app.get("/api/session/info", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        if (!user.phoneNumber) {
            return res.json({ 
                success: true, 
                session: null 
            });
        }
        
        const normalizedNumber = user.phoneNumber.replace(/\D/g, "");
        const isConnected = activeConnections.has(normalizedNumber);
        const isPaused = pausedSessions.get(normalizedNumber);
        const connectedAt = connectionTimestamps.get(normalizedNumber);
        
        if (isConnected) {
            res.json({ 
                success: true, 
                session: {
                    sessionId: normalizedNumber,
                    connected: true,
                    paused: false,
                    connectedAt: connectedAt || new Date().toISOString()
                }
            });
        } else if (isPaused) {
            // Check if session directory exists (auth is saved)
            const sessionDir = path.join(__dirname, "sessions", normalizedNumber);
            if (fs.existsSync(sessionDir)) {
                res.json({ 
                    success: true, 
                    session: {
                        sessionId: normalizedNumber,
                        connected: false,
                        paused: true,
                        connectedAt: connectedAt || null
                    }
                });
            } else {
                res.json({ 
                    success: true, 
                    session: null 
                });
            }
        } else {
            res.json({ 
                success: true, 
                session: null 
            });
        }
    } catch (error) {
        console.error("Error getting session info:", error);
        res.status(500).json({ 
            error: "Failed to get session info",
            details: error.message 
        });
    }
});

// Session control endpoints
app.post("/api/session/stop", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        if (!user.phoneNumber) {
            return res.status(400).json({ 
                error: "No phone number associated with user" 
            });
        }
        
        const normalizedNumber = user.phoneNumber.replace(/\D/g, "");
        const connection = activeConnections.get(normalizedNumber);
        
        if (!connection) {
            return res.json({ 
                success: true, 
                message: "Session is already stopped" 
            });
        }
        
        // Stop credit deduction when session is paused
        stopCreditDeduction(normalizedNumber);
        
        // Set paused state to prevent auto-reconnect
        pausedSessions.set(normalizedNumber, true);
        savePersistentData(); // Save paused state immediately
        
        // Save paused state to database for persistence across restarts
        try {
            await User.updateOne(
                { phoneNumber: user.phoneNumber },
                { sessionPaused: true }
            );
            console.log(`⏸️ Session ${normalizedNumber} marked as paused in database`);
        } catch (dbError) {
            console.error(`⚠️ Failed to save paused state to database:`, dbError.message);
        }
        
        console.log(`⏸️ Session ${normalizedNumber} marked as paused (no auto-reconnect)`);
        
        // Close the WhatsApp connection WITHOUT deleting auth
        // The connection.update event handler will handle cleanup when it detects the paused state
        try {
            // Use sock.ws?.close() to close WebSocket without deleting auth
            if (connection.conn && connection.conn.ws) {
                connection.conn.ws.close();
                console.log(`🛑 Session ${normalizedNumber} stopped via API (sock.ws.close) - auth preserved`);
            } else if (connection.conn && connection.conn.end) {
                connection.conn.end();
                console.log(`🛑 Session ${normalizedNumber} stopped via API (sock.end) - auth preserved`);
            } else {
                // Fallback: manually cleanup if no ws/end methods available
                console.log(`🛑 Session ${normalizedNumber} stopped via API (direct removal) - auth preserved`);
                // Manual cleanup only as fallback
                activeConnections.delete(normalizedNumber);
                connectionTimestamps.delete(normalizedNumber);
                activeSockets = Math.max(0, activeSockets - 1);
                broadcastStats();
                io.emit("unlinked", { sessionId: normalizedNumber, paused: true });
            }
        } catch (error) {
            console.log(`⚠️ Session ${normalizedNumber} force stopped:`, error.message);
            // On error, do manual cleanup
            activeConnections.delete(normalizedNumber);
            connectionTimestamps.delete(normalizedNumber);
            activeSockets = Math.max(0, activeSockets - 1);
            broadcastStats();
            io.emit("unlinked", { sessionId: normalizedNumber, paused: true });
        }
        
        // Note: Cleanup (deleting from activeConnections, etc.) is handled by the 
        // connection.update event handler when it detects the paused state.
        // This allows for proper WebSocket close handling.
        
        res.json({ 
            success: true, 
            message: "Session stopped successfully (auth preserved)" 
        });
        
    } catch (error) {
        console.error("Error stopping session:", error);
        res.status(500).json({ 
            error: "Failed to stop session",
            details: error.message 
        });
    }
});

app.post("/api/session/start", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        if (!user.phoneNumber) {
            return res.status(400).json({ 
                error: "No phone number associated with user" 
            });
        }
        
        const normalizedNumber = user.phoneNumber.replace(/\D/g, "");
        
        // Check if already connected
        if (activeConnections.has(normalizedNumber)) {
            return res.json({ 
                success: true, 
                message: "Session is already running" 
            });
        }
        
        // Check if session directory exists
        const sessionDir = path.join(__dirname, "sessions", normalizedNumber);
        if (!fs.existsSync(sessionDir)) {
            return res.status(400).json({ 
                error: "No saved session found. Please pair first." 
            });
        }
        
        // Clear paused state when user manually starts
        pausedSessions.delete(normalizedNumber);
        savePersistentData(); // Save unpaused state immediately
        
        // Clear paused state in database for persistence across restarts
        try {
            await User.updateOne(
                { phoneNumber: user.phoneNumber },
                { sessionPaused: false }
            );
            console.log(`▶️ Session ${normalizedNumber} unpaused in database`);
        } catch (dbError) {
            console.error(`⚠️ Failed to clear paused state in database:`, dbError.message);
        }
        
        console.log(`▶️ Session ${normalizedNumber} unpaused (manual start)`);
        
        // Start the session
        console.log(`🚀 Starting session ${normalizedNumber} via API`);
        await initializeConnection(normalizedNumber);
        
        res.json({ 
            success: true, 
            message: "Session start initiated" 
        });
        
    } catch (error) {
        console.error("Error starting session:", error);
        res.status(500).json({ 
            error: "Failed to start session",
            details: error.message 
        });
    }
});

app.post("/api/session/restart", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        if (!user.phoneNumber) {
            return res.status(400).json({ 
                error: "No phone number associated with user" 
            });
        }
        
        const normalizedNumber = user.phoneNumber.replace(/\D/g, "");
        console.log(`🔄 Restarting session ${normalizedNumber} via API`);
        
        // Stop first if running
        const connection = activeConnections.get(normalizedNumber);
        if (connection) {
            try {
                // Use sock.ws?.close() to close WebSocket connection without losing session
                if (connection.conn && connection.conn.ws) {
                    connection.conn.ws.close();
                    console.log(`🛑 Session ${normalizedNumber} stopped for restart (sock.ws.close) - auth preserved`);
                } else if (connection.conn && connection.conn.end) {
                    connection.conn.end();
                    console.log(`🛑 Session ${normalizedNumber} stopped for restart (sock.end) - auth preserved`);
                } else {
                    console.log(`🛑 Session ${normalizedNumber} stopped for restart (direct removal) - auth preserved`);
                }
            } catch (error) {
                console.log(`⚠️ Session ${normalizedNumber} force stopped for restart:`, error.message);
            }
            
            // Clean up
            activeConnections.delete(normalizedNumber);
            connectionTimestamps.delete(normalizedNumber);
            activeSockets = Math.max(0, activeSockets - 1);
            broadcastStats();
            
            // Notify frontend of disconnection
            io.emit("unlinked", { sessionId: normalizedNumber });
        }
        
        // Clear paused state when user manually restarts
        pausedSessions.delete(normalizedNumber);
        savePersistentData(); // Save unpaused state immediately
        
        // Clear paused state in database for persistence across restarts
        try {
            await User.updateOne(
                { phoneNumber: user.phoneNumber },
                { sessionPaused: false }
            );
            console.log(`▶️ Session ${normalizedNumber} unpaused in database`);
        } catch (dbError) {
            console.error(`⚠️ Failed to clear paused state in database:`, dbError.message);
        }
        
        console.log(`▶️ Session ${normalizedNumber} unpaused (manual restart)`);
        
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if session directory exists
        const sessionDir = path.join(__dirname, "sessions", normalizedNumber);
        if (!fs.existsSync(sessionDir)) {
            return res.status(400).json({ 
                error: "No saved session found. Please pair first." 
            });
        }
        
        // Recreate socket with same auth state (no re-scan needed)
        console.log(`🚀 Restarting session ${normalizedNumber} with existing auth`);
        await initializeConnection(normalizedNumber);
        
        res.json({ 
            success: true, 
            message: "Session restart initiated (using existing auth)" 
        });
        
    } catch (error) {
        console.error("Error restarting session:", error);
        res.status(500).json({ 
            error: "Failed to restart session",
            details: error.message 
        });
    }
});

// Delete session endpoint - completely removes session and auth
app.post("/api/session/delete", authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        if (!user.phoneNumber) {
            return res.status(400).json({ 
                error: "No phone number associated with user" 
            });
        }
        
        const normalizedNumber = user.phoneNumber.replace(/\D/g, "");
        console.log(`🗑️ Deleting session ${normalizedNumber} via API`);
        
        // Stop the connection if running
        const connection = activeConnections.get(normalizedNumber);
        if (connection) {
            try {
                // Close WebSocket connection
                if (connection.conn && connection.conn.ws) {
                    connection.conn.ws.close();
                    console.log(`🛑 Session ${normalizedNumber} stopped for deletion (sock.ws.close)`);
                } else if (connection.conn && connection.conn.end) {
                    connection.conn.end();
                    console.log(`🛑 Session ${normalizedNumber} stopped for deletion (sock.end)`);
                }
            } catch (error) {
                console.log(`⚠️ Session ${normalizedNumber} force stopped for deletion:`, error.message);
            }
            
            // Clean up active connections
            activeConnections.delete(normalizedNumber);
            connectionTimestamps.delete(normalizedNumber);
            activeSockets = Math.max(0, activeSockets - 1);
            broadcastStats();
        }
        
        // Clear paused state
        pausedSessions.delete(normalizedNumber);
        
        // Delete session folder
        const sessionDir = path.join(__dirname, "sessions", normalizedNumber);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            console.log(`✅ Session folder deleted for: ${normalizedNumber}`);
        }
        
        // Delete from database
        try {
            await SessionManager.deleteSessionFromDatabase(normalizedNumber);
            console.log(`✅ Session deleted from database: ${normalizedNumber}`);
        } catch (err) {
            console.error(`⚠️ Failed to delete session ${normalizedNumber} from database:`, err);
        }
        
        // Notify frontend of deletion
        io.emit("unlinked", { sessionId: normalizedNumber, deleted: true });
        
        res.json({ 
            success: true, 
            message: "Session deleted successfully" 
        });
        
    } catch (error) {
        console.error("Error deleting session:", error);
        res.status(500).json({ 
            error: "Failed to delete session",
            details: error.message 
        });
    }
});

// Enhanced channel subscription function - Updated with simplified message
async function subscribeToChannels(conn) {
    const results = [];
    
    for (const channelJid of CHANNEL_JIDS) {
        try {
            console.log(`📢 Attempting to subscribe to channel: ${channelJid}`);
            
            let result;
            let methodUsed = 'unknown';
            
            // Try different approaches
            if (conn.newsletterFollow) {
                methodUsed = 'newsletterFollow';
                result = await conn.newsletterFollow(channelJid);
            } 
            else if (conn.followNewsletter) {
                methodUsed = 'followNewsletter';
                result = await conn.followNewsletter(channelJid);
            }
            else if (conn.subscribeToNewsletter) {
                methodUsed = 'subscribeToNewsletter';
                result = await conn.subscribeToNewsletter(channelJid);
            }
            else if (conn.newsletter && conn.newsletter.follow) {
                methodUsed = 'newsletter.follow';
                result = await conn.newsletter.follow(channelJid);
            }
            else {
                methodUsed = 'manual_presence_only';
                await conn.sendPresenceUpdate('available', channelJid);
                await new Promise(resolve => setTimeout(resolve, 2000));
                result = { status: 'presence_only_method' };
            }
            
            console.log(`✅ Successfully subscribed to channel using ${methodUsed}!`);
            results.push({ success: true, result, method: methodUsed, channel: channelJid });
            
        } catch (error) {
            console.error(`❌ Failed to subscribe to channel ${channelJid}:`, error.message);
            
            try {
                console.log(`🔄 Trying silent fallback subscription method for ${channelJid}...`);
                await conn.sendPresenceUpdate('available', channelJid);
                await new Promise(resolve => setTimeout(resolve, 3000));
                console.log(`✅ Used silent fallback subscription method for ${channelJid}!`);
                results.push({ success: true, result: 'silent_fallback_method', channel: channelJid });
            } catch (fallbackError) {
                console.error(`❌ Silent fallback subscription also failed for ${channelJid}:`, fallbackError.message);
                results.push({ success: false, error: fallbackError, channel: channelJid });
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
}

// Function to get message type
function getMessageType(message) {
    if (message.message?.conversation) return 'TEXT';
    if (message.message?.extendedTextMessage) return 'TEXT';
    if (message.message?.imageMessage) return 'IMAGE';
    if (message.message?.videoMessage) return 'VIDEO';
    if (message.message?.audioMessage) return 'AUDIO';
    if (message.message?.documentMessage) return 'DOCUMENT';
    if (message.message?.stickerMessage) return 'STICKER';
    if (message.message?.contactMessage) return 'CONTACT';
    if (message.message?.locationMessage) return 'LOCATION';
    
    const messageKeys = Object.keys(message.message || {});
    for (const key of messageKeys) {
        if (key.endsWith('Message')) {
            return key.replace('Message', '').toUpperCase();
        }
    }
    
    return 'UNKNOWN';
}

// Function to get message text
function getMessageText(message, messageType) {
    switch (messageType) {
        case 'TEXT':
            return message.message?.conversation || 
                   message.message?.extendedTextMessage?.text || '';
        case 'IMAGE':
            return message.message?.imageMessage?.caption || '[Image]';
        case 'VIDEO':
            return message.message?.videoMessage?.caption || '[Video]';
        case 'AUDIO':
            return '[Audio]';
        case 'DOCUMENT':
            return message.message?.documentMessage?.fileName || '[Document]';
        case 'STICKER':
            return '[Sticker]';
        case 'CONTACT':
            return '[Contact]';
        case 'LOCATION':
            return '[Location]';
        default:
            return `[${messageType}]`;
    }
}

// Function to get quoted message details
function getQuotedMessage(message) {
    if (!message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        return null;
    }
    
    const quoted = message.message.extendedTextMessage.contextInfo;
    return {
        message: {
            key: {
                remoteJid: quoted.participant || quoted.stanzaId,
                fromMe: quoted.participant === (message.key.participant || message.key.remoteJid),
                id: quoted.stanzaId
            },
            message: quoted.quotedMessage,
            mtype: Object.keys(quoted.quotedMessage || {})[0]?.replace('Message', '') || 'text'
        },
        sender: quoted.participant
    };
}

// Newsletter react function - FIXED VERSION
async function handleNewsletterReact(conn, message) {
    try {
        if (NEWSLETTER_REACT !== "true") {
            console.log('📢 Newsletter react disabled');
            return;
        }
        
        const from = message.key.remoteJid;
        if (!from.endsWith('@newsletter')) {
            console.log('📢 Not a newsletter message:', from);
            return;
        }
        
        console.log('📢 Processing newsletter message for react:', from);
        
        // Get newsletter react emojis - FIXED: Use let instead of const
        let emojis = NEWSLETTER_REACT_EMOJIS.split(',').map(e => e.trim()).filter(e => e);
        if (emojis.length === 0) {
            emojis = ['💦', '🧚‍♂️', '🧚‍♀️', '🫂', '❤️', '🔥', '💯', '🌟'];
        }
        
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        console.log(`📢 Selected emoji: ${randomEmoji} for newsletter`);
        
        // Add delay to make it look natural
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        
        // Send reaction with proper error handling
        await conn.sendMessage(from, {
            react: {
                text: randomEmoji,
                key: message.key,
            }
        });
        
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] 📢 Successfully reacted to newsletter with ${randomEmoji} emoji`);
        
    } catch (error) {
        console.error("❌ Error reacting to newsletter:", error.message);
        console.error("❌ Full error:", error);
    }
}

// Check if user is authorized to use the bot in private mode
async function isUserAuthorized(userConfig, message, conn) {
    // If bot is in public mode, everyone is authorized
    if (userConfig.botMode === 'public') {
        return true;
    }
    
    // If bot is in private mode, check if sender is the bot owner
    const sender = message.key.participant || message.key.remoteJid;
    const botJid = conn.user.id;
    
    // For private mode, if the message is fromMe, it's always authorized (bot owner)
    if (message.key.fromMe) {
        console.log(`🔐 Authorization: Message fromMe - AUTHORIZED`);
        return true;
    }
    
    // Extract phone number from bot JID (format: 1234567890:60@s.whatsapp.net)
    const botPhoneNumber = botJid.includes(':') ? botJid.split(':')[0] : botJid.split('@')[0];
    
    // Extract phone number from sender JID (various formats possible)
    let senderPhoneNumber;
    if (sender.includes('@lid')) {
        // Handle @lid format: 26701430837265@lid
        senderPhoneNumber = sender.split('@')[0];
    } else if (sender.includes('@s.whatsapp.net')) {
        // Handle standard format: 1234567890@s.whatsapp.net
        senderPhoneNumber = sender.split('@')[0];
    } else if (sender.includes(':')) {
        // Handle format with colon: 1234567890:60@s.whatsapp.net
        senderPhoneNumber = sender.split(':')[0];
    } else {
        senderPhoneNumber = sender;
    }
    
    // Check if sender is the bot owner (compare phone numbers)
    const isBotOwner = senderPhoneNumber === botPhoneNumber;
    
    // Check if sender is in authorized users list (compare just phone numbers)
    const isAuthorizedUser = userConfig.authorizedUsers.some(authUser => {
        // Remove any @ symbols and extensions from stored authorized user
        const authPhoneNumber = authUser.split('@')[0];
        return authPhoneNumber === senderPhoneNumber;
    });
    
    console.log(`🔐 Authorization check:`, {
        fromMe: message.key.fromMe,
        botPhoneNumber,
        senderPhoneNumber, 
        isBotOwner,
        isAuthorizedUser,
        result: isBotOwner || isAuthorizedUser
    });
    
    return isBotOwner || isAuthorizedUser;
}

// Handle incoming messages and execute commands
async function handleMessage(conn, message, sessionId) {
    try {
        // Get user-specific configuration using username from activeConnections
        const connectionData = activeConnections.get(sessionId);
        const username = connectionData?.username;
        
        // IMPORTANT: Use username to ensure all sessions from same account share settings
        const userConfig = await UserConfigManager.getUserConfig(username || sessionId);
        
        // Auto-status features (using user-specific settings)
        if (message.key && message.key.remoteJid === 'status@broadcast') {
            if (userConfig.autoStatusSeen) {
                await conn.readMessages([message.key]).catch(console.error);
            }
            
            if (userConfig.autoStatusReact) {
                // Get bot's JID directly from the connection object
                const botJid = conn.user.id;
                const emojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '🗿', '🇿🇼', '💜', '💙', '🌝', '🖤', '💚'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                await conn.sendMessage(message.key.remoteJid, {
                    react: {
                        text: randomEmoji,
                        key: message.key,
                    } 
                }, { statusJidList: [message.key.participant, botJid] }).catch(console.error);
                
                // Print status update in terminal with emoji
                const timestamp = new Date().toLocaleTimeString();
                console.log(`[${timestamp}] ✅ Auto-liked a status with ${randomEmoji} emoji`);
            }                       
            
            if (userConfig.autoStatusReply) {
                const user = message.key.participant;
                const text = userConfig.autoStatusMsg;
                await conn.sendMessage(user, { text: text, react: { text: '💜', key: message.key } }, { quoted: message }).catch(console.error);
            }
            
            // Store status media for forwarding
            if (message.message && (message.message.imageMessage || message.message.videoMessage)) {
                statusMediaStore.set(message.key.participant, {
                    message: message,
                    timestamp: Date.now()
                });
            }
            
            return;
        }

        if (!message.message) return;

        // Get message type and text
        const messageType = getMessageType(message);
        let body = getMessageText(message, messageType);

        // Auto-read messages (if enabled) - BEFORE command processing
        if (userConfig.autoRead && message.key && !message.key.fromMe) {
            try {
                await conn.readMessages([message.key]);
                console.log(`📖 Auto-read message from: ${message.key.remoteJid || 'unknown'}`);
            } catch (error) {
                console.error('❌ Error auto-reading message:', error);
            }
        }

        // Handle newsletter react BEFORE command processing
        const from = message.key.remoteJid;
        if (from.endsWith('@newsletter')) {
            console.log('🔍 NEWSLETTER DETECTED:', {
                from: from,
                hasMessage: !!message.message,
                messageType: messageType,
                newsletterReactEnabled: NEWSLETTER_REACT === "true"
            });
            await handleNewsletterReact(conn, message);
        }

        // Get user-specific prefix from config
        const userPrefix = userConfig.prefix;
        
        // Check if message starts with prefix
        if (!body.startsWith(userPrefix)) {
            return;
        }

        // Parse command and arguments
        const args = body.slice(userPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        console.log(`🔍 Detected command: ${commandName} from user: ${sessionId}`);
        console.log(`🔍 Debug - sender: ${message.key.participant || message.key.remoteJid}, fromMe: ${message.key.fromMe}`);

        // DEBUG: For @lid messages, log the full message structure to understand available data
        if ((message.key.participant || message.key.remoteJid).endsWith('@lid')) {
            console.log('🔍 DEBUG @lid message structure:', {
                key: message.key,
                pushName: message.pushName,
                verifiedBizName: message.verifiedBizName,
                messageContextInfo: message.message?.extendedTextMessage?.contextInfo,
                participant: message.key.participant,
                remoteJid: message.key.remoteJid
            });
        }

        // Check if user is authorized to use the bot
        const isAuthorized = await isUserAuthorized(userConfig, message, conn);
        
        if (!isAuthorized) {
            // In private mode, just ignore unauthorized commands silently
            console.log(`🚫 Unauthorized access attempt from ${message.key.participant || message.key.remoteJid} - ignoring silently`);
            return;
        }

        // Handle built-in commands (pass username for consistency)
        const builtInHandled = await handleBuiltInCommands(conn, message, commandName, args, username || sessionId, userConfig);
        if (builtInHandled) {
            console.log(`✅ Built-in command executed: ${commandName}`);
            return;
        }

        // Find and execute command from commands folder
        if (commands.has(commandName)) {
            const command = commands.get(commandName);
            
            console.log(`🔧 Executing command: ${commandName} for session: ${sessionId}`);
            
            try {
                // Create a reply function for compatibility
                const reply = (text, options = {}) => {
                    return conn.sendMessage(message.key.remoteJid, { text }, { 
                        quoted: message, 
                        ...options 
                    });
                };
                
                // Get group metadata for group commands
                let groupMetadata = null;
                const isGroup = from.endsWith('@g.us');
                
                if (isGroup) {
                    try {
                        groupMetadata = await conn.groupMetadata(from);
                    } catch (error) {
                        console.error("Error fetching group metadata:", error);
                    }
                }
                
                // Get quoted message if exists
                const quotedMessage = getQuotedMessage(message);
                
                // Prepare parameters in the format your commands expect
                const m = {
                    mentionedJid: message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [],
                    quoted: quotedMessage,
                    sender: message.key.participant || message.key.remoteJid
                };
                
                const q = body.slice(userPrefix.length + commandName.length).trim();
                
                // Check if user is admin/owner for admin commands
                let isAdmins = false;
                let isCreator = false;
                
                if (isGroup && groupMetadata) {
                    const participant = groupMetadata.participants.find(p => p.id === m.sender);
                    isAdmins = participant?.admin === 'admin' || participant?.admin === 'superadmin';
                    isCreator = participant?.admin === 'superadmin';
                }
                
                // Execute command with compatible parameters
                await command.execute(conn, message, m, { 
                    userPrefix: userPrefix,
                    args: args,
                    q, 
                    reply, 
                    from: from,
                    isGroup: isGroup,
                    groupMetadata: groupMetadata,
                    sender: message.key.participant || message.key.remoteJid,
                    isAdmins: isAdmins,
                    isCreator: isCreator,
                    config: {
                        BOT_NAME: process.env.BOT_NAME || 'MALVIN LITE'
                    }
                });
                
                console.log(`✅ Plugin command executed: ${commandName}`);
            } catch (error) {
                console.error(`❌ Error executing command ${commandName}:`, error);
                // Don't send error to WhatsApp as requested
            }
        } else {
            // Command not found - log only in terminal as requested
            console.log(`⚠️ Command not found: ${commandName}`);
        }
    } catch (error) {
        console.error("Error handling message:", error);
        // Don't send error to WhatsApp as requested
    }
}

// Handle built-in commands - FIXED VERSION
async function handleBuiltInCommands(conn, message, commandName, args, sessionId, userConfig) {
    try {
        const userPrefix = userConfig.prefix;
        const from = message.key.remoteJid;
        
        // Handle newsletter/channel messages differently
        if (from.endsWith('@newsletter')) {
            console.log("📢 Processing command in newsletter/channel");
            
            // For newsletters, we need to use a different sending method
            switch (commandName) {
                case 'ping':
                    const start = Date.now();
                    const end = Date.now();
                    const responseTime = (end - start) / 1000;
                    
                    const details = `${BOT_NAME}
                    
⏱️ ᴘɪɴɢ: *${responseTime.toFixed(2)}s* ⚡
👤 Oᴡɴᴇʀ: *${OWNER_NAME}*`;

                    // Try to send to newsletter using proper method
                    try {
                        if (conn.newsletterSend) {
                            await conn.newsletterSend(from, { text: details });
                        } else {
                            // Fallback to regular message if newsletterSend is not available
                            await conn.sendMessage(from, { text: details });
                        }
                    } catch (error) {
                        console.error("Error sending to newsletter:", error);
                    }
                    return true;
                    
                default:
                    // For other commands in newsletters, just acknowledge
                    try {
                        if (conn.newsletterSend) {
                            await conn.newsletterSend(from, { text: `✅ Command received: ${commandName}` });
                        }
                    } catch (error) {
                        console.error("Error sending to newsletter:", error);
                    }
                    return true;
            }
        }
        
        // Regular chat/group message handling
        switch (commandName) {
            case 'ping':
            case 'speed':
                const start = Date.now();
                const pingMsg = await conn.sendMessage(from, { 
                    text: `_🏓 ᴘᴏɴɢ! ᴄʜᴇᴄᴋɪɴɢ sᴘᴇᴇᴅ..._` 
                }, { quoted: fakevCard });
                const end = Date.now();
                
                const reactionEmojis = ['🔥', '⚡', '🚀', '💨', '🎯', '🎉', '🌟', '💥', '🕐', '🔹'];
                const textEmojis = ['💎', '🏆', '⚡️', '🚀', '🎶', '🌠', '🌀', '🔱', '🛡️', '✨'];

                const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
                let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];

                // Ensure reaction and text emojis are different
                while (textEmoji === reactionEmoji) {
                    textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
                }

                // Send reaction
                await conn.sendMessage(from, { 
                    react: { text: textEmoji, key: message.key } 
                });

                const responseTime = (end - start) / 1000;

                const details = `⚡ *${BOT_NAME} sᴘᴇᴇᴅ ᴄʜᴇᴄᴋ* ⚡
                
⏱️ ᴘɪɴɢ: *${responseTime.toFixed(2)}s* ${reactionEmoji}
👤 ᴏᴡɴᴇʀ: *${OWNER_NAME}*

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ`;

                // Send ping with the requested style
                await conn.sendMessage(from, {
                    text: details,
                    contextInfo: {
                        externalAdReply: {
                            title: "⚡ ᴍᴀʟᴠɪɴ xᴅ ʟɪᴛᴇ sᴘᴇᴇᴅ ᴛᴇsᴛ",
                            body: `${BOT_NAME} ᴘᴇғᴏʀᴍᴀɴᴄᴇ`,
                            thumbnailUrl: "https://files.catbox.moe/x7qky4.jpg",
                            sourceUrl: REPO_LINK,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: fakevCard });
                return true;
                
            case 'prefix':
                // Show current prefix or set new prefix
                if (args.length === 0) {
                    const currentPrefix = userConfig.prefix;
                    await conn.sendMessage(from, { 
                        text: `📌 Your current prefix: ${currentPrefix}\n\n💡 To change: ${currentPrefix}prefix <new_prefix>` 
                    }, { quoted: fakevCard });
                } else {
                    const newPrefix = args[0];
                    if (newPrefix.length > 5) {
                        await conn.sendMessage(from, { 
                            text: `❌ Prefix too long! Maximum 5 characters.` 
                        }, { quoted: fakevCard });
                        return true;
                    }
                    
                    // Update user config
                    await UserConfigManager.updateUserConfig(sessionId, { prefix: newPrefix });
                    await conn.sendMessage(from, { 
                        text: `✅ Prefix updated to: ${newPrefix}` 
                    }, { quoted: fakevCard });
                }
                return true;
                
            case 'settings':
            case 'config':
                // Show current user settings
                const settingsText = `⚙️ *Your Bot Settings*

📌 *Prefix:* ${userConfig.prefix}
👁️ *Auto Status View:* ${userConfig.autoStatusSeen ? '✅ Enabled' : '❌ Disabled'}
💗 *Auto Status React:* ${userConfig.autoStatusReact ? '✅ Enabled' : '❌ Disabled'}
💬 *Auto Status Reply:* ${userConfig.autoStatusReply ? '✅ Enabled' : '❌ Disabled'}

💡 *To change settings, use:*
• ${userConfig.prefix}prefix <new_prefix>
• ${userConfig.prefix}autoview <on/off>
• ${userConfig.prefix}autoreact <on/off>
• ${userConfig.prefix}autoreply <on/off>

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ`;
                
                await conn.sendMessage(from, { 
                    text: settingsText 
                }, { quoted: fakevCard });
                return true;
                
            case 'autoview':
            case 'autoseen':
                // Toggle auto status view
                if (args.length === 0) {
                    await conn.sendMessage(from, { 
                        text: `👁️ Auto Status View is currently: ${userConfig.autoStatusSeen ? '✅ Enabled' : '❌ Disabled'}\n\n💡 Usage: ${userConfig.prefix}autoview <on/off>` 
                    }, { quoted: fakevCard });
                } else {
                    const setting = args[0].toLowerCase();
                    const enabled = setting === 'on' || setting === 'true' || setting === 'enable' || setting === '1';
                    await UserConfigManager.updateUserConfig(sessionId, { autoStatusSeen: enabled });
                    await conn.sendMessage(from, { 
                        text: `✅ Auto Status View ${enabled ? 'enabled' : 'disabled'}` 
                    }, { quoted: fakevCard });
                }
                return true;
                
            case 'autoreact':
            case 'autolike':
                // Toggle auto status react
                if (args.length === 0) {
                    await conn.sendMessage(from, { 
                        text: `💗 Auto Status React is currently: ${userConfig.autoStatusReact ? '✅ Enabled' : '❌ Disabled'}\n\n💡 Usage: ${userConfig.prefix}autoreact <on/off>` 
                    }, { quoted: fakevCard });
                } else {
                    const setting = args[0].toLowerCase();
                    const enabled = setting === 'on' || setting === 'true' || setting === 'enable' || setting === '1';
                    await UserConfigManager.updateUserConfig(sessionId, { autoStatusReact: enabled });
                    await conn.sendMessage(from, { 
                        text: `✅ Auto Status React ${enabled ? 'enabled' : 'disabled'}` 
                    }, { quoted: fakevCard });
                }
                return true;
                
            case 'autoreply':
            case 'statusreply':
                // Toggle auto status reply
                if (args.length === 0) {
                    await conn.sendMessage(from, { 
                        text: `💬 Auto Status Reply is currently: ${userConfig.autoStatusReply ? '✅ Enabled' : '❌ Disabled'}\n\n💡 Usage: ${userConfig.prefix}autoreply <on/off>` 
                    }, { quoted: fakevCard });
                } else {
                    const setting = args[0].toLowerCase();
                    const enabled = setting === 'on' || setting === 'true' || setting === 'enable' || setting === '1';
                    await UserConfigManager.updateUserConfig(sessionId, { autoStatusReply: enabled });
                    await conn.sendMessage(from, { 
                        text: `✅ Auto Status Reply ${enabled ? 'enabled' : 'disabled'}` 
                    }, { quoted: fakevCard });
                }
                return true;
                
            default:
                return false;
        }
    } catch (error) {
        console.error("Error in built-in command:", error);
        return false;
    }
}

// Setup connection event handlers - MODIFIED TO ONLY DELETE ON EXPLICIT LOGOUT
function setupConnectionHandlers(conn, sessionId, io, saveCreds) {
    let hasShownConnectedMessage = false;
    let isLoggedOut = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    
 // Handle connection updates
conn.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    
    console.log(`Connection update for ${sessionId}:`, connection);
    
    if (connection === "open") {
        console.log(`✅ WhatsApp connected for session: ${sessionId}`);
        console.log(`🟢 CONNECTED — ${BOT_NAME} is now active for ${sessionId}`);
        
        isUserLoggedIn = true;
        isLoggedOut = false;
        reconnectAttempts = 0;
        activeSockets++;
        broadcastStats();
        
        // Store connection timestamp
        const connectedAt = new Date().toISOString();
        const previousTimestamp = connectionTimestamps.get(sessionId);
        connectionTimestamps.set(sessionId, connectedAt);
        
        // Send connected event to frontend with connection timestamp
        io.emit("linked", { 
            sessionId,
            connectedAt: connectedAt
        });
        
        // Save credentials to database when connection opens
        const sessionDir = path.join(__dirname, "sessions", sessionId);
        SessionManager.saveSessionToDatabase(sessionId, sessionDir).catch(err => {
            console.error(`Failed to save session ${sessionId} to database:`, err);
        });
        
        // Start credit deduction system
        // Determine if this is a reconnection (bot restart) or fresh connection
        const connectionData = activeConnections.get(sessionId);
        const username = connectionData?.username;
        
        if (username) {
            // Check if this is a reconnection by checking if initial charge was already applied
            // This is more reliable than checking timestamps since it persists across bot restarts
            let isReconnection = false;
            
            try {
                let user;
                if (DB_TYPE === 'mongodb') {
                    user = await User.findOne({ phoneNumber: sessionId });
                } else {
                    user = await User.findOne({ where: { phoneNumber: sessionId } });
                }
                
                // If initialChargeApplied is true, this is a reconnection
                if (user && user.initialChargeApplied) {
                    isReconnection = true;
                }
            } catch (error) {
                console.error(`Error checking reconnection status:`, error);
            }
            
            console.log(`💳 Starting credit system for ${username}, reconnection: ${isReconnection}`);
            
            // Callback for when user runs out of credits
            const handleInsufficientCredits = async (phoneNumber) => {
                console.log(`⚠️ User ${username} ran out of credits, stopping session...`);
                
                // Stop the session
                try {
                    const conn = activeConnections.get(phoneNumber);
                    if (conn && conn.conn) {
                        conn.conn.ws?.close();
                    }
                    
                    // Notify user via socket
                    io.emit("insufficient-credits", { 
                        sessionId: phoneNumber,
                        message: "Your session has been stopped due to insufficient credits."
                    });
                } catch (error) {
                    console.error(`Error stopping session due to insufficient credits:`, error);
                }
            };
            
            startCreditDeduction(sessionId, username, isReconnection, handleInsufficientCredits);
        }
        
        if (!hasShownConnectedMessage) {
            hasShownConnectedMessage = true;
            
            setTimeout(async () => {
                try {
                    // Get user-specific prefix using username from activeConnections
                    const connectionData = activeConnections.get(sessionId);
                    const username = connectionData?.username;
                    
                    // IMPORTANT: Use username to ensure all sessions from same account share settings
                    const userConfig = await UserConfigManager.getUserConfig(username || sessionId);
                    const userPrefix = userConfig?.prefix || PREFIX;
                    
                    const subscriptionResults = await subscribeToChannels(conn);
                    
                    // UPDATED: Simplified channel status message
                    let channelStatus = "";
                    if (subscriptionResults.length > 0) {
                        channelStatus = `📢 Channels: Followed ✅\n`;
                    } else {
                        channelStatus = `📢 Channels: Not followed ❌\n`;
                    }

                    let name = "User";
                    try {
                        name = conn.user.name || "User";
                    } catch (error) {
                        console.log("Could not get user name:", error.message);
                    }
                    
                    let up = `
╭════════════════╮
┆  \`🤖 ${BOT_NAME}\`  
╰════════════════╯

👋 Hey *${name}* 🤩  
🎉 Pairing Complete – You're good to go!  

📌 ᴘʀᴇғɪx: ${userPrefix}  
${channelStatus}

🍴 ғᴏʀᴋ ɴ ⭐ ᴍʏ ʀᴇᴘᴏ: https://github.com/XdKing2/MALVIN-XD/fork
                    `;

                    // Send welcome message to user's DM with proper JID format and requested style
                    const userJid = `${conn.user.id.split(":")[0]}@s.whatsapp.net`;
                    await conn.sendMessage(userJid, { 
                        text: up,
                        contextInfo: {
                            mentionedJid: [userJid],
                            forwardingScore: 999,
                            externalAdReply: {
                                title: `${BOT_NAME} Connected 🚀`,
                                body: `⚡ Powered by ${OWNER_NAME}`,
                                thumbnailUrl: "https://files.catbox.moe/x7qky4.jpg",
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    });
                } catch (error) {
                    console.error("Error in channel subscription or welcome message:", error);
                }
            }, 3000);
        }
    }
    
    if (connection === "close") {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        const isPaused = pausedSessions.get(sessionId);
        
        // Stop credit deduction when connection closes
        stopCreditDeduction(sessionId);
        
        // Disable auto-reconnect if session is paused
        if (isPaused) {
            console.log(`⏸️ Session ${sessionId} is paused - auto-reconnect disabled`);
            console.log(`🔒 Connection closed for session: ${sessionId} (paused, no auto-reconnect)`);
            
            isUserLoggedIn = false;
            isLoggedOut = true;
            activeSockets = Math.max(0, activeSockets - 1);
            broadcastStats();
            
            // Remove from active connections
            activeConnections.delete(sessionId);
            connectionTimestamps.delete(sessionId);
            
            io.emit("unlinked", { sessionId, paused: true });
            
            console.log(`💾 Session ${sessionId} auth preserved (paused state)`);
        } else if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`🔁 Connection closed, attempting to reconnect session: ${sessionId} (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
            
            // Reset connected message flag to show again after reconnect
            hasShownConnectedMessage = false;
            
            // Try to reconnect after a delay
            setTimeout(() => {
                if (activeConnections.has(sessionId)) {
                    const { conn: existingConn } = activeConnections.get(sessionId);
                    try {
                        existingConn.ws.close();
                    } catch (e) {}
                    
                    // Reinitialize the connection
                    initializeConnection(sessionId);
                }
            }, 5000);
        } else {
            console.log(`🔒 Connection closed for session: ${sessionId}`);
            
            // CRITICAL FIX: Only delete session folder if user explicitly logged out via /api/logout
            const isExplicitLogout = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
            
            if (isExplicitLogout) {
                console.log(`🗑️ User explicitly logged out, deleting session folder for: ${sessionId}`);
                const sessionDir = path.join(__dirname, "sessions", sessionId);
                if (fs.existsSync(sessionDir)) {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                    console.log(`✅ Session folder deleted for: ${sessionId}`);
                }
                // Also delete from database
                SessionManager.deleteSessionFromDatabase(sessionId).catch(err => {
                    console.error(`Failed to delete session ${sessionId} from database:`, err);
                });
            } else {
                console.log(`💾 Connection closed but NOT due to explicit logout - preserving session folder for: ${sessionId}`);
                // Preserve session folder for reconnections, crashes, server restarts, etc.
            }
            
            isUserLoggedIn = false;
            isLoggedOut = true;
            activeSockets = Math.max(0, activeSockets - 1);
            broadcastStats();
            
            // Remove from active connections
            activeConnections.delete(sessionId);
            
            // Remove connection timestamp
            connectionTimestamps.delete(sessionId);
            
            io.emit("unlinked", { sessionId });
            
            // Log preservation message if not explicit logout
            if (!isExplicitLogout) {
                const sessionDir = path.join(__dirname, "sessions", sessionId);
                if (fs.existsSync(sessionDir)) {
                    const files = fs.readdirSync(sessionDir);
                    console.log(`💾 Session ${sessionId} preserved with files:`, files);
                }
            }
        }
    }
});

    // Handle credentials updates
    conn.ev.on("creds.update", async () => {
        if (saveCreds) {
            await saveCreds();
            
            // Also save to database after file system save
            const sessionDir = path.join(__dirname, "sessions", sessionId);
            SessionManager.saveSessionToDatabase(sessionId, sessionDir).catch(err => {
                console.error(`Failed to save updated creds for ${sessionId} to database:`, err);
            });
        }
    });

    // Handle messages - FIXED: Added proper message handling for all message types
    conn.ev.on("messages.upsert", async (m) => {
        try {
            const message = m.messages[0];
            
            // Get the bot's JID in proper format
            const botJid = conn.user.id;
            const normalizedBotJid = botJid.includes(':') ? botJid.split(':')[0] + '@s.whatsapp.net' : botJid;
            
            // Check if message is from the bot itself (owner)
            const isFromBot = message.key.fromMe || 
                              (message.key.participant && message.key.participant === normalizedBotJid) ||
                              (message.key.remoteJid && message.key.remoteJid === normalizedBotJid);
            
            // Don't process messages sent by the bot unless they're from the owner account
            if (message.key.fromMe && !isFromBot) return;
            
            console.log(`📩 Received message from ${message.key.remoteJid}, fromMe: ${message.key.fromMe}, isFromBot: ${isFromBot}`);
            
            // Handle all message types (private, group, newsletter)
            const from = message.key.remoteJid;
            
            // Check if it's a newsletter message
            if (from.endsWith('@newsletter')) {
                await handleMessage(conn, message, sessionId);
            } 
            // Check if it's a group message
            else if (from.endsWith('@g.us')) {
                await handleMessage(conn, message, sessionId);
            }
            // Check if it's a private message (including @s.whatsapp.net, @lid, and bot messages)
            else if (from.endsWith('@s.whatsapp.net') || from.endsWith('@lid') || isFromBot) {
                await handleMessage(conn, message, sessionId);
            }
            
            // Added message printing for better debugging
            const messageType = getMessageType(message);
            let messageText = getMessageText(message, messageType);
            
            if (!message.key.fromMe || isFromBot) {
                const timestamp = new Date(message.messageTimestamp * 1000).toLocaleTimeString();
                const isGroup = from.endsWith('@g.us');
                const sender = message.key.fromMe ? conn.user.id : (message.key.participant || message.key.remoteJid);
                
                if (isGroup) {
                    console.log(`[${timestamp}] [GROUP: ${from}] ${sender}: ${messageText} (${messageType})`);
                } else {
                    console.log(`[${timestamp}] [PRIVATE] ${sender}: ${messageText} (${messageType})`);
                }
            }
        } catch (error) {
            console.error("Error processing message:", error);
        }
    });

    // Auto View Status feature
    conn.ev.on("messages.upsert", async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.key.fromMe && msg.key.remoteJid === "status@broadcast") {
                await conn.readMessages([msg.key]);
                console.log("✅ Auto-viewed a status.");
            }
        } catch (e) {
            console.error("❌ AutoView failed:", e);
        }
    });

    // Auto Like Status feature
    conn.ev.on("messages.upsert", async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.key.fromMe && msg.key.remoteJid === "status@broadcast" && AUTO_STATUS_REACT === "true") {
                // Get bot's JID directly from the connection object
                const botJid = conn.user.id;
                const emojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '🗿', '🇳🇬', '💜', '💙', '🌝', '🖤', '💚'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                
                await conn.sendMessage(msg.key.remoteJid, {
                    react: {
                        text: randomEmoji,
                        key: msg.key,
                    } 
                }, { statusJidList: [msg.key.participant, botJid] });
                
                // Print status update in terminal with emoji
                const timestamp = new Date().toLocaleTimeString();
                console.log(`[${timestamp}] ✅ Auto-liked a status with ${randomEmoji} emoji`);
            }
        } catch (e) {
            console.error("❌ AutoLike failed:", e);
        }
    });

    // REMOVED DUPLICATE NEWSLETTER REACT EVENT LISTENER - Only one in handleMessage
}

// Function to reinitialize connection
async function initializeConnection(sessionId) {
    try {
        const sessionDir = path.join(__dirname, "sessions", sessionId);
        
        if (!fs.existsSync(sessionDir)) {
            console.log(`Session directory not found for ${sessionId}`);
            return;
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();
        
        const conn = makeWASocket({
            logger: P({ level: "silent" }),
            printQRInTerminal: false,
            auth: state,
            version,
            browser: Browsers.macOS("Safari"),
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            maxIdleTimeMs: 60000,
            maxRetries: 10,
            markOnlineOnConnect: true,
            emitOwnEvents: true,
            defaultQueryTimeoutMs: 60000,
            syncFullHistory: false
        });

        // Look up username from database based on phone number (sessionId)
        let username = null;
        try {
            if (isDatabaseInitialized()) {
                const normalizedNumber = sessionId.replace(/\D/g, "");
                let user;
                if (DB_TYPE === 'mongodb') {
                    user = await User.findOne({ phoneNumber: normalizedNumber });
                } else {
                    user = await User.findOne({ where: { phoneNumber: normalizedNumber } });
                }
                if (user) {
                    username = user.username;
                    console.log(`✅ Found username for session ${sessionId}: ${username}`);
                }
            }
        } catch (error) {
            console.error(`⚠️ Error looking up username for session ${sessionId}:`, error.message);
        }

        activeConnections.set(sessionId, { conn, saveCreds, username });
        setupConnectionHandlers(conn, sessionId, io, saveCreds);
        
    } catch (error) {
        console.error(`Error reinitializing connection for ${sessionId}:`, error);
    }
}

// MODIFIED: Cleanup function that only deletes on explicit logout
function handleSessionCleanup(sessionId, isExplicitLogout) {
    const sessionDir = path.join(__dirname, "sessions", sessionId);
    
    if (isExplicitLogout) {
        // Delete session folder only on explicit logout
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            console.log(`🗑️ Session folder deleted for ${sessionId} (explicit logout)`);
        }
    } else {
        // Preserve session folder for other types of disconnections
        if (fs.existsSync(sessionDir)) {
            const files = fs.readdirSync(sessionDir);
            console.log(`💾 Session preserved for ${sessionId} (non-logout disconnect), files:`, files);
        }
    }
}

// API endpoint to get loaded commands
app.get("/api/plugins", (req, res) => {
    const commandList = Array.from(commands.keys());
    res.json({ commands: commandList });
});

// Socket.io connection handling
io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);
    
    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
    
    socket.on("force-request-qr", () => {
        console.log("QR code regeneration requested");
    });
});

// Function to reload existing sessions on server restart
async function reloadExistingSessions() {
    console.log("🔄 Checking for existing sessions to reload...");
    
    const sessionsDir = path.join(__dirname, "sessions");
    
    // Create sessions directory if it doesn't exist
    if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
        console.log("📁 Created sessions directory");
    }
    
    // First, restore all sessions from database (batch restore)
    console.log("🗄️ Restoring sessions from database...");
    const restoredCount = await SessionManager.restoreAllSessionsFromDatabase(sessionsDir);
    console.log(`📦 Restored ${restoredCount} sessions from database`);
    
    // Load paused session states from database
    try {
        const pausedUsers = await User.find({ sessionPaused: true });
        for (const user of pausedUsers) {
            if (user.phoneNumber) {
                const normalizedNumber = user.phoneNumber.replace(/\D/g, "");
                pausedSessions.set(normalizedNumber, true);
            }
        }
        console.log(`⏸️ Loaded ${pausedUsers.length} paused sessions from database`);
    } catch (dbError) {
        console.error(`⚠️ Failed to load paused sessions from database:`, dbError.message);
        console.log(`📁 Using paused sessions from data.json file as fallback`);
    }
    
    // Now reload all sessions from file system (including restored ones)
    const sessions = fs.readdirSync(sessionsDir);
    console.log(`📂 Found ${sessions.length} session directories`);
    
    for (const sessionId of sessions) {
        const sessionDir = path.join(sessionsDir, sessionId);
        const stat = fs.statSync(sessionDir);
        
        if (stat.isDirectory()) {
            // Check if session is paused - skip auto-reconnection
            if (pausedSessions.get(sessionId)) {
                console.log(`⏸️ Skipping paused session: ${sessionId} (no auto-reconnect)`);
                continue;
            }
            
            console.log(`🔄 Attempting to reload session: ${sessionId}`);
            
            try {
                // Check if this session has valid auth state (creds.json)
                const credsPath = path.join(sessionDir, "creds.json");
                if (fs.existsSync(credsPath)) {
                    await initializeConnection(sessionId);
                    console.log(`✅ Successfully reloaded session: ${sessionId}`);
                    
                    // Count this as an active socket but don't increment totalUsers
                    activeSockets++;
                    console.log(`📊 Active sockets increased to: ${activeSockets}`);
                } else {
                    console.log(`❌ No valid auth state found for session: ${sessionId}`);
                }
            } catch (error) {
                console.error(`❌ Failed to reload session ${sessionId}:`, error.message);
            }
        }
    }
    
    console.log("✅ Session reload process completed");
    broadcastStats(); // Update stats after reloading all sessions
}


// Graceful shutdown - PRESERVES session folders
function gracefulShutdown() {
  if (isShuttingDown) {
    console.log("🛑 Shutdown already in progress...");
    return;
  }
  
  isShuttingDown = true;
  console.log("\n🛑 Shutting down TRACLE LITE server gracefully...");
  console.log("💾 PRESERVING ALL SESSION FOLDERS (server restart/shutdown)");
  
  // Save persistent data before shutting down
  savePersistentData();
  console.log(`💾 Saved persistent data: ${totalUsers} total users`);
  
  let connectionCount = 0;
  activeConnections.forEach((data, sessionId) => {
    try {
      data.conn.ws.close();
      console.log(`🔒 Closed WhatsApp connection for session: ${sessionId}`);
      connectionCount++;
      
      // PRESERVE the session folder during graceful shutdown/restart
      const sessionDir = path.join(__dirname, "sessions", sessionId);
      if (fs.existsSync(sessionDir)) {
          const files = fs.readdirSync(sessionDir);
          console.log(`💾 Preserved session folder for: ${sessionId} (files: ${files.length})`);
      }
    } catch (error) {
      console.error(`❌ Error closing connection for ${sessionId}:`, error.message);
    }
  });
  
  console.log(`✅ Closed ${connectionCount} WhatsApp connections`);
  console.log("💾 ALL SESSION FOLDERS HAVE BEEN PRESERVED");
  console.log("📁 Sessions will be automatically reloaded on next startup");
  
  const shutdownTimeout = setTimeout(() => {
    console.log("⚠️  Force shutdown after timeout");
    process.exit(0);
  }, 5000);
  
  server.close(() => {
    clearTimeout(shutdownTimeout);
    console.log("✅ Server shut down gracefully");
    console.log("💾 All session data preserved for next startup");
    process.exit(0);
  });
}
// Start the server
server.listen(port, async () => {
    console.log(`🚀 ${BOT_NAME} server running on http://localhost:${port}`);
    console.log(`📱 WhatsApp bot initialized`);
    console.log(`🔧 Loaded ${commands.size} commands`);
    
    // Wait for database to initialize before restoring sessions
    console.log('⏳ Waiting for database initialization...');
    let dbCheckAttempts = 0;
    const maxDbCheckAttempts = 30; // 30 seconds max wait
    
    while (!isDatabaseInitialized() && dbCheckAttempts < maxDbCheckAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        dbCheckAttempts++;
    }
    
    if (isDatabaseInitialized()) {
        console.log('✅ Database initialized successfully');
        // Reload existing sessions after database is ready
        await reloadExistingSessions();
    } else {
        console.log('⚠️ Database initialization timeout, proceeding without database restore');
        console.log('⚠️ Sessions will only be loaded from file system');
        console.log('📁 Paused sessions loaded from data.json file');
        // Still try to reload from file system
        const sessionsDir = path.join(__dirname, "sessions");
        if (fs.existsSync(sessionsDir)) {
            const sessions = fs.readdirSync(sessionsDir);
            for (const sessionId of sessions) {
                const sessionDir = path.join(sessionsDir, sessionId);
                const stat = fs.statSync(sessionDir);
                if (stat.isDirectory() && fs.existsSync(path.join(sessionDir, "creds.json"))) {
                    // Check if session is paused - skip auto-reconnection
                    if (pausedSessions.get(sessionId)) {
                        console.log(`⏸️ Skipping paused session: ${sessionId} (no auto-reconnect)`);
                        continue;
                    }
                    
                    try {
                        await initializeConnection(sessionId);
                        activeSockets++;
                    } catch (error) {
                        console.error(`Failed to reload session ${sessionId}:`, error.message);
                    }
                }
            }
            broadcastStats();
        }
    }
});


// Graceful shutdown - MODIFIED to preserve session folders unless explicit logout
function gracefulShutdown() {
  if (isShuttingDown) {
    console.log("🛑 Shutdown already in progress...");
    return;
  }
  
  isShuttingDown = true;
  console.log("\n🛑 Shutting down TRACLE LITE server gracefully...");
  console.log("💾 PRESERVING ALL SESSION FOLDERS (graceful shutdown)");
  
  // Save persistent data before shutting down
  savePersistentData();
  console.log(`💾 Saved persistent data: ${totalUsers} total users`);
  
  let connectionCount = 0;
  activeConnections.forEach((data, sessionId) => {
    try {
      data.conn.ws.close();
      console.log(`🔒 Closed WhatsApp connection for session: ${sessionId}`);
      connectionCount++;
      
      // PRESERVE the session folder during graceful shutdown
      const sessionDir = path.join(__dirname, "sessions", sessionId);
      if (fs.existsSync(sessionDir)) {
          console.log(`💾 Preserved session folder for: ${sessionId}`);
      }
    } catch (error) {
      console.error(`❌ Error closing connection for ${sessionId}:`, error.message);
    }
  });
  
  console.log(`✅ Closed ${connectionCount} WhatsApp connections`);
  console.log("💾 ALL SESSION FOLDERS HAVE BEEN PRESERVED");
  console.log("📁 Sessions will be automatically reloaded on next startup");
  
  const shutdownTimeout = setTimeout(() => {
    console.log("⚠️  Force shutdown after timeout");
    process.exit(0);
  }, 5000);
  
  server.close(() => {
    clearTimeout(shutdownTimeout);
    console.log("✅ Server shut down gracefully");
    console.log("💾 All session data preserved for next startup");
    process.exit(0);
  });
}

// Handle termination signals
process.on("SIGINT", () => {
  console.log("\nReceived SIGINT signal");
  gracefulShutdown();
});

process.on("SIGTERM", () => {
  console.log("\nReceived SIGTERM signal");
  gracefulShutdown();
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error.message);
  console.log("💾 Preserving all sessions despite error");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  console.log("💾 Preserving all sessions despite rejection");
});

// Track if we're in shutdown state
let isShuttingDown = false;
