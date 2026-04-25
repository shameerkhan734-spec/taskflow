# 🚀 TaskFlow — Complete Deployment Guide
## From GitHub to Live Production on AWS with Monitoring

---

## 📁 Project Structure

```
fullstack-app/
├── backend/                    ← Node.js/Express API
│   ├── src/
│   │   ├── server.js           ← Entry point
│   │   ├── routes/             ← API routes
│   │   └── middleware/         ← Logger, error handler
│   ├── tests/                  ← Jest tests
│   ├── Dockerfile
│   └── package.json
├── frontend/                   ← React app
│   ├── src/
│   │   ├── App.js              ← Main component
│   │   └── App.css             ← Styles
│   ├── public/index.html
│   ├── nginx.conf              ← Nginx config inside container
│   └── Dockerfile
├── monitoring/
│   ├── prometheus.yml          ← Prometheus scrape config
│   ├── alert_rules.yml         ← Alert definitions
│   └── grafana/                ← Grafana auto-provisioning
├── scripts/
│   ├── setup-ec2.sh            ← Run once on EC2
│   └── create-ecr-repos.sh     ← Run once locally
├── .github/workflows/
│   └── ci-cd.yml               ← Full CI/CD pipeline
└── docker-compose.yml          ← Runs everything together
```

---

## 🔢 COMPLETE STEP-BY-STEP GUIDE

---

## PHASE 1 — LOCAL DEVELOPMENT

### Step 1.1 — Install Prerequisites (Local Machine)
```bash
# Install Node.js 20 from nodejs.org or use nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20 && nvm use 20

# Install Docker Desktop from docker.com
# After install, verify:
docker --version           # Should say Docker version 24+
docker compose version     # Should say Docker Compose version v2+
```

### Step 1.2 — Set Up the Project Locally
```bash
# 1. Extract the project files to a folder
cd fullstack-app

# 2. Install backend dependencies
cd backend
cp .env.example .env        # Copy env template
npm install                 # Install packages
npm test                    # Run tests — should all pass
npm run dev                 # Start backend on port 5000
# You should see: 🚀 Server running on port 5000

# 3. In a NEW terminal, install frontend
cd frontend
cp .env.example .env
npm install
npm start                   # Starts React on port 3000
# Browser opens at http://localhost:3000

# 4. Test the app — add tasks, delete them, toggle completion
```

### Step 1.3 — Run Everything with Docker Compose
```bash
# From the root folder:
docker compose up --build

# Services start at:
# ┌─────────────────────────────────────────────┐
# │  App         → http://localhost              │
# │  Backend API → http://localhost:5000/health  │
# │  Prometheus  → http://localhost:9090         │
# │  Grafana     → http://localhost:3001         │
# │               login: admin / taskflow123     │
# └─────────────────────────────────────────────┘

# Stop everything:
docker compose down
```

---

## PHASE 2 — GITHUB SETUP

### Step 2.1 — Create GitHub Repository
```
1. Go to github.com → New repository
2. Name it: taskflow
3. Set to Private
4. DO NOT initialize with README (you already have files)
5. Click "Create repository"
```

### Step 2.2 — Push Code to GitHub
```bash
# From the project root:
git init
git add .
git commit -m "feat: initial production-ready fullstack app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
git push -u origin main
```

### Step 2.3 — Create Branch Strategy
```bash
# Create develop branch for ongoing work
git checkout -b develop
git push origin develop

# Working pattern from now on:
# • develop branch → code changes, testing
# • main branch    → triggers deployment to production

# To deploy: merge develop → main
git checkout main
git merge develop
git push origin main       # ← This triggers CI/CD!
```

---

## PHASE 3 — AWS SETUP

### Step 3.1 — Create AWS Account
```
1. Go to aws.amazon.com → Create account
2. Choose region: ap-south-1 (Mumbai) — closest to Hyderabad
3. Enable MFA on root account (Security → IAM → MFA)
```

