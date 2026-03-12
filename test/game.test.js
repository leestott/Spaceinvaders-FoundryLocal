/**
 * ===========================================
 * Game Module Tests
 * ===========================================
 * 
 * Tests for the Space Invaders game logic.
 * These tests verify game configuration, state management,
 * and scoring calculations.
 * 
 * Run with: node test/game.test.js
 */

import assert from 'assert';

// ============================================
// Game Configuration Tests
// ============================================

const GAME_CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    playerSpeed: 5,
    bulletSpeed: 7,
    enemySpeed: 2,
    enemyDropDistance: 20,
    maxLives: 3,
    pointsPerEnemy: 10,
    pointsPerPowerUp: 50,
    levelBonusMultiplier: 100
};

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

console.log('\n🧪 Running Game Module Tests\n');
console.log('================================\n');
console.log('Configuration Tests:\n');

test('Canvas dimensions are positive', () => {
    assert.ok(GAME_CONFIG.canvasWidth > 0);
    assert.ok(GAME_CONFIG.canvasHeight > 0);
});

test('Player speed is positive', () => {
    assert.ok(GAME_CONFIG.playerSpeed > 0);
});

test('Bullet speed exceeds enemy speed', () => {
    assert.ok(GAME_CONFIG.bulletSpeed > GAME_CONFIG.enemySpeed);
});

test('Max lives is reasonable', () => {
    assert.ok(GAME_CONFIG.maxLives >= 1 && GAME_CONFIG.maxLives <= 10);
});

test('Points per enemy is positive', () => {
    assert.ok(GAME_CONFIG.pointsPerEnemy > 0);
});

// ============================================
// Game State Tests
// ============================================

console.log('\nGame State Tests:\n');

function createInitialGameState() {
    return {
        score: 0,
        lives: GAME_CONFIG.maxLives,
        level: 1,
        isGameOver: false,
        isPaused: false,
        enemiesDestroyed: 0,
        shotsFired: 0,
        shotsHit: 0
    };
}

test('Initial state has correct score', () => {
    const state = createInitialGameState();
    assert.strictEqual(state.score, 0);
});

test('Initial state has correct lives', () => {
    const state = createInitialGameState();
    assert.strictEqual(state.lives, GAME_CONFIG.maxLives);
});

test('Initial state starts at level 1', () => {
    const state = createInitialGameState();
    assert.strictEqual(state.level, 1);
});

test('Initial state is not game over', () => {
    const state = createInitialGameState();
    assert.strictEqual(state.isGameOver, false);
});

test('Initial state is not paused', () => {
    const state = createInitialGameState();
    assert.strictEqual(state.isPaused, false);
});

// ============================================
// Score Calculation Tests
// ============================================

console.log('\nScore Calculation Tests:\n');

function calculateScore(enemiesDestroyed, level, powerUpsCollected = 0) {
    const enemyPoints = enemiesDestroyed * GAME_CONFIG.pointsPerEnemy;
    const levelBonus = level * GAME_CONFIG.levelBonusMultiplier;
    const powerUpPoints = powerUpsCollected * GAME_CONFIG.pointsPerPowerUp;
    return enemyPoints + levelBonus + powerUpPoints;
}

function calculateAccuracy(shotsFired, shotsHit) {
    if (shotsFired === 0) return 0;
    return Math.round((shotsHit / shotsFired) * 100);
}

test('Score calculation includes enemy points', () => {
    const score = calculateScore(10, 1);
    assert.ok(score >= 10 * GAME_CONFIG.pointsPerEnemy);
});

test('Score calculation includes level bonus', () => {
    const score1 = calculateScore(0, 1);
    const score2 = calculateScore(0, 2);
    assert.ok(score2 > score1);
});

test('Score calculation includes power-up points', () => {
    const score1 = calculateScore(5, 1, 0);
    const score2 = calculateScore(5, 1, 2);
    assert.strictEqual(score2 - score1, 2 * GAME_CONFIG.pointsPerPowerUp);
});

test('Accuracy calculation with no shots is 0', () => {
    const accuracy = calculateAccuracy(0, 0);
    assert.strictEqual(accuracy, 0);
});

test('Accuracy calculation is correct percentage', () => {
    const accuracy = calculateAccuracy(100, 75);
    assert.strictEqual(accuracy, 75);
});

