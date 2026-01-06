# AWS Deployment Guide

Complete guide to deploy WebRTC-SIP Bridge on AWS EC2 using CloudFormation.

## 🚀 Quick Deployment Steps

### Step 1: Create EC2 Key Pair (If you don't have one)

```bash
# In AWS Console
EC2 → Key Pairs → Create Key Pair
Name: webrtc-sip-bridge-key
Type: RSA
Format: .pem
→ Download and save the .pem file
```

Or via AWS CLI:
```bash
aws ec2 create-key-pair \
  --key-name webrtc-sip-bridge-key \
  --query 'KeyMaterial' \
  --output text > webrtc-sip-bridge-key.pem

chmod 400 webrtc-sip-bridge-key.pem
```

### Step 2: Deploy CloudFormation Stack

**Option A: AWS Console**

1. Go to: AWS Console → CloudFormation → Create Stack
2. Upload `cloudformation-template.yaml`
3. Stack name: `webrtc-sip-bridge`
4. Parameters:
   - **KeyName**: Select your key pair
   - **InstanceType**: `t3.medium` (recommended)
   - **SSHLocation**: `0.0.0.0/0` (or your IP for security)
   - **VolumeSize**: `30` GB
5. Click through → Create Stack
6. Wait 5-10 minutes for completion

**Option B: AWS CLI**

```bash
aws cloudformation create-stack \
  --stack-name webrtc-sip-bridge \
  --template-body file://cloudformation-template.yaml \
  --parameters \
    ParameterKey=KeyName,ParameterValue=webrtc-sip-bridge-key \
    ParameterKey=InstanceType,ParameterValue=t3.medium \
    ParameterKey=SSHLocation,ParameterValue=0.0.0.0/0 \
    ParameterKey=VolumeSize,ParameterValue=30 \
  --capabilities CAPABILITY_NAMED_IAM

# Monitor progress
aws cloudformation describe-stacks \
  --stack-name webrtc-sip-bridge \
  --query 'Stacks[0].StackStatus'
```

### Step 3: Get Stack Outputs

**AWS Console:**
CloudFormation → Stacks → webrtc-sip-bridge → Outputs

**AWS CLI:**
```bash
aws cloudformation describe-stacks \
  --stack-name webrtc-sip-bridge \
  --query 'Stacks[0].Outputs' \
  --output table
```

**Important Outputs:**
- `PublicIP` - Your server's public IP (use in .env)
- `SSHCommand` - Command to SSH into server
- `WebClientURL` - URL to access web interface
- `HealthCheckURL` - Health check endpoint

### Step 4: SSH to Your Instance

```bash
# Replace with your values
ssh -i webrtc-sip-bridge-key.pem ec2-user@YOUR_PUBLIC_IP
```

### Step 5: Clone Project and Run AWS Setup

```bash
# SSH to your instance
ssh -i webrtc-sip-bridge-key.pem ec2-user@YOUR_PUBLIC_IP

# Clone the repository (replace with your actual repo URL)
git clone https://github.com/hasithaishere/webrtc-sip-bridge.git
cd webrtc-sip-bridge

# Run the AWS-specific setup script (installs Docker, Docker Compose, Node.js, etc.)
sudo ./infra/setup-aws.sh
```

The script will:
- ✅ Update system packages
- ✅ Install Docker & Docker Compose
- ✅ Install Node.js
- ✅ Configure firewall
- ✅ Optimize kernel for RTPEngine
- ✅ Create project structure
- ✅ Auto-detect public IP
- ✅ Create .env file

### Step 7: Configure SIP Credentials

```bash
cd ~/webrtc-sip-bridge

# Copy the example file and edit
cp .env.example .env
nano .env
```

Update these values:
```bash
SIP_TRUNK_HOST=sip.elevenlabs.io  # Your SIP provider
SIP_USERNAME=your_actual_username
SIP_PASSWORD=your_actual_password
SIP_DOMAIN=elevenlabs.io

# PUBLIC_IP is already set correctly by setup script
```

### Step 8: Install Dependencies

```bash
cd ~/webrtc-sip-bridge/server
npm install
cd ..
```

### Step 9: Start Services

```bash
# Ensure you're in the project directory
cd ~/webrtc-sip-bridge

# Apply Docker group (to avoid sudo)
newgrp docker

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 10: Test the System

**Health Check:**
```bash
curl http://localhost:3000/health
```

**From your browser:**
- Web Client: `http://YOUR_PUBLIC_IP:8080`
- Health Check: `http://YOUR_PUBLIC_IP:3000/health`

**Click "Start Call"** and test!

## 🎛️ CloudFormation Resources Created

| Resource | Type | Purpose |
|----------|------|---------|
| Security Group | EC2 | Firewall rules for all ports |
| Elastic IP | EIP | Persistent public IP |
| EC2 Instance | t3.medium | Server running Docker |
| IAM Role | IAM | CloudWatch & SSM access |
| EBS Volume | gp3 | 30GB encrypted storage |

## 🔐 Ports Opened by CloudFormation

| Port(s) | Protocol | Purpose |
|---------|----------|---------|
| 22 | TCP | SSH access |
| 80 | TCP | HTTP (optional) |
| 443 | TCP | HTTPS (optional) |
| 3000 | TCP | WebSocket signaling |
| 5060 | UDP/TCP | SIP signaling |
| 5061 | TCP | SIP TLS |
| 8080 | TCP | Web client |
| 10000-20000 | UDP | RTP media |

## 💰 Cost Estimate

**Monthly costs (us-east-1):**
- t3.medium instance: ~$30/month
- 30GB gp3 storage: ~$2.40/month
- Elastic IP (when attached): Free
- Data transfer: Varies by usage

**Total: ~$35-50/month** (depending on traffic)

