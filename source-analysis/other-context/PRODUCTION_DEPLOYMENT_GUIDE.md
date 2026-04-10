# 🚀 Production Deployment Guide - Step by Step

**Project**: iFactory EAM System v2.0.0  
**Deployment Type**: Full Production Release  
**Estimated Time**: 2-3 hours  
**Downtime**: ~30 minutes

---

## 📋 PRE-REQUISITES

### Server Requirements

#### Production Server
- **OS**: Ubuntu 20.04 LTS or higher
- **CPU**: 4+ cores
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 100GB SSD
- **Network**: Static IP, Domain configured

#### Software Stack
- **Web Server**: Nginx 1.18+
- **PHP**: 8.2+
- **Database**: MySQL 8.0+
- **Node.js**: 18+
- **Composer**: 2.0+
- **Git**: 2.0+

### Access Requirements
- [ ] SSH access to production server
- [ ] Database credentials
- [ ] Domain DNS configured
- [ ] SSL certificate ready
- [ ] Backup storage access

---

## 🔧 STEP 1: SERVER PREPARATION

### 1.1 Update System
```bash
# Connect to server
ssh user@your-production-server.com

# Update system packages
sudo apt update
sudo apt upgrade -y

# Install required packages
sudo apt install -y nginx mysql-server php8.2 php8.2-fpm php8.2-mysql \
  php8.2-mbstring php8.2-xml php8.2-curl php8.2-zip php8.2-gd \
  nodejs npm git composer certbot python3-certbot-nginx
```

### 1.2 Configure MySQL
```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p

# In MySQL prompt:
CREATE DATABASE factory_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'factory_user'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON factory_manager.* TO 'factory_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 1.3 Configure Nginx
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/factorymanager

# Add configuration (see below)
# Enable site
sudo ln -s /etc/nginx/sites-available/factorymanager /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

**Nginx Configuration**:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    root /var/www/factorymanager/public;
    index index.php index.html;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
    
    # PHP Configuration
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }
    
    # Deny access to sensitive files
    location ~ /\.(?!well-known).* {
        deny all;
    }
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Frontend (Next.js)
    location /_next {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API routes
    location /api {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

### 1.4 SSL Certificate
```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 📦 STEP 2: BACKEND DEPLOYMENT

### 2.1 Clone Repository
```bash
# Create directory
sudo mkdir -p /var/www/factorymanager
sudo chown -R $USER:$USER /var/www/factorymanager

# Clone repository
cd /var/www
git clone https://github.com/your-org/factorymanager.git
cd factorymanager
```

### 2.2 Install Dependencies
```bash
# Install Composer dependencies
composer install --no-dev --optimize-autoloader

# Set permissions
sudo chown -R www-data:www-data /var/www/factorymanager
sudo chmod -R 755 /var/www/factorymanager
sudo chmod -R 775 /var/www/factorymanager/writable
```

### 2.3 Configure Environment
```bash
# Copy environment file
cp env.example .env

# Edit environment file
nano .env
```

**Environment Configuration** (.env):
```env
#--------------------------------------------------------------------
# ENVIRONMENT
#--------------------------------------------------------------------
CI_ENVIRONMENT = production

#--------------------------------------------------------------------
# APP
#--------------------------------------------------------------------
app.baseURL = 'https://your-domain.com/'
app.indexPage = ''
app.forceGlobalSecureRequests = true

#--------------------------------------------------------------------
# DATABASE
#--------------------------------------------------------------------
database.default.hostname = localhost
database.default.database = factory_manager
database.default.username = factory_user
database.default.password = STRONG_PASSWORD_HERE
database.default.DBDriver = MySQLi
database.default.DBPrefix = 
database.default.port = 3306

#--------------------------------------------------------------------
# ENCRYPTION
#--------------------------------------------------------------------
encryption.key = YOUR_32_CHARACTER_ENCRYPTION_KEY_HERE

#--------------------------------------------------------------------
# JWT
#--------------------------------------------------------------------
jwt.secret = YOUR_JWT_SECRET_KEY_HERE
jwt.expiration = 86400

#--------------------------------------------------------------------
# CORS
#--------------------------------------------------------------------
cors.allowedOrigins = https://your-domain.com
cors.allowedMethods = GET, POST, PUT, DELETE, OPTIONS
cors.allowedHeaders = Content-Type, Authorization

#--------------------------------------------------------------------
# LOGGING
#--------------------------------------------------------------------
logger.threshold = 4
```

### 2.4 Run Migrations
```bash
# Run database migrations
php spark migrate

# Seed permissions and roles
php spark db:seed PermissionsSeeder
php spark db:seed RolesSeeder

# Create admin user (if needed)
php spark db:seed AdminUserSeeder
```

