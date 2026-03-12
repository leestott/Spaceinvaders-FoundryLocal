# Changelog

All notable changes to the Space Invaders - AI Commander Edition project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-12

### Changed
- **BREAKING**: Migrated from Foundry Local SDK v0.3.0 to v0.9.0
- Updated SDK initialization to use new `FoundryLocalManager.create()` API pattern
- Replaced OpenAI client with SDK's native `ChatClient` 
- Changed model loading to use `catalog.getModel()` → `model.load()` → `model.createChatClient()` pattern
- Simplified setup: no separate CLI installation required

### Removed
- Removed `openai` package dependency (SDK provides native chat client)
- Removed CLI installation instructions from README (SDK handles everything)

### Added
- Created `AGENTS.md` with comprehensive coding patterns and architecture documentation
- Added Mermaid architecture diagram
- Added automatic model download with progress indication
- Added `appName` configuration for SDK initialization
- **Download Progress UI**: Browser now displays real-time model download progress
  - Visual progress bar in AI Commander console (`████░░░░░ 45%`)
  - Status updates during download, loading, and initialization phases
  - Graceful error handling with user-friendly messages in the game UI
- **Server Status Endpoint**: New `/status` API endpoint for initialization state tracking
  - Returns current state: `idle`, `initializing`, `downloading`, `loading`, `ready`, `error`
  - Includes download progress percentage (0-100)
  - Browser polls this endpoint for real-time progress updates

### Fixed
- Server now properly awaits async `catalog.getModel()` call
- Added explicit `model.isCached()` check before download attempt

## [1.0.0] - 2026-03-01

### Added
- Initial release of Space Invaders - AI Commander Edition
- Browser-based Space Invaders game with Canvas API rendering
- 8 power-up types (Spread, Laser, Rapid, Missile, Shield, Extra Life, Bomb, Bonus)
- Local leaderboard with localStorage persistence
- Web Audio API synthesised sound effects
- Microsoft Foundry Local integration for AI features:
  - Dynamic enemy taunts
  - Mission briefings
  - Performance commentary
  - Game over messages
- Graceful fallback mode when AI server is unavailable
- Prompt caching to reduce API calls
- ES Modules architecture
- Retro CRT visual effects

### Technical
- Node.js proxy server for browser-SDK communication
- OpenAI-compatible API via Foundry Local endpoint
- Configurable model selection (default: phi-3.5-mini)
- Streaming support for longer AI responses
