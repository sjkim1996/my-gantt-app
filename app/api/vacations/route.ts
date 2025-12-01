import dbConnect from '@/lib/db';
import Vacation from '@/models/Vacation';
import { NextResponse } from 'next/server';
import { requireEditor } from '@/lib/serverAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const isValidDate = (d?: string) => !!d && !isNaN(Date.parse(d));

type IncomingVacation = {
  _id?: string;
  person?: string;
  team?: string;
  label?: string;
  start?: string;
  end?: string;
  color?: string;
};

const sanitizeVacation = (v: IncomingVacation | null) => {
  if (!v) return null;
  const person = v.person?.trim();
  const team = v.team?.trim();
  if (!person || !team || !isValidDate(v.start) || !isValidDate(v.end)) return null;
  if (new Date(v.start!) > new Date(v.end!)) return null;
  return {
    ...v,
    person,
    team,
    label: v.label?.trim() || '',
    color: v.color || '#0f172a',
  };
};

export async function GET(req: Request) {
  const { session: _session, response } = requireEditor(req);
  if (!_session) return response!;

  try {
    await dbConnect();
    const vacations = await Vacation.find({}).sort({ start: 1 });
    return NextResponse.json({ success: true, data: vacations });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { session: _session, response } = requireEditor(req);
  if (!_session) return response!;

  try {
    await dbConnect();
    const body = await req.json();
    const list = Array.isArray(body) ? body : [body];
    const sanitized = list.map(sanitizeVacation).filter(Boolean);
    if (!sanitized.length) {
      return NextResponse.json({ success: false, error: '유효한 휴가 데이터가 없습니다.' }, { status: 400 });
    }
    const created = await Vacation.insertMany(sanitized);
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { session: _session, response } = requireEditor(req);
  if (!_session) return response!;

  try {
    await dbConnect();
    const body = (await req.json()) as IncomingVacation;
    if (!body._id) return NextResponse.json({ success: false, error: 'id가 필요합니다.' }, { status: 400 });
    const sanitized = sanitizeVacation(body);
    if (!sanitized) return NextResponse.json({ success: false, error: '필수 값이 없습니다.' }, { status: 400 });
    const updated = await Vacation.findByIdAndUpdate(body._id, sanitized, { new: true, runValidators: true });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { session: _session, response } = requireEditor(req);
  if (!_session) return response!;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id가 필요합니다.' }, { status: 400 });
    await dbConnect();
    await Vacation.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
