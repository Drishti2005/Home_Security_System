# 🚀 Deployment Guide

## Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (free tier works)
- Telegram Bot Token
- Domain name (optional)

## 1. Environment Setup

Create `.env` file:
```env
PORT=3000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_random_string_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_OWNER_CHAT_ID=your_telegram_chat_id
FRONTEND_URL=https://yourdomain.com
```

## 2. MongoDB Atlas Setup

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Create database user
4. Whitelist IP: 0.0.0.0/0 (allow all)
5. Get connection string
6. Replace in `.env`

## 3. Build Frontend

```bash
npm install
npm run build
```

## 4. Deployment Options

### Option A: Render (Recommended - Free)

1. Push code to GitHub
2. Go to https://render.com
3. Create new Web Service
4. Connect GitHub repo
5. Settings:
   - Build Command: `npm install`
   - Start Command: `npm run server`
   - Add environment variables from `.env`
6. Deploy

### Option B: Railway

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Add environment variables
4. Deploy

### Option C: Heroku

```bash
heroku create your-app-name
heroku config:set MONGODB_URI=your_uri
heroku config:set JWT_SECRET=your_secret
heroku config:set TELEGRAM_BOT_TOKEN=your_token
heroku config:set TELEGRAM_OWNER_CHAT_ID=your_id
git push heroku main
```

### Option D: VPS (DigitalOcean, AWS, etc.)

```bash
# SSH into server
ssh user@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone your-repo-url
cd your-project

# Install dependencies
npm install

# Install PM2
npm install -g pm2

# Start server
pm2 start backend/server.js --name "home-security"
pm2 startup
pm2 save

# Setup Nginx (optional)
sudo apt install nginx
# Configure reverse proxy
```

## 5. Post-Deployment

1. Run seed script:
```bash
node backend/seed-with-photos.js
```

2. Test Telegram bot:
   - Send `/start` to your bot
   - Check if it responds

3. Access dashboard:
   - https://yourdomain.com

## 6. Important Notes

- Keep `.env` file secure (never commit to git)
- Use strong JWT_SECRET
- Enable HTTPS in production
- Set up MongoDB backups
- Monitor server logs

## 7. Troubleshooting

**Bot not responding:**
- Check TELEGRAM_BOT_TOKEN is correct
- Verify bot is running: `pm2 logs`

**Database connection failed:**
- Check MongoDB Atlas IP whitelist
- Verify connection string

**Frontend not loading:**
- Check FRONTEND_URL in `.env`
- Verify CORS settings in `backend/server.js`
