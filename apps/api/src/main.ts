import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// Simple logging
const logger = {
  log: (message: string) => console.log(`[${new Date().toISOString()}] ${message}`),
  error: (message: string) => console.error(`[${new Date().toISOString()}] ERROR: ${message}`),
  warn: (message: string) => console.warn(`[${new Date().toISOString()}] WARN: ${message}`)
};

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Mock data store
let mockData = {
  lineState: 1, // 0=Stopped, 1=Running, 2=Paused, 3=Fault
  partCounter: 0,
  oeeScore: 87.5,
  throughput: { current: 142, target: 150 },
  qualityScore: 96.8,
  alarms: [] as any[],
  defects: [] as any[],
  tags: new Map<string, any>()
};

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
        id: uuidv4(),
        partId: uuidv4(),
        class: ['scratch', 'dent', 'discoloration'][Math.floor(Math.random() * 3)],
        confidence: 0.7 + Math.random() * 0.3,
        station: 1,
        timestamp: new Date().toISOString()
      };
      mockData.defects.push(defect);
      
      // Emit defect event
      io.emit('vision/defect', defect);
      logger.log(`Defect detected: ${defect.class}`);
    }
    
    // Simulate random faults
    if (Math.random() < 0.01) { // 1% fault rate
      const alarm = {
        id: uuidv4(),
        code: 'F103',
        severity: 'high',
        message: 'Part present timeout',
        station: 1,
        status: 'active',
        timestamp: new Date().toISOString()
      };
      mockData.alarms.push(alarm);
      mockData.lineState = 3; // Fault state
      
      io.emit('alarm/raised', alarm);
      logger.warn(`Alarm raised: ${alarm.message}`);
      
      // Auto-clear alarm after 5-10 seconds
      setTimeout(() => {
        alarm.status = 'cleared';
        mockData.lineState = 1; // Back to running
        io.emit('alarm/cleared', alarm);
        logger.log(`Alarm cleared: ${alarm.code}`);
      }, Math.random() * 5000 + 5000);
    }
    
    // Emit tag updates
    io.emit('plc/tags', {
      'Part.Counter': mockData.partCounter,
      'Station01.CycleTimeMs': mockData.tags.get('Station01.CycleTimeMs'),
      'Process.Temperature': mockData.tags.get('Process.Temperature'),
      'Process.Pressure': mockData.tags.get('Process.Pressure'),
      'Line.State': mockData.lineState
    });
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: process.env.MODE || 'demo',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/dashboard/status', (req, res) => {
  res.json({
    lineState: mockData.lineState,
    oeeScore: mockData.oeeScore,
    throughput: mockData.throughput,
    qualityScore: mockData.qualityScore,
    partCounter: mockData.partCounter,
    alarmCount: mockData.alarms.filter(a => a.status === 'active').length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/plc/tags', (req, res) => {
  const tags = Object.fromEntries(mockData.tags);
  res.json({
    tags,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/alarms', (req, res) => {
  const activeAlarms = mockData.alarms.filter(a => a.status === 'active').slice(-10);
  res.json({
    alarms: activeAlarms,
    count: activeAlarms.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/defects', (req, res) => {
  const recentDefects = mockData.defects.slice(-20);
  res.json({
    defects: recentDefects,
    count: recentDefects.length,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/plc/write', (req, res) => {
  const { tag, value } = req.body;
  
  if (!tag || value === undefined) {
    return res.status(400).json({ error: 'Tag and value required' });
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
  
  res.json({
    success: true,
    tag,
    value,
    timestamp: new Date().toISOString()
  });
});

// WebSocket connections
io.on('connection', (socket) => {
  logger.log(`Client connected: ${socket.id}`);
  
  // Send initial data
  socket.emit('dashboard/status', {
    lineState: mockData.lineState,
    oeeScore: mockData.oeeScore,
    throughput: mockData.throughput,
    qualityScore: mockData.qualityScore,
    partCounter: mockData.partCounter
  });
  
  socket.on('plc/subscribe', (tags: string[]) => {
    logger.log(`Client ${socket.id} subscribed to tags: ${tags.join(', ')}`);
    // In a real implementation, we'd set up tag monitoring here
  });
  
  socket.on('disconnect', () => {
    logger.log(`Client disconnected: ${socket.id}`);
  });
});

// Initialize and start server
async function bootstrap() {
  const port = process.env.API_PORT || 4000;
  const mode = process.env.MODE || 'demo';
  
  initializeMockTags();
  
  // Start production simulation
  setInterval(simulateProduction, 2000); // Every 2 seconds
  
  server.listen(port, () => {
    logger.log(`🚀 Vision Assembly Dashboard API running on port ${port}`);
    logger.log(`📊 Mode: ${mode}`);
    logger.log(`📚 Health check: http://localhost:${port}/api/health`);
    logger.log(`🔌 WebSocket: ws://localhost:${port}`);
  });
}

bootstrap().catch(error => {
  logger.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});