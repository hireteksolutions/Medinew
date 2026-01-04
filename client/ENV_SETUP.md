# Client Environment Configuration

The client automatically uses different backend URLs based on the environment.

## How It Works

Vite automatically loads environment files based on the mode:
- **Development mode** (`npm run dev`) → loads `.env.development`
- **Production build** (`npm run build`) → loads `.env.production`

## File Structure

```
client/
├── .env.example          # Template file (can be committed)
├── .env.development      # Local development config (gitignored)
├── .env.production       # Production config (gitignored)
└── src/services/api.ts  # Uses VITE_API_URL from environment
```

## Environment Variables

### VITE_API_URL

The backend API URL. Must start with `VITE_` prefix to be accessible in the client.

**Development:**
```env
VITE_API_URL=http://localhost:5000
```

**Production:**
```env
VITE_API_URL=https://api.yourdomain.com
```

## Usage

### Local Development

1. **`.env.development`** is automatically loaded when running:
   ```bash
   npm run dev
   ```

2. The client will:
   - Use `VITE_API_URL` from `.env.development` (or default to `http://localhost:5000`)
   - Use Vite's proxy for API calls (helps with CORS in development)

### Production Build

1. **Update `.env.production`** with your production backend URL:
   ```env
   VITE_API_URL=https://api.yourdomain.com
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. The built application will:
   - Use `VITE_API_URL` from `.env.production`
   - Make direct API calls to the production backend
   - No proxy is used in production builds

## Setting Production Backend URL

### Option 1: Update `.env.production` file

Edit `client/.env.production`:
```env
VITE_API_URL=https://your-production-backend-url.com
```

### Option 2: Set during build (CI/CD)

In your CI/CD pipeline or deployment platform:

**Linux/macOS:**
```bash
VITE_API_URL=https://api.yourdomain.com npm run build
```

**Windows PowerShell:**
```powershell
$env:VITE_API_URL="https://api.yourdomain.com"; npm run build
```

**Docker:**
```dockerfile
ENV VITE_API_URL=https://api.yourdomain.com
RUN npm run build
```

**Heroku:**
```bash
heroku config:set VITE_API_URL=https://api.yourdomain.com
```

**Vercel/Netlify:**
Set `VITE_API_URL` in your environment variables in the dashboard.

## Console Output

When the client starts in development, you'll see:
```
🔗 Backend API URL: http://localhost:5000
```

This helps verify which backend URL is being used.

## Important Notes

1. **VITE_ Prefix Required**: All client-side environment variables must start with `VITE_` to be accessible in the browser.

2. **Build Time**: Environment variables are embedded at **build time**, not runtime. You must rebuild after changing `.env.production`.

3. **Proxy Only in Dev**: The Vite proxy is only active during `npm run dev`. Production builds make direct API calls.

4. **CORS**: Make sure your production backend allows requests from your frontend domain.

## Troubleshooting

### API calls failing in production

**Issue:** Client can't connect to backend

**Solutions:**
- Verify `VITE_API_URL` in `.env.production` is correct
- Check CORS settings on your backend
- Ensure backend server is running and accessible
- Rebuild the application after changing `.env.production`

### Wrong backend URL being used

**Issue:** Client connects to wrong backend

**Solutions:**
- Check which `.env` file is being loaded
- Verify `VITE_API_URL` value in the correct `.env` file
- Rebuild for production if you changed `.env.production`
- Clear browser cache

### Environment variable not working

**Issue:** `import.meta.env.VITE_API_URL` is undefined

**Solutions:**
- Ensure variable name starts with `VITE_`
- Restart dev server after changing `.env` files
- Rebuild for production after changing `.env.production`
- Check file is in `client/` directory (not `client/src/`)

## Example Production URLs

```env
# Custom domain
VITE_API_URL=https://api.medinew.com

# Subdomain
VITE_API_URL=https://backend.medinew.com

# Heroku
VITE_API_URL=https://medinew-api.herokuapp.com

# Railway
VITE_API_URL=https://medinew-api.railway.app

# Render
VITE_API_URL=https://medinew-api.onrender.com

# AWS/Cloud
VITE_API_URL=https://api.medinew.aws.com
```

## Security Notes

- ✅ `.env.development` and `.env.production` are in `.gitignore`
- ✅ `.env.example` can be committed (no secrets)
- ⚠️ Never commit actual `.env` files with real URLs
- ⚠️ Environment variables are visible in the built JavaScript (they're not secret)
- ⚠️ Don't put sensitive data in `VITE_` variables

