import { NextResponse } from "next/server"
import { getDataProvider } from '@/lib/data'

export async function POST(request: Request) {
  try {
    let requestedId: string | null = null
    try {
      const body = await request.json()
      if (body?.id != null) requestedId = String(body.id)
    } catch {
      // Empty body is allowed. We'll generate a new id below.
    }

    const provider = getDataProvider()
    const result = await provider.createEndpoint(requestedId ?? undefined)

    return NextResponse.json(
      { ...result.endpoint, created: result.created },
      { status: result.created ? 201 : 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