### Step 3.2 — Create IAM User for CI/CD
```
Why? Never use root account credentials in CI/CD.
Create a limited user with only required permissions.

1. AWS Console → IAM → Users → Create user
2. Name: taskflow-cicd
3. Attach policies:
   • AmazonEC2ContainerRegistryFullAccess (push Docker images)
   • AmazonEC2FullAccess (optional - for future automation)
4. Create user → Security credentials → Create access key
5. Choose: "Application running outside AWS"
6. SAVE: Access Key ID + Secret Access Key (you only see these once!)
```

### Step 3.3 — Create ECR Repositories (run once, locally)
```bash
# Install AWS CLI on your local machine first:
# https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html

# Configure AWS CLI:
aws configure
# Enter: Access Key ID, Secret Access Key, Region (ap-south-1), format (json)

# Create ECR repos:
chmod +x scripts/create-ecr-repos.sh
bash scripts/create-ecr-repos.sh

# Output will show your ECR registry URL — save it!
# Format: 123456789.dkr.ecr.ap-south-1.amazonaws.com
```

### Step 3.4 — Launch EC2 Instance
```
1. AWS Console → EC2 → Launch Instance
2. Settings:
   • Name: taskflow-production
   • AMI: Ubuntu Server 22.04 LTS (Free tier eligible ✓)
   • Instance type: t3.small (2 vCPU, 2GB RAM — good start)
   • Key pair: Create new → Name: taskflow-key → Download .pem file
     ⚠️  KEEP THIS .PEM FILE SAFE — it's your server login key
   
3. Network settings:
   • Allow SSH (port 22) — from My IP only (more secure)
   • Allow HTTP (port 80)
   • Allow HTTPS (port 443)
   • Allow Custom TCP 3001 (Grafana)
   • Allow Custom TCP 9090 (Prometheus)

4. Storage: 20 GB gp3 (faster than gp2, same price)
5. Click: Launch Instance

6. Wait ~2 minutes → Go to Instances → Copy Public IPv4 address
   Example: 65.0.123.45
```

### Step 3.5 — Configure EC2 Instance
```bash
# 1. Connect via SSH from your local machine:
chmod 400 ~/Downloads/taskflow-key.pem     # Secure the key file

ssh -i ~/Downloads/taskflow-key.pem ubuntu@YOUR_EC2_IP
# Example: ssh -i ~/Downloads/taskflow-key.pem ubuntu@65.0.123.45
# Type "yes" when asked about fingerprint

# 2. You're now ON the server. Run the setup script:
# Copy setup-ec2.sh content to server:

# Option A - if you can scp:
exit    # Go back to your local machine
scp -i ~/Downloads/taskflow-key.pem scripts/setup-ec2.sh ubuntu@YOUR_EC2_IP:~/
ssh -i ~/Downloads/taskflow-key.pem ubuntu@YOUR_EC2_IP
bash setup-ec2.sh

# Option B - paste it manually:
# SSH in, then: nano setup-ec2.sh → paste contents → Ctrl+O → Enter → Ctrl+X
# bash setup-ec2.sh

# 3. Setup takes ~3 minutes. You'll see checkmarks as each step completes.

# 4. After setup, logout and back in (needed for Docker group):
exit
ssh -i ~/Downloads/taskflow-key.pem ubuntu@YOUR_EC2_IP

# 5. Clone your GitHub repo on the server:
cd /home/ubuntu/taskflow
git clone https://github.com/YOUR_USERNAME/taskflow.git .

# 6. Set up environment variables on server:
cp backend/.env.example backend/.env
nano backend/.env
# Change:
#   NODE_ENV=production
#   FRONTEND_URL=http://YOUR_EC2_IP
# Save: Ctrl+O → Enter → Ctrl+X

# 7. Configure AWS credentials on EC2 (for pulling from ECR):
aws configure
# Enter same IAM user credentials as Step 3.2

# 8. Test docker-compose works:
docker compose up -d
docker compose ps     # All services should show "healthy"
curl http://localhost/health    # Should return OK
```

