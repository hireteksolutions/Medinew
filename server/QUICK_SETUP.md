# Quick Setup Guide - Get Your Secret Access Key

## You Have:
✅ Endpoint: `https://qmhaxxxhhxooxtyizmqc.storage.supabase.co/storage/v1/s3`
✅ Access Key ID: `a19d2f12373e75e60d5c2b36e9bdef17`
✅ Bucket Name: `medinew-document-bucket`

## You Need:
❌ **Secret Access Key** - This is what's missing!

## How to Get Secret Access Key

### On the Same Supabase Dashboard Page:

1. **Look for the "Secret Access Key" field** on the S3 Access Keys section
2. **It might be hidden** (showing as `********` or asterisks)
3. **Look for one of these options:**
   - A **"Reveal"** or **"Show"** button
   - A **"Copy"** or **"View"** button
   - An **eye icon** 👁️ to reveal the key
   - A **regenerate button** (if you can't see it, you might need to regenerate)

4. **If you can't see it:**
   - Look for **"Actions"** or **"..."** menu next to the access key
   - Click it and select **"View Secret"** or **"Reveal Secret"**
   - OR click **"Regenerate"** to create a new secret (⚠️ You'll need to update both keys if you regenerate)

## Once You Have the Secret Access Key:

### Step 1: Add to .env file

Create or update `server/.env.development`:

```env
SUPABASE_ACCESS_KEY_ID=a19d2f12373e75e60d5c2b36e9bdef17
SUPABASE_SECRET_ACCESS_KEY=paste_your_secret_key_here
SUPABASE_STORAGE_ENDPOINT=https://qmhaxxxhhxooxtyizmqc.storage.supabase.co/storage/v1/s3
SUPABASE_BUCKET_NAME=medinew-document-bucket
SUPABASE_REGION=ap-northeast-1
```

### Step 2: Run Configuration Script

```bash
cd server
npm run configure:supabase
```

### Step 3: Restart Server

```bash
npm run dev
```

## If You Can't Find the Secret Key:

1. **Check if you need to enable S3 API first**
   - Go to Storage → Settings
   - Enable "S3 protocol connection" if not already enabled

2. **Regenerate the Access Key**
   - In the S3 Access Keys section
   - Click "Regenerate" or "Create New Key"
   - Copy BOTH the Key ID and Secret Access Key immediately
   - ⚠️ The secret will only be shown once!

3. **Check Supabase Documentation**
   - Visit: https://supabase.com/docs/guides/storage/s3-api
   - Look for instructions specific to your Supabase plan

## Quick Test

After setting up, try uploading a profile image. It should:
- ✅ Upload to Supabase bucket `medinew-document-bucket`
- ✅ NOT save to `server/uploads` folder
- ✅ Return a file path that points to the bucket
