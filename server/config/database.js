import mongoose from 'mongoose';

/**
 * Database Configuration
 * Supports both local MongoDB and MongoDB Atlas (cloud)
 * 
 * Local MongoDB Connection String Format:
 * mongodb://localhost:27017/database_name
 * 
 * MongoDB Atlas Connection String Format:
 * mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority
 */

// Database configuration
const getDatabaseConfig = () => {
  // Use environment variable if set, otherwise use local default
  const mongoURI = process.env.MONGODB_URI;
  
  // Default local MongoDB configuration
  const localConfig = {
    host: process.env.MONGODB_HOST || 'localhost',
    port: process.env.MONGODB_PORT || '27017',
    database: process.env.MONGODB_DATABASE || 'medinew',
  };

  // Build local connection string if MONGODB_URI is not provided
  const defaultURI = mongoURI || `mongodb://${localConfig.host}:${localConfig.port}/${localConfig.database}`;

  // Mongoose connection options (Mongoose 8.0+)
  const options = {
    // Connection pool settings
    maxPoolSize: 10, // Maximum number of connections in the pool
    minPoolSize: 2,  // Minimum number of connections in the pool
    serverSelectionTimeoutMS: 5000, // How long to try selecting a server
    socketTimeoutMS: 45000, // How long to wait for a socket connection
    // Retry settings
    retryWrites: true,
    w: 'majority',
  };

  return {
    uri: defaultURI,
    options,
    isLocal: !mongoURI || mongoURI.includes('localhost') || mongoURI.includes('127.0.0.1'),
  };
};

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const config = getDatabaseConfig();
    
    // Log connection attempt
    if (config.isLocal) {
      console.log('📦 Attempting to connect to local MongoDB...');
      console.log(`   URI: ${config.uri}`);
    } else {
      console.log('☁️  Attempting to connect to MongoDB Atlas/Cloud...');
    }

    const conn = await mongoose.connect(config.uri, config.options);
    
    // Success message
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Port: ${conn.connection.port}`);
    
    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('\n❌ MongoDB connection error:', error.message);
    console.error('\n⚠️  Troubleshooting Steps:');
    
    const config = getDatabaseConfig();
    if (config.isLocal) {
      console.error('\n📋 For Local MongoDB:');
      console.error('   1. Ensure MongoDB service is running:');
      console.error('      - Windows: Check Services (services.msc) or run "net start MongoDB"');
      console.error('      - macOS/Linux: Run "brew services start mongodb-community" or "sudo systemctl start mongod"');
      console.error('   2. Verify MongoDB is listening on port 27017');
      console.error('   3. Check connection string format: mongodb://localhost:27017/medinew');
      console.error('\n💡 Quick Start:');
      console.error('   - Install MongoDB: https://www.mongodb.com/try/download/community');
      console.error('   - Start MongoDB service');
      console.error('   - Default connection: mongodb://localhost:27017/medinew');
    } else {
      console.error('\n☁️  For MongoDB Atlas:');
      console.error('   1. Check your connection string in .env file (MONGODB_URI)');
      console.error('   2. Verify your IP address is whitelisted in Atlas');
      console.error('   3. Ensure your database user credentials are correct');
      console.error('   4. Check network connectivity');
    }
    
    console.error('\n📝 Environment Variables:');
    console.error('   MONGODB_URI (optional): Full connection string');
    console.error('   MONGODB_HOST (optional): Database host (default: localhost)');
    console.error('   MONGODB_PORT (optional): Database port (default: 27017)');
    console.error('   MONGODB_DATABASE (optional): Database name (default: medinew)');
    console.error('');
    
    process.exit(1);
  }
};

export default connectDB;

