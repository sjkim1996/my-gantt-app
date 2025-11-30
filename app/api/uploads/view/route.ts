import { NextResponse } from 'next/server';
import { createPresignedRead } from '@/lib/s3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { key?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const key = body.key?.trim();
    if (!key) {
      return NextResponse.json({ success: false, error: 'key가 필요합니다.' }, { status: 400 });
    }

    const { downloadUrl } = await createPresignedRead(key);
    return NextResponse.json({ success: true, downloadUrl, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[S3 PRESIGN GET]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
