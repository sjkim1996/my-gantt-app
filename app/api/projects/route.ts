import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import { NextResponse } from 'next/server';

// Ensure serverful runtime for mongoose
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// [GET] 프로젝트 목록 가져오기
export async function GET() {
  try {
    await dbConnect();
    const projects = await Project.find({});
    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// [POST] 프로젝트 추가하기
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    // 배열이면 여러 개 추가, 객체면 하나 추가
    if (Array.isArray(body)) {
      const projects = await Project.insertMany(body);
      return NextResponse.json({ success: true, data: projects });
    } else {
      const project = await Project.create(body);
      return NextResponse.json({ success: true, data: project });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// [PUT] 프로젝트 수정하기
export async function PUT(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    // _id를 기준으로 찾아서 업데이트
    const project = await Project.findByIdAndUpdate(body._id, body, {
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
