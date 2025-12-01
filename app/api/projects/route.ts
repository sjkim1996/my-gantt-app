import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import { NextResponse } from 'next/server';
import { requireAuth, requireEditor } from '@/lib/serverAuth';

// Ensure serverful runtime for mongoose
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// [GET] 프로젝트 목록 가져오기
export async function GET(req: Request) {
  const { session, response } = requireAuth(req);
  if (!session) return response!;

  try {
    await dbConnect();
    const projects = await Project.find({});

    const normalized = projects.map((p) => (typeof (p as any).toObject === 'function' ? (p as any).toObject() : p));
    const visible =
      session.role === 'member'
        ? normalized
            .filter((p: any) => (p.person || '').toLowerCase() === session.id.toLowerCase())
            .map((p: any) => ({
              ...p,
              vacations: Array.isArray(p.vacations)
                ? p.vacations.filter((v: any) => (v.person || '').toLowerCase() === session.id.toLowerCase())
                : [],
            }))
        : normalized;

    return NextResponse.json({ success: true, data: visible });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

const isValidDate = (d?: string) => !!d && !isNaN(Date.parse(d));
type IncomingProject = {
  _id?: string;
  id?: string | number;
  name: string;
  person: string;
  team: string;
  start: string;
  end: string;
  colorIdx?: number;
  docUrl?: string;
  docName?: string;
  docKey?: string;
  isTentative?: boolean;
  customColor?: string;
  notes?: string;
  milestones?: { id: string; label: string; date: string; color?: string }[];
  vacations?: { id: string; person: string; team?: string; label?: string; start: string; end: string; color?: string }[];
  attachments?: { name?: string; url?: string; key?: string }[];
};

const sanitizeProject = (p?: IncomingProject | null) => {
  if (!p || !p.name || !p.person || !p.team || !isValidDate(p.start) || !isValidDate(p.end)) return null;
  if (new Date(p.start) > new Date(p.end)) return null;
  const cleanMilestones = Array.isArray(p.milestones)
    ? p.milestones
        .filter((m) => m && m.label && isValidDate(m.date))
        .map((m) => ({ ...m, color: m.color || '#ef4444' }))
    : [];
  const cleanVacations = Array.isArray(p.vacations)
    ? p.vacations
        .filter((v) => v && v.person && isValidDate(v.start) && isValidDate(v.end) && new Date(v.start) <= new Date(v.end))
        .map((v) => ({ ...v, team: v.team || '미배정', color: v.color || '#94a3b8' }))
    : [];
  const cleanAttachments = Array.isArray(p.attachments)
    ? p.attachments
        .filter((a) => a && (a.name || a.key || a.url))
        .map((a) => ({
          name: a.name || a.key || a.url || '첨부',
          url: a.url || undefined,
          key: a.key || undefined,
        }))
    : [];
  return { ...p, milestones: cleanMilestones, vacations: cleanVacations, attachments: cleanAttachments };
};

// [POST] 프로젝트 추가하기
export async function POST(req: Request) {
  const { session: _session, response } = requireEditor(req);
  if (!_session) return response!;

  try {
    await dbConnect();
    const body = await req.json();
    if (Array.isArray(body)) {
      const sanitized = body.map(sanitizeProject).filter(Boolean);
      if (!sanitized.length) return NextResponse.json({ success: false, error: '유효한 프로젝트 데이터가 없습니다.' }, { status: 400 });
      const projects = await Project.insertMany(sanitized);
      return NextResponse.json({ success: true, data: projects });
    } else {
      const sanitized = sanitizeProject(body);
      if (!sanitized) return NextResponse.json({ success: false, error: '필수 필드 또는 날짜가 잘못되었습니다.' }, { status: 400 });
      const project = await Project.create(sanitized);
      return NextResponse.json({ success: true, data: project });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// [PUT] 프로젝트 수정하기
export async function PUT(req: Request) {
  const { session: _session, response } = requireEditor(req);
  if (!_session) return response!;

  try {
    await dbConnect();
    const body = await req.json();
    const sanitized = sanitizeProject(body);
    if (!sanitized || !body._id) return NextResponse.json({ success: false, error: '필수 필드 또는 날짜가 잘못되었습니다.' }, { status: 400 });
    const project = await Project.findByIdAndUpdate(body._id, sanitized, {
      new: true,
      runValidators: true,
    });
    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// [DELETE] 프로젝트 삭제하기
export async function DELETE(req: Request) {
  const { session: _session, response } = requireEditor(req);
  if (!_session) return response!;

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });

    await Project.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
