# Virtual Home Security System

Complete AI-powered security system with real-time face recognition, automatic door control, and instant Telegram alerts.

## Core Features

- **Live Face Recognition** - Real-time detection using TensorFlow.js
- **Smart Unknown Person Handling** - Alert sent once, can add via Telegram
- **Automatic Door Access** - Face-based entry control
- **Virtual House Monitoring** - Track people in different rooms
- **Telegram Integration** - Remote control and instant alerts with images
- **Analytics Dashboard** - Real-time charts and statistics
- **MongoDB Database** - Scalable data storage

## Quick Start

### 1. Install
```bash
npm install
npm run download-models
```

### 2. Configure Telegram
See `HOW_TO_SETUP_TELEGRAM.txt` for step-by-step instructions.

### 3. Start System
```bash
npm run server    # Terminal 1
npm run dev       # Terminal 2  
npm run bot       # Terminal 3
```

### 4. Access
- Open: http://localhost:5173
- Login: demo@security.com / demo123

## How It Works

### Unknown Person Detected:
1. Camera detects unknown face
2. Captures image
3. Sends to your Telegram (6386278721)
4. Alert sent ONCE (no spam)
5. Add via: `/addunknown [ID] [name]`
6. Next time: Recognized!

### Known Person Detected:
1. Camera detects face
2. Matches with database
3. Shows name + category
4. Door opens automatically (if allowed)
5. No alert sent

## Telegram Commands

- `/start` - Show all commands
- `/status` - System status
- `/pending` - List unknown faces
- `/addunknown [ID] [name]` - Add unknown person
- `/arm` / `/disarm` - Control system
- `/logs` - Recent events
- `/risk` - Risk score

## Tech Stack

- Frontend: React 18 + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- AI: TensorFlow.js + face-api.js
- Bot: Telegram Bot API

## Project Structure

```
├── backend/
│   ├── database/     # MongoDB schemas
│   ├── routes/       # API endpoints
│   ├── services/     # Business logic
│   └── server.js     # Express server
├── src/
│   ├── pages/        # React pages
│   ├── components/   # React components
│   └── services/     # API client
└── package.json      # Dependencies
```

## License

MIT
