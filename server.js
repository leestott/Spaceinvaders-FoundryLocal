/**
 * ===========================================
 * Foundry Local Proxy Server
 * ===========================================
 * 
 * This server acts as a bridge between the browser-based game
 * and the Microsoft Foundry Local SDK.
 * 
 * Since browsers cannot directly use Node.js modules like the
 * Foundry Local SDK, this proxy server handles the LLM communication.
 * 
 * Prerequisites:
 * 1. Install Node.js (v18+)
 * 2. Install Foundry Local CLI: winget install Microsoft.FoundryLocal
 * 3. Run: npm install
 * 4. Run: node server.js
 */

import { OpenAI } from 'openai';
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
let openaiClient = null;
let modelInfo = null;
let isInitialized = false;

// ============================================
// Initialize Foundry Local
// ============================================

async function initializeFoundry() {
    if (isInitialized) return true;
    
    console.log('[Server] Initializing Foundry Local...');
    
    try {
        // Create Foundry Local Manager
        foundryManager = new FoundryLocalManager();
        
        // Initialize with model alias - this will:
        // 1. Start the Foundry Local service if not running
        // 2. Download the model if not cached
        // 3. Return model info
        console.log(`[Server] Loading model: ${CONFIG.modelAlias}`);
        modelInfo = await foundryManager.init(CONFIG.modelAlias);
        console.log('[Server] Model loaded:', modelInfo.id);
        
        // Create OpenAI client pointing to local Foundry service
        openaiClient = new OpenAI({
            baseURL: foundryManager.endpoint,
            apiKey: foundryManager.apiKey || 'not-required'
        });
        
        isInitialized = true;
        console.log('[Server] Foundry Local initialized successfully');
        console.log(`[Server] Endpoint: ${foundryManager.endpoint}`);
        
        return true;
    } catch (error) {
        console.error('[Server] Failed to initialize Foundry Local:', error.message);
        console.error('[Server] Make sure Foundry Local is installed:');
        console.error('         winget install Microsoft.FoundryLocal');
        return false;
    }
}

// ============================================
// Chat Completion Handler
// ============================================

async function handleChatCompletion(systemPrompt, userPrompt, options = {}) {
    if (!isInitialized) {
        throw new Error('Foundry Local not initialized');
    }
    
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
    
    const completion = await openaiClient.chat.completions.create({
        model: modelInfo.id,
        messages: messages,
        max_tokens: options.maxTokens || CONFIG.defaultMaxTokens,
        temperature: options.temperature || CONFIG.defaultTemperature,
        stream: false
    });
    
    return completion.choices[0]?.message?.content || '';
}

// ============================================
// Streaming Chat Handler
// ============================================

async function* handleStreamingChat(systemPrompt, userPrompt, options = {}) {
    if (!isInitialized) {
        throw new Error('Foundry Local not initialized');
    }
    
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
    
    const stream = await openaiClient.chat.completions.create({
        model: modelInfo.id,
        messages: messages,
        max_tokens: options.maxTokens || CONFIG.defaultMaxTokens,
        temperature: options.temperature || CONFIG.defaultTemperature,
        stream: true
    });
    
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
            model: modelInfo?.id || null
        }));
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
    console.log('  Powered by Microsoft Foundry Local');
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
