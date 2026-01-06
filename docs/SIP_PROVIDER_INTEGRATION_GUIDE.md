# SIP Provider Integration Guide

How to connect your WebRTC-SIP bridge to any SIP trunk provider.

## 🎯 Universal Compatibility

This bridge works with **ANY provider that supports SIP** - whether it's:
- ✅ AI voice services (ElevenLabs, Deepgram)
- ✅ Telecom APIs (Twilio, Vonage, Telnyx)
- ✅ Business VoIP (RingCentral, 8x8)
- ✅ Open source PBX (Asterisk, FreeSWITCH)
- ✅ Enterprise systems (Cisco, Avaya, Mitel)
- ✅ Your own SIP server

## 📋 What You Need from Any Provider

To connect to **ANY** SIP provider, you need these 5 things:

1. **SIP Server Address** - Hostname or IP (e.g., `sip.provider.com`)
2. **Port** - Usually 5060 for UDP/TCP, or 5061 for TLS
3. **Username** - Your account ID, extension, or user ID
4. **Password** - API key, auth token, or SIP password
5. **Domain** - SIP domain (often same as server address)

That's it! The bridge handles everything else.

## 🔧 Step-by-Step Integration

### Step 1: Get Credentials from Your Provider

**Example: Twilio**
```
Login to Twilio Console
→ Voice → Elastic SIP Trunking
→ Create SIP Trunk
→ Get: Termination SIP URI, Username, Password
```

**Example: Your Own Asterisk**
```
Edit /etc/asterisk/sip.conf:
[webrtc_trunk]
type=friend
host=dynamic
secret=your_password
context=from-trunk

Credentials: Username=webrtc_trunk, Password=your_password
```

### Step 2: Update `.env` File

```bash
# Replace with YOUR provider's details
SIP_TRUNK_HOST=sip.your-provider.com
SIP_TRUNK_PORT=5060
SIP_USERNAME=your_username
SIP_PASSWORD=your_password
SIP_DOMAIN=your-provider.com
PUBLIC_IP=your_public_ip
```

### Step 3: Restart and Test

```bash
# Restart to apply changes
docker-compose restart signaling-server

# Test connection
docker-compose logs -f signaling-server
```

### Step 4: Make Test Call

Open `http://localhost:8080` and click "Start Call"

Watch logs for successful SIP connection!

## 🌟 Provider-Specific Guides

### Twilio Integration

**1. Create SIP Domain**
```
Twilio Console → Voice → SIP Domains → Create
Domain: your-app.sip.twilio.com
```

**2. Configure Authentication**
```
Authentication → Add Credential List
Username: your_username
Password: generate_secure_password
```

**3. Point to Phone Number**
```
Voice Configuration → Configure With → SIP Domain
Select your SIP domain
```

**4. Update .env**
```bash
SIP_TRUNK_HOST=your-app.sip.twilio.com
SIP_TRUNK_PORT=5060
SIP_USERNAME=your_username
SIP_PASSWORD=your_password
SIP_DOMAIN=your-app.sip.twilio.com
```

**5. Destination Number**
For outbound calls, modify `server/drachtio-handler.js`:
```javascript
const sipUri = `sip:+15551234567@${host}:${port}`; // Your Twilio number
```

### Asterisk Integration

**1. Configure SIP Trunk in Asterisk**

Edit `/etc/asterisk/pjsip.conf`:
```ini
[webrtc_bridge]
type=endpoint
context=from-webrtc
disallow=all
allow=ulaw,alaw
auth=webrtc_bridge
aors=webrtc_bridge

[webrtc_bridge]
type=auth
auth_type=userpass
username=webrtc_bridge
password=SecurePassword123

[webrtc_bridge]
type=aor
max_contacts=1
```

**2. Configure Dialplan**

Edit `/etc/asterisk/extensions.conf`:
```ini
[from-webrtc]
exten => _X.,1,NoOp(Call from WebRTC Bridge)
exten => _X.,n,Dial(SIP/your-destination)
exten => _X.,n,Hangup()
```

