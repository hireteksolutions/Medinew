import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { GENERAL_MESSAGES } from './constants/messages.js';
import { TIME_CONSTANTS } from './constants/numeric.js';

// Import routes
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patient.js';
import doctorRoutes from './routes/doctor.js';
import adminRoutes from './routes/admin.js';
import appointmentRoutes from './routes/appointment.js';
import doctorPublicRoutes from './routes/doctorPublic.js';
import specializationRoutes from './routes/specialization.js';
import contactInfoRoutes from './routes/contactInfo.js';
import messageRoutes from './routes/message.js';
import reviewRoutes from './routes/review.js';
import availabilityScheduleRoutes from './routes/availabilitySchedule.js';
import notificationRoutes from './routes/notification.js';
import reviewRatingRoutes from './routes/reviewRating.js';
import auditLogRoutes from './routes/auditLog.js';
import masterRoleRoutes from './routes/masterRole.js';
import fileRoutes from './routes/file.js';

// Database configuration
import connectDB from './config/database.js';

dotenv.config();

const app = express();

// CORS configuration (must be before other middleware)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting - TEMPORARILY DISABLED
// const limiter = rateLimit({
//   windowMs: TIME_CONSTANTS.RATE_LIMIT_WINDOW_MS,
//   max: TIME_CONSTANTS.RATE_LIMIT_MAX_REQUESTS
// });
// app.use('/api/', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Database connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorPublicRoutes);
app.use('/api/specializations', specializationRoutes);
app.use('/api/contact-info', contactInfoRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/availability-schedules', availabilityScheduleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/review-ratings', reviewRatingRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/master-roles', masterRoleRoutes);
app.use('/api/files', fileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: GENERAL_MESSAGES.SERVER_IS_RUNNING });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || GENERAL_MESSAGES.INTERNAL_SERVER_ERROR,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: GENERAL_MESSAGES.ROUTE_NOT_FOUND });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

