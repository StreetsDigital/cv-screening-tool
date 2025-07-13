# Vercel Deployment Guide

## 🚀 Quick Deploy to Vercel

### Option 1: One-Click Deploy (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import from GitHub: `StreetsDigital/cv-screening-tool`
4. Configure environment variables (see below)
5. Click "Deploy"

### Option 2: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project directory
cd /Users/streetsdigital/cv-screening-tool-updated
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Set up environment variables
# - Deploy
```

## ⚙️ Environment Variables Required

Set these in your Vercel dashboard under "Settings" → "Environment Variables":

### Production Environment Variables
```
ANTHROPIC_API_KEY=your_actual_claude_api_key_here
NODE_ENV=production
PORT=3000
```

### Optional Variables
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📁 Vercel Configuration

The project includes a `vercel.json` file with the following configuration:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**/*", 
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/health",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ]
}
```

## 🔍 Post-Deployment Testing

After deployment, test these endpoints:

1. **Health Check**: `https://your-app.vercel.app/health`
2. **Frontend**: `https://your-app.vercel.app/`
3. **API**: `https://your-app.vercel.app/api/analyze-cv` (POST)

## 🐛 Common Deployment Issues & Solutions

### Issue 1: Build Fails
**Problem**: CI/CD pipeline fails
**Solution**: The simplified CI/CD workflow should fix this. If issues persist:
```bash
# Test locally first
npm install
npm test
npm start
```

### Issue 2: Environment Variables Not Set
**Problem**: API returns 500 errors
**Solution**: 
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `ANTHROPIC_API_KEY` with your actual API key
3. Redeploy the project

### Issue 3: API Routes Not Working
**Problem**: 404 errors on API endpoints
**Solution**: Vercel configuration should handle this automatically. Verify `vercel.json` is in the root directory.

### Issue 4: Static Files Not Loading
**Problem**: CSS/JS files return 404
**Solution**: Ensure files are in the `public/` directory and `vercel.json` includes the static build configuration.

## 📊 Monitoring & Analytics

After deployment, you can monitor your application through:

1. **Vercel Dashboard**: Performance, logs, analytics
2. **Function Logs**: Real-time API request monitoring  
3. **GitHub Actions**: CI/CD pipeline status

## 🔄 Continuous Deployment

The repository is configured for automatic deployment:

1. **Push to main branch** → Triggers GitHub Actions CI/CD
2. **CI passes** → Vercel automatically deploys
3. **Deployment complete** → Live at your Vercel URL

## 📋 Deployment Checklist

- [ ] Repository pushed to GitHub
- [ ] Vercel project created and linked
- [ ] Environment variables configured
- [ ] Initial deployment successful
- [ ] Health check endpoint responding
- [ ] Frontend loading correctly
- [ ] API endpoints working with demo mode
- [ ] Domain configured (if using custom domain)

## 🔧 Advanced Configuration

### Custom Domain
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Update DNS settings as instructed

### Database Integration (Phase 2.5)
When implementing PostgreSQL:
1. Use Vercel Postgres or external provider
2. Add database URL to environment variables
3. Update `vercel.json` if needed for database migrations

### Performance Optimization
- Enable Vercel Analytics
- Configure caching headers
- Optimize static assets
- Monitor function execution times

---

**Need Help?**
- Vercel Documentation: https://vercel.com/docs
- GitHub Repository: https://github.com/StreetsDigital/cv-screening-tool
- Issues: Create an issue in the GitHub repository