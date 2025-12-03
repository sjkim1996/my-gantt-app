import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Account from '@/models/Account';
import { UserRole } from '@/lib/authShared';
import { ensureAccountsSeeded, requireAdmin } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type IncomingAccount = {
  _id?: string;
  userId?: string;
  password?: string;
  role?: UserRole;
  team?: string;
  label?: string;
};

const sanitize = (data?: IncomingAccount | null) => {
  if (!data) return null;
  const userId = data.userId?.trim();
  const password = data.password ?? '';
  const role = data.role || 'member';
  if (!userId) return null;
  if (!password.trim()) return null;
  if (!['admin', 'lead', 'member'].includes(role)) return null;
  return {
    userId,
    password,
    role,
    team: data.team?.trim() || '',
    label: data.label?.trim() || userId,
  };
};

const ensureNotLastAdmin = async (targetId: string) => {
  const adminCount = await Account.countDocuments({ role: 'admin' });
  const target = await Account.findById(targetId).lean();
  if (!target) return;
  if ((target as { role?: string }).role === 'admin' && adminCount <= 1) {
    throw new Error('마지막 관리자 계정은 삭제하거나 권한을 낮출 수 없습니다.');
  }
};

export async function GET(req: Request) {
  const { session: _session, response } = requireAdmin(req);
  if (!_session) return response!;

  try {
    await ensureAccountsSeeded();
    await dbConnect();
    const accounts = await Account.find({}).sort({ createdAt: 1 });
    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { session: _session, response } = requireAdmin(req);
  if (!_session) return response!;

  try {
    await dbConnect();
    const body = (await req.json()) as IncomingAccount;
    const sanitized = sanitize(body);
    if (!sanitized) return NextResponse.json({ success: false, error: '필수 값이 누락되었습니다.' }, { status: 400 });

    const duplicate = await Account.findOne({ userId: sanitized.userId });
    if (duplicate) return NextResponse.json({ success: false, error: '이미 존재하는 ID입니다.' }, { status: 409 });

    const created = await Account.create(sanitized);
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { session: _session, response } = requireAdmin(req);
  if (!_session) return response!;

  try {
    await dbConnect();
    const body = (await req.json()) as IncomingAccount;
    if (!body._id) return NextResponse.json({ success: false, error: '계정 id가 필요합니다.' }, { status: 400 });

    const current = await Account.findById(body._id);
    if (!current) return NextResponse.json({ success: false, error: '계정을 찾을 수 없습니다.' }, { status: 404 });

    if (body.role && body.role !== 'admin') {
      await ensureNotLastAdmin(body._id);
    }

    if (body.userId && body.userId !== current.userId) {
      const exists = await Account.findOne({ userId: body.userId });
      if (exists) return NextResponse.json({ success: false, error: '이미 존재하는 ID입니다.' }, { status: 409 });
    }

    if (body.password !== undefined && !body.password.trim()) {
      return NextResponse.json({ success: false, error: '비밀번호는 공백일 수 없습니다.' }, { status: 400 });
    }

    const next: IncomingAccount = {
      userId: body.userId?.trim() || current.userId,
      password: body.password !== undefined ? body.password : current.password,
      role: (body.role as UserRole | undefined) || (current.role as UserRole),
      team: body.team !== undefined ? body.team : current.team,
      label: body.label !== undefined ? body.label : current.label,
    };

    const sanitized = sanitize(next);
    if (!sanitized) return NextResponse.json({ success: false, error: '필수 값이 누락되었습니다.' }, { status: 400 });

    const updated = await Account.findByIdAndUpdate(body._id, sanitized, { new: true, runValidators: true });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { session: _session, response } = requireAdmin(req);
  if (!_session) return response!;

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id가 필요합니다.' }, { status: 400 });

    await ensureNotLastAdmin(id);
    await Account.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
