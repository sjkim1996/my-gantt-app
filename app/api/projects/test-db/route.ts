import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

// Force Node.js runtime to avoid accidental Edge deployment (Mongoose needs Node APIs)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return NextResponse.json(
      { success: false, error: 'MONGODB_URI env not set' },
      { status: 500 }
    );
  }

  try {
    const conn = await dbConnect();
    const { host, name } = conn.connection;

    return NextResponse.json({
      success: true,
      db: {
        host,
        name,
        readyState: mongoose.connection.readyState,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
