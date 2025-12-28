# File Storage System - Setup Guide

## Prerequisites

### Required Dependencies

Install the following packages based on your storage provider:

```bash
# For AWS S3
npm install @aws-sdk/client-s3

# For Google Cloud Storage
npm install @google-cloud/storage

# For Azure Blob Storage
npm install @azure/storage-blob @azure/identity

# For file upload handling (required)
npm install multer

# For virus scanning (optional)
npm install clamscan  # For ClamAV
# OR use cloud-based services (Cloudmersive, VirusTotal) - no package needed
```

## Configuration

### 1. Database Configuration

The system uses MongoDB to store file storage configuration. A default configuration will be created automatically on first use.

### 2. Storage Provider Setup

#### Local Storage (Default)
No additional setup required. Files will be stored in `./uploads` directory.

#### AWS S3 Setup
1. Create an S3 bucket in AWS Console
2. Create IAM user with S3 access
3. Get Access Key ID and Secret Access Key
4. Configure via Admin API:

```javascript
PUT /api/admin/file-storage/config
{
  "provider": "aws-s3",
  "awsS3": {
    "bucketName": "your-bucket-name",
    "region": "us-east-1",
    "accessKeyId": "your-access-key",
    "secretAccessKey": "your-secret-key"
  }
}
```

#### Google Cloud Storage Setup
1. Create a GCS bucket
2. Create service account with Storage Admin role
3. Download service account key JSON file
4. Configure via Admin API:

```javascript
PUT /api/admin/file-storage/config
{
  "provider": "google-cloud",
  "googleCloud": {
    "bucketName": "your-bucket-name",
    "projectId": "your-project-id",
    "keyFilename": "/path/to/service-account-key.json"
  }
}
```

#### Azure Blob Storage Setup
1. Create Azure Storage Account
2. Create container in blob storage
3. Get account name and account key
4. Configure via Admin API:

```javascript
PUT /api/admin/file-storage/config
{
  "provider": "azure-blob",
  "azureBlob": {
    "accountName": "your-account-name",
    "accountKey": "your-account-key",
    "containerName": "your-container-name"
  }
}
```

### 3. Virus Scanning Setup

#### ClamAV (Local/Remote Server)
1. Install ClamAV on server
2. Start ClamAV daemon (clamd)
3. Configure via Admin API:

```javascript
PUT /api/admin/file-storage/config
{
  "virusScanning": {
    "enabled": true,
    "provider": "clamav",
    "endpoint": "localhost" // or remote server IP
  }
}
```

#### Cloudmersive API
1. Sign up at https://cloudmersive.com
2. Get API key
3. Configure via Admin API:

```javascript
PUT /api/admin/file-storage/config
{
  "virusScanning": {
    "enabled": true,
    "provider": "cloudmersive",
    "apiKey": "your-api-key"
  }
}
```

#### VirusTotal API
1. Sign up at https://www.virustotal.com
2. Get API key
3. Configure via Admin API:

```javascript
PUT /api/admin/file-storage/config
{
  "virusScanning": {
    "enabled": true,
    "provider": "virustotal",
    "apiKey": "your-api-key"
  }
}
```

## File Size Limits Configuration

Configure file size limits via Admin API:

```javascript
PUT /api/admin/file-storage/config
{
  "maxFileSizes": {
    "images": 10485760,    // 10MB in bytes
    "documents": 20971520, // 20MB in bytes
    "videos": 52428800     // 50MB in bytes
  }
}
```

## Allowed Formats Configuration

Configure allowed file formats:

```javascript
PUT /api/admin/file-storage/config
{
  "allowedFormats": {
    "images": [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp"
    ],
    "documents": [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ],
    "videos": [
      "video/mp4",
      "video/mpeg",
      "video/quicktime"
    ]
  }
}
```

## Usage Examples

### Upload Single File

```javascript
POST /api/files/upload
Content-Type: multipart/form-data

Form Data:
- file: [file]
- relatedEntityType: "medical-record" (optional)
- relatedEntityId: "entity-id" (optional)
- isPublic: "false" (optional)
- metadata: JSON string (optional)

Response:
{
  "message": "File uploaded successfully",
  "file": {
    "id": "file-id",
    "originalName": "document.pdf",
    "fileName": "generated-filename.pdf",
    "fileUrl": "https://storage.../file.pdf",
    "fileType": "document",
    "size": 1024000,
    "mimeType": "application/pdf",
    "virusScanStatus": "pending"
  }
}
```

### Upload Multiple Files

```javascript
POST /api/files/upload-multiple
Content-Type: multipart/form-data

Form Data:
- files: [file1, file2, file3]
- relatedEntityType: "medical-record" (optional)
- relatedEntityId: "entity-id" (optional)
```

### Download File

```javascript
GET /api/files/:id/download

Response: File stream with appropriate headers
```

### Get File Info

```javascript
GET /api/files/:id

Response:
{
  "id": "file-id",
  "originalName": "document.pdf",
  "fileName": "generated-filename.pdf",
  "fileUrl": "https://storage.../file.pdf",
  "fileType": "document",
  "size": 1024000,
  "mimeType": "application/pdf",
  "virusScanStatus": "clean",
  "virusScanResult": {
    "scanned": true,
    "scannedAt": "2024-01-15T10:30:00Z",
    "threats": []
  }
}
```

### Delete File

```javascript
DELETE /api/files/:id

Response:
{
  "message": "File deleted successfully",
  "file": {
    "id": "file-id",
    "originalName": "document.pdf"
  }
}
```

## Integration with Medical Records

### Step 1: Upload File
```javascript
POST /api/files/upload
// Get fileId from response
```

### Step 2: Create Medical Record
```javascript
POST /api/patient/medical-records
{
  "documentType": "prescription",
  "fileId": "file-id-from-step-1",
  "description": "Prescription from Dr. Smith"
}
```

## Testing Storage Connection

```javascript
POST /api/admin/file-storage/test

Response:
{
  "message": "Storage connection test successful",
  "provider": "aws-s3"
}
```

## Security Best Practices

1. **Never expose storage credentials** - Store in environment variables or secure vault
2. **Use IAM roles** - For AWS, use IAM roles instead of access keys when possible
3. **Enable encryption** - Configure encryption at rest for cloud storage
4. **Enable virus scanning** - Always enable virus scanning in production
5. **Set appropriate file size limits** - Prevent abuse
6. **Use CDN** - For better performance and security
7. **Regular backups** - Backup file metadata and storage

## Troubleshooting

### File Upload Fails
- Check file size limits
- Verify file format is allowed
- Check storage provider credentials
- Verify storage bucket/container exists

### Virus Scan Fails
- Verify ClamAV is running (if using ClamAV)
- Check API key (if using cloud service)
- Check network connectivity

### Download Fails
- Verify file exists
- Check user permissions
- Verify virus scan status (infected files cannot be downloaded)

## Environment Variables

Optional environment variables for sensitive data:

```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
GCS_PROJECT_ID=your-project-id
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
CLOUDMERSIVE_API_KEY=your-api-key
VIRUSTOTAL_API_KEY=your-api-key
```

