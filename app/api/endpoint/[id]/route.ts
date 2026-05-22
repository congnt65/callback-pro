import { NextResponse } from "next/server"
import { getDataProvider } from '@/lib/data'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const provider = getDataProvider()
    const endpoint = await provider.getEndpoint(id)

    if (endpoint == null) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 })
    }

    return NextResponse.json(endpoint)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
