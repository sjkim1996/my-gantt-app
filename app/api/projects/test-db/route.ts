import dbConnect from '@/lib/db';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET() {
  try {
    // 1. 환경 변수 확인
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
    }

    console.log('1. DB 연결 시도 중...');
    
    // 2. 연결 함수 호출
    await dbConnect();

    // 3. 현재 상태 확인
    const state = mongoose.connection.readyState;
    const statusList = ['Disconnected (연결 끊김)', 'Connected (연결됨!)', 'Connecting (연결 중)', 'Disconnecting (종료 중)'];
    
    console.log(`2. 연결 상태: ${statusList[state]}`);

    if (state === 1) {
        // 연결 성공 시
        return NextResponse.json({ 
            success: true, 
            message: '몽고DB 연결 성공! 🎉', 
            status: statusList[state],
            dbName: mongoose.connection.db?.databaseName || 'Unknown'
        });
    } else {
        // 연결 실패 시
        return NextResponse.json({ 
            success: false, 
            message: '연결은 되었으나 상태가 불안정합니다.', 
            status: statusList[state] 
        }, { status: 500 });
    }

  } catch (error: any) {
    console.error('DB 연결 에러 발생:', error);
    return NextResponse.json({ 
        success: false, 
        message: 'DB 연결 실패 😭', 
        error: error.message 
    }, { status: 500 });
  }
}