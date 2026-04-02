import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    let requestedId: string | null = null
    try {
      const body = await request.json()
      if (body?.id != null) requestedId = String(body.id)
    } catch {
      // Empty body is allowed. We'll generate a new id below.
    }

    const id = (requestedId?.trim() || crypto.randomUUID())

    const { data, error } = await supabase
      .from("endpoints")
      .insert({ id, custom_response_body: JSON.stringify({ message: "ok" }) })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await supabase.from("endpoints").select().eq("id", id).single()
        return NextResponse.json({ ...existing, created: false })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ...data, created: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
