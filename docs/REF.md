# AWS Deployment Quick Reference

## 🚀 Super Quick Start

```bash
# 1. Deploy CloudFormation
aws cloudformation create-stack \
  --stack-name webrtc-sip-bridge \
  --template-body file://cloudformation-template.yaml \
  --parameters \
    ParameterKey=KeyName,ParameterValue=YOUR_KEY_NAME \
    ParameterKey=InstanceType,ParameterValue=t3.medium \
  --capabilities CAPABILITY_NAMED_IAM

# 2. Wait for completion
aws cloudformation wait stack-create-complete \
  --stack-name webrtc-sip-bridge

# 3. Get Public IP
PUBLIC_IP=$(aws cloudformation describe-stacks \
  --stack-name webrtc-sip-bridge \
  --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
  --output text)

echo "Public IP: $PUBLIC_IP"

# 4. SSH to instance
ssh -i YOUR_KEY.pem ec2-user@$PUBLIC_IP

# 5. On the instance - run setup
sudo ./setup-aws.sh

# 6. Upload files (from your local machine)
scp -i YOUR_KEY.pem -r \
  docker-compose.yml drachtio/ rtpengine/ server/ client/ \
  ec2-user@$PUBLIC_IP:~/webrtc-sip-bridge/

# 7. Back on instance - configure and start
cd ~/webrtc-sip-bridge
nano .env  # Update SIP credentials
cd server && npm install && cd ..
docker-compose up -d

# 8. Test
curl http://localhost:3000/health
# Open browser: http://$PUBLIC_IP:8080
```

## 📋 Essential Commands

### CloudFormation
```bash
# Create stack
aws cloudformation create-stack --stack-name NAME --template-body file://template.yaml

# Check status
aws cloudformation describe-stacks --stack-name NAME

# Get outputs
aws cloudformation describe-stacks --stack-name NAME --query 'Stacks[0].Outputs'

# Delete stack
aws cloudformation delete-stack --stack-name NAME
```

### Docker Operations
```bash
# Start all
docker-compose up -d

# Stop all
docker-compose stop

# Restart
docker-compose restart

# Logs
docker-compose logs -f

# Status
docker-compose ps

# Clean up
docker-compose down -v
```

### Helper Script
```bash
./quick-start.sh start    # Start services
./quick-start.sh stop     # Stop services
./quick-start.sh restart  # Restart services
./quick-start.sh logs     # View logs
./quick-start.sh status   # Check status
./quick-start.sh clean    # Remove all
```

## 🔗 Important URLs

```bash
# Replace YOUR_PUBLIC_IP with actual IP from CloudFormation output

# Web Client
http://YOUR_PUBLIC_IP:8080

# Health Check
http://YOUR_PUBLIC_IP:3000/health

# SSH Access
ssh -i KEY.pem ec2-user@YOUR_PUBLIC_IP
```

## 📦 Files You Need

```
Your Local Machine:
├── cloudformation-template.yaml  (Deploy this first)
├── setup-aws.sh                  (Run on EC2)
└── Project Files:
    ├── docker-compose.yml
    ├── .env (created by setup script)
    ├── drachtio/drachtio.conf.xml
    ├── rtpengine/rtpengine.conf
    ├── server/ (all files)
    └── client/ (all files)
```

## 🔧 Configuration

### .env File (Update after setup)
```bash
SIP_TRUNK_HOST=sip.your-provider.com
SIP_USERNAME=your_username
SIP_PASSWORD=your_password
SIP_DOMAIN=your-provider.com
PUBLIC_IP=auto_detected_by_script
```

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't SSH | Check key permissions: `chmod 400 key.pem` |
| No audio | Verify PUBLIC_IP in .env, check ports 10000-20000 |
| Docker permission denied | Run: `newgrp docker` |
| Port not accessible | Check AWS Security Group |
| Service won't start | Check logs: `docker-compose logs SERVICE_NAME` |

## 💰 Cost Optimization

| Instance Type | vCPU | RAM | Price/month | Use Case |
|---------------|------|-----|-------------|----------|
| t3.small | 2 | 2GB | ~$15 | Testing |
| t3.medium | 2 | 4GB | ~$30 | Light production |
| t3.large | 2 | 8GB | ~$60 | Production |
| t3.xlarge | 4 | 16GB | ~$120 | High load |

## 📊 Monitoring Commands

```bash
# System resources
htop

# Docker stats
docker stats

# Active connections
netstat -tuln | grep -E '3000|5060|8080'

# RTPEngine sessions
docker exec rtpengine rtpengine-ctl list sessions

# Application health
curl http://localhost:3000/health
```

## 🔒 Security Checklist

- [ ] Use strong SSH key
- [ ] Restrict SSH to your IP only
- [ ] Update .env with strong passwords
- [ ] Keep system updated: `sudo dnf update -y`
- [ ] Enable CloudWatch monitoring
- [ ] Set up automated backups
- [ ] Use HTTPS in production

## 📞 Support Resources

- **AWS Console**: https://console.aws.amazon.com
- **CloudFormation Docs**: https://docs.aws.amazon.com/cloudformation/
- **EC2 Docs**: https://docs.aws.amazon.com/ec2/
- **Project Docs**: README.md, SIPWISE_RTPENGINE_SETUP.md

## ⏱️ Deployment Timeline

1. Create CloudFormation stack: **5 min**
2. SSH and run setup script: **5 min**
3. Upload project files: **2 min**
4. Configure .env: **1 min**
5. Install dependencies & start: **3 min**
6. Test: **2 min**

**Total: ~20 minutes** from zero to working system! 🎉