const nodemailer = require('nodemailer');

// Email configuration
const EMAIL_CONFIG = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : undefined,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    fromName: process.env.EMAIL_FROM_NAME || 'Void V4 Enterprise',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
};

// Create transporter
let transporter = null;

function getTransporter() {
    if (!transporter && EMAIL_CONFIG.user && EMAIL_CONFIG.password) {
        // Check if using a known service (gmail, outlook, etc.)
        const knownServices = ['gmail', 'outlook', 'yahoo', 'hotmail', 'icloud'];
        const isKnownService = knownServices.includes(EMAIL_CONFIG.service.toLowerCase());
        
        // If service is a hostname (contains dots) or not a known service, use custom SMTP
        if (EMAIL_CONFIG.service.includes('.') || !isKnownService) {
            const port = EMAIL_CONFIG.port || 587;
            const secure = EMAIL_CONFIG.secure || false;
            
            transporter = nodemailer.createTransport({
                host: EMAIL_CONFIG.service,
                port: port,
                secure: secure, // true for port 465, false for 587
                requireTLS: !secure, // Use STARTTLS for port 587
                auth: {
                    user: EMAIL_CONFIG.user,
                    pass: EMAIL_CONFIG.password
                },
                tls: {
                    // Do not fail on invalid certs (for self-signed certificates)
                    rejectUnauthorized: false
                }
            });
        } else {
            // Use predefined service
            transporter = nodemailer.createTransport({
                service: EMAIL_CONFIG.service,
                auth: {
                    user: EMAIL_CONFIG.user,
                    pass: EMAIL_CONFIG.password
                }
            });
        }
    }
    return transporter;
}

// Check if email is configured
function isEmailConfigured() {
    return !!(EMAIL_CONFIG.user && EMAIL_CONFIG.password);
}

