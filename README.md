# MediNew - Healthcare Management System

A complete, modern full-stack healthcare management system with appointment booking, doctor profiles, patient dashboard, and admin panel.

## Features

### Patient Features
- User registration and authentication
- Browse and search doctors by specialization, rating, and location
- Book appointments with multi-step booking process
- View and manage appointments (cancel, reschedule)
- Access medical records and prescriptions
- Save favorite doctors
- Profile management with medical history

### Doctor Features
- Doctor registration and profile management
- View and manage appointments
- Patient history and records access
- Schedule management
- Consultation fee and availability settings
- View statistics and ratings

### Admin Features
- Dashboard with analytics and statistics
- Doctor approval and management
- Patient management
- Appointment oversight
- System-wide statistics

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for routing
- **React Hook Form** with Zod for form validation
- **date-fns** for date manipulation
- **Lucide React** for icons
- **Axios** for API calls
- **React Hot Toast** for notifications

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Express Validator** for input validation
- **Helmet** for security
- **CORS** for cross-origin requests
- **Morgan** for logging

## Project Structure

```
MediNew/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React Context providers
│   │   ├── services/       # API service functions
│   │   └── App.tsx
│   └── package.json
├── server/                 # Node.js backend
│   ├── controllers/        # Route controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   ├── config/            # Configuration files
│   └── server.js          # Entry point
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the server directory:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/medinew
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
BCRYPT_ROUNDS=10
CLIENT_URL=http://localhost:3000
```

4. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the client directory (optional):
```env
VITE_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

The client will run on `http://localhost:3000`

## Database Models

### User
- Basic user information (email, password, name, phone, etc.)
- Role-based access (patient, doctor, admin)

### Patient
- Medical information (blood group, allergies, medical history)
- Emergency contact
- Insurance information
- Favorite doctors

### Doctor
- Professional information (specialization, license, education)
- Availability schedule
- Consultation fees
- Ratings and reviews

### Appointment
- Patient and doctor references
- Date, time, and status
- Reason for visit and symptoms
- Diagnosis and prescription
- Payment status

### Review
- Patient reviews and ratings for doctors

### MedicalRecord
- Patient medical documents
- Prescriptions, lab reports, etc.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Doctors (Public)
- `GET /api/doctors` - Get all approved doctors
- `GET /api/doctors/featured` - Get featured doctors
- `GET /api/doctors/:id` - Get doctor by ID
- `GET /api/doctors/search` - Search doctors

### Appointments
- `GET /api/appointments/available-slots/:doctorId` - Get available slots
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/:id` - Get appointment
- `PUT /api/appointments/:id/cancel` - Cancel appointment
- `PUT /api/appointments/:id/reschedule` - Reschedule appointment

### Patient Routes
- `GET /api/patient/profile` - Get patient profile
- `PUT /api/patient/profile` - Update patient profile
- `GET /api/patient/appointments` - Get patient appointments
- `GET /api/patient/medical-records` - Get medical records
- `POST /api/patient/medical-records` - Upload medical record
- `GET /api/patient/favorite-doctors` - Get favorite doctors
- `POST /api/patient/favorite-doctors/:doctorId` - Add favorite doctor
- `DELETE /api/patient/favorite-doctors/:doctorId` - Remove favorite doctor

### Doctor Routes
- `GET /api/doctor/profile` - Get doctor profile
- `PUT /api/doctor/profile` - Update doctor profile
- `GET /api/doctor/appointments` - Get doctor appointments
- `PUT /api/doctor/appointments/:id` - Update appointment
- `GET /api/doctor/patients` - Get doctor's patients
- `GET /api/doctor/patients/:patientId/history` - Get patient history
- `PUT /api/doctor/schedule` - Update schedule
- `GET /api/doctor/stats` - Get doctor statistics

### Admin Routes
- `GET /api/admin/stats` - Get admin statistics
- `GET /api/admin/doctors` - Get all doctors
- `PUT /api/admin/doctors/:id/approve` - Approve doctor
- `GET /api/admin/patients` - Get all patients
- `GET /api/admin/appointments` - Get all appointments
- `GET /api/admin/users` - Get all users

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Role-based access control (RBAC)
- Input validation and sanitization
- CORS protection
- Helmet.js for security headers
- Rate limiting on API endpoints

## Development Notes

- The application uses JWT tokens stored in localStorage for authentication
- All API calls include the JWT token in the Authorization header
- Protected routes check for authentication and role permissions
- Error handling is implemented throughout the application
- Loading states and user feedback are provided for all async operations

## Future Enhancements

- Email notifications for appointments
- Real-time chat between patients and doctors
- Video consultation support
- Payment gateway integration
- Mobile app development
- Advanced analytics and reporting
- Multi-language support

## License

This project is open source and available for educational purposes.

## Support

For issues and questions, please contact the development team.

