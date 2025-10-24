const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { User } = require('./userModel');
const { generateToken } = require('./authMiddleware');
const { sendWelcomeEmail } = require('./emailService');

// Helper function to generate unique referral code
const generateReferralCode = (username) => {
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `${username.substring(0, 4).toUpperCase()}${hash}${Date.now().toString(36).substring(5)}`;
};

// Helper function to ensure referral code uniqueness
const generateUniqueReferralCode = async (username) => {
    let userReferralCode = generateReferralCode(username);
    // Ensure uniqueness
    let codeExists = await User.findOne ? 
        await User.findOne({ referralCode: userReferralCode }) :
        await User.findOne({ where: { referralCode: userReferralCode } });
    
    while (codeExists) {
        userReferralCode = generateReferralCode(username + Math.random().toString(36).substring(7));
        codeExists = await User.findOne ? 
            await User.findOne({ referralCode: userReferralCode }) :
            await User.findOne({ where: { referralCode: userReferralCode } });
    }
    return userReferralCode;
};

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id || user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById ? await User.findById(id) : await User.findByPk(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.APP_URL}/api/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists with this Google ID
            let user = await User.findOne ? 
                await User.findOne({ oauthId: profile.id, oauthProvider: 'google' }) :
                await User.findOne({ where: { oauthId: profile.id, oauthProvider: 'google' } });

            if (user) {
                // User exists, update last login
                user.lastLogin = new Date();
                
                // Generate referral code if user doesn't have one (for legacy users)
                if (!user.referralCode) {
                    user.referralCode = await generateUniqueReferralCode(user.username);
                    console.log(`🔗 Generated referral code for existing OAuth user: ${user.username} → ${user.referralCode}`);
                }
                
                await user.save();
                return done(null, user);
            }

            // Check if user exists with this email (local account)
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            if (email) {
                user = await User.findOne ?
                    await User.findOne({ email: email.toLowerCase() }) :
                    await User.findOne({ where: { email: email.toLowerCase() } });

                if (user) {
                    // Check if this is a new OAuth link (user previously only had local account)
                    const isNewOAuthLink = !user.oauthProvider || user.oauthProvider === 'local';
                    
                    // Link existing local account to Google
                    user.oauthProvider = 'google';
                    user.oauthId = profile.id;
                    user.oauthProfilePicture = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
                    user.isEmailVerified = true; // Auto-verify email for OAuth users
                    user.lastLogin = new Date();
                    
                    // Generate referral code if user doesn't have one
                    if (!user.referralCode) {
                        user.referralCode = await generateUniqueReferralCode(user.username);
                        console.log(`🔗 Generated referral code for existing user: ${user.username} → ${user.referralCode}`);
                    }
                    
                    await user.save();
                    
                    // Send welcome email if this is the first OAuth link
                    if (isNewOAuthLink) {
                        try {
                            await sendWelcomeEmail(email.toLowerCase(), user.username);
                            console.log(`📧 Welcome email sent to existing user ${email.toLowerCase()} who linked Google`);
                        } catch (emailError) {
                            console.error('⚠️ Failed to send welcome email:', emailError);
                        }
                    }
                    
                    return done(null, user);
                }
            }

            if (!email) {
                return done(new Error('No email provided by Google'), null);
            }

            // Create new user
            const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(7);
            
            // Generate unique referral code for the new user
            const userReferralCode = await generateUniqueReferralCode(username);
            
            const newUser = await User.create({
                username: username,
                email: email.toLowerCase(),
                password: Math.random().toString(36).substring(2, 15), // Random password for OAuth users
                oauthProvider: 'google',
                oauthId: profile.id,
                oauthProfilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                isEmailVerified: true, // Auto-verify email for OAuth users
                accountType: 'free',
                lastLogin: new Date(),
                referralCode: userReferralCode
            });

            console.log(`✅ New user created via Google OAuth: ${newUser.username} with referral code: ${userReferralCode}`);
            
            // Send welcome email to new OAuth user
            try {
                await sendWelcomeEmail(email.toLowerCase(), newUser.username);
                console.log(`📧 Welcome email sent to ${email.toLowerCase()}`);
            } catch (emailError) {
                console.error('⚠️ Failed to send welcome email:', emailError);
                // Don't fail the OAuth flow if email sending fails
            }
            
            done(null, newUser);
        } catch (error) {
            console.error('Google OAuth error:', error);
            done(error, null);
        }
    }));
} else {
    console.log('⚠️ Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
}

// GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || `${process.env.APP_URL}/api/auth/github/callback`,
        scope: ['user:email']
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists with this GitHub ID
            let user = await User.findOne ?
                await User.findOne({ oauthId: profile.id, oauthProvider: 'github' }) :
                await User.findOne({ where: { oauthId: profile.id, oauthProvider: 'github' } });

            if (user) {
                // User exists, update last login
                user.lastLogin = new Date();
                
                // Generate referral code if user doesn't have one (for legacy users)
                if (!user.referralCode) {
                    user.referralCode = await generateUniqueReferralCode(user.username);
                    console.log(`🔗 Generated referral code for existing OAuth user: ${user.username} → ${user.referralCode}`);
                }
                
                await user.save();
                return done(null, user);
            }

            // Get email from profile
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            if (email) {
                user = await User.findOne ?
                    await User.findOne({ email: email.toLowerCase() }) :
                    await User.findOne({ where: { email: email.toLowerCase() } });

                if (user) {
                    // Check if this is a new OAuth link (user previously only had local account)
                    const isNewOAuthLink = !user.oauthProvider || user.oauthProvider === 'local';
                    
                    // Link existing local account to GitHub
                    user.oauthProvider = 'github';
                    user.oauthId = profile.id;
                    user.oauthProfilePicture = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
                    user.isEmailVerified = true; // Auto-verify email for OAuth users
                    user.lastLogin = new Date();
                    
                    // Generate referral code if user doesn't have one
                    if (!user.referralCode) {
                        user.referralCode = await generateUniqueReferralCode(user.username);
                        console.log(`🔗 Generated referral code for existing user: ${user.username} → ${user.referralCode}`);
                    }
                    
                    await user.save();
                    
                    // Send welcome email if this is the first OAuth link
                    if (isNewOAuthLink) {
                        try {
                            await sendWelcomeEmail(email.toLowerCase(), user.username);
                            console.log(`📧 Welcome email sent to existing user ${email.toLowerCase()} who linked GitHub`);
                        } catch (emailError) {
                            console.error('⚠️ Failed to send welcome email:', emailError);
                        }
                    }
                    
                    return done(null, user);
                }
            }

            if (!email) {
                return done(new Error('No email provided by GitHub'), null);
            }

            // Create new user
            const username = profile.username || email.split('@')[0] + '_' + Math.random().toString(36).substring(7);
            
            // Generate unique referral code for the new user
            const userReferralCode = await generateUniqueReferralCode(username);
            
            const newUser = await User.create({
                username: username,
                email: email.toLowerCase(),
                password: Math.random().toString(36).substring(2, 15), // Random password for OAuth users
                oauthProvider: 'github',
                oauthId: profile.id,
                oauthProfilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                isEmailVerified: true, // Auto-verify email for OAuth users
                accountType: 'free',
                lastLogin: new Date(),
                referralCode: userReferralCode
            });

            console.log(`✅ New user created via GitHub OAuth: ${newUser.username} with referral code: ${userReferralCode}`);
            
            // Send welcome email to new OAuth user
            try {
                await sendWelcomeEmail(email.toLowerCase(), newUser.username);
                console.log(`📧 Welcome email sent to ${email.toLowerCase()}`);
            } catch (emailError) {
                console.error('⚠️ Failed to send welcome email:', emailError);
                // Don't fail the OAuth flow if email sending fails
            }
            
            done(null, newUser);
        } catch (error) {
            console.error('GitHub OAuth error:', error);
            done(error, null);
        }
    }));
} else {
    console.log('⚠️ GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env');
}

module.exports = passport;