**3. Reload Asterisk**
```bash
asterisk -rx "pjsip reload"
asterisk -rx "dialplan reload"
```

**4. Update .env**
```bash
SIP_TRUNK_HOST=192.168.1.100  # Your Asterisk IP
SIP_TRUNK_PORT=5060
SIP_USERNAME=webrtc_bridge
SIP_PASSWORD=SecurePassword123
SIP_DOMAIN=asterisk.local
```

### FreeSWITCH Integration

**1. Create User**

Edit `/usr/local/freeswitch/conf/directory/default/webrtc_bridge.xml`:
```xml
<user id="webrtc_bridge">
  <params>
    <param name="password" value="SecurePassword123"/>
    <param name="dial-string" value="{presence_id=${dialed_user}@${dialed_domain}}${sofia_contact(${dialed_user}@${dialed_domain})}"/>
  </params>
  <variables>
    <variable name="user_context" value="default"/>
  </variables>
</user>
```

**2. Reload Configuration**
```bash
fs_cli -x "reloadxml"
```

**3. Update .env**
```bash
SIP_TRUNK_HOST=freeswitch.yourdomain.com
SIP_TRUNK_PORT=5060
SIP_USERNAME=webrtc_bridge
SIP_PASSWORD=SecurePassword123
SIP_DOMAIN=freeswitch.yourdomain.com
```

### ElevenLabs AI Agent Integration

#### **Step 1: Create/Login to ElevenLabs Account**
```bash
# Go to: https://elevenlabs.io
# Sign up or login to your account
```

#### **Step 2: Access Conversational AI**
```
ElevenLabs Dashboard → Conversational AI → Agents
→ Click "Create Agent" or select existing agent
```

#### **Step 3: Enable SIP Integration**
```
Agent Settings → Integrations → SIP
→ Enable SIP integration
→ Copy the SIP credentials:
  - SIP Username (Agent ID)
  - SIP Password (API Key)
  - SIP Host: sip.elevenlabs.io
  - Port: 5060
```

#### **Step 4: Get Your Credentials**
```
The SIP credentials are displayed in the agent settings:
- Username: Your Agent ID (e.g., "agent_1234567890abcdef")
- Password: Your API Key (long alphanumeric string)
- Host: sip.elevenlabs.io (always this)
- Port: 5060 (UDP/TCP)
- Domain: elevenlabs.io
```

#### **Step 5: Update .env File**
```bash
# Edit your .env file with the credentials:
SIP_TRUNK_HOST=sip.elevenlabs.io
SIP_TRUNK_PORT=5060
SIP_USERNAME=your_agent_id_here          # From ElevenLabs
SIP_PASSWORD=your_api_key_here           # From ElevenLabs
SIP_DOMAIN=elevenlabs.io
```

**4. Optional: Pass Custom Data**

Modify `server/drachtio-handler.js` to pass context:
```javascript
headers: {
  'X-Agent-Context': JSON.stringify({
    user_id: '12345',
    language: 'en',
    context: 'customer_support'
  })
}
```

## 🎛️ Advanced: Dynamic Provider Selection

Want to route to different providers based on conditions?

**Modify `server/index.js`:**

```javascript
async function handleOffer(session, sdp, destination) {
  // Choose provider based on destination
  const providers = {
    'support': {
      host: 'sip.provider1.com',
      username: 'support_user',
      password: 'pass1'
    },
    'sales': {
      host: 'sip.provider2.com',
      username: 'sales_user',
      password: 'pass2'
    },
    'ai_assistant': {
      host: 'sip.elevenlabs.io',
      username: 'agent_id',
      password: 'api_key'
    }
  };

  const config = providers[destination] || providers['support'];
  
  const { dialog, remoteSdp } = await drachtioHandler.createCall(
    session.id,
    rtpEngineOffer,
    config
  );
  // ... rest of the code
}
```

**Update WebSocket handler:**
```javascript
case 'offer':
  const destination = data.destination || 'support';
  await handleOffer(session, data.sdp, destination);
  break;
```

