/**
 * ===========================================
 * LLM Integration Module
 * Microsoft Foundry Local SDK Integration
 * ===========================================
 * 
 * This module handles all interactions with the Microsoft Foundry Local
 * language model. It provides:
 * - Initialization and connection management
 * - Prompt caching to avoid repeated identical calls
 * - Async, non-blocking API for game integration
 * - Graceful fallback when model is unavailable
 */

// ============================================
// Configuration
// ============================================

const LLM_CONFIG = {
    // Model alias - Foundry Local will select the best variant for hardware
    modelAlias: 'phi-3.5-mini',
    
    // Maximum tokens for responses (keep short for game context)
    maxTokens: 100,
    
    // Temperature for response randomness (0.7-0.9 for creativity)
    temperature: 0.8,
    
    // Cache settings
    cacheEnabled: true,
    cacheMaxSize: 50,
    cacheTTL: 300000, // 5 minutes in milliseconds
    
    // Retry settings
    maxRetries: 2,
    retryDelay: 1000,
    
    // Timeout for requests (ms)
    requestTimeout: 10000
};

// ============================================
// Prompt Cache Implementation
// ============================================

/**
 * Simple LRU-style cache for storing LLM responses.
 * Prevents repeated identical API calls during gameplay.
 */
class PromptCache {
    constructor(maxSize = 50, ttl = 300000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }
    
    /**
     * Generate a cache key from prompt parameters
     */
    generateKey(type, context) {
        return `${type}:${JSON.stringify(context)}`;
    }
    
    /**
     * Get cached response if available and not expired
     */
    get(type, context) {
        const key = this.generateKey(type, context);
        const entry = this.cache.get(key);
        
        if (!entry) return null;
        
        // Check if entry has expired
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);
        
        return entry.response;
    }
    
    /**
     * Store response in cache
     */
    set(type, context, response) {
        const key = this.generateKey(type, context);
        
        // Remove oldest entry if cache is full
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(key, {
            response,
            timestamp: Date.now()
        });
    }
    
    /**
     * Clear all cached entries
     */
    clear() {
        this.cache.clear();
    }
}

// ============================================
// Fallback Responses
// ============================================

/**
 * Pre-defined fallback responses when LLM is unavailable.
 * These maintain the game experience without AI.
 */
const FALLBACK_RESPONSES = {
    taunts: [
        "Your aim is terrible, human!",
        "Prepare to be vaporized!",
        "We will conquer your planet!",
        "Resistance is futile!",
        "You cannot stop us!",
        "Your weapons are primitive!",
        "We have traveled galaxies to destroy you!",
        "Surrender now, Earthling!",
        "Our fleet is infinite!",
        "You fight alone against millions!"
    ],
    
    briefings: [
        "Incoming wave detected. Stay alert, pilot.",
        "Enemy reinforcements approaching. Good luck.",
        "New hostiles on radar. Show them what you've got.",
        "Alien signatures detected. Engage at will.",
        "Multiple contacts incoming. Stay focused.",
        "The enemy grows stronger. Adapt and overcome.",
        "Heavy resistance ahead. Keep your shields up.",
        "Threat level increasing. Stay sharp, commander."
    ],
    
    levelDescriptions: [
        "Sector Alpha - The invasion begins.",
        "Sector Beta - Enemy forces intensify.",
        "Sector Gamma - Deep space combat zone.",
        "Sector Delta - The heart of enemy territory.",
        "Sector Omega - Final stand against the horde."
    ],
    
    powerUpHints: [
        "Power-up detected! Rapid fire incoming!",
        "Shield boost available in the debris field!",
        "Multi-shot upgrade spotted! Grab it fast!",
        "Bonus points floating through the sector!",
        "Special weapon cache detected!"
    ],
    
    performanceComments: {
        excellent: [
            "Outstanding performance, pilot!",
            "You're a natural ace!",
            "The enemy trembles before you!",
            "Exceptional marksmanship!",
            "You fight like a legend!"
        ],
        good: [
            "Solid shooting, keep it up!",
            "You're doing well, pilot.",
            "Nice work out there!",
            "Holding the line admirably!",
            "Good progress, commander."
        ],
        average: [
            "Stay focused, you can do better.",
            "Keep practicing, pilot.",
            "The enemy is testing you.",
            "Don't give up now!",
            "You're learning the ropes."
        ],
        poor: [
            "The enemy is gaining ground...",
            "We need better results, pilot.",
            "Concentrate on your aim!",
            "Earth is counting on you!",
            "Dig deep and fight harder!"
        ]
    },
    
    gameOverComments: {
        highScore: "Legendary performance! You've earned your place among the stars.",
        mediumScore: "A valiant effort. The galaxy will remember your sacrifice.",
        lowScore: "The battle was lost, but hope remains. Try again, pilot."
    }
};

