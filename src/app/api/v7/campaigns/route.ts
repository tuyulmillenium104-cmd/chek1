import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const campaigns = await db.campaign.findMany({
      include: { intelligence: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal memuat campaign' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, campaignAddress, action, campaignId } = body;

    // Toggle active status
    if (action === 'toggle') {
      if (!campaignId) {
        return NextResponse.json({ error: 'Campaign ID wajib' }, { status: 400 });
      }
      const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
      if (!campaign) {
        return NextResponse.json({ error: 'Campaign tidak ditemukan' }, { status: 404 });
      }
      const updated = await db.campaign.update({
        where: { id: campaignId },
        data: { isActive: !campaign.isActive },
      });
      return NextResponse.json({
        success: true,
        campaign: updated,
        message: updated.isActive ? 'Campaign diaktifkan' : 'Campaign dinonaktifkan',
      });
    }

    // Retrain model
    if (action === 'retrain') {
      if (!campaignId) {
        return NextResponse.json({ error: 'Campaign ID wajib' }, { status: 400 });
      }
      const { runDataPipeline } = await import('@/lib/v7/pipeline');
      const result = await runDataPipeline(campaignId);
      return NextResponse.json({
        success: result.modelTrained,
        message: result.modelTrained
          ? 'Model berhasil dilatih ulang'
          : 'Model gagal dilatih ulang: data tidak cukup',
      });
    }

    // Add new campaign
    if (!name) {
      return NextResponse.json({ error: 'Nama campaign wajib diisi' }, { status: 400 });
    }

    const campaign = await db.campaign.create({
      data: {
        name,
        campaignAddress: campaignAddress ?? null,
        campaignData: JSON.stringify({ name, address: campaignAddress }),
      },
    });

    return NextResponse.json({
      success: true,
      campaign,
      message: `Campaign "${name}" berhasil dibuat`,
    });
  } catch (error) {
    console.error('[v7] Campaigns error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal mengelola campaign' },
      { status: 500 }
    );
  }
}