// Generate 6-digit verification code
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Professional email template wrapper
function emailTemplate(content, title = 'Void V4 Enterprise') {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .email-header .logo {
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            font-weight: bold;
            backdrop-filter: blur(10px);
        }
        .email-header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .email-header p {
            margin: 10px 0 0;
            font-size: 14px;
            opacity: 0.9;
        }
        .email-body {
            padding: 40px 30px;
            line-height: 1.6;
        }
        .email-body h2 {
            color: #667eea;
            margin-top: 0;
            font-size: 24px;
        }
        .email-body p {
            margin: 15px 0;
            color: #555;
            font-size: 16px;
        }
        .verification-code {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 36px;
            font-weight: bold;
            text-align: center;
            padding: 25px;
            margin: 30px 0;
            border-radius: 12px;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .info-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 25px 0;
            border-radius: 8px;
        }
        .info-box h3 {
            margin: 0 0 10px;
            color: #667eea;
            font-size: 18px;
        }
        .info-box ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .info-box li {
            margin: 8px 0;
            color: #555;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: 600;
            text-align: center;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: transform 0.2s;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .email-footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #777;
            font-size: 14px;
            border-top: 1px solid #e9ecef;
        }
        .email-footer p {
            margin: 5px 0;
        }
        .email-footer a {
            color: #667eea;
            text-decoration: none;
        }
        .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #ddd, transparent);
            margin: 30px 0;
        }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="logo">V4</div>
            <h1>VOID V4</h1>
            <p>Enterprise Gateway</p>
        </div>
        <div class="email-body">
            ${content}
        </div>
        <div class="email-footer">
            <p><strong>Void V4 Enterprise Gateway</strong></p>
            <p>Ultimate WhatsApp Bot Platform</p>
            <p style="margin-top: 15px;">
                <a href="https://github.com/XdKing2/MALVIN-XD">GitHub</a> •
                <a href="#">Support</a> •
                <a href="#">Privacy</a>
            </p>
            <p style="margin-top: 15px; font-size: 12px; color: #999;">
                © ${new Date().getFullYear()} Void V4 Enterprise. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
    `;
}

// Send verification code email
async function sendVerificationEmail(email, username, code) {
    const transporter = getTransporter();
    if (!transporter) {
        console.error('❌ Email service not configured');
        return { success: false, error: 'Email service not configured' };
    }

    const content = `
        <h2>🔐 Verify Your Email Address</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>Thank you for registering with Void V4 Enterprise Gateway! To complete your registration and access your dashboard, please verify your email address.</p>
        
        <p>Your verification code is:</p>
        <div class="verification-code">${code}</div>
        
        <div class="warning">
            <strong>⚠️ Important:</strong> This code will expire in 15 minutes. If you didn't request this verification, please ignore this email.
        </div>
        
        <p>Enter this code on the verification page to activate your account and start using our premium WhatsApp bot service.</p>
        
        <div class="divider"></div>
        
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br><strong>Void V4 Team</strong></p>
    `;

    try {
        console.log(`📤 Sending verification email to ${email} from ${EMAIL_CONFIG.fromAddress}...`);
        const info = await transporter.sendMail({
            from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromAddress}>`,
            to: email,
            subject: '🔐 Verify Your Email - Void V4 Enterprise',
            html: emailTemplate(content, 'Verify Your Email')
        });
        console.log(`✅ Verification email sent to ${email}`);
        console.log(`📬 Message ID: ${info.messageId}`);
        console.log(`📊 Response: ${info.response}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending verification email:', error.message);
        console.error('❌ Full error details:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error command:', error.command);
        // Return error details for better debugging
        return { success: false, error: error.message, details: error };
    }
}

// Send welcome email after successful verification
async function sendWelcomeEmail(email, username) {
    const transporter = getTransporter();
    if (!transporter) {
        console.error('❌ Email service not configured');
        return false;
    }

    const content = `
        <h2>🎉 Welcome to Void V4 Enterprise!</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>Congratulations! Your account has been successfully verified. Welcome to the ultimate WhatsApp bot gateway platform.</p>
        
        <div class="info-box">
            <h3>🚀 Getting Started</h3>
            <p><strong>Connect Your WhatsApp:</strong></p>
            <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Go to your dashboard</li>
                <li>Enter your phone number</li>
                <li>Click "Get Pairing Code"</li>
                <li>Open WhatsApp on your phone</li>
                <li>Go to <strong>Settings → Linked Devices → Link a Device</strong></li>
                <li>Enter the pairing code from dashboard</li>
            </ol>
        </div>
        
        <div class="info-box">
            <h3>✨ Premium Features</h3>
            <ul>
                <li><strong>🎵 Media Downloader:</strong> Download videos, music, and images from multiple platforms</li>
                <li><strong>👥 Group Management:</strong> Advanced group administration tools</li>
                <li><strong>🤖 AI Integration:</strong> Smart responses and automation</li>
                <li><strong>📊 Analytics:</strong> Track your bot's performance</li>
                <li><strong>🎨 Sticker Maker:</strong> Create custom WhatsApp stickers</li>
                <li><strong>🔧 Custom Commands:</strong> Build your own plugins</li>
            </ul>
        </div>
        
        <div class="info-box">
            <h3>💎 Free Credits</h3>
            <p>You've been credited with <strong>65 free credits</strong> to get started! Use them to explore all features.</p>
        </div>
        
        <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard →</a>
        
        <div class="divider"></div>
        
        <p><strong>Need Help?</strong> Check out our documentation or contact support anytime.</p>
        <p>Best regards,<br><strong>Void V4 Team</strong></p>
    `;

    try {
        await transporter.sendMail({
            from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromAddress}>`,
            to: email,
            subject: '🎉 Welcome to Void V4 Enterprise - Let\'s Get Started!',
            html: emailTemplate(content, 'Welcome to Void V4')
        });
        console.log(`✅ Welcome email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending welcome email:', error.message);
        return false;
    }
}

// Send email change notification
async function sendEmailChangeNotification(email, username, newEmail) {
    const transporter = getTransporter();
    if (!transporter) {
        console.error('❌ Email service not configured');
        return false;
    }

    const content = `
        <h2>📧 Email Address Changed</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>This is to confirm that your email address has been successfully updated.</p>
        
        <div class="info-box">
            <h3>Change Details</h3>
            <p><strong>Previous Email:</strong> ${email}</p>
            <p><strong>New Email:</strong> ${newEmail}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="warning">
            <strong>⚠️ Security Notice:</strong> If you didn't make this change, please contact support immediately to secure your account.
        </div>
        
        <p>Best regards,<br><strong>Void V4 Team</strong></p>
    `;

    try {
        // Send to old email
        await transporter.sendMail({
            from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromAddress}>`,
            to: email,
            subject: '📧 Email Address Changed - Void V4 Enterprise',
            html: emailTemplate(content, 'Email Changed')
        });
        
        // Send to new email
        await transporter.sendMail({
            from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromAddress}>`,
            to: newEmail,
            subject: '📧 Email Address Changed - Void V4 Enterprise',
            html: emailTemplate(content, 'Email Changed')
        });
        
        console.log(`✅ Email change notification sent to ${email} and ${newEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending email change notification:', error.message);
        return false;
    }
}

