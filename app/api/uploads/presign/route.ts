import { NextResponse } from 'next/server';
import { buildObjectKey, createPresignedUpload } from '@/lib/s3';
import { requireEditor } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { fileName?: string; fileType?: string };

export async function POST(req: Request) {
  const { session: _session, response } = requireEditor(req);
  if (!_session) return response!;

  try {
    const body = (await req.json()) as Body;
    const fileName = body.fileName?.trim();
    const fileType = body.fileType?.trim() || 'application/octet-stream';

    if (!fileName) {
      return NextResponse.json({ success: false, error: 'fileName이 필요합니다.' }, { status: 400 });
    }

    const key = buildObjectKey(fileName);
    const { uploadUrl, publicUrl } = await createPresignedUpload(key, fileType);

    return NextResponse.json({ success: true, uploadUrl, publicUrl, key });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[S3 PRESIGN]', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
