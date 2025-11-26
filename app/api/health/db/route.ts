import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return NextResponse.json({ success: false, error: 'MONGODB_URI not set' }, { status: 500 });
  }

  try {
    const conn = await dbConnect();
    const { host, name } = conn.connection;
    return NextResponse.json({
      success: true,
      readyState: mongoose.connection.readyState,
      host,
      db: name,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
