import mongoose, { Mongoose } from 'mongoose';

type MongooseCache = { conn: Mongoose | null; promise: Promise<Mongoose> | null };

const globalWithMongoose = global as typeof global & { mongooseCache?: MongooseCache };

if (!globalWithMongoose.mongooseCache) {
  globalWithMongoose.mongooseCache = { conn: null, promise: null };
}

const cached = globalWithMongoose.mongooseCache;

async function dbConnect() {
  const mongoDbUri = process.env.MONGODB_URI;

  if (!mongoDbUri) {
    throw new Error('MONGODB_URI is not set in the environment');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: Parameters<typeof mongoose.connect>[1] = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 10,
    };

    cached.promise = mongoose.connect(mongoDbUri, opts).catch((err) => {
      cached.promise = null;
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] connection error:', err);
});

export default dbConnect;
