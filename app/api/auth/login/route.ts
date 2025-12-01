import { NextResponse } from 'next/server';
import { findUserByCredentials, writeSessionCookie } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { id?: string; password?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const id = body.id?.trim() || '';
    const password = body.password || '';
    if (!id || !password) {
      return NextResponse.json({ success: false, error: '아이디와 비밀번호를 입력하세요.' }, { status: 400 });
    }

    const user = findUserByCredentials(id, password);
    if (!user) {
      return NextResponse.json({ success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      data: { id: user.id, role: user.role, label: user.label },
    });
    writeSessionCookie(response, { id: user.id, role: user.role, label: user.label });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
