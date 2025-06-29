# WebRTC P2P Voice Calls

A simple web application to test direct peer-to-peer communication connections using WebRTC with free STUN servers.

## 🎯 Purpose

My goal in creating this is to test peer-to-peer (P2P) connections using WebRTC by utilizing free STUN servers as a communication solution.

## ✨ Features

- **P2P Voice Calls**: Direct peer-to-peer communication
- **Free STUN Server**: Uses Google's public STUN server (`stun:stun.l.google.com:19302`)
- **Simple Signaling**: WebSocket-based signaling server
- **Unique IDs**: 6-digit unique identifiers for each user
- **No Database**: In-memory storage for simplicity
- **Ringtone**: Incoming call notifications with sound
- **Mute Controls**: Mute/unmute during calls

## 🚀 Quick Start

### Prerequisites

- Node.js
- pnpm package manager

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

### Usage

1. Open `http://localhost:3000` in your browser
2. You'll get a unique 6-digit ID
3. Share your ID with another person
4. Enter their ID and click "Call" to test the P2P connection

## 🏗️ Project Structure

```
├── src/                    # TypeScript source files
│   ├── server.ts           # Main server
│   ├── socket-handler.ts   # WebSocket events
│   └── types.ts            # Type definitions
├── public/                 # Static files
│   ├── index.html          # Main page
│   ├── js/                 # Client-side JavaScript
│   └── assets/             # Audio files
└── package.json            # Dependencies
```

## 🔧 Technology Stack

- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Backend**: Node.js, Express, TypeScript
- **Real-time**: Socket.IO
- **P2P**: WebRTC
- **STUN**: Google's public STUN server

## 🌐 WebRTC Configuration

```javascript
const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
```

## 🐛 Troubleshooting

**Common Issues:**

- **Microphone access**: Allow microphone permissions in browser
- **Connection fails**: Check if both users are online and firewall settings

## 📝 License

[MIT License](LICENSE)

feel free to use for testing and learning purposes.
