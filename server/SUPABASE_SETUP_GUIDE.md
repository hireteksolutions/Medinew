# Supabase Storage S3 Credentials Setup Guide

## Where to Get Supabase Credentials

### Prerequisites
1. You need a Supabase account: https://supabase.com
2. You need a Supabase project (or create one at https://app.supabase.com)

### Required Credentials

You need these environment variables:

1. **SUPABASE_ACCESS_KEY_ID** - Already configured in the script (`a19d2f12373e75e60d5c2b36e9bdef17`)
2. **SUPABASE_SECRET_ACCESS_KEY** - ⚠️ **YOU NEED TO GET THIS** (see steps below)
3. **SUPABASE_STORAGE_ENDPOINT** - Already configured (`https://qmhaxxxhhxooxtyizmqc.storage.supabase.co/storage/v1/s3`)
4. **SUPABASE_BUCKET_NAME** - Already configured (`medinew-document-bucket`)
5. **SUPABASE_REGION** - Already configured (`ap-northeast-1`)

## How to Get SUPABASE_SECRET_ACCESS_KEY

### Option 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Log in to your account
   - Select your project (or create a new one)

2. **Navigate to Storage Settings**
   - In the left sidebar, click on **"Storage"**
   - Click on **"Settings"** or the gear icon

3. **Find S3 Credentials**
   - Look for **"S3 API Settings"** or **"S3 Compatible API"** section
   - You'll find:
     - **Access Key ID** (already in your script)
     - **Secret Access Key** ← **THIS IS WHAT YOU NEED**

4. **Copy the Secret Access Key**
   - Click the "Reveal" or "Show" button to view the secret key
   - Copy it (you won't be able to see it again!)

### Option 2: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Get storage credentials
supabase storage keys
```

### Option 3: API (If S3 API is enabled)

If your Supabase project has S3-compatible API enabled, you can get credentials from:

```
Project Settings → API → Storage API → S3 Credentials
```

## Setting Up Environment Variables

### Step 1: Create/Update `.env` file

In your `server` directory, create or update `.env.development` (or `.env.production`):

```env
# Supabase Storage S3 Credentials
SUPABASE_ACCESS_KEY_ID=a19d2f12373e75e60d5c2b36e9bdef17
SUPABASE_SECRET_ACCESS_KEY=your_secret_access_key_here
SUPABASE_STORAGE_ENDPOINT=https://qmhaxxxhhxooxtyizmqc.storage.supabase.co/storage/v1/s3
SUPABASE_BUCKET_NAME=medinew-document-bucket
SUPABASE_REGION=ap-northeast-1
```

**⚠️ Important:** Replace `your_secret_access_key_here` with your actual secret key from Supabase dashboard.

### Step 2: Verify Bucket Exists

1. In Supabase Dashboard → **Storage**
2. Check if bucket `medinew-document-bucket` exists
3. If it doesn't exist, create it:
   - Click **"New bucket"**
   - Name: `medinew-document-bucket`
   - Make it **Public** or **Private** (based on your needs)
   - Click **"Create bucket"**

### Step 3: Configure Storage

Run the configuration script:

```bash
cd server
npm run configure:supabase
```

This will:
- ✅ Connect to your database
- ✅ Configure file storage to use Supabase bucket
- ✅ Save the configuration in your database

### Step 4: Restart Server

```bash
npm run dev
# or
npm start
```

## Troubleshooting

### "No bucket storage credentials found"
- Make sure `SUPABASE_SECRET_ACCESS_KEY` is set in your `.env` file
- Check that the `.env` file is in the `server` directory
- Verify the file is named correctly (`.env.development` or `.env.production`)

### "Bucket not found"
- Go to Supabase Dashboard → Storage
- Create the bucket `medinew-document-bucket` if it doesn't exist
- Make sure the bucket name matches exactly (case-sensitive)

### "Invalid credentials"
- Double-check your `SUPABASE_SECRET_ACCESS_KEY` is correct
- Make sure there are no extra spaces or quotes in the `.env` file
- Regenerate the secret key in Supabase if needed

### "S3 API not enabled"
- Supabase Storage S3-compatible API might not be enabled in your project
- Check Supabase documentation for enabling S3 API
- Contact Supabase support if needed

## Alternative: Use Supabase Storage Client (If S3 API Not Available)

If S3-compatible API is not available, you can use Supabase Storage JavaScript client instead. However, this would require code changes.

## Quick Reference

**Required:**
- ✅ `SUPABASE_SECRET_ACCESS_KEY` - Get from Supabase Dashboard → Storage → Settings → S3 API

**Already Configured:**
- ✅ `SUPABASE_ACCESS_KEY_ID` = `a19d2f12373e75e60d5c2b36e9bdef17`
- ✅ `SUPABASE_STORAGE_ENDPOINT` = `https://qmhaxxxhhxooxtyizmqc.storage.supabase.co/storage/v1/s3`
- ✅ `SUPABASE_BUCKET_NAME` = `medinew-document-bucket`
- ✅ `SUPABASE_REGION` = `ap-northeast-1`

## Need Help?

1. Check Supabase Documentation: https://supabase.com/docs/guides/storage
2. Supabase Storage S3 API: https://supabase.com/docs/guides/storage/s3-api
3. Supabase Community: https://github.com/supabase/supabase/discussions
