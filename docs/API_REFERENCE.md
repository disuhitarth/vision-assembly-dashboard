# 📡 API Reference Guide

## Overview

The Industrial Vision Dashboard API provides RESTful endpoints for production monitoring, PLC control, and vision system management.

**Base URL:** `http://localhost:4000`  
**Protocol:** HTTP/HTTPS + WebSocket  
**Format:** JSON  

---

## 🔍 System Health

### GET /api/health
Check system health and uptime.

**Response:**
```json
{
  "status": "ok",
  "mode": "demo",
  "timestamp": "2025-09-01T03:00:00.000Z",
  "uptime": 3600.123
}
```

---

## 📊 Dashboard Data

### GET /api/dashboard/status
Get main dashboard status and metrics.

**Response:**
```json
{
  "lineState": 1,
  "oeeScore": 87.5,
  "throughput": {
    "current": 142,
    "target": 150
  },
  "qualityScore": 96.8,
  "partCounter": 1250,
  "alarmCount": 0,
  "timestamp": "2025-09-01T03:00:00.000Z"
}
```

**Line States:**
- `0` = Stopped
- `1` = Running  
- `2` = Paused
- `3` = Fault

---

## 🏭 PLC Operations

### GET /api/plc/tags
Get all current PLC tag values.

**Response:**
```json
{
  "tags": {
    "Line.State": 1,
    "Part.Counter": 1250,
    "Station01.CycleTimeMs": 850,
    "Process.Temperature": 22.5,
    "Process.Pressure": 6.2
  },
  "timestamp": "2025-09-01T03:00:00.000Z"
}
```

### POST /api/plc/write
Write value to PLC tag.

**Request:**
```json
{
  "tag": "Line.RunCmd",
  "value": true
}
```

**Response:**
```json
{
  "success": true,
  "tag": "Line.RunCmd",
  "value": true,
  "timestamp": "2025-09-01T03:00:00.000Z"
}
```

---

## 🚨 Alarms

### GET /api/alarms
Get active alarms.

**Response:**
```json
{
  "alarms": [
    {
      "id": "uuid",
      "code": "F103",
      "severity": "high",
      "message": "Part present timeout",
      "station": 1,
      "status": "active",
      "timestamp": "2025-09-01T03:00:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2025-09-01T03:00:00.000Z"
}
```

**Severity Levels:**
- `low` - Information only
- `medium` - Warning condition  
- `high` - Requires attention
- `critical` - Immediate action required

---

## 🔍 Vision System

### GET /api/defects
Get recent defect detections.

**Response:**
```json
{
  "defects": [
    {
      "id": "uuid",
      "partId": "uuid", 
      "class": "scratch",
      "confidence": 0.87,
      "station": 1,
      "timestamp": "2025-09-01T03:00:00.000Z"
    }
  ],
  "count": 20,
  "timestamp": "2025-09-01T03:00:00.000Z"
}
```

**Defect Classes:**
- `scratch` - Surface scratches
- `dent` - Physical damage
- `discoloration` - Color variations
- `foreign_object` - Contamination
- `edge_defect` - Edge irregularities

---

## 🔌 WebSocket Events

Connect to: `ws://localhost:4000`

### Client → Server

#### Subscribe to PLC tags
```json
{
  "event": "plc/subscribe",
  "tags": ["Line.State", "Part.Counter"]
}
```

### Server → Client

#### PLC tag updates
```json
{
  "event": "plc/tags",
  "data": {
    "Part.Counter": 1251,
    "Line.State": 1,
    "timestamp": 1693526400000
  }
}
```

#### Vision defect detected
```json
{
  "event": "vision/defect", 
  "data": {
    "id": "uuid",
    "class": "scratch",
    "confidence": 0.87,
    "station": 1,
    "timestamp": "2025-09-01T03:00:00.000Z"
  }
}
```

#### Alarm raised
```json
{
  "event": "alarm/raised",
  "data": {
    "id": "uuid",
    "code": "F103", 
    "severity": "high",
    "message": "Part present timeout",
    "station": 1,
    "timestamp": "2025-09-01T03:00:00.000Z"
  }
}
```

#### Alarm cleared  
```json
{
  "event": "alarm/cleared",
  "data": {
    "id": "uuid",
    "code": "F103",
    "timestamp": "2025-09-01T03:00:00.000Z"
  }
}
```

---

## ⚠️ Error Handling

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (endpoint doesn't exist)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "error": "Description of the error",
  "code": "ERROR_CODE",
  "timestamp": "2025-09-01T03:00:00.000Z"
}
```

---

## 🔒 Security

### CORS Policy
- Allowed Origins: `http://localhost:3000`
- Allowed Methods: `GET, POST, OPTIONS`
- Allowed Headers: `Content-Type, Authorization`

### Rate Limiting  
- **Limit:** 1000 requests per minute per IP
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### Input Validation
- All inputs sanitized and validated
- JSON schema validation on POST requests
- SQL injection prevention
- XSS protection headers

---

## 📝 Example Usage

### JavaScript/Fetch
```javascript
// Get dashboard status
const response = await fetch('http://localhost:4000/api/dashboard/status');
const data = await response.json();
console.log('Parts produced:', data.partCounter);

// Write PLC tag
await fetch('http://localhost:4000/api/plc/write', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tag: 'Line.RunCmd', value: true })
});
```

### WebSocket Connection
```javascript
const socket = io('http://localhost:4000');

socket.on('connect', () => {
  console.log('Connected to server');
  socket.emit('plc/subscribe', ['Line.State', 'Part.Counter']);
});

socket.on('plc/tags', (data) => {
  console.log('PLC update:', data);
});

socket.on('vision/defect', (defect) => {
  console.log('Defect detected:', defect.class);
});
```

### cURL Examples  
```bash
# Health check
curl http://localhost:4000/api/health

# Get dashboard data
curl http://localhost:4000/api/dashboard/status

# Emergency stop
curl -X POST -H "Content-Type: application/json" \
  -d '{"tag":"Emergency.Stop","value":true}' \
  http://localhost:4000/api/plc/write
```

---

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### API Testing with Postman
Import the provided Postman collection: `tests/api-collection.json`

### Load Testing  
```bash
npm run test:load
```

---

## 📚 Additional Resources

- [Main Documentation](../README.md)
- [Enhanced Features Guide](ENHANCED_FEATURES.md)  
- [Deployment Guide](DEPLOYMENT_GUIDE.md)