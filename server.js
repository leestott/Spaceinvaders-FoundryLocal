/**
 * ===========================================
 * Foundry Local Proxy Server
 * ===========================================
 * 
 * This server acts as a bridge between the browser-based game
 * and the Microsoft Foundry Local SDK (v0.9.0+).
 * 
 * Since browsers cannot directly use Node.js modules like the
 * Foundry Local SDK, this proxy server handles the LLM communication.
 * 
 * Prerequisites:
 * 1. Install Node.js (v18+)
 * 2. Run: npm install
 * 3. Run: node server.js
 * 
 * The SDK will automatically manage the Foundry Local service.
 */

import { FoundryLocalManager } from 'foundry-local-sdk';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MIME types for static file serving
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// ============================================
// Configuration
// ============================================

const CONFIG = {
    port: 3001,
    modelAlias: 'phi-3.5-mini',
    defaultMaxTokens: 100,
    defaultTemperature: 0.8
};

// ============================================
// Global State
// ============================================

let foundryManager = null;
let chatClient = null;
let loadedModel = null;
let isInitialized = false;

// Download progress tracking for UI
let initStatus = {
    state: 'idle',           // idle, initializing, downloading, loading, ready, error
    progress: 0,             // Download progress 0-100
    message: '',             // Status message for UI
    modelAlias: null,        // Model being loaded
    error: null              // Error message if failed
};

// ============================================
// Initialize Foundry Local
// ============================================

/**
 * Renders a CLI progress bar for model download.
 * @param {number} progress - Download progress percentage (0-100).
 */
function renderProgressBar(progress) {
    const barWidth = 30;
    const filled = Math.round((progress / 100) * barWidth);
    const empty = barWidth - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    process.stdout.write(`\r[Server] Downloading: [${bar}] ${progress.toFixed(1)}%`);
    if (progress >= 100) {
        process.stdout.write('\n');
    }
}

async function initializeFoundry() {
    if (isInitialized) return true;
    
    initStatus.state = 'initializing';
    initStatus.message = 'Starting Foundry Local SDK...';
    initStatus.modelAlias = CONFIG.modelAlias;
    
    console.log('[Server] Initializing Foundry Local SDK v0.9.0...');
    
    try {
        // Step 1: Create Foundry Local Manager using the new SDK API
        console.log('[Server] Creating Foundry Local Manager...');
        initStatus.message = 'Creating Foundry Local Manager...';
        foundryManager = FoundryLocalManager.create({
            appName: 'space-invaders-ai-commander',
            logLevel: 'info'
        });
        
        // Step 2: Access the catalog and find our model (async in v0.9.0)
        console.log(`[Server] Looking for model: ${CONFIG.modelAlias}...`);
        initStatus.message = `Looking for model: ${CONFIG.modelAlias}...`;
        const catalog = foundryManager.catalog;
        const model = await catalog.getModel(CONFIG.modelAlias);
        
        if (!model) {
            throw new Error(`Model "${CONFIG.modelAlias}" not found in catalog`);
        }
        
        console.log(`[Server] Found model: ${model.alias}`);
        
        // Step 3: Check if model is cached, download if needed
        if (!model.isCached) {
            initStatus.state = 'downloading';
            initStatus.progress = 0;
            initStatus.message = `Downloading ${CONFIG.modelAlias}... This may take several minutes.`;
            console.log(`[Server] Downloading model: ${CONFIG.modelAlias} (this may take several minutes)...`);
            
            // Download with progress callback
            await model.download((progress) => {
                initStatus.progress = progress;
                initStatus.message = `Downloading ${CONFIG.modelAlias}... ${progress.toFixed(1)}%`;
                renderProgressBar(progress);
            });
            
            initStatus.progress = 100;
            console.log(`[Server] Download complete: ${CONFIG.modelAlias}`);
        } else {
            console.log(`[Server] Model already cached: ${CONFIG.modelAlias}`);
        }
        
        // Step 4: Load the model into memory
        initStatus.state = 'loading';
        initStatus.message = `Loading ${CONFIG.modelAlias} into memory...`;
        console.log(`[Server] Loading model: ${CONFIG.modelAlias}...`);
        await model.load();
        loadedModel = model;
        
        // Step 5: Create chat client from the loaded model
        console.log('[Server] Creating chat client...');
        initStatus.message = 'Creating chat client...';
        chatClient = model.createChatClient();
        
        isInitialized = true;
        initStatus.state = 'ready';
        initStatus.message = 'AI Commander ready!';
        console.log('[Server] Foundry Local SDK initialized successfully');
        
        return true;
    } catch (error) {
        console.error('[Server] Failed to initialize Foundry Local:', error.message);
        console.error('[Server] Troubleshooting tips:');
        console.error('         - Ensure foundry-local-sdk is installed: npm install foundry-local-sdk');
        console.error('         - Check that you have sufficient disk space for model download');
        console.error('         - Try a different model alias if phi-3.5-mini is unavailable');
        
        initStatus.state = 'error';
        initStatus.error = error.message;
        initStatus.message = `Failed: ${error.message}`;
        
        return false;
    }
}

