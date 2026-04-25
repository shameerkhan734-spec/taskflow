#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# EC2 Bootstrap Script
# Run this ONCE on a fresh Ubuntu 22.04 EC2 instance to set everything up.
# Usage: chmod +x setup-ec2.sh && sudo bash setup-ec2.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e  # Stop on any error
set -o pipefail

LOG="/var/log/taskflow-setup.log"
exec > >(tee -a "$LOG") 2>&1

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TaskFlow EC2 Setup — $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── Step 1: System Update ────────────────────────────────────────────────────
echo ""
echo "▶ STEP 1: Updating system packages..."
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  curl \
  wget \
  git \
  unzip \
  htop \
  vim \
  net-tools \
  ca-certificates \
  gnupg \
  lsb-release

# ─── Step 2: Install Docker ───────────────────────────────────────────────────
echo ""
echo "▶ STEP 2: Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

  systemctl enable docker
  systemctl start docker

  # Allow ubuntu user to run docker without sudo
  usermod -aG docker ubuntu

  echo "✅ Docker installed: $(docker --version)"
else
  echo "✅ Docker already installed: $(docker --version)"
fi

# ─── Step 3: Install AWS CLI ──────────────────────────────────────────────────
echo ""
echo "▶ STEP 3: Installing AWS CLI v2..."
if ! command -v aws &>/dev/null; then
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  unzip -q awscliv2.zip
  ./aws/install
  rm -rf awscliv2.zip aws/
  echo "✅ AWS CLI installed: $(aws --version)"
else
  echo "✅ AWS CLI already installed"
fi

# ─── Step 4: Install Node Exporter (for Prometheus) ──────────────────────────
echo ""
echo "▶ STEP 4: Installing Node Exporter (system metrics for Prometheus)..."
NODE_EXPORTER_VERSION="1.7.0"
if ! systemctl is-active --quiet node_exporter; then
  wget -q "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz"
  tar xzf "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz"
  mv "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64/node_exporter" /usr/local/bin/
  rm -rf "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64"*

  # Create systemd service
  cat > /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=nobody
ExecStart=/usr/local/bin/node_exporter
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable node_exporter
  systemctl start node_exporter
  echo "✅ Node Exporter installed and running on port 9100"
else
  echo "✅ Node Exporter already running"
fi

# ─── Step 5: Clone App Repository ────────────────────────────────────────────
echo ""
echo "▶ STEP 5: Setting up application directory..."
APP_DIR="/home/ubuntu/taskflow"
if [ ! -d "$APP_DIR" ]; then
  mkdir -p "$APP_DIR"
  chown ubuntu:ubuntu "$APP_DIR"
  echo "✅ App directory created: $APP_DIR"
  echo "   ⚠️  Remember to: cd $APP_DIR && git clone YOUR_REPO_URL ."
else
  echo "✅ App directory already exists"
fi

# ─── Step 6: Configure Firewall (UFW) ────────────────────────────────────────
echo ""
echo "▶ STEP 6: Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment 'SSH'
ufw allow 80/tcp    comment 'HTTP'
ufw allow 443/tcp   comment 'HTTPS'
ufw allow 3001/tcp  comment 'Grafana dashboard'
ufw allow 9090/tcp  comment 'Prometheus (restrict this in production!)'
ufw --force enable
echo "✅ Firewall configured"

# ─── Step 7: Configure Log Rotation ──────────────────────────────────────────
echo ""
echo "▶ STEP 7: Setting up log rotation..."
cat > /etc/logrotate.d/taskflow << 'EOF'
/home/ubuntu/taskflow/backend/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0640 ubuntu ubuntu
}
EOF
echo "✅ Log rotation configured"

# ─── Step 8: Create deployment script ────────────────────────────────────────
echo ""
echo "▶ STEP 8: Creating deploy helper script..."
cat > /home/ubuntu/deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
# Quick deploy script — can also be run manually
set -e
cd /home/ubuntu/taskflow
git pull origin main
docker compose pull
docker compose up -d
docker image prune -f
echo "✅ Manual deployment complete!"
DEPLOY_SCRIPT
chmod +x /home/ubuntu/deploy.sh
chown ubuntu:ubuntu /home/ubuntu/deploy.sh

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ EC2 setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Log out and back in (for docker group to take effect)"
echo "  2. cd /home/ubuntu/taskflow"
echo "  3. git clone YOUR_REPO_URL ."
echo "  4. cp backend/.env.example backend/.env  && edit it"
echo "  5. docker compose up -d"
echo ""
echo "  Services will be available at:"
echo "  • App:        http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "  • Grafana:    http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3001"
echo "  • Prometheus: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):9090"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
