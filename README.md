# yume-baileys

A high-performance, modern TypeScript library for the WhatsApp Web API.
Optimized for extreme speed, reliability, and modern features.

[![npm version](https://img.shields.io/npm/v/yume-baileys.svg?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/yume-baileys)
[![downloads](https://img.shields.io/npm/dm/yume-baileys.svg?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/yume-baileys)
[![license](https://img.shields.io/npm/l/yume-baileys.svg?style=for-the-badge&color=green)](LICENSE)
[![node](https://img.shields.io/node/v/yume-baileys.svg?style=for-the-badge&logo=node.js&color=339933)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

---

### 📜 About yume-baileys

**yume-baileys** is an advanced fork of the original Baileys library, heavily optimized for maximum performance and stability. It is built with modern TypeScript and designed for production-ready applications.

This library is **95% faster** than most other versions, supports full **multi-device** and **iOS** compatibility, and includes unique features like automatic **blue-check fake replies**.

* **Based on:** `yupra/baileys & ajammm/baileys`
* **Original by:** `WhiskeySockets/Baileys`
* **Modified & Enhanced by:** `YumeNoTo (yume-baileys)`

---

### 💡 Key Features

* ⚡ **Fast Performance:** Optimized code for 95% faster message processing and connection times.
* 📱 **Full Platform Support:** Full multi-device compatibility, including robust support for **iOS & Apple devices**.
* 🔐 **Reliable & Secure:** Supports end-to-end encryption, secure session management, and auto-recovery.
* 🛡️ **Built-in Protections:**
    * **Anti-Call:** Automatically reject voice and video calls with a custom message.
    * **Rate Limiter:** Smart flood protection to prevent account banning from spam.
    * **Auto-Reconnect:** Ensures the bot stays online and restores the session automatically.
* 📨 **All Message Types:** Supports text, media (images, videos, audio), documents, polls, albums, buttons, and list messages.

---

### ⚠️ Disclaimer

This library is not affiliated with WhatsApp Inc. Use it responsibly. Avoid spamming or any activity that violates WhatsApp's Terms of Service. The developer is not responsible for any misuse of this library.

---

### 📦 Installation

##### Requirements

* **Node.js:** >= 20.0.0
* **OS:** Windows, Linux, or macOS

##### Install with NPM

```bash
# 🚀 Install the latest version (Recommended)
npm install yume-baileys@latest

# 🧶 Yarn
yarn add yume-baileys@latest

# 📦 PNPM
pnpm add yume-baileys@latest
```

---

### 📥 Import
```javascript
// ES6 Module
import makeWASocket from "yume-baileys"

// CommonJS (Node.js)
const makeWASocket = require("yume-baileys").default
```

---

### 🚀 Quick Start
```javascript
const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require("yume-baileys")
const { Boom } = require("@hapi/boom")
const P = require("pino")

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys")

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ["Chrome"],
        logger: P({ level: 'silent' }),
        generateHighQualityLinkPreview: true,
        defaultQueryTimeoutMs: 60000,
    })

    sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            console.log("Please scan the QR Code with your WhatsApp.")
        }

        if (connection === "close") {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log("Connection closed. Reconnecting:", shouldReconnect)

            if (shouldReconnect) {
                setTimeout(connectToWhatsApp, 3000)
            }
        } else if (connection === "open") {
            console.log("Successfully connected to WhatsApp!")
        }
    })

    sock.ev.on("messages.upsert", async ({ messages }) => {
        for (const m of messages) {
            if (!m.message) continue

            const text = m.message.conversation || m.message.extendedTextMessage?.text
            console.log("New message:", text)

            if (text === "hi") {
                await sock.sendMessage(m.key.remoteJid!, {
                    text: "Hello! I am a bot powered by yume-baileys"
                })
            }
        }
    })

    sock.ev.on("creds.update", saveCreds)
    return sock
}

connectToWhatsApp()
```

---

### 📚 Authentication
```javascript
const { makeWASocket, useMultiFileAuthState } = require("yume-baileys")

async function connectWithPairingCode() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info")
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    })

    if (!sock.authState.creds.registered) {
        const phoneNumber = "6281234567890" 

        setTimeout(async () => {
            const code = await sock.requestPairingCode(phoneNumber)
            console.log("Your Pairing Code is:", code)
        }, 2000)
    }

    sock.ev.on("creds.update", saveCreds)
    return sock
}
```

---

### 📨 Send Message

##### Text Messages
```javascript
// Simple text
await sock.sendMessage("6281234567890@s.whatsapp.net", { 
    text: "Hello from @ajammm/baileys!" 
})

// With formatting
await sock.sendMessage(jid, { 
    text: "*Bold* _italic_ ~strikethrough~ ```monospace```" 
})

// With mentions
await sock.sendMessage(jid, {
    text: "Hello @6281234567890!",
    mentions: ["6281234567890@s.whatsapp.net"]
})
```

##### Media Messages
```javascript
// Image
await sock.sendMessage(jid, {
    image: { url: "https://example.com/image.jpg" },
    caption: "Beautiful sunrise"
})

// Video
await sock.sendMessage(jid, {
    video: { url: "https://example.com/video.mp4" },
    caption: "Beautiful sunset"
})

// Audio
await sock.sendMessage(jid, {
    audio: { url: "./music.mp3" },
    mimetype: "audio/mp3",
    fileName: "awesome-song.mp3"
})

// Document
await sock.sendMessage(jid, {
    document: { url: "./document.pdf" },
    mimetype: "application/pdf",
    fileName: "important-document.pdf"
})

// Album (Image & Video)
await sock.sendAlbumMessage(jid, [
    {
        image: { url: "https://example.jpg" },
        caption: "Halo dunia",
    },
    {
        video: { url: "https://example.mp4" },
        caption: "Video keren",
    },
    {
        image: { url: "./local-image.jpg" },
        caption: "Gambar keren",
    }
], {
    quoted: message,
    delay: 2000
})
```

---

### 🎨 Interactive Message

##### Buttons & Message List Buttons
```javascript
// Button
await sock.sendMessage(jid, {
    text: "Welcome! Choose an option:",
    footer: "Powered by @ajammm/baileys",
    buttons: [
        { buttonId: "menu", buttonText: { displayText: "📋 Main Menu" }, type: 1 },
        { buttonId: "help", buttonText: { displayText: "❓ Help" }, type: 1 },
        { buttonId: "about", buttonText: { displayText: "ℹ️ About" }, type: 1 }
    ],
    headerType: 1
})

// List Button
await sock.sendMessage(jid, {
    text: "Select a service:",
    buttonText: "View Options",
    sections: [
        {
            title: "🔧 Development Services",
            rows: [
                { title: "WhatsApp Bot", description: "Custom WhatsApp automation", rowId: "service_bot" },
                { title: "Web Development", description: "Modern web applications", rowId: "service_web" }
            ]
        }
    ]
})
```
---
---

 ### And More..

---

🙏 Credits & License
This library is an enhanced fork and owes its functionality to the original creators.
 * Original: `WhiskeySockets/Baileys`
 * Base Fork: `yupra/baileys & ajammm/baileys`
 * Enhancements: `YumeNoTo (yume-baileys)`
Licensed under the MIT License.