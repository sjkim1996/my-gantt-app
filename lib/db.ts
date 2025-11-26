import mongoose, { Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Narrow to a plain string for downstream use after the guard above
const mongoDbUri = MONGODB_URI as string;

type MongooseCache = { conn: Mongoose | null; promise: Promise<Mongoose> | null };

const globalWithMongoose = global as typeof global & { mongooseCache?: MongooseCache };

if (!globalWithMongoose.mongooseCache) {
  globalWithMongoose.mongooseCache = { conn: null, promise: null };
}

const cached = globalWithMongoose.mongooseCache;

async function dbConnect() {
  if (cached?.conn) {
    return cached.conn;
  }

  if (!cached?.promise) {
    const opts: Parameters<typeof mongoose.connect>[1] = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached!.promise = mongoose.connect(mongoDbUri, opts).catch((err) => {
      cached!.promise = null;
      throw err;
    });
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}

export default dbConnect;
