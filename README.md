# Space Invaders - AI Commander Edition

A retro-style Space Invaders browser game featuring power-ups, weapons, leaderboards, 
sound effects, and optional AI-powered features.

## 🎮 Play Now (No Setup Required!)

**Simply double-click `index.html`** and start playing!

The game works immediately in any modern browser. No installation is needed.

![SpaceInvader](/images/Spaceinvaders.png)


---

## ✨ Features

### 🕹️ Classic Arcade Gameplay
- Defend Earth from waves of alien invaders
- Progressive difficulty across multiple levels
- Retro pixel-art graphics with CRT effects

### 🔫 8 Power-Up Types
| Power-Up | Colour | Effect |
|----------|-------|--------|
| **SPREAD** | 🟠 Orange | 3-way spread shot |
| **LASER** | 🔴 Red | Powerful beam, high damage |
| **RAPID** | 🟡 Yellow | Super fast fire rate |
| **MISSILE** | 🟣 Purple | Homing missiles that track enemies |
| **SHIELD** | 🔵 Blue | +1 Life |
| **EXTRA LIFE** | 🟢 Green | +2 Lives |
| **BOMB** | 💥 Red | Destroys ALL enemies on screen! |
| **BONUS** | ⭐ Gold | Random 250-750 bonus points |

### 🏆 Leaderboard System
- Top 10 scores saved locally
- Enter your name after each game
- High score always displayed in HUD

### 🔊 Retro Sound Effects
- All sounds synthesized using Web Audio API
- Unique sounds for each weapon type
- Victory fanfares and game over music
- Toggle sound on/off anytime

### 🤖 AI Commander (Optional Powered by a SLM and Foundry Local)
- Dynamic enemy taunts during battle
- Personalized mission briefings
- Performance feedback and hints
- Powered by Microsoft Foundry Local

---

## 🕹️ Controls

| Key | Action |
|-----|--------|
| ← → or A/D | Move ship |
| SPACE | Fire |
| P | Pause/Resume |
| R | Restart (when game over) |

### On-Screen Buttons
- **🔊 SOUND** - Toggle sound effects
- **🏆 SCORES** - View leaderboard

---

## 🤖 Optional: Enable AI Features

Want dynamic AI-generated taunts and commentary? The game uses the **Foundry Local SDK v0.9.0** which handles everything automatically. No separate CLI installation is needed!

### Windows / macOS / Linux
```bash
# In the game folder, run:
npm install
npm start

# Open http://localhost:3001
```

The SDK will automatically:
- Download the AI model on first run (you will see a progress bar in the game)
- Start the local inference service
- Load the model into memory

When AI is enabled, you will see **"AI: ONLINE"** in the game HUD.

---

## 📁 Project Files

```
Spaceinvaders/
├── index.html    # Main game page - open this to play!
├── styles.css    # Retro arcade styling
├── game.js       # Core game logic
├── llm.js        # AI integration module  
├── sound.js      # Sound effects system
├── server.js     # AI proxy server (optional)
├── package.json  # Node.js config (optional)
└── README.md     # This file
```

---

## 🎯 Tips

- Collect weapon power-ups - they last 8 seconds!
- BOMB power-ups are rare but clear the entire screen
- Higher accuracy = better AI Commander feedback
- Your high score persists between sessions

---

## 🛠️ Technical Details

- **No dependencies** for basic gameplay
- **Foundry Local SDK v0.9.0** for AI features (optional)
- **Web Audio API** for synthesised sound
- **localStorage** for saving scores
- **ES6 Modules** for clean code structure
- **Canvas API** for rendering

---

## 📖 Developer Guide

See [AGENTS.md](AGENTS.md) for coding patterns and SDK integration details.

---

Enjoy defending Earth! 🚀
