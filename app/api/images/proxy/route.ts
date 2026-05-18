import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/images/proxy?fileId=DRIVE_FILE_ID
// Returns { base64, contentType } for use as data: URI (required for print popup)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const fileId = req.nextUrl.searchParams.get('fileId')
    if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
      return NextResponse.json({ error: 'Invalid fileId' }, { status: 400 })
    }

    // Try direct download URL first, then export view URL
    const urls = [
      `https://drive.google.com/uc?export=download&id=${fileId}`,
      `https://drive.google.com/uc?export=view&id=${fileId}`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
    ]

    let imgBuffer: Buffer | null = null
    let contentType = 'image/jpeg'

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) continue
        const ct = res.headers.get('content-type') || ''
        if (!ct.startsWith('image/')) continue
        imgBuffer = Buffer.from(await res.arrayBuffer())
        contentType = ct.split(';')[0].trim()
        break
      } catch {
        continue
      }
    }

    if (!imgBuffer) {
      return NextResponse.json({ error: 'Image not accessible' }, { status: 404 })
    }

    const base64 = imgBuffer.toString('base64')
    return NextResponse.json({ success: true, base64, contentType })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
