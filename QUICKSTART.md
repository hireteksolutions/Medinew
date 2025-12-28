# Quick Start Guide

## Prerequisites
- Node.js (v18 or higher)
- MongoDB (running locally or connection string)
- npm or yarn

## Step 1: Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the `server` directory with the following content:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/medinew
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
BCRYPT_ROUNDS=10
CLIENT_URL=http://localhost:3000
```

4. Start MongoDB (if running locally):
```bash
# On macOS/Linux
mongod

# On Windows, start MongoDB service or run:
mongod.exe
```

5. Start the backend server:
```bash
npm run dev
```

The server should now be running on `http://localhost:5000`

## Step 2: Frontend Setup

1. Open a new terminal and navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Create `.env` file in the `client` directory:
```env
VITE_API_URL=http://localhost:5000/api
```

4. Start the frontend development server:
```bash
npm run dev
```

The frontend should now be running on `http://localhost:3000`

## Step 3: Access the Application

1. Open your browser and navigate to `http://localhost:3000`
2. Register a new account (choose Patient, Doctor, or Admin role)
3. Start exploring the application!

## Default User Roles

- **Patient**: Can book appointments, view medical records, manage profile
- **Doctor**: Can manage appointments, view patients, update schedule (requires admin approval)
- **Admin**: Can manage all users, approve doctors, view system statistics

## Testing the Application

1. **Register as Patient**: Create an account with role "patient"
2. **Register as Doctor**: Create an account with role "doctor" (will need admin approval)
3. **Register as Admin**: Create an account with role "admin"
4. **Login as Admin**: Approve the doctor account
5. **Login as Patient**: Browse doctors and book an appointment
6. **Login as Doctor**: View and manage appointments

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check the MONGODB_URI in your `.env` file
- For cloud MongoDB (MongoDB Atlas), use the connection string provided

### Port Already in Use
- Change the PORT in server `.env` file
- Update CLIENT_URL if you change the port
- Update VITE_API_URL in client `.env` if backend port changes

### CORS Errors
- Ensure CLIENT_URL in server `.env` matches your frontend URL
- Check that both servers are running

### Build Errors
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear npm cache: `npm cache clean --force`

## Next Steps

- Review the README.md for detailed documentation
- Explore the codebase structure
- Customize the application for your needs
- Add additional features as required

