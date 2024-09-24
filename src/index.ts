import app from './app';
import dotenv from 'dotenv';
import logger from './config/logger';
import connectDB from './config/db';

dotenv.config();

connectDB();

const PORT: number = Number(process.env.PORT) || 8000;

if (isNaN(PORT)) {
  throw new Error('Invalid PORT environment variable');
}

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} ...`);
});
