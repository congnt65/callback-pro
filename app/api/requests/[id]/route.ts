import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('requests')
    .select()
    .eq('endpoint_id', id)
    .order('received_at', { ascending: false })
    .limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabase.from('requests').delete().eq('endpoint_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Reset counter
  await supabase.from('endpoints').update({ request_count: 0 }).eq('id', id)
  return NextResponse.json({ success: true })
}