**Cost optimization:**
- Use t3.small for testing: ~$15/month
- Use Reserved Instances: Save up to 72%
- Use Spot Instances: Save up to 90% (for non-production)

## 🛠️ Helper Commands

### Quick Start Script

After setup, use the helper script:

```bash
cd ~/webrtc-sip-bridge

# Start services
./quick-start.sh start

# View logs
./quick-start.sh logs

# Check status
./quick-start.sh status

# Restart services
./quick-start.sh restart

# Stop services
./quick-start.sh stop

# Clean everything
./quick-start.sh clean
```

### Manual Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose stop

# Restart specific service
docker-compose restart signaling-server

# View logs
docker-compose logs -f signaling-server
docker-compose logs -f rtpengine
docker-compose logs -f drachtio

# Check running containers
docker ps

# Remove everything
docker-compose down -v
```

### System Monitoring

```bash
# CPU and Memory usage
htop

# Docker stats
docker stats

# Network connections
netstat -tuln | grep -E '3000|5060|8080'

# Check if ports are open
nc -zv localhost 3000
nc -zv localhost 5060
nc -zv localhost 8080

# RTPEngine stats
docker exec rtpengine rtpengine-ctl list sessions

# Kernel forwarding check
docker exec rtpengine iptables -t mangle -L RTPENGINE -n
```

## 🔄 Update CloudFormation Stack

To update instance type or other parameters:

```bash
aws cloudformation update-stack \
  --stack-name webrtc-sip-bridge \
  --template-body file://cloudformation-template.yaml \
  --parameters \
    ParameterKey=InstanceType,ParameterValue=t3.large \
    ParameterKey=KeyName,UsePreviousValue=true \
    ParameterKey=SSHLocation,UsePreviousValue=true \
    ParameterKey=VolumeSize,UsePreviousValue=true \
  --capabilities CAPABILITY_NAMED_IAM
```

## 🗑️ Delete Stack

**Warning:** This will delete everything!

```bash
# Via AWS CLI
aws cloudformation delete-stack --stack-name webrtc-sip-bridge

# Via Console
CloudFormation → Stacks → webrtc-sip-bridge → Delete
```

**Note:** Elastic IP will be released and public IP will change if you recreate.

## 🐛 Troubleshooting

### Issue: Can't SSH to instance

```bash
# Check security group
aws ec2 describe-security-groups \
  --group-ids sg-xxxxx \
  --query 'SecurityGroups[0].IpPermissions'

# Verify key pair permissions
chmod 400 webrtc-sip-bridge-key.pem

# Try with verbose output
ssh -v -i webrtc-sip-bridge-key.pem ec2-user@YOUR_PUBLIC_IP
```

### Issue: CloudFormation stack failed

```bash
# View events
aws cloudformation describe-stack-events \
  --stack-name webrtc-sip-bridge \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]'

# Common fixes:
# - Key pair doesn't exist in the region
# - Instance type not available in AZ
# - Service quota exceeded
```

### Issue: Can't access web client

```bash
# From EC2 instance
curl http://localhost:8080

# Check if service is running
docker-compose ps

# Check security group
# Make sure port 8080 is open in AWS Security Group
```

### Issue: Docker permission denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply group membership
newgrp docker

# Or logout and login again
```

## 📊 Monitoring & Logs

### CloudWatch Logs (Optional)

Enable CloudWatch logging:

```bash
# Install CloudWatch agent
sudo yum install -y amazon-cloudwatch-agent

# Configure to send Docker logs
# Create config at /opt/aws/amazon-cloudwatch-agent/etc/config.json
```

### Application Logs

```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f signaling-server

# Export logs
docker-compose logs > app-logs.txt
```

## 🔒 Security Best Practices

1. **Restrict SSH access**
   - Update SSHLocation to your IP only
   - Use SSH key authentication only

2. **Update system regularly**
   ```bash
   sudo dnf update -y
   ```

3. **Enable SSL/TLS**
   - Get Let's Encrypt certificate
   - Configure HTTPS on port 443

4. **Secure .env file**
   ```bash
   chmod 600 ~/webrtc-sip-bridge/.env
   ```

5. **Monitor logs**
   - Set up CloudWatch alarms
   - Monitor for suspicious activity

6. **Backup regularly**
   - Create AMI snapshots
   - Backup configuration files

## 📈 Scaling

### Vertical Scaling (Bigger Instance)

```bash
# Stop instance
aws ec2 stop-instances --instance-ids i-xxxxx

# Change instance type
aws ec2 modify-instance-attribute \
  --instance-id i-xxxxx \
  --instance-type t3.xlarge

# Start instance
aws ec2 start-instances --instance-ids i-xxxxx
```

### Horizontal Scaling (Multiple Instances)

1. Set up Redis for RTPEngine clustering
2. Use Application Load Balancer
3. Deploy multiple instances
4. Share session state via Redis

## ✅ Post-Deployment Checklist

- [ ] CloudFormation stack created successfully
- [ ] SSH access working
- [ ] All project files uploaded
- [ ] Setup script executed
- [ ] .env configured with SIP credentials
- [ ] Node.js dependencies installed
- [ ] Docker services running
- [ ] Health check returns "ok"
- [ ] Web client accessible from browser
- [ ] Test call successful with audio
- [ ] Firewall/Security Group configured
- [ ] Monitoring set up
- [ ] Backups scheduled

## 🎓 Summary

**Deployment Flow:**
1. Create CloudFormation stack (5 min)
2. SSH to instance (1 min)
3. Run setup script (5 min)
4. Upload project files (2 min)
5. Configure .env (1 min)
6. Start services (2 min)
7. Test (2 min)

**Total Time: ~20 minutes** ⏱️

Your WebRTC-SIP bridge is now running on AWS! 🎉