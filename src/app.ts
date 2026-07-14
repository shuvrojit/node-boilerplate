import express, { Express, Response } from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import {
  errorConverter,
  errorHandler,
  notFound,
} from './middlewares/errorHandler';
import morganMiddleware from './config/morgan';
import v1Routes from './routes/v1';
import config from './config/config';

const app: Express = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(config.cookie.secret));
app.use(morganMiddleware);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit, // limit each IP to apiRateLimit requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Base route
app.get('/', (_, res: Response) => {
  res.status(200);
  res.send('root');
});

// API Routes
app.use('/api/v1', v1Routes);

// Add 404 handler for routes that don't exist
app.use(notFound);

// Global error handling middleware
app.use(errorConverter);
app.use(errorHandler);

export default app;
