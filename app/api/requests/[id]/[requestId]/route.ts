import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

type Params = { params: Promise<{ id: string; requestId: string }> }

export async function PATCH(_req: Request, { params }: Params) {
  const { requestId } = await params
  const { error } = await supabase
    .from('requests')
    .update({ is_read: true })
    .eq('id', requestId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: Params) {
  const { requestId } = await params
  const { error } = await supabase.from('requests').delete().eq('id', requestId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}