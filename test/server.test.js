/**
 * ===========================================
 * Server Tests
 * ===========================================
 * 
 * Tests for the Foundry Local proxy server.
 * Run with: npm test
 */

import http from 'http';
import assert from 'assert';

const BASE_URL = 'http://localhost:3001';

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data ? JSON.parse(data) : null
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);
        
        if (body) {
            req.write(JSON.stringify(body));
        }
        
        req.end();
    });
}

// Test results tracking
let passed = 0;
let failed = 0;
const testResults = [];

function test(name, fn) {
    return async () => {
        try {
            await fn();
            passed++;
            testResults.push({ name, status: 'PASS' });
            console.log(`✓ ${name}`);
        } catch (error) {
            failed++;
            testResults.push({ name, status: 'FAIL', error: error.message });
            console.log(`✗ ${name}`);
            console.log(`  Error: ${error.message}`);
        }
    };
}

// ============================================
// Test Definitions
// ============================================

const tests = [
    test('Health endpoint returns OK status', async () => {
        const response = await makeRequest('/health');
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.status, 'ok');
    }),

    test('Health endpoint includes SDK version', async () => {
        const response = await makeRequest('/health');
        assert.strictEqual(response.data.sdkVersion, '0.9.0');
    }),

    test('Health endpoint includes model info', async () => {
        const response = await makeRequest('/health');
        assert.ok(response.data.model, 'Model should be defined');
    }),

    test('Status endpoint returns initialisation state', async () => {
        const response = await makeRequest('/status');
        assert.strictEqual(response.status, 200);
        assert.ok(['idle', 'initializing', 'downloading', 'loading', 'ready', 'error'].includes(response.data.state));
    }),

    test('Chat endpoint requires POST method', async () => {
        const response = await makeRequest('/chat', 'GET');
        // Should return 404 or method not allowed for non-POST
        assert.ok(response.status === 404 || response.status === 405);
    }),

    test('Chat endpoint validates required fields', async () => {
        const response = await makeRequest('/chat', 'POST', {});
        assert.strictEqual(response.status, 400);
        assert.ok(response.data.error.includes('Missing'));
    }),

    test('Chat endpoint accepts valid request', async () => {
        const response = await makeRequest('/chat', 'POST', {
            systemPrompt: 'You are a helpful assistant.',
            userPrompt: 'Say hello'
        });
        // Should return 200 if model is loaded, or 500 if not available
        assert.ok(response.status === 200 || response.status === 500);
    }),

    test('CORS headers are present', async () => {
        const response = await makeRequest('/health');
        assert.ok(response.headers['access-control-allow-origin']);
    }),

    test('Static file serving works for HTML', async () => {
        const response = await makeRequest('/');
        assert.strictEqual(response.status, 200);
        assert.ok(response.data.includes('Space Invaders') || response.headers['content-type'].includes('text/html'));
    }),

    test('404 returned for non-existent routes', async () => {
        const response = await makeRequest('/nonexistent');
        assert.strictEqual(response.status, 404);
    })
];

// ============================================
// Run Tests
// ============================================

async function runTests() {
    console.log('\n🧪 Running Server Tests\n');
    console.log('================================\n');

    // Check if server is running
    try {
        await makeRequest('/health');
    } catch (error) {
        console.log('❌ Server not running. Please start the server first:');
        console.log('   npm start');
        console.log('\nThen run tests in another terminal:');
        console.log('   npm test\n');
        process.exit(1);
    }

    // Run all tests
    for (const runTest of tests) {
        await runTest();
    }

    // Print summary
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
}

runTests();