// Send password change notification
async function sendPasswordChangeNotification(email, username) {
    const transporter = getTransporter();
    if (!transporter) {
        console.error('❌ Email service not configured');
        return false;
    }

    const content = `
        <h2>🔒 Password Changed</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>This is to confirm that your password has been successfully changed.</p>
        
        <div class="info-box">
            <h3>Change Details</h3>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Account:</strong> ${username}</p>
        </div>
        
        <div class="warning">
            <strong>⚠️ Security Notice:</strong> If you didn't make this change, please contact support immediately. Your account may be compromised.
        </div>
        
        <p>Best regards,<br><strong>Void V4 Team</strong></p>
    `;

    try {
        await transporter.sendMail({
            from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromAddress}>`,
            to: email,
            subject: '🔒 Password Changed - Void V4 Enterprise',
            html: emailTemplate(content, 'Password Changed')
        });
        console.log(`✅ Password change notification sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending password change notification:', error.message);
        return false;
    }
}

// Send account deletion notification
async function sendAccountDeletionNotification(email, username) {
    const transporter = getTransporter();
    if (!transporter) {
        console.error('❌ Email service not configured');
        return false;
    }

    const content = `
        <h2>👋 Account Deleted</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>This is to confirm that your Void V4 Enterprise account has been permanently deleted.</p>
        
        <div class="info-box">
            <h3>Deletion Details</h3>
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Deletion Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="warning">
            <strong>⚠️ Important:</strong> This action is permanent. All your data, including bot sessions and configurations, has been removed.
        </div>
        
        <p>We're sorry to see you go. If you have any feedback or would like to return in the future, we'd love to hear from you.</p>
        
        <p>Thank you for using Void V4 Enterprise Gateway.</p>
        
        <p>Best regards,<br><strong>Void V4 Team</strong></p>
    `;

    try {
        await transporter.sendMail({
            from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromAddress}>`,
            to: email,
            subject: '👋 Account Deleted - Void V4 Enterprise',
            html: emailTemplate(content, 'Account Deleted')
        });
        console.log(`✅ Account deletion notification sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending account deletion notification:', error.message);
        return false;
    }
}

// Send ticket confirmation email
async function sendTicketConfirmationEmail(email, username, ticketId, reason, message) {
    const transporter = getTransporter();
    if (!transporter) {
        console.log('⚠️ Email not configured. Skipping ticket confirmation email.');
        return false;
    }

    const content = `
        <h2>🎫 Support Ticket Created</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>Thank you for reaching out to us. We've received your support ticket and our team will review it shortly.</p>
        
        <div class="info-box">
            <h3>Ticket Details</h3>
            <p><strong>Ticket ID:</strong> ${ticketId}</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p><strong>Status:</strong> Open</p>
            <p><strong>Created:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="highlight">
            <h3>Your Message:</h3>
            <p style="white-space: pre-wrap; word-wrap: break-word;">${message}</p>
        </div>
        
        <div class="warning">
            <strong>⏱️ Response Time:</strong> Please allow 3-7 business days for a response, depending on the volume of messages we receive.
        </div>
        
        <p>We appreciate your patience and will get back to you as soon as possible.</p>
        
        <p>Best regards,<br><strong>Void V4 Support Team</strong></p>
    `;

    try {
        await transporter.sendMail({
            from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.fromAddress}>`,
            to: email,
            subject: `🎫 Support Ticket ${ticketId} - Void V4 Enterprise`,
            html: emailTemplate(content, 'Support Ticket Created')
        });
        console.log(`✅ Ticket confirmation email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending ticket confirmation email:', error.message);
        return false;
    }
}

module.exports = {
    isEmailConfigured,
    generateVerificationCode,
    sendVerificationEmail,
    sendWelcomeEmail,
    sendEmailChangeNotification,
    sendPasswordChangeNotification,
    sendAccountDeletionNotification,
    sendTicketConfirmationEmail
};
