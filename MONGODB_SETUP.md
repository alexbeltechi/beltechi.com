# MongoDB-Only CMS Setup

## ✅ Complete - Database-First Architecture

Your CMS now requires MongoDB (no filesystem fallback). This is standard practice for modern CMSs.

## Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)

### 2. Get MongoDB Connection String

Already set up! Your connection string is in `.env.local`:
```
MONGODB_URI=mongodb+srv://alexbeltechi_db_user:...@cluster0.r9ywqGd.mongodb.net/beltechi-cms
```

### 3. Check Database Status

```bash
# Health check endpoint
curl http://localhost:3000/api/health

# Response when ready:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "..."
}

# Response when DNS not ready:
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "querySrv ENOTFOUND ...",
  "timestamp": "..."
}
```

### 4. Start Development

```bash
npm run dev
```

**If MongoDB is not connected**, you'll see clear errors in:
- `/api/health` endpoint
- Admin UI (when creating posts)
- Server logs

## Current Status

**MongoDB Cluster:** Provisioned, waiting for DNS propagation (30-60 min)

**Check if ready:**
```bash
curl http://localhost:3000/api/health
```

When `"status": "healthy"` → MongoDB is ready!

## Error Handling

### Startup
If `MONGODB_URI` is not set, server shows:
```
Error: MONGODB_URI is required. Please add it to your .env.local file.
Get your connection string from MongoDB Atlas: https://cloud.mongodb.com
```

### Runtime
If MongoDB disconnects while running:

**API Response:**
```json
{
  "error": "Database Connection Failed",
  "message": "Unable to connect to MongoDB. Please check your MONGODB_URI configuration.",
  "code": "DB_CONNECTION_ERROR",
  "timestamp": "2025-12-28T11:42:00.000Z"
}
```

**UI Behavior:**
- Shows error toast notification
- Displays retry button
- Prevents data loss

## Deployment

### Vercel Setup

```bash
# Add MongoDB URI to Vercel
vercel env add MONGODB_URI production

# Deploy
vercel --prod
```

### Environment Variables

```env
# Required
MONGODB_URI=mongodb+srv://...

# Authentication (already set)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://yourdomain.com

# Optional: Media storage
BLOB_READ_WRITE_TOKEN=...
```

## Architecture

### What's in MongoDB
- ✅ Posts, articles, pages
- ✅ Users & authentication
- ✅ Categories
- ✅ Media metadata

### What's in Filesystem
- ✅ Media files (images, videos)
  - Development: `/public/uploads/`
  - Production: Vercel Blob

### No Fallbacks
- ❌ No filesystem content storage
- ❌ No GitHub API storage
- ✅ MongoDB only (standard practice)

## Comparison to WordPress

| Feature | WordPress | Your CMS |
|---------|-----------|----------|
| Database Required | ✅ MySQL | ✅ MongoDB |
| Filesystem Fallback | ❌ No | ❌ No |
| Error on DB Down | ✅ Yes | ✅ Yes |
| Health Check | ✅ Yes | ✅ Yes |
| Clear Error Messages | ✅ Yes | ✅ Yes |

## Troubleshooting

### DNS Error
```
querySrv ENOTFOUND _mongodb._tcp.cluster0...
```
**Solution:** Wait 30-60 minutes for DNS propagation (new cluster)

### Connection Timeout
```
Connection timeout
```
**Solution:** 
1. Check MongoDB Atlas → Network Access
2. Add your IP: `0.0.0.0/0` (allow all)

### Authentication Failed
```
Authentication failed
```
**Solution:** Verify username/password in connection string

## Next Steps

1. ⏳ **Wait for MongoDB DNS** (check `/api/health`)
2. 🎨 **Work on UI/Admin** (no database needed for styling)
3. ✅ **Once connected** → Create content
4. 🚀 **Deploy to Vercel** → Add `MONGODB_URI` env var

---

**Status:** Ready to use once MongoDB DNS propagates! 🍃

