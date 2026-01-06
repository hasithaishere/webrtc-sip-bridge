#!/bin/bash

echo "========================================"
echo "WebRTC-SIP Bridge Setup Script"
echo "Using Sipwise RTPEngine"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p drachtio rtpengine server client

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating template..."
    cat > .env << 'EOF'
# SIP Trunk Configuration (ElevenLabs)
SIP_TRUNK_HOST=sip.elevenlabs.io
SIP_TRUNK_PORT=5060
SIP_USERNAME=your_elevenlabs_username
SIP_PASSWORD=your_elevenlabs_password
SIP_DOMAIN=elevenlabs.io

# Public IP for RTP (replace with your actual public IP)
PUBLIC_IP=127.0.0.1

# Drachtio Configuration
DRACHTIO_SECRET=cymru

# Server Port
SERVER_PORT=3000
EOF
    echo "⚠️  Please edit .env file with your SIP trunk credentials!"
    echo ""
fi

# Get public IP
echo "🌐 Detecting public IP address..."
PUBLIC_IP=$(curl -s ifconfig.me)
if [ -n "$PUBLIC_IP" ]; then
    echo "   Detected public IP: $PUBLIC_IP"
    echo "   Update PUBLIC_IP in .env if this is incorrect"
else
    echo "   Could not detect public IP. Using 127.0.0.1"
    PUBLIC_IP="127.0.0.1"
fi
echo ""

# Install npm dependencies
echo "📦 Installing Node.js dependencies..."
cd server
if [ ! -f package.json ]; then
    echo "❌ package.json not found in server directory"
    exit 1
fi

npm install
if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi
cd ..
echo "✅ Dependencies installed"
echo ""

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose build
if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi
echo "✅ Docker images built"
echo ""

# Start services
echo "🚀 Starting services..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "❌ Failed to start services"
    exit 1
fi
echo "✅ Services started"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check service status
echo "📊 Checking service status..."
echo ""
docker-compose ps
echo ""

# Verify kernel forwarding
echo "🔍 Checking Sipwise RTPEngine kernel forwarding..."
sleep 2
if docker exec rtpengine iptables -t mangle -L RTPENGINE -n 2>/dev/null | grep -q RTPENGINE; then
    echo "✅ Kernel forwarding is active"
else
    echo "⚠️  Kernel forwarding may not be active (this is normal on some systems)"
    echo "   RTPEngine will use userspace forwarding as fallback"
fi
echo ""

# Display access information
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "🌐 Access URLs:"
echo "   Web Client:    http://localhost:8080"
echo "   API Server:    http://localhost:3000"
echo "   Health Check:  http://localhost:3000/health"
echo ""
echo "📝 Next Steps:"
echo "   1. Edit .env file with your SIP trunk credentials"
echo "   2. Restart services: docker-compose restart"
echo "   3. Open http://localhost:8080 in your browser"
echo "   4. Click 'Start Call' to test"
echo ""
echo "📋 Useful Commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Stop services:    docker-compose stop"
echo "   Restart:          docker-compose restart"
echo "   Remove all:       docker-compose down"
echo ""
echo "🔍 Troubleshooting:"
echo "   Check logs:       docker-compose logs -f signaling-server"
echo "   Test connection:  curl http://localhost:3000/health"
echo ""