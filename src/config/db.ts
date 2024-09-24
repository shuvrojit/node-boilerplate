import mongoose from 'mongoose';

const DB_URL: string = process.env.mongoURL!;

const connectDB = async () => {
  console.log(DB_URL);
  try {
    await mongoose.connect(DB_URL, { dbName: 'simple-auth' });
    process.stdout.write('Database connected\n');
  } catch (e) {
    process.stdout.write(`Error ${e}\n`);
    process.exit(1);
  }
};

export default connectDB;
