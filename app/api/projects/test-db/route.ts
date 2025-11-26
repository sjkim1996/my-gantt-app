import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

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
    return NextResponse.json({
      success: true,
      uri,
      readyState: mongoose.connection.readyState,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
