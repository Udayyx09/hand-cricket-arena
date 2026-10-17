# 🏏 Hand Cricket Arena

A real-time, browser-based multiplayer **Hand Cricket** web application featuring webcam-based gesture detection (AI), peer-to-peer live video & voice chat, a synchronized anti-cheat mechanism, and a modern neo-brutalist UI.

🔗 **Live Demo:** [https://hand-cricket-arena-delta.vercel.app](https://hand-cricket-arena-delta.vercel.app)

---

## 🚀 Features

* **🧠 Client-Side Computer Vision:** Powered by **Google MediaPipe Hands** to detect and classify 1 to 6 hand signs in real-time at 60 FPS using WebGL, eliminating backend video processing overhead.
* **🌐 Real-Time Multiplayer Engine:** Built with **Spring Boot WebSockets (STOMP)** for thread-safe room management, lockstep game state synchronization, and automated innings transitions.
* **🎥 P2P Video & Voice Chat:** Integrated **WebRTC** peer-to-peer streaming allowing players to see and talk to each other live during matches.
* **🛡️ "Sightscreen" Anti-Cheat:** A synchronized countdown and reveal system that prevents players from reacting to or seeing each other's throws before the lock-in.
* **📊 Rivalry Persistence:** Stores match results using **Spring Data JPA & H2** to track head-to-head records (*"Your Record vs Friend: X Won, Y Lost"*).
* **🎨 Neo-Brutalist Design:** High-contrast UI styled with Tailwind CSS, custom sound effects, and interactive lobby cards.

---

## 🛠️ Tech Stack

* **Frontend:** React, Vite, Tailwind CSS, Google MediaPipe Hands, WebRTC API, SockJS, STOMP.js
* **Backend:** Java 21/25, Spring Boot 3, Spring WebSockets, Spring Data JPA, H2 Database
* **Deployment & DevOps:** Docker, Render (Backend), Vercel (Frontend)

---

## 📂 Project Architecture

```text
hand-cricket-arena/
├── frontend/                # React + Vite Client Application
│   ├── src/
│   │   ├── components/     # Game Arena, Lobby, Video Streams
│   │   ├── utils/          # MediaPipe Hands & Gesture Logic
│   │   └── App.jsx
│   └── package.json
└── backend/                 # Spring Boot Server
    ├── src/main/java/
    │   └── com/cricket/     # Controllers, WebSocket Config, Game Engine, Entities
    ├── Dockerfile           # Multi-stage Docker build for Java 21/25
    └── pom.xml



