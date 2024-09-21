import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT: number = Number(process.env.PORT) || 8000;

if (isNaN(PORT)) {
  throw new Error('Invalid PORT environment variable');
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ...`);
});
