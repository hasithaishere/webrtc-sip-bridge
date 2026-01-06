#!/bin/bash

##############################################################################
# WebRTC-SIP Bridge Setup Script for AWS Amazon Linux
# Run this after logging into your EC2 instance
##############################################################################

set -e  # Exit on any error

echo "========================================"
echo "WebRTC-SIP Bridge Setup for AWS"
echo "Using Sipwise RTPEngine"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root: sudo ./setup-aws.sh"
    exit 1
fi

# Get the actual user (not root)
ACTUAL_USER="${SUDO_USER:-$USER}"
USER_HOME=$(getent passwd "$ACTUAL_USER" | cut -d: -f6)

echo "📋 System Information:"
echo "   User: $ACTUAL_USER"
echo "   Home: $USER_HOME"
echo "   OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo ""

# ==========================================
# 1. UPDATE SYSTEM
# ==========================================
echo "📦 Updating system packages..."
dnf update -y
echo "✅ System updated"
echo ""

# ==========================================
# 2. INSTALL DOCKER
# ==========================================
echo "🐳 Installing Docker..."
dnf install -y docker
systemctl start docker
systemctl enable docker

# Add user to docker group
usermod -aG docker "$ACTUAL_USER"

echo "✅ Docker installed and started"
docker --version
echo ""

# ==========================================
# 3. INSTALL DOCKER COMPOSE
# ==========================================
echo "🐳 Installing Docker Compose..."

# Get latest version
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -Po '"tag_name": "\K.*?(?=")')
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

echo "✅ Docker Compose installed"
docker-compose --version
echo ""

# ==========================================
# 4. INSTALL NODE.JS
# ==========================================
echo "📦 Installing Node.js..."
dnf install -y nodejs npm
echo "✅ Node.js installed"
node --version
npm --version
echo ""

# ==========================================
# 5. INSTALL GIT
# ==========================================
echo "📦 Installing Git..."
dnf install -y git
echo "✅ Git installed"
git --version
echo ""

# ==========================================
# 6. INSTALL ADDITIONAL TOOLS
# ==========================================
echo "📦 Installing additional tools..."
dnf install -y \
    curl \
    wget \
    vim \
    nano \
    htop \
    net-tools \
    tcpdump \
    nc \
    bind-utils

echo "✅ Additional tools installed"
echo ""

# ==========================================
# 7. CONFIGURE FIREWALL
# ==========================================
echo "🔥 Configuring firewall..."

# Amazon Linux uses firewalld
if systemctl is-active --quiet firewalld; then
    echo "   Firewalld is active, configuring..."
    
    # Web Client
    firewall-cmd --permanent --add-port=8080/tcp
    
    # Signaling Server
    firewall-cmd --permanent --add-port=3000/tcp
    
    # SIP
    firewall-cmd --permanent --add-port=5060/udp
    firewall-cmd --permanent --add-port=5060/tcp
    firewall-cmd --permanent --add-port=5061/tcp
    
    # RTP Media
    firewall-cmd --permanent --add-port=10000-20000/udp
    
    # HTTP/HTTPS
    firewall-cmd --permanent --add-port=80/tcp
    firewall-cmd --permanent --add-port=443/tcp
    
    firewall-cmd --reload
    echo "✅ Firewall configured"
else
    echo "   Firewalld not active, skipping (AWS Security Group handles this)"
fi
echo ""

# ==========================================
# 8. OPTIMIZE KERNEL FOR RTPENGINE
# ==========================================
echo "⚙️  Optimizing kernel for RTPEngine..."

cat >> /etc/sysctl.conf << 'EOF'

# RTPEngine Optimizations
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.rmem_default = 262144
net.core.wmem_default = 262144
net.ipv4.udp_rmem_min = 8192
net.ipv4.udp_wmem_min = 8192
net.core.netdev_max_backlog = 5000
net.ipv4.ip_forward = 1
EOF

sysctl -p
echo "✅ Kernel optimized"
echo ""

# ==========================================
# 9. CREATE PROJECT DIRECTORY
# ==========================================
echo "📁 Creating project directory..."

PROJECT_DIR="$USER_HOME/webrtc-sip-bridge"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Create directory structure
mkdir -p drachtio rtpengine server client

echo "✅ Project directory created: $PROJECT_DIR"
echo ""

# ==========================================
# 10. GET PUBLIC IP
# ==========================================
echo "🌐 Detecting public IP address..."
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

if [ -z "$PUBLIC_IP" ]; then
    echo "⚠️  Could not detect IP from AWS metadata, trying external service..."
    PUBLIC_IP=$(curl -s ifconfig.me)
fi

echo "   Detected Public IP: $PUBLIC_IP"
echo ""

# ==========================================
# 11. CREATE .ENV FILE
# ==========================================
echo "📝 Creating .env configuration file..."

cat > "$PROJECT_DIR/.env" << EOF
# SIP Trunk Configuration
# UPDATE THESE WITH YOUR PROVIDER CREDENTIALS!
SIP_TRUNK_HOST=sip.elevenlabs.io
SIP_TRUNK_PORT=5060
SIP_USERNAME=your_username_here
SIP_PASSWORD=your_password_here
SIP_DOMAIN=elevenlabs.io

