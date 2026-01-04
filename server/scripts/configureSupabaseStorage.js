/**
 * Script to configure Supabase Storage for file uploads
 * 
 * Usage: node scripts/configureSupabaseStorage.js
 * 
 * This script will configure the file storage to use Supabase S3-compatible storage.
 * Make sure to set the following environment variables or update the values below:
 * - SUPABASE_ACCESS_KEY_ID
 * - SUPABASE_SECRET_ACCESS_KEY
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FileStorageConfig from '../models/FileStorageConfig.js';
import { STORAGE_PROVIDERS } from '../constants/index.js';
import connectDB from '../config/database.js';

// Load environment variables
dotenv.config();

// Supabase Configuration
const SUPABASE_CONFIG = {
  endpoint: 'https://qmhaxxxhhxooxtyizmqc.storage.supabase.co/storage/v1/s3',
  bucketName: 'medinew-document-bucket',
  region: 'ap-northeast-1',
  accessKeyId: process.env.SUPABASE_ACCESS_KEY_ID || 'a19d2f12373e75e60d5c2b36e9bdef17',
  secretAccessKey: process.env.SUPABASE_SECRET_ACCESS_KEY || '' // Set this in .env file
};

async function configureSupabaseStorage() {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Check if secret access key is provided
    if (!SUPABASE_CONFIG.secretAccessKey) {
      console.error('❌ Error: SUPABASE_SECRET_ACCESS_KEY is required!');
      console.error('   Please set it in your .env file or pass it as an environment variable.');
      process.exit(1);
    }

    // Get or create active config
    let config = await FileStorageConfig.findOne({ isActive: true });
    
    if (config) {
      console.log('📝 Updating existing file storage configuration...');
    } else {
      console.log('📝 Creating new file storage configuration...');
      config = new FileStorageConfig();
    }

    // Update configuration for Supabase
    config.provider = STORAGE_PROVIDERS.AWS_S3; // Use AWS_S3 provider for S3-compatible storage
    config.awsS3 = {
      bucketName: SUPABASE_CONFIG.bucketName,
      region: SUPABASE_CONFIG.region,
      accessKeyId: SUPABASE_CONFIG.accessKeyId,
      secretAccessKey: SUPABASE_CONFIG.secretAccessKey,
      endpoint: SUPABASE_CONFIG.endpoint
    };
    config.isActive = true;

    await config.save();
    console.log('✅ Supabase storage configuration saved successfully!');
    console.log('\n📋 Configuration Details:');
    console.log(`   Provider: ${config.provider}`);
    console.log(`   Endpoint: ${config.awsS3.endpoint}`);
    console.log(`   Bucket: ${config.awsS3.bucketName}`);
    console.log(`   Region: ${config.awsS3.region}`);
    console.log(`   Access Key ID: ${config.awsS3.accessKeyId}`);
    console.log(`   Secret Access Key: ${'*'.repeat(config.awsS3.secretAccessKey.length)}`);

    console.log('\n✅ Configuration complete!');
    console.log('   You can now use the file upload endpoints.');
    console.log('   Make sure to restart your server for changes to take effect.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error configuring Supabase storage:', error);
    process.exit(1);
  }
}

// Run the configuration
configureSupabaseStorage();

