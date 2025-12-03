import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Account from '@/models/Account';
import { requireAuth } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  currentPassword?: string;
  newPassword?: string;
};

export async function POST(req: Request) {
  const { session: _session, response } = requireAuth(req);
  if (!_session) return response!;

  try {
    const body = (await req.json()) as Body;
    const currentPassword = body.currentPassword || '';
    const newPassword = body.newPassword || '';

    if (!currentPassword || !newPassword.trim()) {
      return NextResponse.json({ success: false, error: '현재 비밀번호와 새 비밀번호를 입력하세요.' }, { status: 400 });
    }

    await dbConnect();
    const account = await Account.findOne({ userId: _session.id });
    if (!account) {
      return NextResponse.json({ success: false, error: '계정을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (account.password !== currentPassword) {
      return NextResponse.json({ success: false, error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 });
    }

    account.password = newPassword.trim();
    await account.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