### 2.5 Optimize Backend
```bash
# Clear cache
php spark cache:clear

# Optimize autoloader
composer dump-autoload --optimize

# Set production permissions
sudo chown -R www-data:www-data writable/
sudo chmod -R 775 writable/
```

---

## 🎨 STEP 3: FRONTEND DEPLOYMENT

### 3.1 Clone Frontend
```bash
# Create directory
sudo mkdir -p /var/www/factorymanager-frontend
sudo chown -R $USER:$USER /var/www/factorymanager-frontend

# Clone repository (if separate)
cd /var/www
git clone https://github.com/your-org/factorymanager-frontend.git
cd factorymanager-frontend
```

### 3.2 Install Dependencies
```bash
# Install npm packages
npm ci --production

# Or if using same repo
cd /var/www/factorymanager
npm ci --production
```

### 3.3 Configure Environment
```bash
# Create environment file
nano .env.local
```

**Frontend Environment** (.env.local):
```env
# API Configuration
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1/eam
NEXT_PUBLIC_API_TIMEOUT=30000

# WebSocket Configuration
NEXT_PUBLIC_WS_URL=https://your-domain.com:3001
NEXT_PUBLIC_WS_ENABLED=true

# App Configuration
NEXT_PUBLIC_APP_NAME=iFactory EAM
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_ENVIRONMENT=production

# Features
NEXT_PUBLIC_ENABLE_REALTIME=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### 3.4 Build Frontend
```bash
# Build production bundle
npm run build

# Test build
npm run start
```

### 3.5 Setup PM2 (Process Manager)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem file
nano ecosystem.config.js
```

**PM2 Configuration** (ecosystem.config.js):
```javascript
module.exports = {
  apps: [
    {
      name: 'factorymanager-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/factorymanager-frontend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/factorymanager-error.log',
      out_file: '/var/log/pm2/factorymanager-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G'
    }
  ]
};
```

```bash
# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

# Check status
pm2 status
pm2 logs
```

---

## 🔐 STEP 4: SECURITY HARDENING

### 4.1 Firewall Configuration
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow WebSocket (if needed)
sudo ufw allow 3001/tcp

# Check status
sudo ufw status
```

### 4.2 Fail2Ban Setup
```bash
# Install Fail2Ban
sudo apt install fail2ban -y

# Configure Fail2Ban
sudo nano /etc/fail2ban/jail.local
```

**Fail2Ban Configuration**:
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true

[nginx-badbots]
enabled = true
```

```bash
# Restart Fail2Ban
sudo systemctl restart fail2ban

# Check status
sudo fail2ban-client status
```

### 4.3 Secure PHP
```bash
# Edit PHP configuration
sudo nano /etc/php/8.2/fpm/php.ini

# Update these settings:
expose_php = Off
display_errors = Off
log_errors = On
error_log = /var/log/php/error.log
max_execution_time = 30
memory_limit = 256M
upload_max_filesize = 10M
post_max_size = 10M

# Restart PHP-FPM
sudo systemctl restart php8.2-fpm
```

---

## 📊 STEP 5: MONITORING SETUP

### 5.1 Log Rotation
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/factorymanager
```

**Logrotate Configuration**:
```
/var/www/factorymanager/writable/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload php8.2-fpm > /dev/null
    endscript
}

/var/log/nginx/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null
    endscript
}
```

### 5.2 Monitoring Scripts
```bash
# Create monitoring directory
sudo mkdir -p /opt/monitoring

# Create health check script
sudo nano /opt/monitoring/health-check.sh
```

**Health Check Script**:
```bash
#!/bin/bash

# Configuration
API_URL="https://your-domain.com/api/v1/eam/health"
LOG_FILE="/var/log/health-check.log"
ALERT_EMAIL="admin@your-domain.com"

# Check API health
response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ $response -eq 200 ]; then
    echo "$(date): API is healthy" >> $LOG_FILE
else
    echo "$(date): API is down! Response code: $response" >> $LOG_FILE
    echo "API Health Check Failed" | mail -s "ALERT: iFactory EAM Down" $ALERT_EMAIL
fi

# Check database
mysql -u factory_user -pPASSWORD -e "SELECT 1" factory_manager > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "$(date): Database is healthy" >> $LOG_FILE
else
    echo "$(date): Database connection failed!" >> $LOG_FILE
    echo "Database Connection Failed" | mail -s "ALERT: Database Down" $ALERT_EMAIL
fi

