import { NextResponse } from 'next/server'
import { getDataProvider } from '@/lib/data'

type Params = { params: Promise<{ id: string; requestId: string }> }

export async function PATCH(_req: Request, { params }: Params) {
  const { requestId } = await params
  try {
    const provider = getDataProvider()
    await provider.markRequestRead(requestId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, requestId } = await params
  try {
    const provider = getDataProvider()
    await provider.deleteRequest(id, requestId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}