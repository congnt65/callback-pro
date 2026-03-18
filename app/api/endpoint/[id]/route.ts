import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase.from("endpoints").select().eq("id", id).single()
  if (error) return NextResponse.json({ error: "Endpoint not found" }, { status: 404 })
  return NextResponse.json(data)
}
