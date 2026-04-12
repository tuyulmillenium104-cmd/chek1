import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    const reportPath = join(process.cwd(), 'download', 'rally_system', 'latest_report.json')

    if (!existsSync(reportPath)) {
      return NextResponse.json({ exists: false }, { status: 404 })
    }

    const content = await readFile(reportPath, 'utf-8')
    const data = JSON.parse(content)

    return NextResponse.json({
      exists: true,
      ...data,
    })
  } catch (error: any) {
    console.error('Latest report read error:', error)
    return NextResponse.json(
      { exists: false, error: 'Failed to read report file' },
      { status: 500 }
    )
  }
}