---

## PHASE 4 — GITHUB SECRETS (Connecting GitHub to AWS)

### Step 4.1 — Add Secrets to GitHub
```
GitHub secrets are encrypted environment variables used by CI/CD.
They're NEVER visible after you save them.

Go to: Your repo → Settings → Secrets and variables → Actions → New repository secret

Add these 5 secrets:
┌──────────────────────────┬────────────────────────────────────────────────┐
│ Secret Name              │ Value                                          │
├──────────────────────────┼────────────────────────────────────────────────┤
│ AWS_ACCOUNT_ID           │ Your 12-digit AWS account ID                   │
│                          │ (Find it: AWS Console top-right → Account ID)  │
├──────────────────────────┼────────────────────────────────────────────────┤
│ AWS_ACCESS_KEY_ID        │ The Access Key ID from Step 3.2                │
├──────────────────────────┼────────────────────────────────────────────────┤
│ AWS_SECRET_ACCESS_KEY    │ The Secret Access Key from Step 3.2            │
├──────────────────────────┼────────────────────────────────────────────────┤
│ EC2_HOST                 │ Your EC2 Public IP (e.g., 65.0.123.45)         │
├──────────────────────────┼────────────────────────────────────────────────┤
│ EC2_SSH_PRIVATE_KEY      │ Full contents of taskflow-key.pem              │
│                          │ Open the .pem file in a text editor,           │
│                          │ copy EVERYTHING including the header lines     │
└──────────────────────────┴────────────────────────────────────────────────┘
```

---

## PHASE 5 — FIRST DEPLOYMENT (Test the Pipeline)

### Step 5.1 — Trigger First Deployment
```bash
# On your local machine, make a small change:
# Edit frontend/src/App.js — change "TaskFlow" in footer to "TaskFlow v1.0"

git add .
git commit -m "feat: trigger first production deployment"
git push origin main     # ← This triggers the CI/CD pipeline!
```

### Step 5.2 — Watch the Pipeline Run
```
1. Go to: GitHub → Your repo → Actions tab
2. You'll see a workflow running called "CI/CD Pipeline"
3. Click it to see real-time logs

Pipeline stages (takes ~5-8 minutes total):
┌────────────────────────────────────────────────────────────┐
│  🧪 Test Backend    → Runs Jest tests (1-2 min)            │
│  🧪 Test Frontend   → Runs React tests (1-2 min)           │
│  🐳 Build & Push    → Builds Docker images, pushes to ECR  │
│  🚀 Deploy to EC2   → SSH deploy, health check (1 min)     │
└────────────────────────────────────────────────────────────┘

4. All steps should show green ✓ checkmarks
5. If any step fails, click it to see exact error logs
```

### Step 5.3 — Verify Deployment
```bash
# Visit in your browser:
http://YOUR_EC2_IP              ← Your live React app!
http://YOUR_EC2_IP:5000/health  ← Backend health check
http://YOUR_EC2_IP/api/v1/tasks ← API data

# From terminal:
curl http://YOUR_EC2_IP/api/v1/stats
# Should return: {"success":true,"data":{"total":3,"completed":1,"pending":2}}
```

---

## PHASE 6 — MONITORING SETUP

### Step 6.1 — Access Prometheus
```
Open: http://YOUR_EC2_IP:9090

1. Click: Status → Targets
   You should see "taskflow-backend" with state: UP (green)
   This means Prometheus is successfully scraping your app's metrics.

2. Try a query in the search box:
   • http_requests_total              ← All requests ever made
   • rate(http_requests_total[5m])    ← Requests per second (last 5 min)
   • node_app_nodejs_heap_size_used_bytes  ← Node.js memory usage

3. Click Graph tab to see the metric over time
```