**Client can now specify destination:**
```javascript
// In client/webrtc-client.js
this.sendMessage({
  type: 'offer',
  sdp: offer.sdp,
  destination: 'ai_assistant' // or 'support', 'sales'
});
```

## 🔐 Security Best Practices

### 1. Use Environment Variables
Never hardcode credentials:
```bash
# Good ✅
SIP_PASSWORD=${SIP_PASSWORD}

# Bad ❌
SIP_PASSWORD=hardcoded_password
```

### 2. Enable TLS/SIPS
For production, use encrypted SIP:
```bash
SIP_TRUNK_HOST=sip.provider.com
SIP_TRUNK_PORT=5061  # TLS port
SIP_TRANSPORT=tls
```

Update `server/drachtio-handler.js`:
```javascript
const sipUri = `sips:${username}@${host}:${port};transport=tls`;
```

### 3. IP Whitelisting
Configure your provider to only accept from your IP:
```
Provider Settings → Security → IP Whitelist
Add: YOUR_PUBLIC_IP
```

### 4. Strong Passwords
Generate secure passwords:
```bash
openssl rand -base64 32
```

## 🧪 Testing Different Providers

### Test Script

Create `test-provider.sh`:
```bash
#!/bin/bash

echo "Testing SIP Provider Connection..."

# Test 1: DNS Resolution
echo "1. Resolving $SIP_TRUNK_HOST..."
dig $SIP_TRUNK_HOST +short

# Test 2: Port Connectivity
echo "2. Testing port $SIP_TRUNK_PORT..."
nc -zv $SIP_TRUNK_HOST $SIP_TRUNK_PORT

# Test 3: SIP OPTIONS Probe
echo "3. Sending SIP OPTIONS..."
# Use sipp or similar tool

echo "Testing complete!"
```

### Monitor Connection

```bash
# Watch SIP traffic
docker exec drachtio-server tcpdump -i any port 5060 -vvv

# Check registration
docker logs drachtio-server | grep REGISTER

# Monitor RTP flow
docker exec rtpengine rtpengine-ctl list sessions
```

## 📊 Provider Comparison

| Provider | Best For | Difficulty | Cost |
|----------|----------|------------|------|
| ElevenLabs | AI Voice | Easy ⭐ | API-based |
| Twilio | APIs | Easy ⭐ | Pay-as-go |
| Asterisk | Full Control | Medium ⭐⭐ | Free/Self-host |
| FreeSWITCH | Scalability | Medium ⭐⭐ | Free/Self-host |
| Cisco | Enterprise | Hard ⭐⭐⭐ | License |
| Any SIP | Flexibility | Varies | Varies |

## 🆘 Troubleshooting Providers

### Issue: Connection Refused

```bash
# Check connectivity
telnet $SIP_TRUNK_HOST $SIP_TRUNK_PORT

# Check firewall
iptables -L -n | grep 5060
```

### Issue: Authentication Failed

```bash
# Verify credentials
echo "Username: $SIP_USERNAME"
echo "Domain: $SIP_DOMAIN"

# Check provider logs
# (Provider-specific)
```

### Issue: No Audio

```bash
# Check codec compatibility
# Both sides must support same codec

# Common codecs: PCMU (G.711u), PCMA (G.711a)
# View negotiated codec in logs
```

## ✅ Checklist for New Provider

- [ ] Obtain SIP credentials (host, port, user, pass)
- [ ] Update `.env` file
- [ ] Test DNS resolution
- [ ] Test port connectivity
- [ ] Configure firewall (if needed)
- [ ] Restart signaling server
- [ ] Make test call
- [ ] Verify audio both ways
- [ ] Check call quality
- [ ] Document any special config

## 🎓 Summary

**The beauty of this system:** It's truly universal!

- ✅ Works with **ANY SIP provider**
- ✅ Just update 5 configuration values
- ✅ No code changes needed
- ✅ Switch providers anytime
- ✅ Use multiple providers simultaneously
- ✅ Standard SIP protocols

**You can connect to literally ANY system that speaks SIP!** 🌐