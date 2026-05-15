#!/bin/bash
# =============================================================================
# EAM System - Complete Server Setup Script
# Run this on a fresh Ubuntu VM (Google Compute Engine)
# 
# Usage:
#   chmod +x setup-server.sh
#   ./setup-server.sh
#
# This script will:
#   1. Update system packages
#   2. Install Node.js 20
#   3. Install MySQL Server
#   4. Install Nginx
#   5. Install PM2 (process manager)
#   6. Install Certbot (SSL certificates)
#   7. Clone the EAM repo
#   8. Setup the database
#   9. Build the Next.js app
#   10. Configure Nginx reverse proxy
#   11. Start the app with PM2
#   12. Setup auto-start on reboot
# =============================================================================

set -e

# ---- Colors ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "============================================"
echo "  iAssetsPro EAM - Server Setup Script"
echo "============================================"
echo ""

# ---- Configuration ----
APP_DIR="/home/$(whoami)/eam-system"
APP_PORT=3000
NODE_VERSION=20

# ---- Step 1: Update System ----
step() {
    echo -e "${BLUE}[Step $1]${NC} $2"
    echo "-------------------------------------------"
}

ok() {
    echo -e "${GREEN}  ✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}  ⚠️  $1${NC}"
}

err() {
    echo -e "${RED}  ❌ $1${NC}"
}

# ============================================================
step 1 "Updating system packages"
# ============================================================
sudo apt-get update -y > /dev/null 2>&1
sudo apt-get upgrade -y > /dev/null 2>&1
sudo apt-get install -y curl wget git software-properties-common build-essential > /dev/null 2>&1
ok "System updated"

# ============================================================
step 2 "Installing Node.js $NODE_VERSION"
# ============================================================
if command -v node &> /dev/null; then
    ok "Node.js $(node --version) already installed"
else
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash - > /dev/null 2>&1
    sudo apt-get install -y nodejs > /dev/null 2>&1
    ok "Node.js $(node --version) installed"
fi

# Install useful global packages
sudo npm install -g pm2 yarn > /dev/null 2>&1
ok "PM2 $(pm2 --version 2>/dev/null | head -1) installed"

# ============================================================
step 3 "Installing MySQL Server"
# ============================================================
if command -v mysql &> /dev/null; then
    ok "MySQL already installed"
else
    # Pre-configure MySQL root password to avoid interactive prompt
    sudo debconf-set-selections <<< "mysql-server mysql-server/root_password password EAM_Root_2024!"
    sudo debconf-set-selections <<< "mysql-server mysql-server/root_password_again password EAM_Root_2024!"
    sudo apt-get install -y mysql-server > /dev/null 2>&1
    sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'EAM_Root_2024!'; FLUSH PRIVILEGES;" 2>/dev/null || true
    ok "MySQL installed (root: EAM_Root_2024!)"
fi

# ============================================================
step 4 "Installing Nginx"
# ============================================================
if command -v nginx &> /dev/null; then
    ok "Nginx already installed"
else
    sudo apt-get install -y nginx > /dev/null 2>&1
    ok "Nginx installed"
fi

# ============================================================
step 5 "Installing Certbot (for SSL/HTTPS)"
# ============================================================
if command -v certbot &> /dev/null; then
    ok "Certbot already installed"
else
    sudo apt-get install -y certbot python3-certbot-nginx > /dev/null 2>&1
    ok "Certbot installed"
fi

# ============================================================
step 6 "Configuring MySQL for the EAM app"
# ============================================================
echo ""
echo -e "${YELLOW}  Setting up MySQL database...${NC}"

# Create database and user
sudo mysql -u root -p'EAM_Root_2024!' << 'MYSQL_SETUP'
CREATE DATABASE IF NOT EXISTS eam_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'eam_user'@'localhost' IDENTIFIED BY 'EAM_DB_2024_Secure!';
GRANT ALL PRIVILEGES ON eam_system.* TO 'eam_user'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SETUP

ok "Database 'eam_system' created"
ok "User 'eam_user' created"

# ============================================================
step 7 "Cloning the EAM repository"
# ============================================================
echo ""
if [ -d "$APP_DIR" ]; then
    ok "Repository already exists at $APP_DIR"
    cd "$APP_DIR"
    git pull origin main 2>/dev/null || true
else
    git clone https://github.com/christianagbotah/eam-system.git "$APP_DIR"
    cd "$APP_DIR"
    ok "Repository cloned to $APP_DIR"
fi

# ============================================================
step 8 "Configuring environment"
# ============================================================
echo ""
cat > "$APP_DIR/.env" << 'ENVFILE'
DATABASE_URL="mysql://eam_user:EAM_DB_2024_Secure!@localhost:3306/eam_system"
DB_HOST=localhost
DB_PORT=3306
DB_USER=eam_user
DB_PASSWORD=EAM_DB_2024_Secure!
DB_NAME=eam_system
SESSION_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_APP_URL=http://localhost
ENVFILE

# Replace SESSION_SECRET placeholder with actual value
ACTUAL_SECRET=$(openssl rand -hex 32)
sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=${ACTUAL_SECRET}|" "$APP_DIR/.env"
# Also fix the double $$ issue in sed
sed -i 's|EAM_DB_2024_Secure\!|EAM_DB_2024_Secure!|g' "$APP_DIR/.env"

ok ".env file created"

# ============================================================
step 9 "Installing dependencies"
# ============================================================
echo ""
cd "$APP_DIR"
npm install --legacy-peer-deps 2>&1 | tail -3
ok "Dependencies installed"

# ============================================================
step 10 "Setting up Prisma and Database"
# ============================================================
echo ""
cd "$APP_DIR"

