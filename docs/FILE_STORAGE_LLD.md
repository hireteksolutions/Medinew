# File Storage System - Low Level Design (LLD)

## Overview
A configurable, multi-provider file storage system with virus scanning, file validation, and secure access control.

## Architecture

### Components

1. **FileStorageConfig Model** - Database configuration for storage providers
2. **File Model** - Metadata storage for uploaded files
3. **FileStorageService** - Core service handling multiple storage providers
4. **VirusScanService** - Virus scanning integration
5. **File Validation Middleware** - File size and format validation
6. **File Controller** - API endpoints for file operations

## Storage Providers

### Supported Providers
- **Local Storage** - File system storage (default)
- **AWS S3** - Amazon Simple Storage Service
- **Google Cloud Storage** - GCS bucket storage
- **Azure Blob Storage** - Microsoft Azure Blob Storage

### Provider Configuration

Each provider requires specific configuration stored in `FileStorageConfig`:

```javascript
{
  provider: 'aws-s3' | 'google-cloud' | 'azure-blob' | 'local',
  awsS3: {
    bucketName: string,
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
    endpoint?: string
  },
  googleCloud: {
    bucketName: string,
    projectId: string,
    keyFilename?: string,
    credentials?: object
  },
  azureBlob: {
    accountName: string,
    accountKey: string,
    containerName: string,
    connectionString?: string
  },
  local: {
    uploadPath: string,
    publicUrl: string
  }
}
```

## File Validation

### Size Limits
- **Images**: 10MB (configurable)
- **Documents**: 20MB (configurable)
- **Videos**: 50MB (configurable)

### Allowed Formats

**Images:**
- JPEG/JPG
- PNG
- GIF
- WebP

**Documents:**
- PDF
- DOC
- DOCX

**Videos:**
- MP4
- MPEG
- QuickTime

### Validation Flow
1. File received via multer middleware
2. Check file size against configured limits
3. Validate MIME type against allowed formats
4. Validate file extension
5. Proceed to upload if valid

## Virus Scanning

### Supported Providers
- **ClamAV** - Open-source antivirus (local or remote server)
- **Cloudmersive** - Cloud-based scanning API
- **VirusTotal** - Multi-engine scanning service

### Scanning Flow
1. File uploaded to storage
2. Virus scan initiated (async, non-blocking)
3. Scan result stored in File model
4. Infected files blocked from download

### Configuration
```javascript
virusScanning: {
  enabled: boolean,
  provider: 'clamav' | 'cloudmersive' | 'virustotal',
  apiKey?: string, // For cloud services
  endpoint?: string // For ClamAV server
}
```

## File Operations

### Upload
1. Validate file (size, format)
2. Generate unique filename
3. Calculate file hash (SHA-256)
4. Upload to configured storage provider
5. Save metadata to database
6. Initiate virus scan (async)

### Download
1. Verify user access permissions
2. Check virus scan status
3. Retrieve file from storage
4. Stream file to client

### Delete
1. Verify ownership
2. Delete from storage provider
3. Soft delete in database

## Security Features

### Access Control
- Files are private by default
- Access token generation for secure downloads
- User-based access verification
- Related entity tracking

### File Integrity
- SHA-256 hash calculation
- Hash stored for verification
- Unique filename generation

### Security Settings
```javascript
security: {
  generateUniqueNames: boolean,
  encryptFiles: boolean,
  requireAuthForDownload: boolean
}
```

## API Endpoints

### File Operations
- `POST /api/files/upload` - Upload single file
- `POST /api/files/upload-multiple` - Upload multiple files
- `GET /api/files` - Get user's files
- `GET /api/files/:id` - Get file info
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file

### Configuration (Admin Only)
- `GET /api/admin/file-storage/config` - Get configuration
- `PUT /api/admin/file-storage/config` - Update configuration
- `POST /api/admin/file-storage/test` - Test storage connection

## Integration Points

### Medical Records
- Files linked via `relatedEntity.type = 'medical-record'`
- Automatic association with patient records

### Profile Images
- Files linked via `relatedEntity.type = 'profile-image'`
- User profile image storage

### Appointment Documents
- Files linked via `relatedEntity.type = 'appointment-document'`
- Documents attached to appointments

## Database Schema

### FileStorageConfig
- Provider configuration
- Size limits
- Allowed formats
- Virus scanning settings
- Security settings

### File
- File metadata
- Storage information
- Virus scan results
- Access control
- Related entities

## Error Handling

### Validation Errors
- File size exceeded
- Format not allowed
- Missing required fields

### Storage Errors
- Provider connection failure
- Upload failure
- Download failure

### Security Errors
- Access denied
- Infected file detected
- Invalid file hash

## Performance Considerations

### Async Operations
- Virus scanning is non-blocking
- File uploads are synchronous
- Downloads are streamed

### Caching
- Configuration cached in service
- File metadata cached in database

### CDN Support
- Optional CDN URL configuration
- Automatic URL generation

## Deployment

### Environment Variables
- Storage provider credentials
- Virus scanning API keys
- CDN configuration

### Dependencies
- `@aws-sdk/client-s3` - AWS S3
- `@google-cloud/storage` - Google Cloud
- `@azure/storage-blob` - Azure Blob
- `multer` - File upload handling
- `clamscan` - ClamAV integration (optional)

## Future Enhancements

1. File versioning
2. Image processing/resizing
3. Document conversion
4. Thumbnail generation
5. File encryption at rest
6. Multi-region storage
7. Automatic backup
8. File compression

