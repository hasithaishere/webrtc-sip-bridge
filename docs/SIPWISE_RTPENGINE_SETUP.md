# Sipwise RTPEngine Configuration Guide

This guide provides detailed information about using the official Sipwise RTPEngine in the WebRTC-SIP bridge system.

## 🎯 Why Sipwise RTPEngine?

Sipwise RTPEngine is the **official, production-grade** RTP proxy developed by Sipwise. It offers:

- ✅ **High Performance** - Kernel-space packet forwarding
- ✅ **WebRTC Support** - Full ICE/STUN/TURN/DTLS support
- ✅ **Media Manipulation** - Transcoding, recording, encryption
- ✅ **Scalability** - Redis-based clustering for high availability
- ✅ **Active Development** - Regular updates and bug fixes
- ✅ **Production Ready** - Used by major telecom providers

## 📋 System Requirements

### Host System
- Linux kernel 4.15 or newer (for optimal performance)
- iptables configured (for kernel forwarding)
- Minimum 2GB RAM
- Network with UDP port range 10000-20000 available

### Docker Requirements
- Docker 20.10+
- `--privileged` mode (for kernel table manipulation)
- `--cap-add NET_ADMIN` capability
- `network_mode: host` (for optimal performance)

## 🔧 Configuration Details

### Docker Setup

The system uses the official `sipwise/rtpengine:latest` image with these key parameters:

```yaml
rtpengine:
  image: sipwise/rtpengine:latest
  network_mode: host          # Required for kernel forwarding
  privileged: true            # Required for iptables
  cap_add:
    - NET_ADMIN              # Network administration
    - SYS_NICE               # Process priority
```

### Interface Configuration

RTPEngine uses a special interface format:

```bash
# Format: name/local_ip!external_ip
--interface=internal/127.0.0.1!YOUR_PUBLIC_IP
```

- **internal** - Logical name for the interface
- **127.0.0.1** - Local listening IP (for signaling)
- **YOUR_PUBLIC_IP** - IP address advertised to external peers

### Control Protocol (NG Protocol)

RTPEngine listens on port **2223** for control messages:

```bash
--listen-ng=127.0.0.1:2223
```

The Node.js server communicates via this port using the NG (Next Generation) protocol.

## 🚀 Advanced Features

### 1. Kernel-Space Forwarding

For maximum performance, RTPEngine forwards RTP packets in kernel space:

```bash
--table=0                    # Use kernel table 0
--no-fallback               # Don't fallback to userspace
```

**Performance Comparison:**
- Kernel-space: 10,000+ concurrent calls
- User-space: 100-500 concurrent calls

### 2. Call Recording

Enable call recording in `rtpengine.conf`:

```ini
recording-dir = /var/spool/rtpengine
recording-method = pcap
recording-format = eth
```

Activate per-call in Node.js:

```javascript
await webrtcHandler.startRecording(sessionId);
```

### 3. Redis Clustering

For multi-server deployments:

```ini
# In rtpengine.conf
redis = redis-server:6379
redis-db = 0
redis-write = true
redis-read = true
```

Update `docker-compose.yml`:

```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
  
  rtpengine:
    depends_on:
      - redis
    environment:
      - REDIS_HOST=redis
```

### 4. Homer/HEP Integration

Send call statistics to Homer for monitoring:

```ini
homer = 10.0.0.1:9060
homer-protocol = udp
homer-id = 2001
```

### 5. DTLS/SRTP Support

For secure WebRTC media:

```javascript
// Already configured in webrtc-handler.js
'DTLS': 'passive',
'DTLS-fingerprint': 'SHA-256',
'transport-protocol': 'UDP/TLS/RTP/SAVPF'
```

## 📊 Monitoring and Debugging

### Check RTPEngine Status

```bash
# View logs
docker logs -f rtpengine

# Check if running
docker ps | grep rtpengine

# Test NG protocol connectivity
echo -e "d1:qping" | nc -u 127.0.0.1 2223
```

### Query Active Sessions

Use the RTPEngine client:

```javascript
// In your Node.js code
const stats = await webrtcHandler.getStats(sessionId);
console.log('RTPEngine Stats:', stats);
```

### View Kernel Forwarding Table

```bash
# Enter container
docker exec -it rtpengine /bin/bash

# View forwarding rules
iptables -t mangle -L -n -v
```

### Performance Metrics

```bash
# CPU usage
docker stats rtpengine

# Network statistics
docker exec rtpengine rtpengine-ctl query statistics
```

## 🐛 Troubleshooting

### Issue: Kernel forwarding not working

