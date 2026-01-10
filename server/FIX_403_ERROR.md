# Fixing 403 Error When Downloading/Viewing Images

## Issue
When trying to download or view images, you're getting a **403 Forbidden** error. This happens because:
- Files are uploaded to Supabase bucket
- But the bucket might be **private** in Supabase settings
- Even with ACL 'public-read', if bucket is private, public URLs return 403

## Solution Options

### Option 1: Make Bucket Public (Recommended for Profile Images)

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select your project
   - Go to **Storage** → **Buckets**
   - Click on `medinew-document-bucket`

2. **Make Bucket Public**
   - Click **Settings** or the gear icon
   - Find **"Public bucket"** toggle
   - **Enable it** (toggle ON)
   - Save changes

3. **Result**
   - Public URLs will work: `https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[key]`
   - Images will be accessible directly without signed URLs

### Option 2: Use Signed URLs (Already Implemented)

The system now:
- ✅ Generates signed URLs automatically when files are uploaded
- ✅ Returns signed URLs in upload response (`signedUrl` field)
- ✅ Provides `/api/files/:id/signed-url` endpoint for getting signed URLs
- ✅ `getMe` endpoint generates signed URLs for profile images

**To use signed URLs:**

**Frontend:**
```typescript
// When uploading, use signedUrl if available
const imageUrl = uploadResponse.data.file.signedUrl || uploadResponse.data.file.fileUrl;

// Or get signed URL later
const response = await api.get(`/api/files/${fileId}/signed-url?expiresIn=3600`);
const signedUrl = response.data.signedUrl; // Use this URL to access the file
```

**Backend:**
- Files uploaded with `isPublic: 'true'` will get signed URLs generated automatically
- Profile images returned from `getMe` endpoint include signed URLs if bucket is private
- Download endpoint handles 403 errors and suggests using signed URL endpoint

## Current Implementation

### Profile Image Upload
- Files uploaded with `isPublic: 'true'` 
- ACL set to 'public-read' (works if bucket is public)
- Signed URL generated and returned in response
- Frontend uses `signedUrl` if available, otherwise `fileUrl`

### Profile Image Removal
- When profile image is removed (set to empty):
  1. ✅ Old file is found in database (by URL or relatedEntity)
  2. ✅ File is deleted from Supabase bucket
  3. ✅ File record is soft-deleted in database
  4. ✅ Profile image field is cleared in user model

### Download
- If download fails with 403, error message suggests using signed URL endpoint
- Signed URL endpoint: `GET /api/files/:id/signed-url?expiresIn=3600`
- Download endpoint works if bucket is public or file is accessible

## Quick Fix for 403 Error

**Make the bucket public in Supabase:**
1. Supabase Dashboard → Storage → Buckets → `medinew-document-bucket`
2. Enable "Public bucket" toggle
3. Save
4. Restart server
5. Try uploading/viewing images again

This is the **simplest solution** and recommended for profile images that need to be publicly accessible.

## Alternative: Keep Bucket Private

If you want to keep the bucket private:
- ✅ System already generates signed URLs automatically
- ✅ Frontend already uses signed URLs when available
- ✅ `getMe` endpoint generates signed URLs for profile images
- ✅ Files are accessible via signed URLs

The 403 error should not occur if:
- Bucket is public, OR
- Signed URLs are used (already implemented)
