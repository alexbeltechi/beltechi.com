# MongoDB Migration Guide

## What Changed

Your CMS has been migrated from file-based storage to MongoDB Atlas. This solves the Vercel deployment limit issue (100 deployments/day) because content changes no longer trigger new deployments.

### Before (File-based)
- Content stored in `content/` directory as JSON files
- Every content change = Git commit + Vercel deployment
- Hit Vercel's 100 deployments/day limit quickly ❌

### After (MongoDB)
- Content stored in MongoDB Atlas (free tier: 512MB)
- Media files stay in `/public/uploads/` (or Vercel Blob for production)
- Content changes don't trigger deployments ✅
- Unlimited content updates per day ✅

## Setup Complete

✅ MongoDB driver installed
✅ Database connection utility created
✅ Storage layer updated to use MongoDB
✅ Migration script ready

## Next Steps

### 1. Wait for MongoDB Cluster

Your MongoDB Atlas cluster is being provisioned. This can take 5-10 minutes.

To check if it's ready:

```bash
npm run migrate
```

If you see "Connected to MongoDB" - you're ready!

### 2. Run Migration

Once the cluster is ready, migrate your existing content:

```bash
npm run migrate
```

This will copy all content from `content/` files to MongoDB:
- ✅ Posts
- ✅ Articles  
- ✅ Media metadata
- ✅ Categories

### 3. Test Everything

1. Start dev server: `npm run dev`
2. Log into admin: http://localhost:3000/admin
3. Create/edit/delete content
4. Check homepage to see posts

### 4. Deploy to Vercel

```bash
# Add MongoDB URI to Vercel
vercel env add MONGODB_URI

# Paste your connection string:
mongodb+srv://alexbeltechi_db_user:jHEQzSLiCy8nuiqb@cluster0.r9ywqGd.mongodb.net/beltechi-cms?retryWrites=true&w=majority&appName=Cluster0

# Deploy
vercel --prod
```

## How It Works

### Storage Abstraction Layer

The CMS uses a storage abstraction layer that automatically picks the right storage:

```typescript
// src/lib/cms/storage.ts
export function getStorage(): Storage {
  if (MONGODB_URI exists)     → MongoDB ✅
  else if (GITHUB_TOKEN exists) → GitHub API
  else                          → Filesystem (dev)
}
```

### MongoDB Collections

- **entries** - Posts, articles, pages
- **media** - Media file metadata  
- **categories** - Content categories
- **users** - Admin users

### File Structure

```
src/
├── lib/
│   ├── db/
│   │   ├── mongodb.ts          # Connection singleton
│   │   ├── entries.ts          # Entry CRUD operations
│   │   ├── media.ts            # Media metadata operations
│   │   └── categories.ts       # Category operations
│   └── cms/
│       ├── storage.ts          # Storage abstraction (updated)
│       ├── mongodb-storage.ts  # MongoDB adapter
│       └── ...
└── ...

scripts/
└── migrate-to-mongodb.ts       # One-time migration script
```

## Troubleshooting

### DNS Error (querySrv ENOTFOUND)

**Cause**: MongoDB cluster is still being provisioned

**Solution**: Wait 5-10 minutes, then try again

### Connection Timeout

**Cause**: Network firewall blocking MongoDB

**Solution**: 
1. Check MongoDB Atlas → Network Access
2. Add your IP address or allow `0.0.0.0/0` (all IPs)

### Migration Failed

**Cause**: Content files don't exist or are corrupted

**Solution**:
```bash
# Check if content exists
ls -la content/entries/
ls -la content/media/

# If empty, migration is not needed
```

## Benefits

1. **No More Deployment Limits** - Content changes don't deploy
2. **Faster Content Updates** - Direct database writes
3. **Better Performance** - Indexed queries
4. **Scalability** - MongoDB handles growth
5. **Free Tier** - 512MB free forever

## Future Enhancements

- [ ] Move media files to Vercel Blob (production)
- [ ] Add database indexes for faster queries
- [ ] Implement content versioning
- [ ] Add content search with MongoDB text search
- [ ] Set up automated backups

## Questions?

- MongoDB connection string in `.env.local`
- All code changes are committed to Git
- No content lost - files stay in `content/` as backup
- Can switch back to filesystem by removing `MONGODB_URI`

