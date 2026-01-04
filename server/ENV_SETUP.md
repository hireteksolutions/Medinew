# Environment Variables Setup Guide

This guide will help you set up environment variables for both local development and production environments.

## Quick Start

1. **Copy the example file:**
   ```bash
   cd server
   cp .env.example .env
   ```

2. **Edit `.env` file** with your actual values

3. **Restart your server** for changes to take effect

---

## Local Development Setup

### Step 1: Create `.env` file

Copy the example file:
```bash
cd server
cp .env.example .env
```

### Step 2: Configure for Local Development

Edit `server/.env` with the following values:

```env
# Database - Use Local MongoDB
MONGODB_URI=mongodb://localhost:27017/medinew

# Server Configuration
PORT=5000
NODE_ENV=development

# Client URL
CLIENT_URL=http://localhost:3000

# JWT Secrets (Generate new ones for local development)
JWT_SECRET=local_dev_jwt_secret_key_min_32_characters_long
JWT_EXPIRE=7d
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_SECRET=local_dev_refresh_secret_min_32_characters_long
JWT_REFRESH_EXPIRE=30d
```

### Step 3: Generate Secure Secrets (Optional but Recommended)

Generate secure random secrets for JWT:

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate Refresh Token Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the generated values to your `.env` file.

### Step 4: Start Local MongoDB

**Windows:**
```bash
# Check if MongoDB is running
Get-Service MongoDB

# Start MongoDB if not running
net start MongoDB
```

**macOS:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

### Step 5: Verify Setup

Start your server:
```bash
npm run dev
```

You should see:
```
✅ MongoDB Connected Successfully!
Server running on port 5000
```

---

## Production Setup

### Step 1: Create Production `.env` file

**Important:** Never commit production `.env` files to version control!

Create `server/.env` on your production server with production values.

### Step 2: Configure for Production

```env
# Database - Use MongoDB Atlas (Cloud)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medinew?retryWrites=true&w=majority

# Server Configuration
PORT=5000
NODE_ENV=production

# Client URL - Your production frontend URL
CLIENT_URL=https://yourdomain.com

# JWT Secrets - MUST be strong, unique secrets
# Generate using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<generate_strong_secret_64_chars_min>
JWT_EXPIRE=7d
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_SECRET=<generate_different_strong_secret_64_chars_min>
JWT_REFRESH_EXPIRE=30d

# Payment Gateway (if using online payments)
RAZORPAY_KEY_ID=your_production_razorpay_key_id
RAZORPAY_KEY_SECRET=your_production_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_production_razorpay_webhook_secret

# File Storage (if using cloud storage)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket_name
```

### Step 3: Security Checklist for Production

- [ ] Generate new, unique JWT secrets (never reuse development secrets)
- [ ] Use MongoDB Atlas with strong password
- [ ] Whitelist only necessary IP addresses in MongoDB Atlas
- [ ] Set `NODE_ENV=production`
- [ ] Update `CLIENT_URL` to your production domain
- [ ] Configure payment gateway credentials (if using online payments)
- [ ] Set up cloud file storage (if needed)
- [ ] Enable HTTPS/SSL for your production server
- [ ] Set up proper firewall rules
- [ ] Regularly rotate secrets and passwords

### Step 4: MongoDB Atlas Setup

1. **Create MongoDB Atlas Account:**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free account

2. **Create Cluster:**
   - Create a new cluster (free tier available)
   - Choose your region

3. **Create Database User:**
   - Go to Database Access
   - Create a new user with read/write permissions
   - Save the username and password securely

4. **Whitelist IP Address:**
   - Go to Network Access
   - Add your server's IP address
   - For development, you can use `0.0.0.0/0` (allows all IPs - not recommended for production)

5. **Get Connection String:**
   - Go to Database → Connect
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `medinew` (or your preferred database name)

6. **Update `.env`:**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medinew?retryWrites=true&w=majority
   ```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/medinew` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `JWT_SECRET` | JWT signing secret | `your_secret_key` |
| `JWT_EXPIRE` | JWT expiration | `7d` |
| `JWT_ACCESS_EXPIRE` | Access token expiration | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token secret | `your_refresh_secret` |
| `JWT_REFRESH_EXPIRE` | Refresh token expiration | `30d` |

### Optional Variables

| Variable | Description | When to Use |
|----------|-------------|-------------|
| `RAZORPAY_KEY_ID` | Razorpay API key | When using Razorpay payments |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret | When using Razorpay payments |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret | When using Razorpay webhooks |
| `STRIPE_SECRET_KEY` | Stripe secret key | When using Stripe payments |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | When using Stripe payments |
| `AWS_ACCESS_KEY_ID` | AWS access key | When using S3 file storage |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | When using S3 file storage |
| `AWS_S3_BUCKET` | S3 bucket name | When using S3 file storage |

---

## Troubleshooting

### MongoDB Connection Issues

**Error: ECONNREFUSED**
- **Cause:** MongoDB is not running
- **Solution:** Start MongoDB service

**Error: Authentication failed (MongoDB Atlas)**
- **Cause:** Wrong username/password
- **Solution:** Verify credentials in MongoDB Atlas

**Error: IP not whitelisted**
- **Cause:** Your IP is not in MongoDB Atlas whitelist
- **Solution:** Add your IP to Network Access in MongoDB Atlas

### JWT Token Issues

**Error: Invalid token**
- **Cause:** JWT_SECRET mismatch
- **Solution:** Ensure JWT_SECRET is the same across all instances

**Error: Token expired**
- **Cause:** Token expiration time too short
- **Solution:** Adjust JWT_EXPIRE or JWT_ACCESS_EXPIRE values

### CORS Issues

**Error: CORS policy blocked**
- **Cause:** CLIENT_URL not matching frontend URL
- **Solution:** Update CLIENT_URL to match your frontend URL exactly

---

## Security Best Practices

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Use different secrets** for development and production
3. **Rotate secrets regularly** in production
4. **Use strong passwords** (minimum 32 characters for JWT secrets)
5. **Limit IP access** in MongoDB Atlas for production
6. **Use environment-specific values** - Don't share secrets between environments
7. **Monitor access logs** for unauthorized access attempts
8. **Use HTTPS** in production for all API calls

---

## Generating Secure Secrets

### Using Node.js

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate Refresh Token Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate Encryption Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Using OpenSSL

```bash
# Generate random secret
openssl rand -hex 64
```

---

## Need Help?

If you encounter any issues:
1. Check the error messages in the console
2. Verify all required environment variables are set
3. Ensure MongoDB is running and accessible
4. Check network connectivity for MongoDB Atlas
5. Review the troubleshooting section above

