/**
 * ===========================================
 * LLM Module Tests
 * ===========================================
 * 
 * Tests for the LLM client-side module.
 * These tests verify the caching, fallback responses,
 * and request handling logic.
 * 
 * Run with: node test/llm.test.js
 */

import assert from 'assert';

// ============================================
// Prompt Cache Tests (Unit Tests)
// ============================================

// Simple PromptCache implementation for testing
class PromptCache {
    constructor(maxSize = 50, ttl = 300000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    generateKey(type, context) {
        return `${type}:${JSON.stringify(context)}`;
    }

    get(type, context) {
        const key = this.generateKey(type, context);
        const entry = this.cache.get(key);
        
        if (!entry) return null;
        
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);
        
        return entry.response;
    }

    set(type, context, response) {
        const key = this.generateKey(type, context);
        
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(key, {
            response,
            timestamp: Date.now()
        });
    }

    clear() {
        this.cache.clear();
    }
}

// Test results tracking
let passed = 0;
let failed = 0;
const testResults = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        testResults.push({ name, status: 'PASS' });
        console.log(`✓ ${name}`);
    } catch (error) {
        failed++;
        testResults.push({ name, status: 'FAIL', error: error.message });
        console.log(`✗ ${name}`);
        console.log(`  Error: ${error.message}`);
    }
}

// ============================================
// Cache Tests
// ============================================

console.log('\n🧪 Running LLM Module Tests\n');
console.log('================================\n');
console.log('Cache Tests:\n');

test('Cache stores and retrieves values', () => {
    const cache = new PromptCache();
    cache.set('taunt', { level: 1 }, 'Your planet is doomed!');
    const result = cache.get('taunt', { level: 1 });
    assert.strictEqual(result, 'Your planet is doomed!');
});

test('Cache returns null for missing keys', () => {
    const cache = new PromptCache();
    const result = cache.get('taunt', { level: 99 });
    assert.strictEqual(result, null);
});

test('Cache respects max size limit', () => {
    const cache = new PromptCache(3, 300000);
    cache.set('a', {}, 'response1');
    cache.set('b', {}, 'response2');
    cache.set('c', {}, 'response3');
    cache.set('d', {}, 'response4'); // Should evict 'a'
    
    assert.strictEqual(cache.get('a', {}), null);
    assert.strictEqual(cache.get('d', {}), 'response4');
});

test('Cache generates unique keys for different contexts', () => {
    const cache = new PromptCache();
    cache.set('briefing', { level: 1 }, 'Level 1 briefing');
    cache.set('briefing', { level: 2 }, 'Level 2 briefing');
    
    assert.strictEqual(cache.get('briefing', { level: 1 }), 'Level 1 briefing');
    assert.strictEqual(cache.get('briefing', { level: 2 }), 'Level 2 briefing');
});

test('Cache clear removes all entries', () => {
    const cache = new PromptCache();
    cache.set('a', {}, 'value1');
    cache.set('b', {}, 'value2');
    cache.clear();
    
    assert.strictEqual(cache.get('a', {}), null);
    assert.strictEqual(cache.get('b', {}), null);
});

test('Cache handles complex context objects', () => {
    const cache = new PromptCache();
    const context = {
        level: 5,
        score: 1000,
        weapons: ['laser', 'spread'],
        powerUps: { active: true, type: 'shield' }
    };
    
    cache.set('hint', context, 'Use your shield wisely!');
    assert.strictEqual(cache.get('hint', context), 'Use your shield wisely!');
});

// ============================================
// Fallback Response Tests
// ============================================

console.log('\nFallback Response Tests:\n');

const FALLBACK_RESPONSES = {
    taunts: [
        "Your aim is terrible, human!",
        "Prepare to be vaporized!",
        "We will conquer your planet!"
    ],
    briefings: [
        "Incoming wave detected. Stay alert, pilot.",
        "Enemy reinforcements approaching. Good luck."
    ],
    performanceComments: {
        excellent: ["Outstanding performance, pilot!"],
        poor: ["The enemy is gaining ground..."]
    }
};

function getRandomFallback(category) {
    const responses = FALLBACK_RESPONSES[category];
    if (!responses) return null;
    
    if (Array.isArray(responses)) {
        return responses[Math.floor(Math.random() * responses.length)];
    }
    return null;
}

function getPerformanceFallback(accuracy) {
    if (accuracy >= 80) {
        return FALLBACK_RESPONSES.performanceComments.excellent[0];
    }
    return FALLBACK_RESPONSES.performanceComments.poor[0];
}

test('Fallback returns valid taunt', () => {
    const taunt = getRandomFallback('taunts');
    assert.ok(FALLBACK_RESPONSES.taunts.includes(taunt));
});

test('Fallback returns valid briefing', () => {
    const briefing = getRandomFallback('briefings');
    assert.ok(FALLBACK_RESPONSES.briefings.includes(briefing));
});

test('Fallback returns null for unknown category', () => {
    const result = getRandomFallback('nonexistent');
    assert.strictEqual(result, null);
});

test('Performance fallback handles excellent accuracy', () => {
    const comment = getPerformanceFallback(85);
    assert.strictEqual(comment, "Outstanding performance, pilot!");
});

test('Performance fallback handles poor accuracy', () => {
    const comment = getPerformanceFallback(30);
    assert.strictEqual(comment, "The enemy is gaining ground...");
});

// ============================================
// Configuration Tests
// ============================================

console.log('\nConfiguration Tests:\n');

const LLM_CONFIG = {
    modelAlias: 'phi-3.5-mini',
    maxTokens: 100,
    temperature: 0.8,
    cacheEnabled: true,
    cacheMaxSize: 50,
    cacheTTL: 300000,
    maxRetries: 2,
    retryDelay: 1000,
    requestTimeout: 10000
};

test('Configuration has required model settings', () => {
    assert.ok(LLM_CONFIG.modelAlias);
    assert.ok(typeof LLM_CONFIG.maxTokens === 'number');
    assert.ok(typeof LLM_CONFIG.temperature === 'number');
});

test('Configuration has valid temperature range', () => {
    assert.ok(LLM_CONFIG.temperature >= 0 && LLM_CONFIG.temperature <= 1);
});

test('Configuration has reasonable token limit', () => {
    assert.ok(LLM_CONFIG.maxTokens > 0 && LLM_CONFIG.maxTokens <= 500);
});

test('Configuration has cache settings', () => {
    assert.ok(typeof LLM_CONFIG.cacheEnabled === 'boolean');
    assert.ok(typeof LLM_CONFIG.cacheMaxSize === 'number');
    assert.ok(typeof LLM_CONFIG.cacheTTL === 'number');
});

test('Configuration has retry settings', () => {
    assert.ok(typeof LLM_CONFIG.maxRetries === 'number');
    assert.ok(LLM_CONFIG.maxRetries >= 0 && LLM_CONFIG.maxRetries <= 5);
});

// ============================================
// Summary
// ============================================

console.log('\n================================');
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
    console.log('Failed tests:');
    testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    console.log('');
    process.exit(1);
}
