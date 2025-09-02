// Simple Vision Assembly Dashboard API Server
// This runs without external dependencies for easy demo

const http = require('http');
const url = require('url');
const { v4: uuidv4 } = require('crypto');

// Generate UUID v4 without external dependency
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Simple logging
const logger = {
    log: (message) => console.log(`[${new Date().toISOString()}] ${message}`),
    error: (message) => console.error(`[${new Date().toISOString()}] ERROR: ${message}`),
    warn: (message) => console.warn(`[${new Date().toISOString()}] WARN: ${message}`)
};

// Mock data store
let mockData = {
    lineState: 1, // 0=Stopped, 1=Running, 2=Paused, 3=Fault
    partCounter: 0,
    oeeScore: 87.5,
    throughput: { current: 142, target: 150 },
    qualityScore: 96.8,
    alarms: [],
    defects: [],
    tags: new Map()
};

// WebSocket connections (simple implementation)
let wsConnections = [];

// Initialize mock PLC tags
function initializeMockTags() {
    mockData.tags.set('Line.State', 1);
    mockData.tags.set('Line.RunCmd', false);
    mockData.tags.set('Station01.CycleTimeMs', 850);
    mockData.tags.set('Part.Counter', 0);
    mockData.tags.set('Quality.PassCount', 0);
    mockData.tags.set('Quality.FailCount', 0);
    mockData.tags.set('Process.Temperature', 22.5);
    mockData.tags.set('Process.Pressure', 6.2);
    
    logger.log('Mock PLC tags initialized');
}

// Simulate production cycle
function simulateProduction() {
    if (mockData.lineState === 1) { // Running
        // Increment part counter
        mockData.partCounter++;
        mockData.tags.set('Part.Counter', mockData.partCounter);
        
        // Simulate cycle time variation
        const baseCycle = 850;
        const variation = Math.floor(Math.random() * 100 - 50);
        mockData.tags.set('Station01.CycleTimeMs', baseCycle + variation);
        
        // Simulate temperature and pressure variation
        const temp = mockData.tags.get('Process.Temperature');
        const newTemp = temp + (Math.random() - 0.5) * 0.5;
        mockData.tags.set('Process.Temperature', Math.round(newTemp * 10) / 10);
        
        const pressure = mockData.tags.get('Process.Pressure');
        const newPressure = pressure + (Math.random() - 0.5) * 0.2;
        mockData.tags.set('Process.Pressure', Math.round(newPressure * 10) / 10);
        
        // Simulate random defects
        if (Math.random() < 0.05) { // 5% defect rate
            const defect = {
                id: generateUUID(),
                partId: generateUUID(),
                class: ['scratch', 'dent', 'discoloration'][Math.floor(Math.random() * 3)],
                confidence: 0.7 + Math.random() * 0.3,
                station: 1,
                timestamp: new Date().toISOString()
            };
            mockData.defects.push(defect);
            
            // Broadcast to WebSocket clients
            broadcastToClients('vision/defect', defect);
            logger.log(`Defect detected: ${defect.class}`);
        }
        
        // Simulate random faults
        if (Math.random() < 0.01) { // 1% fault rate
            const alarm = {
                id: generateUUID(),
                code: 'F103',
                severity: 'high',
                message: 'Part present timeout',
                station: 1,
                status: 'active',
                timestamp: new Date().toISOString()
            };
            mockData.alarms.push(alarm);
            mockData.lineState = 3; // Fault state
            
            broadcastToClients('alarm/raised', alarm);
            logger.warn(`Alarm raised: ${alarm.message}`);
            
            // Auto-clear alarm after 5-10 seconds
            setTimeout(() => {
                alarm.status = 'cleared';
                mockData.lineState = 1; // Back to running
                broadcastToClients('alarm/cleared', alarm);
                logger.log(`Alarm cleared: ${alarm.code}`);
            }, Math.random() * 5000 + 5000);
        }
        
        // Broadcast tag updates
        const tagUpdate = {
            'Part.Counter': mockData.partCounter,
            'Station01.CycleTimeMs': mockData.tags.get('Station01.CycleTimeMs'),
            'Process.Temperature': mockData.tags.get('Process.Temperature'),
            'Process.Pressure': mockData.tags.get('Process.Pressure'),
            'Line.State': mockData.lineState
        };
        broadcastToClients('plc/tags', tagUpdate);
    }
}