// ============================================
// LLM Manager Class
// ============================================

/**
 * Main class for managing LLM interactions.
 * Handles initialization, requests, caching, and fallbacks.
 */
class LLMManager {
    constructor() {
        this.isInitialized = false;
        this.isAvailable = false;
        this.openai = null;
        this.foundryManager = null;
        this.modelInfo = null;
        this.cache = new PromptCache(LLM_CONFIG.cacheMaxSize, LLM_CONFIG.cacheTTL);
        this.pendingRequests = new Map();
        this.statusCallback = null;
    }
    
    /**
     * Set callback for status updates
     */
    onStatusChange(callback) {
        this.statusCallback = callback;
    }
    
    /**
     * Update status and notify listeners
     */
    updateStatus(status) {
        if (this.statusCallback) {
            this.statusCallback(status);
        }
    }
    
    /**
     * Initialize connection to Foundry Local.
     * This is called once at game start.
     * 
     * The game works in two modes:
     * 1. STANDALONE: Just open index.html - uses fallback responses (no setup needed!)
     * 2. WITH AI: Run "npm start" first for live AI-generated content
     */
    async initialize() {
        if (this.isInitialized) return this.isAvailable;
        
        this.updateStatus('loading');
        console.log('[LLM] Checking for AI Commander server...');
        
        try {
            // Try to connect to local proxy server (optional)
            const proxyAvailable = await this.checkLocalProxy();
            if (proxyAvailable) {
                this.isInitialized = true;
                this.isAvailable = true;
                this.updateStatus('online');
                console.log('[LLM] ✓ Connected to Foundry Local AI');
                return true;
            }
        } catch (error) {
            // Silent fail - proxy is optional
        }
        
        // No proxy = standalone mode with fallback responses
        console.log('[LLM] Running in standalone mode (no AI server)');
        console.log('[LLM] Tip: Run "npm start" for live AI features');
        this.isInitialized = true;
        this.isAvailable = false;
        this.updateStatus('offline');
        
        return this.isAvailable;
    }
    
