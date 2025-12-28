# MongoDB Setup Guide

## Option 1: Local MongoDB Installation

### Windows
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Install MongoDB following the installer
3. MongoDB usually runs as a Windows service automatically
4. If not running, start it from Services or run: `mongod.exe`

### macOS
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Linux (Ubuntu/Debian)
```bash
# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### Verify MongoDB is Running
```bash
# Check if MongoDB is running
mongosh  # or mongo (older versions)

# Or check the service status
# Windows: Check Services
# macOS/Linux: sudo systemctl status mongodb
```

## Option 2: MongoDB Atlas (Cloud - Recommended for Development)

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for a free account
3. Create a new cluster (free tier available)
4. Create a database user
5. Whitelist your IP address (or use 0.0.0.0/0 for development)
6. Get your connection string
7. Update your `.env` file:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/medinew?retryWrites=true&w=majority
```

Replace:
- `username` with your database username
- `password` with your database password
- `cluster0.xxxxx` with your cluster address

## Option 3: Docker (Quick Setup)

```bash
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Your connection string remains:
MONGODB_URI=mongodb://localhost:27017/medinew
```

## Troubleshooting Connection Issues

### Error: ECONNREFUSED
- **Cause**: MongoDB is not running
- **Solution**: Start MongoDB service or use MongoDB Atlas

### Error: Authentication failed
- **Cause**: Wrong username/password in connection string
- **Solution**: Verify credentials in your `.env` file

### Error: IP not whitelisted (MongoDB Atlas)
- **Cause**: Your IP address is not in the whitelist
- **Solution**: Add your IP to MongoDB Atlas Network Access

### Check if MongoDB is running
```bash
# Windows PowerShell
Get-Service MongoDB

# macOS/Linux
sudo systemctl status mongodb
# or
ps aux | grep mongod
```

## Quick Test

After setting up MongoDB, test the connection:

```bash
# Using mongosh (MongoDB Shell)
mongosh
# or for older versions
mongo

# Should connect and show MongoDB version
```

## For This Project

Once MongoDB is running, your server should connect automatically. The default connection string in the code is:

```
mongodb://localhost:27017/medinew
```

If using MongoDB Atlas, update your `server/.env` file with your cloud connection string.