// Simple WebSocket broadcast
function broadcastToClients(event, data) {
    wsConnections.forEach(ws => {
        try {
            ws.write(`data: ${JSON.stringify({ event, data })}\n\n`);
        } catch (err) {
            // Remove dead connections
            wsConnections = wsConnections.filter(conn => conn !== ws);
        }
    });
}

// Handle HTTP requests
function handleRequest(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    
    // Routes
    if (path === '/api/health') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'ok',
            mode: process.env.MODE || 'demo',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }));
        
    } else if (path === '/api/dashboard/status') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
            lineState: mockData.lineState,
            oeeScore: mockData.oeeScore,
            throughput: mockData.throughput,
            qualityScore: mockData.qualityScore,
            partCounter: mockData.partCounter,
            alarmCount: mockData.alarms.filter(a => a.status === 'active').length,
            timestamp: new Date().toISOString()
        }));
        
    } else if (path === '/api/plc/tags') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        const tags = Object.fromEntries(mockData.tags);
        res.end(JSON.stringify({
            tags,
            timestamp: new Date().toISOString()
        }));
        
    } else if (path === '/api/alarms') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        const activeAlarms = mockData.alarms.filter(a => a.status === 'active').slice(-10);
        res.end(JSON.stringify({
            alarms: activeAlarms,
            count: activeAlarms.length,
            timestamp: new Date().toISOString()
        }));
        
    } else if (path === '/api/defects') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        const recentDefects = mockData.defects.slice(-20);
        res.end(JSON.stringify({
            defects: recentDefects,
            count: recentDefects.length,
            timestamp: new Date().toISOString()
        }));
        
    } else if (path === '/api/plc/write' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const { tag, value } = JSON.parse(body);
                
                if (!tag || value === undefined) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Tag and value required' }));
                    return;
                }
                
                mockData.tags.set(tag, value);
                logger.log(`Tag written: ${tag} = ${value}`);
                
                // Handle special tags
                if (tag === 'Line.RunCmd') {
                    mockData.lineState = value ? 1 : 0;
                } else if (tag === 'Emergency.Stop') {
                    mockData.lineState = 0;
                    logger.warn('EMERGENCY STOP ACTIVATED');
                }
                
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    tag,
                    value,
                    timestamp: new Date().toISOString()
                }));
                
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        
    } else if (path === '/events') {
        // Simple Server-Sent Events for real-time updates
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.writeHead(200);
        
        // Add to connections
        wsConnections.push(res);
        
        // Send initial dashboard status
        res.write(`data: ${JSON.stringify({
            event: 'dashboard/status',
            data: {
                lineState: mockData.lineState,
                oeeScore: mockData.oeeScore,
                throughput: mockData.throughput,
                qualityScore: mockData.qualityScore,
                partCounter: mockData.partCounter
            }
        })}\n\n`);
        
        req.on('close', () => {
            wsConnections = wsConnections.filter(conn => conn !== res);
            logger.log('Client disconnected from events stream');
        });
        
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
}

// Start server
function bootstrap() {
    const port = process.env.API_PORT || 4000;
    const mode = process.env.MODE || 'demo';
    
    initializeMockTags();
    
    // Start production simulation
    setInterval(simulateProduction, 2000); // Every 2 seconds
    
    const server = http.createServer(handleRequest);
    
    server.listen(port, () => {
        logger.log(`🚀 Vision Assembly Dashboard API running on port ${port}`);
        logger.log(`📊 Mode: ${mode}`);
        logger.log(`📚 Health check: http://localhost:${port}/api/health`);
        logger.log(`📱 Demo Dashboard: Open demo.html in your browser`);
        logger.log(`🔌 Events stream: http://localhost:${port}/events`);
    });
}

bootstrap();