# Check disk space
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $disk_usage -gt 80 ]; then
    echo "$(date): Disk usage is high: ${disk_usage}%" >> $LOG_FILE
    echo "Disk usage is at ${disk_usage}%" | mail -s "WARNING: High Disk Usage" $ALERT_EMAIL
fi
```

```bash
# Make executable
sudo chmod +x /opt/monitoring/health-check.sh

# Add to crontab (run every 5 minutes)
sudo crontab -e

# Add line:
*/5 * * * * /opt/monitoring/health-check.sh
```

---

## 💾 STEP 6: BACKUP CONFIGURATION

### 6.1 Database Backup Script
```bash
# Create backup directory
sudo mkdir -p /backups/database
sudo chown $USER:$USER /backups

# Create backup script
nano /opt/monitoring/backup-database.sh
```

**Backup Script**:
```bash
#!/bin/bash

# Configuration
DB_NAME="factory_manager"
DB_USER="factory_user"
DB_PASS="PASSWORD"
BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Remove old backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log
echo "$(date): Database backup completed: backup_$DATE.sql.gz" >> /var/log/backup.log
```

```bash
# Make executable
chmod +x /opt/monitoring/backup-database.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add line:
0 2 * * * /opt/monitoring/backup-database.sh
```

### 6.2 Code Backup
```bash
# Create code backup script
nano /opt/monitoring/backup-code.sh
```

**Code Backup Script**:
```bash
#!/bin/bash

BACKUP_DIR="/backups/code"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup
tar -czf $BACKUP_DIR/code_$DATE.tar.gz /var/www/factorymanager

# Remove old backups
find $BACKUP_DIR -name "code_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Log
echo "$(date): Code backup completed: code_$DATE.tar.gz" >> /var/log/backup.log
```

```bash
# Make executable
chmod +x /opt/monitoring/backup-code.sh

# Add to crontab (weekly on Sunday at 3 AM)
crontab -e

# Add line:
0 3 * * 0 /opt/monitoring/backup-code.sh
```

---

## ✅ STEP 7: FINAL VERIFICATION

### 7.1 System Checks
```bash
# Check all services
sudo systemctl status nginx
sudo systemctl status php8.2-fpm
sudo systemctl status mysql
pm2 status

# Check logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/www/factorymanager/writable/logs/log-*.log
pm2 logs
```

### 7.2 Application Tests
```bash
# Test API
curl https://your-domain.com/api/v1/eam/health

# Test frontend
curl https://your-domain.com

# Test database connection
php spark db:check

# Test permissions
php spark permissions:check
```

### 7.3 Performance Tests
```bash
# Install Apache Bench
sudo apt install apache2-utils -y

# Test API performance
ab -n 1000 -c 10 https://your-domain.com/api/v1/eam/health

# Test frontend performance
ab -n 100 -c 10 https://your-domain.com/
```

---

## 🎉 STEP 8: GO LIVE

### 8.1 Final Checklist
- [ ] All services running
- [ ] SSL certificate valid
- [ ] Database migrations complete
- [ ] Permissions seeded
- [ ] Admin user created
- [ ] Backups configured
- [ ] Monitoring active
- [ ] Logs rotating
- [ ] Firewall configured
- [ ] Security hardened

### 8.2 Announce Deployment
```bash
# Send notification email
# Update status page
# Post in company chat
# Update documentation
```

### 8.3 Monitor First 24 Hours
- Watch error logs continuously
- Monitor performance metrics
- Track user feedback
- Be ready for quick fixes

---

## 🔄 ROLLBACK PROCEDURE

### If Critical Issues Occur

```bash
# 1. Enable maintenance mode
touch /var/www/factorymanager/maintenance.flag

# 2. Restore database
gunzip < /backups/database/backup_LATEST.sql.gz | mysql -u factory_user -pPASSWORD factory_manager

# 3. Restore code
cd /var/www
sudo rm -rf factorymanager
sudo tar -xzf /backups/code/code_LATEST.tar.gz

# 4. Restart services
sudo systemctl restart php8.2-fpm
sudo systemctl restart nginx
pm2 restart all

# 5. Verify
curl https://your-domain.com/api/v1/eam/health

# 6. Disable maintenance mode
rm /var/www/factorymanager/maintenance.flag
```

---

## 📞 SUPPORT CONTACTS

- **Technical Lead**: tech-lead@your-company.com
- **DevOps**: devops@your-company.com
- **Emergency**: +1-234-567-8901

---

## ✅ DEPLOYMENT COMPLETE

**Congratulations! Your iFactory EAM System is now live in production!** 🎉

**Next Steps**:
1. Monitor for 24-48 hours
2. Gather user feedback
3. Address any issues
4. Plan next iteration

---

**Built with ❤️ for modern manufacturing**