// ============================================
// Chat Completion Handler
// ============================================

async function handleChatCompletion(systemPrompt, userPrompt, options = {}) {
    if (!isInitialized || !chatClient) {
        throw new Error('Foundry Local not initialized');
    }
    
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
    
    // Use the new SDK's chat client API - minimal call without settings
    // SDK 0.9.0 may have API changes that make settings optional
    const response = await chatClient.completeChat(messages);
    
    return response.choices[0]?.message?.content || '';
}

// ============================================
// Streaming Chat Handler
// ============================================

async function* handleStreamingChat(systemPrompt, userPrompt, options = {}) {
    if (!isInitialized || !chatClient) {
        throw new Error('Foundry Local not initialized');
    }
    
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
    
    // Use the new SDK's streaming API without settings
    const stream = await chatClient.completeChatStreaming(messages);
    
    for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
            yield chunk.choices[0].delta.content;
        }
    }
}

// ============================================
// HTTP Server
// ============================================

const server = http.createServer(async (req, res) => {
    // Enable CORS for browser requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    const url = new URL(req.url, `http://localhost:${CONFIG.port}`);
    
    // Serve static files for root and game files
    if (req.method === 'GET' && !url.pathname.startsWith('/chat') && url.pathname !== '/health') {
        let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
        const fullPath = path.join(__dirname, filePath);
        
        // Security: prevent directory traversal
        if (!fullPath.startsWith(__dirname)) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden' }));
            return;
        }
        
        try {
            const ext = path.extname(fullPath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            const content = fs.readFileSync(fullPath);
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
            return;
        } catch (err) {
            // File not found - fall through to API routes or 404
            if (err.code !== 'ENOENT') {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Server error' }));
                return;
            }
        }
    }
    
    // Health check endpoint
    if (url.pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'ok', 
            initialized: isInitialized,
            model: loadedModel?.alias || loadedModel?.id || null,
            sdkVersion: '0.9.0'
        }));
        return;
    }
    
    // Status endpoint for UI - includes download progress
    if (url.pathname === '/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(initStatus));
        return;
    }
    
    // Chat completion endpoint
    if (url.pathname === '/chat' && req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const { systemPrompt, userPrompt, maxTokens, temperature } = JSON.parse(body);
                
                if (!systemPrompt || !userPrompt) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing systemPrompt or userPrompt' }));
                    return;
                }
                
                console.log(`[Server] Chat request: "${userPrompt.substring(0, 50)}..."`);
                
                const content = await handleChatCompletion(systemPrompt, userPrompt, {
                    maxTokens,
                    temperature
                });
                
                console.log(`[Server] Response: "${content.substring(0, 50)}..."`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ content }));
                
            } catch (error) {
                console.error('[Server] Chat error:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }
    
    // Streaming chat endpoint
    if (url.pathname === '/chat/stream' && req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const { systemPrompt, userPrompt, maxTokens, temperature } = JSON.parse(body);
                
                if (!systemPrompt || !userPrompt) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing systemPrompt or userPrompt' }));
                    return;
                }
                
                res.writeHead(200, { 
                    'Content-Type': 'text/plain',
                    'Transfer-Encoding': 'chunked'
                });
                
                for await (const chunk of handleStreamingChat(systemPrompt, userPrompt, {
                    maxTokens,
                    temperature
                })) {
                    res.write(chunk);
                }
                
                res.end();
                
            } catch (error) {
                console.error('[Server] Stream error:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }
    
    // 404 for unknown routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

// ============================================
// Start Server
// ============================================

async function start() {
    console.log('========================================');
    console.log('  Space Invaders - AI Commander Server');
    console.log('  Foundry Local SDK v0.9.0');
    console.log('========================================');
    console.log('');
    
    // Initialize Foundry Local
    const initialized = await initializeFoundry();
    
    if (!initialized) {
        console.log('');
        console.log('[Server] Starting in fallback mode (no LLM)');
        console.log('[Server] The game will use pre-defined responses');
    }
    
    // Start HTTP server
    server.listen(CONFIG.port, () => {
        console.log('');
        console.log(`[Server] Proxy server running on http://localhost:${CONFIG.port}`);
        console.log('[Server] Open index.html in a browser to play the game');
        console.log('');
        console.log('Press Ctrl+C to stop the server');
    });
}

start();
