import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const { data, error } = await supabase
      .from("endpoints")
      .insert({ id, custom_response_body: JSON.stringify({ message: "ok" }) })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await supabase.from("endpoints").select().eq("id", id).single()
        return NextResponse.json(existing)
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
