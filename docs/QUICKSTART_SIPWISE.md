# Quick Start Guide - Sipwise RTPEngine Edition

Get your WebRTC-SIP bridge running with Sipwise RTPEngine in 5 minutes!

## ⚡ Prerequisites Check

```bash
# Check Docker
docker --version    # Should be 20.10+
docker-compose --version

# Check system (Linux recommended for kernel forwarding)
uname -r           # Kernel 4.15+ for best performance
```

## 🚀 5-Minute Setup

### Step 1: Get Your Public IP

```bash
# Find your public IP
curl ifconfig.me

# Note this down - you'll need it!
```

### Step 2: Configure Environment

Copy and configure the environment file:

```bash
# Copy the example file
cp .env.example .env

# Edit with your values
nano .env

# Or create manually:
cat > .env << 'EOF'
# Your SIP Trunk (ElevenLabs example)
SIP_TRUNK_HOST=sip.elevenlabs.io
SIP_TRUNK_PORT=5060
SIP_USERNAME=your_username_here
SIP_PASSWORD=your_password_here
SIP_DOMAIN=elevenlabs.io

# YOUR PUBLIC IP (from Step 1)
PUBLIC_IP=YOUR_IP_HERE

# Drachtio settings (keep as-is)
DRACHTIO_SECRET=cymru
SERVER_PORT=3000
EOF
```

**IMPORTANT:** Replace `YOUR_IP_HERE` and your SIP credentials!

### Step 3: Create Project Structure

```bash
# Create directories
mkdir -p drachtio rtpengine server client

# You should have these files (from artifacts):
# - docker-compose.yml
# - .env (just created)
# - drachtio/drachtio.conf.xml
# - rtpengine/rtpengine.conf
# - server/Dockerfile
# - server/package.json
# - server/index.js
# - server/drachtio-handler.js
# - server/webrtc-handler.js
# - client/index.html
# - client/webrtc-client.js
```

### Step 4: Launch Everything

```bash
# Install Node.js dependencies
cd server
npm install
cd ..

# Start all services
docker-compose up -d

# Watch the logs
docker-compose logs -f
```

### Step 5: Test It!

Open your browser to:
```
http://localhost:8080
```

Click "**Start Call**" and you should connect to your SIP trunk!

## 🎯 What You Should See

### 1. Docker Containers Running
```bash
$ docker-compose ps

NAME                STATUS              PORTS
drachtio-server     Up 30 seconds       5060/tcp, 5060/udp, 9022/tcp
rtpengine          Up 30 seconds       
signaling-server   Up 30 seconds       0.0.0.0:3000->3000/tcp
web-client         Up 30 seconds       0.0.0.0:8080->80/tcp
```

### 2. Health Check Success
```bash
$ curl http://localhost:3000/health

{
  "status": "ok",
  "drachtio": "connected",
  "activeSessions": 0
}
```

### 3. Kernel Forwarding Active (Linux)
```bash
$ docker exec rtpengine iptables -t mangle -L RTPENGINE -n

# Should show forwarding rules
Chain RTPENGINE (1 references)
target     prot opt source               destination
ACCEPT     udp  --  0.0.0.0/0            0.0.0.0/0
```

## 🔍 Verify Sipwise RTPEngine

### Check Version
```bash
docker exec rtpengine rtpengine --version
```

### Check Active Sessions
```bash
# During a call
docker exec rtpengine rtpengine-ctl list sessions
```

### View Statistics
```bash
docker exec rtpengine rtpengine-ctl query statistics
```

## 🐛 Quick Troubleshooting

### Problem: Containers Won't Start

```bash
# Check for port conflicts
netstat -tuln | grep -E '3000|5060|8080'

# Remove and restart
docker-compose down -v
docker-compose up -d
```

### Problem: No Audio

```bash
# Check firewall (Linux)
sudo ufw allow 10000:20000/udp

# Check RTPEngine logs
docker logs rtpengine | grep -i error
```

### Problem: WebSocket Won't Connect

```bash
# Check signaling server
docker logs signaling-server

# Restart signaling server
docker-compose restart signaling-server
```

### Problem: SIP Registration Failed

```bash
# Verify credentials in .env
cat .env

# Test SIP connectivity
ping sip.elevenlabs.io

# Check Drachtio logs
docker logs drachtio-server | grep -i error
```

## 📊 Monitor Your System

### Real-time Logs
```bash
# All services
docker-compose logs -f

# Just RTPEngine
docker-compose logs -f rtpengine

# Just signaling
docker-compose logs -f signaling-server
```

### Resource Usage
```bash
docker stats
```

### Active Calls
```bash
# Check health endpoint
curl http://localhost:3000/health | jq
```

## 🎨 Test Web Interface

1. Open: `http://localhost:8080`
2. Click "**Start Call**"
3. Allow microphone access
4. Watch the logs in the interface
5. You should see:
   - ✅ Connected to signaling server
   - ✅ Microphone access granted
   - ✅ Created local offer
   - ✅ Received answer from server
   - ✅ Call Active

## 🔧 Common Configuration Changes

### Change Codecs

Edit `server/webrtc-handler.js`:
```javascript
'codec': {
  'strip': ['all'],
  'offer': ['PCMU', 'PCMA', 'opus', 'G722'],  // Add codecs
  'transcode': ['PCMU', 'PCMA']
}
```

### Adjust Port Range

Edit `docker-compose.yml` and `rtpengine/rtpengine.conf`:
```yaml
- PORT_MIN=20000  # Change from 10000
- PORT_MAX=30000  # Change from 20000
```

### Enable Recording

Edit `rtpengine/rtpengine.conf`:
```ini
recording-dir = /var/spool/rtpengine
recording-method = pcap
recording-format = eth
```

Then restart:
```bash
docker-compose restart rtpengine
```

## 🚀 Next Steps

1. **Test with real calls** - Make actual calls through your SIP trunk
2. **Monitor performance** - Watch CPU/memory usage
3. **Enable HTTPS** - Add SSL certificates for production
4. **Set up monitoring** - Integrate with Prometheus/Grafana
5. **Scale up** - Add Redis for multi-server setup

## 📚 Learn More

- [Full Documentation](README.md)
- [Sipwise RTPEngine Setup](SIPWISE_RTPENGINE_SETUP.md)
- [Sipwise GitHub](https://github.com/sipwise/rtpengine)

## ✅ Success Checklist

- [ ] Docker containers running
- [ ] Health check returns "ok"
- [ ] Web interface loads
- [ ] Can grant microphone access
- [ ] Call connects (logs show "Call Active")
- [ ] Can hear audio both ways
- [ ] Hangup works correctly

If all checked, congratulations! 🎉 Your WebRTC-SIP bridge with Sipwise RTPEngine is working!

## 🆘 Still Having Issues?

```bash
# Generate diagnostic report
echo "=== Docker Status ===" > debug.log
docker-compose ps >> debug.log
echo "=== Health Check ===" >> debug.log
curl http://localhost:3000/health >> debug.log
echo "=== RTPEngine Logs ===" >> debug.log
docker logs rtpengine >> debug.log 2>&1
echo "=== Signaling Logs ===" >> debug.log
docker logs signaling-server >> debug.log 2>&1

# Review debug.log for errors
```

Share `debug.log` when asking for help!