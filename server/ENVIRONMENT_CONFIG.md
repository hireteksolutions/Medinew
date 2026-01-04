# Environment Configuration Guide

The server automatically detects and loads the correct environment file based on available files or `NODE_ENV` setting.

## How It Works

The server uses **automatic environment detection** with the following logic:

1. **If `NODE_ENV` is set**: Uses `.env.{NODE_ENV}` (e.g., `.env.production` or `.env.development`)
2. **If `NODE_ENV` is NOT set**: Auto-detects by checking which files exist:
   - If `.env.production` exists → uses production
   - Else if `.env.development` exists → uses development
   - Else → defaults to development

## File Structure

```
server/
├── .env.example          # Template file (can be committed)
├── .env.development      # Local development config (gitignored)
├── .env.production       # Production config (gitignored)
└── server.js             # Auto-detects and loads the right file
```

## Usage

### Local Development

1. **Create `.env.development`** (already created):
   ```bash
   # Uses local MongoDB
   MONGODB_URI=mongodb://localhost:27017/medinew
   NODE_ENV=development
   ```

2. **Run the server**:
   ```bash
   npm run dev
   # or
   npm start
   ```

   The server will automatically:
   - Detect `.env.development` exists
   - Load `.env.development`
   - Set `NODE_ENV=development`

### Production Deployment

1. **Create `.env.production`** on your production server (already created):
   ```bash
   # Uses MongoDB Atlas
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medinew
   NODE_ENV=production
   ```

2. **Set NODE_ENV** (optional, but recommended):
   ```bash
   # On Linux/macOS
   export NODE_ENV=production
   
   # On Windows
   $env:NODE_ENV="production"
   
   # Or in your deployment platform (Heroku, AWS, etc.)
   # Set NODE_ENV=production in environment variables
   ```

3. **Run the server**:
   ```bash
   npm start
   ```

   The server will:
   - Check if `NODE_ENV` is set → use `.env.production`
   - Or detect `.env.production` exists → use it
   - Load `.env.production`
   - Set `NODE_ENV=production`

## Manual Override

You can manually set `NODE_ENV` to force a specific environment:

```bash
# Windows PowerShell
$env:NODE_ENV="production"; npm start
$env:NODE_ENV="development"; npm run dev

# Linux/macOS
NODE_ENV=production npm start
NODE_ENV=development npm run dev
```

## Priority Order

1. **Explicit `NODE_ENV` environment variable** (highest priority)
2. **File existence check** (if `NODE_ENV` not set)
   - `.env.production` → production
   - `.env.development` → development
3. **Default fallback** → development

## Fallback Behavior

- If `.env.development` doesn't exist, falls back to `.env` (for backward compatibility)
- If `.env.production` doesn't exist in production, server will exit with error (prevents accidental misconfiguration)

## Console Output

When the server starts, you'll see:

```
🔍 Auto-detected: development environment (found .env.development)
✅ Loaded environment from: .env.development
📋 Running in: development mode
```

Or for production:

```
✅ Loaded environment from: .env.production
📋 Running in: production mode
```

## Troubleshooting

### Server can't find environment file

**Error:** `❌ Error loading .env.production`

**Solution:**
- Make sure `.env.production` exists in the `server/` directory
- Check file permissions
- Verify you're running from the correct directory

### Wrong environment loaded

**Issue:** Server loads development config in production

**Solution:**
- Set `NODE_ENV=production` explicitly in your deployment environment
- Or ensure only `.env.production` exists on production server
- Remove `.env.development` from production server

### Both files exist, which one is used?

**Answer:** 
- If `NODE_ENV` is set, that takes priority
- If `NODE_ENV` is not set, `.env.production` takes priority over `.env.development`

## Best Practices

1. **Local Development:**
   - Keep `.env.development` in your local machine
   - Never commit it to git

2. **Production:**
   - Create `.env.production` directly on production server
   - Set `NODE_ENV=production` in your deployment platform
   - Never commit production secrets to git

3. **CI/CD:**
   - Set `NODE_ENV` in your CI/CD pipeline
   - Use environment variables from your deployment platform
   - Don't store `.env` files in your repository

## Security Notes

- ✅ `.env.development` and `.env.production` are in `.gitignore`
- ✅ `.env.example` can be committed (no secrets)
- ⚠️ Never commit actual `.env` files with real credentials
- ⚠️ Rotate secrets regularly in production
- ⚠️ Use different secrets for development and production

