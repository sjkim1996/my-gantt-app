import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import { NextResponse } from 'next/server';

// [GET] 프로젝트 목록 가져오기
export async function GET() {
  await dbConnect();
  try {
    const projects = await Project.find({});
    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}

// [POST] 프로젝트 추가하기
export async function POST(req: Request) {
  await dbConnect();
  try {
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
    return NextResponse.json({ success: false }, { status: 400 });
  }
}

// [PUT] 프로젝트 수정하기
export async function PUT(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();
    // _id를 기준으로 찾아서 업데이트
    const project = await Project.findByIdAndUpdate(body._id, body, {
        new: true,
        runValidators: true,
    });
    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}

// [DELETE] 프로젝트 삭제하기
export async function DELETE(req: Request) {
    await dbConnect();
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ success: false }, { status: 400 });

      await Project.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json({ success: false }, { status: 400 });
    }
}