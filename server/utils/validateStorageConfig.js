/**
 * Validate and fix storage configuration on server startup
 * Ensures no LOCAL storage config is active
 */

import FileStorageConfig from '../models/FileStorageConfig.js';
import { STORAGE_PROVIDERS } from '../constants/index.js';

export async function validateAndFixStorageConfig() {
  try {
    console.log('🔍 Validating file storage configuration...');
    
    // Find active config
    const activeConfig = await FileStorageConfig.findOne({ isActive: true });
    
    if (!activeConfig) {
      console.warn('⚠️  No active file storage configuration found.');
      console.warn('   System will attempt to create bucket config on first file upload.');
      return;
    }
    
    // CRITICAL: If active config is LOCAL, disable it immediately
    if (activeConfig.provider === STORAGE_PROVIDERS.LOCAL || activeConfig.provider === 'local') {
      console.error('❌ CRITICAL: Found active LOCAL storage config! Disabling immediately...');
      
      // Check for existing bucket config
      const bucketConfig = await FileStorageConfig.findOne({
        provider: { $in: [STORAGE_PROVIDERS.AWS_S3, STORAGE_PROVIDERS.GOOGLE_CLOUD, STORAGE_PROVIDERS.AZURE_BLOB] }
      }).sort({ updatedAt: -1 });
      
      if (bucketConfig && bucketConfig.provider === STORAGE_PROVIDERS.AWS_S3 && 
          bucketConfig.awsS3 && bucketConfig.awsS3.bucketName && 
          bucketConfig.awsS3.accessKeyId && bucketConfig.awsS3.secretAccessKey) {
        console.log('📋 Found existing bucket config. Reactivating it...');
        // Disable LOCAL config
        activeConfig.isActive = false;
        await activeConfig.save();
        // Activate bucket config
        bucketConfig.isActive = true;
        await bucketConfig.save();
        console.log('✅ Disabled LOCAL config and activated bucket config');
      } else {
        // Disable LOCAL config
        activeConfig.isActive = false;
        await activeConfig.save();
        console.error('❌ LOCAL config disabled. Please configure bucket storage:');
        console.error('   Run: npm run configure:supabase (after setting SUPABASE_SECRET_ACCESS_KEY)');
        console.error('   OR set environment variables: SUPABASE_ACCESS_KEY_ID, SUPABASE_SECRET_ACCESS_KEY');
        throw new Error('LOCAL storage config was disabled. Please configure bucket storage before uploading files.');
      }
    } else {
      console.log(`✅ Active storage config uses bucket storage: ${activeConfig.provider}`);
      
      // Verify bucket config is complete
      if (activeConfig.provider === STORAGE_PROVIDERS.AWS_S3) {
        if (!activeConfig.awsS3 || !activeConfig.awsS3.bucketName || !activeConfig.awsS3.accessKeyId || !activeConfig.awsS3.secretAccessKey) {
          console.error('❌ ERROR: Bucket config is incomplete!');
          activeConfig.isActive = false;
          await activeConfig.save();
          throw new Error('Bucket storage configuration is incomplete. Please run: npm run configure:supabase');
        }
        console.log(`   Bucket: ${activeConfig.awsS3.bucketName}`);
        console.log(`   Endpoint: ${activeConfig.awsS3.endpoint || 'Default AWS S3'}`);
      }
    }
    
    console.log('✅ Storage configuration validation complete');
  } catch (error) {
    console.error('❌ Storage configuration validation failed:', error.message);
    throw error;
  }
}