### Step 6.2 — Set Up Grafana Dashboard
```
Open: http://YOUR_EC2_IP:3001
Login: admin / taskflow123

1. Left sidebar → Dashboards → New → New Dashboard
2. Click "Add visualization"
3. Select data source: Prometheus
4. In the query box, type: rate(http_requests_total[5m])
5. Give it a title: "Requests per second"
6. Save the dashboard

Useful metrics to add as panels:
┌─────────────────────────────────────────────────────────────────────────┐
│ Panel Name         │ PromQL Query                                        │
├─────────────────────────────────────────────────────────────────────────┤
│ Request Rate       │ rate(http_requests_total[5m])                       │
│ Error Rate (%)     │ rate(http_requests_total{status_code=~"5.."}[5m])   │
│ Response Time p95  │ histogram_quantile(0.95,                            │
│                    │   rate(http_request_duration_seconds_bucket[5m]))   │
│ Node.js Memory     │ node_app_nodejs_heap_size_used_bytes / 1024 / 1024  │
│ CPU Usage          │ rate(node_app_process_cpu_user_seconds_total[5m])   │
│ Active Connections │ active_connections                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step 6.3 — Set Up Alert Notifications (Email)
```
1. Grafana → Alerting → Contact points → Add contact point
2. Name: email-alerts
3. Integration: Email
4. Enter your email address
5. Save

6. Grafana → Alerting → Notification policies
7. Set Default policy → Contact point: email-alerts
8. Save

Now alerts defined in monitoring/alert_rules.yml will trigger emails.
```

---

## PHASE 7 — ONGOING WORKFLOW

### Your Daily Development Workflow
```bash
# 1. Always work on develop branch:
git checkout develop

# 2. Make changes to your code

# 3. Test locally:
cd backend && npm test
docker compose up --build

# 4. Commit and push develop:
git add .
git commit -m "feat: describe your change"
git push origin develop
# This runs tests only — does NOT deploy

# 5. When ready to deploy to production:
git checkout main
git merge develop
git push origin main
# This triggers the FULL pipeline → tests → build → deploy!
```

---

## 🛟 TROUBLESHOOTING

### Pipeline fails at "Build & Push" step
```bash
# Check: Is AWS_ACCOUNT_ID correct? (12 digits, no dashes)
# Check: Does the IAM user have ECR permissions?
# Check: Were ECR repos created? (run create-ecr-repos.sh)
```

### Pipeline fails at "Deploy to EC2" step
```bash
# SSH into EC2 manually and check:
ssh -i taskflow-key.pem ubuntu@YOUR_EC2_IP
docker compose ps           # Are containers running?
docker compose logs backend # Check backend logs
curl localhost/health       # Is it accessible locally?

# Common fix: re-run setup script
bash setup-ec2.sh
```

### App loads but API returns errors
```bash
# Check backend logs:
docker compose logs --tail=50 backend

# Check environment variables:
cat backend/.env   # Is NODE_ENV=production? Is FRONTEND_URL set?
```

### Can't connect to EC2 via SSH
```
Check: EC2 Security Group allows SSH from your IP
AWS Console → EC2 → Instance → Security → Security groups → Edit inbound rules
```

---

## 💰 AWS COST ESTIMATE (Monthly)

```
t3.small EC2 instance:    ~$15/month
ECR storage (10 images):  ~$1/month
Data transfer:            ~$2/month
                          ─────────
Total:                    ~$18/month

Free tier (first 12 months):
  • t2.micro is free (750 hrs/month) — works for testing
  • ECR: 500MB storage free
```

---

## ✅ CHECKLIST — You're Production Ready When:

- [ ] App runs locally with `docker compose up`
- [ ] Code is on GitHub (main + develop branches)
- [ ] ECR repositories created
- [ ] EC2 instance running, setup script completed
- [ ] All 5 GitHub Secrets added
- [ ] First push to main triggered green CI/CD pipeline
- [ ] App accessible at http://YOUR_EC2_IP
- [ ] Prometheus shows backend metrics (Targets: UP)
- [ ] Grafana dashboard created with key metrics
- [ ] Alert rules in place

**Congratulations — you have a production-grade full stack app! 🎉**
