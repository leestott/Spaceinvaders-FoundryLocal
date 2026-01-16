# Space Invaders - AI Commander Edition

A retro-style Space Invaders browser game with power-ups, weapons, leaderboards, 
sound effects, and optional AI-powered features.

## 🎮 Play Now (No Setup Required!)

**Just double-click `index.html`** and start playing!

The game works immediately in any modern browser. No installation needed.

---

## ✨ Features

### 🕹️ Classic Arcade Gameplay
- Defend Earth from waves of alien invaders
- Progressive difficulty across multiple levels
- Retro pixel-art graphics with CRT effects

### 🔫 8 Power-Up Types
| Power-Up | Color | Effect |
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

Want dynamic AI-generated taunts and commentary? Follow these steps:

### Windows
```powershell
# 1. Install Foundry Local (one-time)
winget install Microsoft.FoundryLocal

# 2. In the game folder, run:
npm install
npm start

# 3. Open http://localhost:3001
```

### macOS
```bash
# 1. Install Foundry Local (one-time)
brew install microsoft/foundrylocal/foundrylocal

# 2. In the game folder, run:
npm install
npm start

# 3. Open http://localhost:3001
```

When AI is enabled, you'll see **"AI: ONLINE"** in the game HUD.

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
- **Web Audio API** for synthesized sound
- **localStorage** for saving scores
- **ES6 Modules** for clean code structure
- **Canvas API** for rendering

---

Enjoy defending Earth! 🚀
