# Void V4 - Enterprise WhatsApp Bot Gateway

<div align="center">

![Void V4 Banner](https://github.com/user-attachments/assets/f07f6eb1-ad69-4f2f-97db-dfa22d8e7abc)

**Transform your business communication with the most powerful WhatsApp bot gateway platform**

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/XdKing2/malvin-lite)

</div>

## ✨ Features

### 🤖 AI Integration
Advanced AI-powered responses with:
- **FluxAI** - Image generation
- **Suno** - Music creation
- **GPT-4** - Intelligent conversations
- **LuminAI** - Advanced language processing
- **MetaAI** - Meta platform integration

### 🎨 Creative Tools
Generate stunning visuals with 50+ effects:
- Logo maker with multiple styles
- Text effects (3D, neon, luxury, futuristic)
- Custom graphics and designs
- Brand assets creation

### 📥 Media Downloader
Download and convert media from:
- YouTube (video & audio)
- TikTok
- Instagram
- Twitter/X
- Facebook

### 👥 Group Management
Complete administration tools:
- User moderation
- Welcome messages
- Auto-reply features
- Group settings management

### 🎭 Sticker Creator
- Custom sticker creation
- Image to sticker conversion
- Animated stickers
- Text to sticker

### 🔐 User Authentication System
Secure multi-user platform with:
- **User Registration** - Create accounts with email verification
- **OAuth Login** - Sign in with Google & GitHub (auto-verified ✅)
- **JWT Authentication** - Secure token-based sessions
- **Profile Management** - Update email, password, and preferences
- **Dashboard Access** - Personalized user dashboard
- **MongoDB Integration** - Reliable data storage

### 💳 PayPal Payment Integration
Seamless coin purchase system:
- **4 Package Options** - 200, 500, 800, and 1500 coins
- **Secure PayPal Checkout** - Industry-standard payment processing
- **Sandbox & Live Mode** - Test safely before going live
- **Automatic Credit Addition** - Coins added instantly after payment
- **Best Value Discount** - 25% OFF on Ultimate package
- **Mobile Optimized** - Responsive payment UI for all devices
- See [PAYPAL_INTEGRATION.md](PAYPAL_INTEGRATION.md) for setup guide

### 🎮 Fun & Entertainment
Keep users engaged with:
- Jokes and humor
- Flirt lines
- Truth or dare
- Fun facts
- Interactive reactions

### 🔒 Enterprise Security
- Multi-user session isolation
- End-to-end encryption
- Secure data storage
- Privacy-first architecture

### ⚙️ Customizable
- Custom command prefixes
- Auto-status features
- Personalized settings per user
- Flexible configuration

## 💎 Pricing

### Free Tier
- ✅ Access to all bot commands
- ✅ 1 active session
- ✅ 100 messages per month
- ✅ Basic AI features
- ✅ Community support

### Professional ($29/month)
- ✅ Everything in Free
- ✅ 5 active sessions
- ✅ Unlimited messages
- ✅ Advanced AI features
- ✅ Priority support 24/7
- ✅ Advanced analytics
- ✅ Custom branding
- ✅ API access

### Enterprise (Custom)
- ✅ Everything in Pro
- ✅ Unlimited sessions
- ✅ Unlimited messages
- ✅ Dedicated support
- ✅ Custom integrations
- ✅ White-label solution
- ✅ SLA guarantee
- ✅ On-premise deployment

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/XdKing2/malvin-lite.git
   cd malvin-lite
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   # Important: Set DATABASE_URL and JWT_SECRET
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

6. **Create an account**
   - Go to `/register` to create your user account
   - Login at `/login` with your credentials
   - Access your dashboard at `/dashboard`

## 📱 Connect Your WhatsApp

1. Enter your WhatsApp number with country code
2. Click "Request Pairing Code"
3. Copy the 8-digit code
4. Open WhatsApp → Settings → Linked Devices → Link a Device
5. Paste the code and you're ready to go!

## 🛠️ Technology Stack

- **Backend**: Node.js, Express
- **WhatsApp**: Baileys (Multi-device support)
- **Database**: MongoDB / PostgreSQL / SQLite
- **Authentication**: JWT (JSON Web Tokens) + bcryptjs
- **Real-time**: Socket.io
- **Frontend**: HTML5, CSS3, Vanilla JavaScript

## 📝 Commands

The bot includes 80+ commands across multiple categories:
- AI & Creative
- Media Download & Convert
- Group Management
- Stickers & Fun
- Utility & Tools
- And much more!

## 🔐 Authentication & User Management

This bot now includes a complete authentication system for multi-user support. See [AUTHENTICATION_README.md](./AUTHENTICATION_README.md) for detailed documentation.

### 🚀 OAuth Login (NEW!)

Quick and secure login with social accounts:
- ✅ **Google Login** - Sign in with Google account (auto-verified)
- ✅ **GitHub Login** - Sign in with GitHub account (auto-verified)
- ✅ **Account Linking** - Links OAuth to existing local accounts
- 📚 See [OAUTH_SETUP_GUIDE.md](./OAUTH_SETUP_GUIDE.md) for setup instructions
- 📋 See [OAUTH_QUICK_REFERENCE.md](./OAUTH_QUICK_REFERENCE.md) for quick reference

### ⏸️ Session Pause Feature

The bot now includes intelligent session management that **respects paused sessions across server restarts**, even on platforms with ephemeral file systems (Heroku, Koyeb, Railway).

- ✅ **Pause sessions** - Stop your bot without losing authentication
- ✅ **Persistent state** - Paused sessions stay paused after server restarts
- ✅ **Platform agnostic** - Works on all deployment platforms
- 📚 See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for usage guide

### Quick Authentication Guide

**Registration:**
- Visit `/register` to create a new account
- Provide email, username (6+ chars), and password (8+ chars)
- Or use Google/GitHub OAuth (instant sign-up!)
- Account is created with MongoDB

**Login:**
- Visit `/login` with your credentials
- Or click Google/GitHub button for OAuth login
- Secure JWT token authentication
- Support for persistent sessions ("Keep me signed in")

**Profile Management:**
- Access `/profile` to view and update your information
- Change email (requires password verification)
- Update password (requires current password)
- View account type and membership details

**Dashboard:**
- Personal dashboard at `/dashboard`
- View bot statistics and manage sessions
- Configure bot settings
- Real-time updates via WebSocket

## 🌐 Deploy

### Heroku
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/XdKing2/malvin-lite)

### Other Platforms
- Railway
- Render
- DigitalOcean
- AWS
- Self-hosted

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Developer

**Malvin King (XdKing2)**

- GitHub: [@XdKing2](https://github.com/XdKing2)
- WhatsApp Channel: [Join Channel](https://whatsapp.com/channel/0029VbB3YxTDJ6H15SKoBv3S)

## 💬 Support

For support, join our [WhatsApp Channel](https://whatsapp.com/channel/0029VbB3YxTDJ6H15SKoBv3S) or open an issue on GitHub.

---

<div align="center">

**© 2025 Void V4 Enterprise. Powered by Malvin Tech. All rights reserved.**

Made with ❤️ by Malvin King

</div>
