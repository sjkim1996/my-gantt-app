import dbConnect from '@/lib/db';
import Team from '@/models/Team';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 팀 목록 조회
export async function GET() {
  try {
    await dbConnect();
    const teams = await Team.find({}).sort({ createdAt: 1 });
    return NextResponse.json({ success: true, data: teams });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 팀 전체 저장 (간단히 모두 덮어쓰기)
export async function PUT(req: Request) {
  try {
    await dbConnect();
    const body = (await req.json()) as Array<{ name: string; members: string[] }>;

    if (!Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Body must be array' }, { status: 400 });
    }

    await Team.deleteMany({});
    const inserted = await Team.insertMany(body.map((t) => ({ name: t.name, members: t.members || [] })));
    return NextResponse.json({ success: true, data: inserted });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