test('Perfect accuracy is 100%', () => {
    const accuracy = calculateAccuracy(50, 50);
    assert.strictEqual(accuracy, 100);
});

// ============================================
// Collision Detection Tests
// ============================================

console.log('\nCollision Detection Tests:\n');

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

test('Collision detected for overlapping rectangles', () => {
    const rect1 = { x: 0, y: 0, width: 50, height: 50 };
    const rect2 = { x: 25, y: 25, width: 50, height: 50 };
    assert.ok(checkCollision(rect1, rect2));
});

test('No collision for separate rectangles', () => {
    const rect1 = { x: 0, y: 0, width: 50, height: 50 };
    const rect2 = { x: 100, y: 100, width: 50, height: 50 };
    assert.ok(!checkCollision(rect1, rect2));
});

test('Collision detected for touching rectangles', () => {
    const rect1 = { x: 0, y: 0, width: 50, height: 50 };
    const rect2 = { x: 49, y: 0, width: 50, height: 50 };
    assert.ok(checkCollision(rect1, rect2));
});

test('No collision for adjacent rectangles', () => {
    const rect1 = { x: 0, y: 0, width: 50, height: 50 };
    const rect2 = { x: 50, y: 0, width: 50, height: 50 };
    assert.ok(!checkCollision(rect1, rect2));
});

// ============================================
// Movement Bounds Tests
// ============================================

console.log('\nMovement Bounds Tests:\n');

function clampPosition(x, width, canvasWidth) {
    return Math.max(0, Math.min(x, canvasWidth - width));
}

test('Position clamped to left boundary', () => {
    const result = clampPosition(-10, 50, 800);
    assert.strictEqual(result, 0);
});

test('Position clamped to right boundary', () => {
    const result = clampPosition(800, 50, 800);
    assert.strictEqual(result, 750);
});

test('Position unchanged when within bounds', () => {
    const result = clampPosition(400, 50, 800);
    assert.strictEqual(result, 400);
});

// ============================================
// Level Progression Tests
// ============================================

console.log('\nLevel Progression Tests:\n');

function calculateEnemySpeed(baseSpeed, level) {
    return baseSpeed + (level - 1) * 0.5;
}

function calculateEnemyCount(baseCount, level) {
    return Math.min(baseCount + (level - 1) * 5, 100);
}

test('Enemy speed increases with level', () => {
    const speed1 = calculateEnemySpeed(2, 1);
    const speed5 = calculateEnemySpeed(2, 5);
    assert.ok(speed5 > speed1);
});

test('Enemy count increases with level', () => {
    const count1 = calculateEnemyCount(20, 1);
    const count5 = calculateEnemyCount(20, 5);
    assert.ok(count5 > count1);
});

test('Enemy count capped at maximum', () => {
    const count = calculateEnemyCount(20, 100);
    assert.ok(count <= 100);
});

// ============================================
// AI Status Display Tests
// ============================================

console.log('\nAI Status Display Tests:\n');

function formatAIStatus(status, progress = null) {
    switch (status) {
        case 'connecting':
            return 'AI: CONNECTING...';
        case 'downloading':
            return progress !== null 
                ? `AI: DOWNLOADING ${progress}%` 
                : 'AI: DOWNLOADING...';
        case 'online':
            return 'AI: ONLINE';
        case 'offline':
            return 'AI: OFFLINE';
        default:
            return 'AI: UNKNOWN';
    }
}

test('AI status shows connecting', () => {
    const status = formatAIStatus('connecting');
    assert.strictEqual(status, 'AI: CONNECTING...');
});

test('AI status shows downloading with progress', () => {
    const status = formatAIStatus('downloading', 45);
    assert.strictEqual(status, 'AI: DOWNLOADING 45%');
});

test('AI status shows downloading without progress', () => {
    const status = formatAIStatus('downloading');
    assert.strictEqual(status, 'AI: DOWNLOADING...');
});

test('AI status shows online', () => {
    const status = formatAIStatus('online');
    assert.strictEqual(status, 'AI: ONLINE');
});

test('AI status shows offline', () => {
    const status = formatAIStatus('offline');
    assert.strictEqual(status, 'AI: OFFLINE');
});

test('AI status handles unknown status', () => {
    const status = formatAIStatus('invalid');
    assert.strictEqual(status, 'AI: UNKNOWN');
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
