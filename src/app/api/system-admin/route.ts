import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { hashPin } from '@/lib/hash'

export async function POST(request: Request) {
  try {
    const { name, pin_code } = await request.json()
    if (!name || !pin_code || pin_code.length !== 4) {
      return NextResponse.json({ error: '유효한 이름과 4자리 비밀을 입력해주세요.' }, { status: 400 })
    }

    const supabaseAdmin = getServiceSupabase()

    // 이미 시스템 관리자가 있는지 확인
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('system_admins')
      .select('id')

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: '이미 시스템 관리자가 존재합니다.' }, { status: 400 })
    }

    const pin_hash = hashPin(pin_code)

    const { data, error } = await supabaseAdmin.from('system_admins').insert([
      {
        name,
        pin_hash,
      },
    ]).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '서버 오류' }, { status: 500 })
  }
}
