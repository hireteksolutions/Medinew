/**
 * CORS Configuration
 * Manages allowed origins for cross-origin requests
 */

/**
 * Get allowed CORS origins
 * @returns {string[]} Array of allowed origin URLs
 */
export const getAllowedOrigins = () => {
  const origins = [
    process.env.CLIENT_URL,
    'https://medi-new-client.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean); // Remove undefined/null values

  return origins;
};

/**
 * CORS configuration object
 */
export const corsConfig = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`);
      console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
};

export default corsConfig;