    /**
     * Check if local proxy server is running
     */
    async checkLocalProxy() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            
            const response = await fetch('http://localhost:3001/health', {
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Send a prompt to the LLM and get a response.
     * This is the core method for all LLM interactions.
     * 
     * @param {string} systemPrompt - Context for the AI
     * @param {string} userPrompt - The actual request
     * @param {object} options - Additional options
     * @returns {Promise<string>} - The generated response
     */
    async sendPrompt(systemPrompt, userPrompt, options = {}) {
        if (!this.isAvailable) {
            return null;
        }
        
        try {
            const controller = new AbortController();
            const timeout = setTimeout(
                () => controller.abort(), 
                options.timeout || LLM_CONFIG.requestTimeout
            );
            
            const response = await fetch('http://localhost:3001/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemPrompt,
                    userPrompt,
                    maxTokens: options.maxTokens || LLM_CONFIG.maxTokens,
                    temperature: options.temperature || LLM_CONFIG.temperature
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return data.content;
            
        } catch (error) {
            console.warn('[LLM] Request failed:', error.message);
            return null;
        }
    }
    
    /**
     * Generate a streaming response (for longer content)
     * Currently unused but available for future features
     */
    async sendPromptStreaming(systemPrompt, userPrompt, onChunk) {
        if (!this.isAvailable) return null;
        
        try {
            const response = await fetch('http://localhost:3001/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ systemPrompt, userPrompt })
            });
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                fullResponse += chunk;
                if (onChunk) onChunk(chunk);
            }
            
            return fullResponse;
        } catch (error) {
            console.warn('[LLM] Streaming request failed:', error.message);
            return null;
        }
    }
    
    // ========================================
    // Game-Specific LLM Methods
    // ========================================
    
    /**
     * Generate a dynamic enemy taunt.
     * Called periodically during gameplay.
     */
    async generateTaunt(gameState = {}) {
        const context = {
            level: gameState.level || 1,
            score: Math.floor((gameState.score || 0) / 100) * 100
        };
        
        // Check cache first
        if (LLM_CONFIG.cacheEnabled) {
            const cached = this.cache.get('taunt', context);
            if (cached) return cached;
        }
        
        const systemPrompt = `You are an alien commander in a Space Invaders game. Generate a short, menacing taunt for the human player. Keep it under 15 words. Be creative and threatening but appropriate for all ages.`;
        
        const userPrompt = `The player is on level ${context.level} with score ${context.score}. Generate a unique alien taunt.`;
        
        const response = await this.sendPrompt(systemPrompt, userPrompt, {
            maxTokens: 50,
            temperature: 0.9
        });
        
        if (response) {
            this.cache.set('taunt', context, response);
            return response;
        }
        
        // Fallback
        return this.getRandomFallback('taunts');
    }
    
    /**
     * Generate a mission briefing for a new level.
     * Called at the start of each level.
     */
    async generateBriefing(level, previousScore = 0) {
        const context = { level, previousScore };
        
        if (LLM_CONFIG.cacheEnabled) {
            const cached = this.cache.get('briefing', context);
            if (cached) return cached;
        }
        
        const systemPrompt = `You are an AI Commander guiding a pilot in a Space Invaders game. Generate a brief mission briefing for the upcoming level. Keep it under 25 words. Be encouraging but serious about the threat.`;
        
        const userPrompt = `Generate a briefing for Level ${level}. The pilot's current score is ${previousScore}. Make it feel unique and urgent.`;
        
        const response = await this.sendPrompt(systemPrompt, userPrompt, {
            maxTokens: 60,
            temperature: 0.7
        });
        
        if (response) {
            this.cache.set('briefing', context, response);
            return response;
        }
        
        return this.getRandomFallback('briefings');
    }
    
    /**
     * Generate a procedural level description.
     * Provides flavor text for each level.
     */
    async generateLevelDescription(level) {
        const context = { level };
        
        if (LLM_CONFIG.cacheEnabled) {
            const cached = this.cache.get('levelDesc', context);
            if (cached) return cached;
        }
        
        const systemPrompt = `You are a narrator in a Space Invaders game. Generate a short, atmospheric description of a space sector where battle will take place. Keep it under 20 words. Make it sound epic and dangerous.`;
        
        const userPrompt = `Describe the space sector for Level ${level}. Make each sector feel unique.`;
        
        const response = await this.sendPrompt(systemPrompt, userPrompt, {
            maxTokens: 50,
            temperature: 0.8
        });
        
        if (response) {
            this.cache.set('levelDesc', context, response);
            return response;
        }
        
        const index = Math.min(level - 1, FALLBACK_RESPONSES.levelDescriptions.length - 1);
        return FALLBACK_RESPONSES.levelDescriptions[index];
    }
    
    /**
     * Generate a power-up hint message.
     * Called when power-ups appear in game.
     */
    async generatePowerUpHint(powerUpType = 'generic') {
        const context = { type: powerUpType };
        
        if (LLM_CONFIG.cacheEnabled) {
            const cached = this.cache.get('hint', context);
            if (cached) return cached;
        }
        
        const systemPrompt = `You are an AI Commander in a Space Invaders game. Alert the pilot about a power-up. Keep it under 12 words. Sound excited but professional.`;
        
        const userPrompt = `A ${powerUpType} power-up has appeared. Alert the pilot!`;
        
        const response = await this.sendPrompt(systemPrompt, userPrompt, {
            maxTokens: 30,
            temperature: 0.7
        });
        
        if (response) {
            this.cache.set('hint', context, response);
            return response;
        }
        
        return this.getRandomFallback('powerUpHints');
    }
    
    /**
     * Generate a performance comment based on player stats.
     * Called periodically to provide feedback.
     */
    async generatePerformanceComment(stats = {}) {
        const accuracy = stats.accuracy || 0;
        const efficiency = stats.efficiency || 0;
        
        let performanceLevel = 'average';
        if (accuracy > 70 && efficiency > 80) performanceLevel = 'excellent';
        else if (accuracy > 50 || efficiency > 60) performanceLevel = 'good';
        else if (accuracy < 30 && efficiency < 40) performanceLevel = 'poor';
        
        const context = { performanceLevel };
        
        if (LLM_CONFIG.cacheEnabled) {
            const cached = this.cache.get('performance', context);
            if (cached) return cached;
        }
        
        const systemPrompt = `You are an AI Commander commenting on a pilot's performance in Space Invaders. Generate a short comment (under 15 words) that matches their performance level: ${performanceLevel}.`;
        
        const userPrompt = `Player accuracy: ${accuracy}%, efficiency: ${efficiency}%. Comment on their ${performanceLevel} performance.`;
        
        const response = await this.sendPrompt(systemPrompt, userPrompt, {
            maxTokens: 40,
            temperature: 0.7
        });
        
        if (response) {
            this.cache.set('performance', context, response);
            return response;
        }
        
        return this.getRandomFallback('performanceComments', performanceLevel);
    }
    
    /**
     * Generate a game over comment based on final score.
     */
    async generateGameOverComment(score, level, stats = {}) {
        const context = { 
            scoreRange: score > 5000 ? 'high' : score > 2000 ? 'medium' : 'low'
        };
        
        if (LLM_CONFIG.cacheEnabled) {
            const cached = this.cache.get('gameOver', context);
            if (cached) return cached;
        }
        
        const systemPrompt = `You are an AI Commander delivering a final message after a Space Invaders game ends. Be respectful of the player's effort. Keep it under 25 words.`;
        
        const userPrompt = `Game over. Score: ${score}, Level reached: ${level}. Generate a ${context.scoreRange}-score appropriate farewell message.`;
        
        const response = await this.sendPrompt(systemPrompt, userPrompt, {
            maxTokens: 60,
            temperature: 0.7
        });
        
        if (response) {
            this.cache.set('gameOver', context, response);
            return response;
        }
        
        // Fallback based on score
        if (score > 5000) return FALLBACK_RESPONSES.gameOverComments.highScore;
        if (score > 2000) return FALLBACK_RESPONSES.gameOverComments.mediumScore;
        return FALLBACK_RESPONSES.gameOverComments.lowScore;
    }
    
    /**
     * Get a random fallback response of a specific type.
     */
    getRandomFallback(type, subType = null) {
        let responses = FALLBACK_RESPONSES[type];
        
        if (subType && typeof responses === 'object' && !Array.isArray(responses)) {
            responses = responses[subType];
        }
        
        if (Array.isArray(responses) && responses.length > 0) {
            return responses[Math.floor(Math.random() * responses.length)];
        }
        
        return "Systems nominal.";
    }
    
    /**
     * Clear the prompt cache.
     */
    clearCache() {
        this.cache.clear();
    }
    
    /**
     * Check if LLM is available.
     */
    isReady() {
        return this.isInitialized && this.isAvailable;
    }
}

// Create and export singleton instance
const llmManager = new LLMManager();

export { llmManager, LLMManager, LLM_CONFIG, FALLBACK_RESPONSES };