**Symptoms:** High CPU usage, poor performance

**Solution:**
```bash
# Check kernel modules
lsmod | grep xt_RTPENGINE

# Load module if missing
modprobe xt_RTPENGINE

# Verify iptables rules
iptables -t mangle -L RTPENGINE -n
```

### Issue: No audio (packets not forwarded)

**Symptoms:** Call connects but no audio

**Solution:**
```bash
# Check firewall rules
iptables -L -n | grep 10000:20000

# Allow UDP ports
iptables -A INPUT -p udp --dport 10000:20000 -j ACCEPT
iptables -A OUTPUT -p udp --sport 10000:20000 -j ACCEPT

# For Docker host
ufw allow 10000:20000/udp
```

### Issue: NG protocol connection failed

**Symptoms:** Node.js can't connect to RTPEngine

**Solution:**
```bash
# Test NG port
nc -zv 127.0.0.1 2223

# Check RTPEngine is listening
netstat -tuln | grep 2223

# Restart RTPEngine
docker restart rtpengine
```

### Issue: WebRTC ICE failures

**Symptoms:** Browser can't establish connection

**Solution:**
```javascript
// In client/webrtc-client.js, add more STUN servers:
this.iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.sipgate.net:3478' }
];
```

### Issue: Codec mismatch

**Symptoms:** Call connects but no audio, codec errors in logs

**Solution:**
```javascript
// In webrtc-handler.js, adjust codec handling:
'codec': {
  'strip': [],  // Don't strip any codecs
  'offer': ['PCMU', 'PCMA', 'opus', 'G722'],
  'transcode': ['PCMU', 'PCMA']
}
```

## 🔐 Security Hardening

### 1. Restrict NG Protocol Access

```bash
# Only allow local connections
--listen-ng=127.0.0.1:2223
```

### 2. Enable SRTP/DTLS

```javascript
// Force encryption in webrtc-handler.js
'SDES': ['pad'],
'DTLS': 'active',
'flags': ['trust-address', 'DTLS-passive']
```

### 3. Rate Limiting

```ini
# In rtpengine.conf
max-sessions = 1000
homer-max-calls = 500
```

### 4. Network Isolation

```yaml
# In docker-compose.yml
networks:
  rtpengine-net:
    driver: bridge
    internal: true  # No external access
```

## 📈 Performance Tuning

### 1. Increase File Descriptors

```bash
# In docker-compose.yml
rtpengine:
  ulimits:
    nofile:
      soft: 65536
      hard: 65536
```

### 2. Optimize Thread Count

```ini
# In rtpengine.conf
num-threads = $(nproc)  # Match CPU cores
```

### 3. Adjust Buffer Sizes

```bash
# System-wide
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216
```

### 4. Enable CPU Pinning

```yaml
# In docker-compose.yml
rtpengine:
  cpuset: "0-3"  # Use cores 0-3
```

## 🧪 Testing

### Load Testing

Use SIPP to generate load:

```bash
# Install SIPP
apt-get install sipp

# Run load test (100 calls)
sipp -sn uac -s 1000 -d 60000 -l 100 localhost:5060
```

### Audio Quality Testing

```bash
# Record a test call
docker exec rtpengine rtpengine-ctl start-recording <call-id>

# Play recording
ffplay /var/spool/rtpengine/<call-id>.pcap
```

## 📚 Additional Resources

- [Sipwise RTPEngine GitHub](https://github.com/sipwise/rtpengine)
- [RTPEngine Documentation](https://github.com/sipwise/rtpengine/tree/master/docs)
- [NG Protocol Specification](https://github.com/sipwise/rtpengine/blob/master/docs/ng-protocol.md)
- [WebRTC Standards](https://www.w3.org/TR/webrtc/)

## 🆘 Getting Help

If you encounter issues:

1. **Check logs:** `docker logs rtpengine`
2. **Increase verbosity:** Set `log-level = 7` in config
3. **Test connectivity:** Verify network paths and firewall rules
4. **Community:** Sipwise RTPEngine GitHub issues
5. **Commercial support:** Contact Sipwise for enterprise support

## 🎓 Best Practices

1. ✅ **Always use kernel forwarding** for production
2. ✅ **Monitor RTPEngine metrics** continuously
3. ✅ **Set up Redis clustering** for HA
4. ✅ **Use DTLS/SRTP** for security
5. ✅ **Test with realistic load** before production
6. ✅ **Keep RTPEngine updated** to latest stable
7. ✅ **Configure proper firewall rules**
8. ✅ **Plan capacity** based on expected call volume