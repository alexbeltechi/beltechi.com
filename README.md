# Beltechi CMS

A modern, git-based CMS built with Next.js 15. Similar to Decap CMS but purpose-built for the Vercel ecosystem.

## Features

- **Git-based content storage** - Content is stored as JSON in your repository via GitHub API
- **Vercel Blob media storage** - Images and videos stored on Vercel's CDN
- **Image optimization** - Automatic variant generation (thumb, medium, large, display, original)
- **Admin dashboard** - Full content management at `/admin`
- **Dual-mode storage** - Local filesystem for development, cloud storage for production

## Architecture

| Data Type | Development | Production |
|-----------|-------------|------------|
| Media files | Local (`public/uploads/`) | Vercel Blob |
| Content JSON | Local (`content/`) | GitHub API |
| Media index | Local filesystem | GitHub API |

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit [http://localhost:3000/admin](http://localhost:3000/admin) to access the CMS.

### Deploy to Vercel

1. **Push to GitHub** (if not already):
   ```bash
   git remote add origin https://github.com/alexbeltechi/beltechi.com.git
   git push -u origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository

3. **Create Blob Store**:
   - In Vercel dashboard → Storage → Create → Blob
   - Copy the `BLOB_READ_WRITE_TOKEN`

4. **Create GitHub Token**:
   - Go to [GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
   - Create token with `Contents` (read/write) permission for this repo

5. **Add Environment Variables** in Vercel:
   ```
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
   GITHUB_TOKEN=github_pat_xxxxx
   GITHUB_REPO=alexbeltechi/beltechi.com
   GITHUB_BRANCH=main
   ```

6. **Redeploy** and visit `yoursite.vercel.app/admin`

## Environment Variables

See [`.env.example`](.env.example) for all available configuration options.

| Variable | Required | Description |
|----------|----------|-------------|
| `BLOB_READ_WRITE_TOKEN` | Production | Vercel Blob storage token |
| `GITHUB_TOKEN` | Production | GitHub Personal Access Token |
| `GITHUB_REPO` | Production | Repository in format `owner/repo` |
| `GITHUB_BRANCH` | No | Branch to commit to (default: `main`) |

## Content Workflow

### Creating Content (Production)
1. Go to `yoursite.com/admin`
2. Upload images → stored in Vercel Blob
3. Create posts/articles → committed to GitHub

### Syncing to Local
```bash
git pull origin main
```
Content created on production automatically appears in your local `content/` folder.

### Development → Production
```bash
git add .
git commit -m "Your changes"
git push
```
Vercel auto-deploys. Your production content persists.

## Project Structure

```
├── content/              # Content JSON files (git-tracked)
│   ├── posts/           # Blog posts
│   ├── articles/        # Long-form articles
│   └── media/           # Media index
├── public/uploads/      # Local dev media (gitignored)
├── src/
│   ├── app/
│   │   ├── (site)/      # Public website routes
│   │   ├── admin/       # Admin dashboard
│   │   └── api/         # API routes
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   ├── admin/       # Admin-specific components
│   │   └── site/        # Public site components
│   └── lib/
│       └── cms/         # CMS core (storage, media, entries)
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Media Storage**: Vercel Blob
- **Content Storage**: GitHub API
- **Image Processing**: Sharp

## License

MIT
