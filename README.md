# WebRTC-SIP Bridge System

Complete system for bridging WebRTC clients to SIP trunks using Drachtio SIP server and **Sipwise RTPEngine** media proxy. Designed for integration with ElevenLabs and other SIP providers.

## 🎯 Features

- **WebRTC to SIP bridging** - Connect web browsers to SIP networks
- **Drachtio SIP server** - Professional SIP stack
- **Sipwise RTPEngine** - Production-grade kernel-space media proxy
- **Docker containerized** - Easy deployment and scaling
- **Real-time signaling** - WebSocket-based signaling server
- **Audio support** - Full duplex audio communication
- **ICE/STUN/DTLS support** - Complete WebRTC compatibility
- **Kernel forwarding** - High-performance media handling
- **Recording support** - Built-in call recording capabilities

## 📋 Prerequisites

- Docker 20.10+
- Docker Compose 1.29+
- Node.js 18+ (for local development)
- A SIP trunk account (e.g., ElevenLabs)
- Public IP address (or ngrok for testing)

## 🚀 Quick Start

### 1. Clone or Create Project Structure

```bash
mkdir webrtc-sip-bridge
cd webrtc-sip-bridge
```

Create the following structure and files (provided in the artifacts):
```
webrtc-sip-bridge/
├── docker-compose.yml
├── .env.example
├── .env
├── setup.sh
├── drachtio/
│   └── drachtio.conf.xml
├── rtpengine/
│   └── rtpengine.conf
├── server/
│   ├── Dockerfile
│   ├── package.json
│   ├── index.js
│   ├── drachtio-handler.js
│   └── webrtc-handler.js
└── client/
    ├── index.html
    └── webrtc-client.js
```

### 2. Configure Environment

Copy the sample environment file and edit with your SIP trunk credentials:

```bash
cp .env.example .env
nano .env  # or your preferred editor
```

Configure the following in your `.env` file:

```env
# SIP Trunk Configuration (choose your provider)
SIP_TRUNK_HOST=sip.elevenlabs.io
SIP_TRUNK_PORT=5060
SIP_USERNAME=your_username
SIP_PASSWORD=your_password
SIP_DOMAIN=elevenlabs.io

# Network Configuration
PUBLIC_IP=your_public_ip_address
```

**Important:** Replace `your_public_ip_address` with your actual public IP:
```bash
curl ifconfig.me
```

### 3. Run Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

Or manually:

```bash
# Install dependencies
cd server && npm install && cd ..

# Build and start containers
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 4. Test the System

1. Open browser to `http://localhost:8080`
2. Click "Start Call" button
3. Grant microphone permissions
4. Call should connect to your SIP trunk

## 🏗️ Architecture

```
┌─────────────────┐
│  Web Browser    │
│  (WebRTC)       │
│  ICE/DTLS/SRTP  │
└────────┬────────┘
         │ WebSocket
         │ Signaling
┌────────▼────────┐
│  Node.js        │
│  Signaling      │
│  Server         │
└────────┬────────┘
         │ Drachtio Protocol
         │
┌────────▼────────┐       ┌────────────────────┐
│  Drachtio       │◄─────►│  Sipwise RTPEngine │
│  SIP Server     │  NG   │  (Kernel Forward)  │
└────────┬────────┘       └──────────┬─────────┘
         │ SIP                       │ RTP/RTCP
         │                           │ (Kernel Space)
         └───────────┬───────────────┘
                     │
            ┌────────▼────────┐
            │  SIP Trunk      │
            │  (ElevenLabs)   │
            └─────────────────┘
```

**Key Components:**
- **Sipwise RTPEngine** - Official production-grade media proxy with kernel-space forwarding
- **Drachtio SIP Server** - SIP protocol handling and signaling
- **Node.js Server** - WebSocket signaling and orchestration
- **Web Client** - Browser-based WebRTC interface

## 🔧 Configuration

### SIP Trunk Setup