# Public IP (Auto-detected)
PUBLIC_IP=$PUBLIC_IP

# Drachtio Configuration
DRACHTIO_SECRET=cymru

# Server Port
SERVER_PORT=3000
EOF

echo "✅ .env file created"
echo ""

# ==========================================
# 12. INSTRUCTIONS TO USER
# ==========================================
echo "========================================"
echo "✅ AWS Setup Complete!"
echo "========================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1️⃣  IMPORTANT: Add your project files"
echo "   Copy all project files to: $PROJECT_DIR"
echo "   You need:"
echo "   - docker-compose.yml"
echo "   - drachtio/drachtio.conf.xml"
echo "   - rtpengine/rtpengine.conf"
echo "   - server/ (all files)"
echo "   - client/ (all files)"
echo ""
echo "2️⃣  Configure SIP credentials:"
echo "   sudo nano $PROJECT_DIR/.env"
echo "   Update: SIP_USERNAME, SIP_PASSWORD, SIP_TRUNK_HOST"
echo ""
echo "3️⃣  Install Node.js dependencies:"
echo "   cd $PROJECT_DIR/server"
echo "   npm install"
echo "   cd .."
echo ""
echo "4️⃣  Start the services:"
echo "   cd $PROJECT_DIR"
echo "   docker-compose up -d"
echo ""
echo "5️⃣  Check status:"
echo "   docker-compose ps"
echo "   docker-compose logs -f"
echo ""
echo "6️⃣  Test the system:"
echo "   Health Check: http://$PUBLIC_IP:3000/health"
echo "   Web Client:   http://$PUBLIC_IP:8080"
echo ""
echo "========================================"
echo "📊 System Information"
echo "========================================"
echo "Public IP:     $PUBLIC_IP"
echo "Project Dir:   $PROJECT_DIR"
echo "Docker:        $(docker --version | cut -d' ' -f3)"
echo "Docker Compose: $(docker-compose --version | cut -d' ' -f4)"
echo "Node.js:       $(node --version)"
echo ""
echo "🔐 Security Notes:"
echo "   - Firewall ports configured (if firewalld active)"
echo "   - AWS Security Group controls main access"
echo "   - Update .env with strong passwords"
echo "   - Consider enabling SSL/TLS for production"
echo ""
echo "📚 Documentation:"
echo "   - README.md for full setup guide"
echo "   - SIPWISE_RTPENGINE_SETUP.md for RTPEngine details"
echo "   - QUICKSTART_SIPWISE.md for quick testing"
echo ""
echo "🆘 Need Help?"
echo "   - Check logs: docker-compose logs -f"
echo "   - Health check: curl http://localhost:3000/health"
echo "   - System status: docker-compose ps"
echo ""
echo "========================================"
echo ""

# Change ownership to actual user
chown -R "$ACTUAL_USER:$ACTUAL_USER" "$PROJECT_DIR"

# Create a quick helper script
cat > "$PROJECT_DIR/quick-start.sh" << 'QUICKSTART'
#!/bin/bash
# Quick start helper script

cd "$(dirname "$0")"

case "$1" in
    start)
        echo "Starting services..."
        docker-compose up -d
        echo "✅ Services started"
        echo "Web Client: http://$(cat .env | grep PUBLIC_IP | cut -d'=' -f2):8080"
        ;;
    stop)
        echo "Stopping services..."
        docker-compose stop
        echo "✅ Services stopped"
        ;;
    restart)
        echo "Restarting services..."
        docker-compose restart
        echo "✅ Services restarted"
        ;;
    logs)
        docker-compose logs -f
        ;;
    status)
        docker-compose ps
        echo ""
        curl -s http://localhost:3000/health | jq 2>/dev/null || curl -s http://localhost:3000/health
        ;;
    clean)
        echo "Removing all containers and volumes..."
        docker-compose down -v
        echo "✅ Cleaned up"
        ;;
    *)
        echo "WebRTC-SIP Bridge Quick Commands"
        echo ""
        echo "Usage: ./quick-start.sh {start|stop|restart|logs|status|clean}"
        echo ""
        echo "Commands:"
        echo "  start   - Start all services"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  logs    - View live logs"
        echo "  status  - Check service status"
        echo "  clean   - Remove all containers and volumes"
        ;;
esac
QUICKSTART

chmod +x "$PROJECT_DIR/quick-start.sh"
chown "$ACTUAL_USER:$ACTUAL_USER" "$PROJECT_DIR/quick-start.sh"

echo "💡 Tip: Use quick-start.sh for common operations:"
echo "   ./quick-start.sh start   - Start services"
echo "   ./quick-start.sh logs    - View logs"
echo "   ./quick-start.sh status  - Check status"
echo ""

# Reboot reminder
echo "⚠️  IMPORTANT: You may need to reboot or re-login for Docker group changes to take effect"
echo "   Run: newgrp docker (or logout and login again)"
echo ""

echo "Setup script completed successfully! 🎉"