# Generate Prisma client
npx prisma generate 2>&1 | tail -3
ok "Prisma client generated"

# Push schema to database
npx prisma db push 2>&1 | tail -5
ok "Database schema pushed"

# ============================================================
step 11 "Seeding the database"
# ============================================================
echo ""
warn "Seeding database with initial data..."
cd "$APP_DIR"
npx tsx prisma/seed.ts 2>&1 | tail -10
ok "Database seeded"

# ============================================================
step 12 "Building the Next.js application"
# ============================================================
echo ""
warn "Building Next.js app (this takes 3-5 minutes)..."
cd "$APP_DIR"
npm run build:local 2>&1 | tail -10
ok "Build complete"

# ============================================================
step 13 "Configuring Nginx"
# ============================================================
echo ""
warn "Setting up Nginx reverse proxy..."

# Ask for domain name
echo ""
echo -e "${YELLOW}  Enter your domain name (e.g., eam.lightworldtech.com)${NC}"
echo -e "${YELLOW}  Or press Enter to use the server's IP address${NC}"
read -p "  Domain: " DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    # Get server IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
    DOMAIN_NAME=$SERVER_IP
    warn "No domain provided, using IP: $SERVER_IP"
fi

# Create Nginx config
sudo tee /etc/nginx/sites-available/eam-system > /dev/null << NGINX
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    # Maximum upload size (for file attachments)
    client_max_body_size 50M;

    # Proxy to Next.js app
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files - let Nginx serve them directly
    location /_next/static/ {
        alias ${APP_DIR}/.next/static/;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location /favicon.ico {
        alias ${APP_DIR}/public/favicon.ico;
    }
}
NGINX

# Enable the site
sudo ln -sf /etc/nginx/sites-available/eam-system /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
ok "Nginx configured for ${DOMAIN_NAME}"

# Test and restart Nginx
sudo nginx -t 2>&1 && sudo systemctl restart nginx
ok "Nginx restarted"

# ============================================================
step 14 "Starting the app with PM2"
# ============================================================
echo ""
cd "$APP_DIR"

# Kill any existing PM2 process
pm2 delete eam-system 2>/dev/null || true

# Start the app
pm2 start npm --name "eam-system" -- start
ok "App started with PM2"

# Save PM2 config so it auto-starts on reboot
pm2 save
pm2 startup 2>&1 | grep "sudo" | bash 2>/dev/null || true
ok "PM2 auto-start configured"

# ============================================================
step 15 "Setting up SSL (HTTPS)"
# ============================================================
echo ""
if [[ "$DOMAIN_NAME" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    warn "Cannot setup SSL for IP addresses. SSL requires a domain name."
    warn "To add SSL later, point a domain to this IP and run:"
    warn "  sudo certbot --nginx -d ${DOMAIN_NAME}"
else
    echo -e "${YELLOW}  Setting up SSL certificate for ${DOMAIN_NAME}...${NC}"
    echo -e "${YELLOW}  Make sure your domain DNS points to this server's IP!${NC}"
    echo ""
    read -p "  Setup SSL now? (y/n): " SETUP_SSL
    
    if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
        sudo certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos --email admin@lightworldtech.com 2>&1 | tail -5
        ok "SSL certificate installed"
    else
        warn "SSL skipped. Run later: sudo certbot --nginx -d ${DOMAIN_NAME}"
    fi
fi

# ============================================================
step 16 "Setting up automatic backups"
# ============================================================
echo ""
# Create backup script
cat > "$APP_DIR/backup-db.sh" << 'BACKUP'
#!/bin/bash
BACKUP_DIR="/home/$(whoami)/eam-backups"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u eam_user -p'EAM_DB_2024_Secure!' eam_system > "$BACKUP_DIR/eam_backup_$DATE.sql"
gzip "$BACKUP_DIR/eam_backup_$DATE.sql"
# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "eam_backup_*.sql.gz" -mtime +7 -delete
echo "Backup completed: eam_backup_$DATE.sql.gz"
BACKUP
chmod +x "$APP_DIR/backup-db.sh"

# Add daily backup cron job
(crontab -l 2>/dev/null | grep -v "backup-db.sh"; echo "0 2 * * * $APP_DIR/backup-db.sh >> $APP_DIR/backup.log 2>&1") | crontab -
ok "Daily backup configured (runs at 2:00 AM)"

# ============================================================
# DONE!
# ============================================================
echo ""
echo "============================================"
echo -e "${GREEN}  🎉 SETUP COMPLETE!${NC}"
echo "============================================"
echo ""
echo "  📍 Access your app:"
if [[ "$DOMAIN_NAME" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "     http://${DOMAIN_NAME}"
else
    echo "     https://${DOMAIN_NAME}"
fi
echo ""
echo "  👤 Login credentials:"
echo "     admin / Admin@1234"
echo "     planner1 / Planner@1234"
echo "     supervisor1 / Super@1234"
echo "     tech1 / Tech@1234"
echo "     storekeeper1 / Store@1234"
echo "     operator1 / Operator@1234"
echo ""
echo "  🛠️  Useful commands:"
echo "     pm2 logs eam-system          # View app logs"
echo "     pm2 restart eam-system       # Restart the app"
echo "     pm2 stop eam-system          # Stop the app"
echo "     sudo nginx -t                # Test Nginx config"
echo "     sudo systemctl restart nginx # Restart Nginx"
echo "     $APP_DIR/backup-db.sh        # Manual backup"
echo ""
echo "  📁 File locations:"
echo "     App: $APP_DIR"
echo "     Nginx: /etc/nginx/sites-available/eam-system"
echo "     Logs: pm2 logs eam-system"
echo "     Backups: ~/eam-backups/"
echo ""
