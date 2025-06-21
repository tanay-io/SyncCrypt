# 🔐 SyncCrypt

**SyncCrypt** is a real-time collaborative code editor built with **Next.js 15**, **Monaco Editor**, and **Socket.IO**, enhanced with **AES-256 end-to-end encryption** using the Web Crypto API. It enables developers to collaborate on code with complete security — ensuring the code never leaves the browser in plaintext.

---

## 🚀 Overview

Whether you're pair programming, mentoring, or conducting remote interviews — **SyncCrypt** provides a blazing-fast, secure, and visually clean environment to share and collaborate on code.

> No server ever sees your original code. Encryption is handled entirely client-side using `AES-GCM` via the Web Crypto API.

---

## 🔧 Features

| Feature                        | Description                                                                 |
|-------------------------------|-----------------------------------------------------------------------------|
| 🔐 End-to-end AES-256         | Code is encrypted on the client before being sent to the server             |
| ⚡ Real-time Collaboration     | Share a room ID and start editing simultaneously                           |
| 🧠 Monaco Editor              | VS Code-like editing experience in the browser                             |
| 🌐 WebSocket Communication    | Low-latency sync powered by Socket.IO                                      |
| 🧍 Live Presence Tracking     | See who joins or leaves a room in real-time                                |
| 🌙 Sleek UI                   | Built with Tailwind CSS for modern UX                                      |
| 📱 Responsive Design          | Optimized for desktops and tablets                                         |
| 🔄 Auto-Syncing               | Changes broadcast instantly to all connected clients                       |

---

## 🏗️ Tech Stack

- **Frontend**: Next.js 15 (App Router, RSC), React 18, Tailwind CSS
- **Editor**: Monaco Editor (same as VS Code)
- **Real-time Engine**: Socket.IO (Client + Server)
- **Security**: Web Crypto API (AES-256 GCM)
- **Other**: UUID for room/session management, Zustand for global state

---