For ElevenLabs or other providers, you need:
- SIP server hostname
- Port (usually 5060)
- Username/Account ID
- Password/API Key
- Domain

### Network Configuration

**For Local Testing:**
- Use `PUBLIC_IP=127.0.0.1` (localhost)
- Only works on same machine

**For Production/Remote Access:**
- Use your server's public IP address
- Open firewall ports:
  - 5060 (SIP UDP/TCP)
  - 10000-20000 (RTP/RTCP UDP)
  - 3000 (WebSocket)
  - 8080 (Web client)

**Using ngrok for Testing:**
```bash
ngrok tcp 5060  # For SIP
# Update PUBLIC_IP in .env with ngrok address
```

## 📊 Monitoring

### Check Service Health

```bash
# Health endpoint
curl http://localhost:3000/health

# Response:
{
  "status": "ok",
  "drachtio": "connected",
  "activeSessions": 0
}
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f signaling-server
docker-compose logs -f drachtio
docker-compose logs -f rtpengine

# Follow last 100 lines
docker-compose logs -f --tail=100
```

### Container Status

```bash
docker-compose ps
```

## 🐛 Troubleshooting

### WebSocket Connection Failed

**Problem:** Can't connect to signaling server

**Solution:**
```bash
# Check if server is running
docker-compose ps signaling-server

# Check logs
docker-compose logs signaling-server

# Restart server
docker-compose restart signaling-server
```

### SIP Registration Failed

**Problem:** Can't connect to SIP trunk

**Solution:**
- Verify credentials in `.env`
- Check network connectivity: `ping sip.elevenlabs.io`
- Ensure port 5060 is not blocked
- Review Drachtio logs: `docker-compose logs drachtio`

### No Audio / One-way Audio

**Problem:** Can't hear audio or audio only works one direction

**Solution:**
- Verify Sipwise RTPEngine is running: `docker-compose ps rtpengine`
- Check PUBLIC_IP is set correctly in `.env`
- Ensure UDP ports 10000-20000 are open
- Verify kernel forwarding is active: `docker exec rtpengine iptables -t mangle -L -n`
- Check codec compatibility in logs
- Verify firewall rules allow UDP traffic

**Check kernel forwarding:**
```bash
# Enter RTPEngine container
docker exec -it rtpengine /bin/bash

# Check iptables rules
iptables -t mangle -L RTPENGINE -n

# Should show forwarding rules for RTP ports
```

### ICE Connection Failed

**Problem:** WebRTC connection fails during ICE negotiation

**Solution:**
- Check STUN server accessibility
- Verify network allows UDP traffic
- Try different STUN servers in `client/webrtc-client.js`
- Check browser console for detailed ICE errors

### Docker Issues

**Problem:** Containers won't start

**Solution:**
```bash
# Remove all containers and volumes
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Start fresh
docker-compose up -d

# Check for port conflicts
netstat -tuln | grep -E '3000|5060|8080'
```

## 🔒 Security Considerations

### For Production Deployment:

1. **Use HTTPS/WSS**
   - Add SSL certificates
   - Use secure WebSocket (wss://)
   - Enable TLS for SIP (SIPS)

2. **Authentication**
   - Implement user authentication
   - Use API keys for WebSocket connections
   - Secure admin endpoints

3. **Firewall Rules**
   ```bash
   # Allow only necessary ports
   ufw allow 5060/udp
   ufw allow 5060/tcp
   ufw allow 10000:20000/udp
   ufw allow 443/tcp  # HTTPS
   ```

4. **Environment Variables**
   - Never commit `.env` to version control
   - Use secrets management in production
   - Rotate credentials regularly

5. **Rate Limiting**
   - Implement call rate limits
   - Add connection limits
   - Monitor for abuse

## 📈 Scaling

### Horizontal Scaling

Multiple instances with load balancer:
```yaml
signaling-server:
  deploy:
    replicas: 3
  # Add load balancer configuration
```

### Media Server Clustering

Use Redis for RTPEngine session sharing:
```ini
# In rtpengine.conf
redis = redis-server:6379
```

## 🧪 Testing

### Manual Testing

1. **Test WebSocket:**
   ```javascript
   const ws = new WebSocket('ws://localhost:3000');
   ws.onopen = () => console.log('Connected');
   ```

2. **Test SIP Registration:**
   ```bash
   # Use SIPp or similar tool
   sipp -sf scenario.xml localhost:5060
   ```

3. **Test Audio Path:**
   - Use browser's WebRTC internals: `chrome://webrtc-internals`
   - Check RTP packet flow in logs

### Automated Testing

```bash
# Run health checks
./scripts/health-check.sh

# Load testing
npm run test:load
```

## 📚 API Reference

### WebSocket Messages

#### Client → Server

```javascript
// Start call
{ 
  type: 'offer', 
  sdp: '<SDP_STRING>' 
}

// ICE candidate
{ 
  type: 'ice-candidate', 
  candidate: { ... } 
}

// Hang up
{ 
  type: 'hangup' 
}
```

#### Server → Client

```javascript
// Session created
{ 
  type: 'session-created', 
  sessionId: '<UUID>' 
}

// Answer
{ 
  type: 'answer', 
  sdp: '<SDP_STRING>' 
}

// Call ended
{ 
  type: 'hangup' 
}

// Error
{ 
  type: 'error', 
  message: '<ERROR_MESSAGE>' 
}
```

### Sipwise RTPEngine NG Protocol

The system uses Sipwise RTPEngine's NG (Next Generation) protocol for media control:

```javascript
// Offer (WebRTC → SIP)
{
  'call-id': sessionId,
  'from-tag': 'webrtc-tag',
  'direction': ['private', 'public'],
  'ICE': 'remove',
  'DTLS': 'passive',
  'transport-protocol': 'RTP/AVP'
}

// Answer (SIP → WebRTC)
{
  'call-id': sessionId,
  'from-tag': 'sip-tag',
  'to-tag': 'webrtc-tag',
  'direction': ['public', 'private'],
  'ICE': 'force',
  'DTLS': 'passive',
  'transport-protocol': 'UDP/TLS/RTP/SAVPF'
}
```

For complete NG protocol documentation, see [Sipwise RTPEngine NG Protocol](https://github.com/sipwise/rtpengine/blob/master/docs/ng-protocol.md).

## 🛠️ Development

### Local Development (Without Docker)

```bash
# Terminal 1: Start Drachtio
drachtio --daemon=false

# Terminal 2: Start RTPEngine
rtpengine --config-file=rtpengine.conf

# Terminal 3: Start Node server
cd server
npm install
npm run dev

# Terminal 4: Serve client
cd client
python -m http.server 8080
```

### Adding Features

**Add DTMF Support:**
```javascript
// In drachtio-handler.js
await dialog.request({
  method: 'INFO',
  body: `Signal=${digit}\r\nDuration=100`
});
```

**Add Call Recording:**
```javascript
// In webrtc-handler.js
await rtpengine.startRecording({
  'call-id': callId,
  'from-tag': fromTag
});
```

## 📄 License

MIT License - See LICENSE file

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 📞 Support

- GitHub Issues: Report bugs and request features
- Documentation: Check inline code comments
- Logs: Always check Docker logs first

## 🔗 Resources

- [Sipwise RTPEngine](https://github.com/sipwise/rtpengine)
- [RTPEngine NG Protocol](https://github.com/sipwise/rtpengine/blob/master/docs/ng-protocol.md)
- [Drachtio Documentation](https://drachtio.org)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [SIP RFC 3261](https://tools.ietf.org/html/rfc3261)
- [ElevenLabs API Docs](https://elevenlabs.io/docs)

## 📖 Additional Documentation

See [SIPWISE_RTPENGINE_SETUP.md](SIPWISE_RTPENGINE_SETUP.md) for detailed Sipwise RTPEngine configuration, performance tuning, and advanced features.