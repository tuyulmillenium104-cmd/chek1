import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: List all database campaigns
export async function GET() {
  try {
    const model = (db as any).rallyCampaign
    if (!model || typeof model.findMany !== 'function') {
      return NextResponse.json({ campaigns: [] })
    }
    const campaigns = await model.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Campaign manage GET error:', error)
    return NextResponse.json({ error: 'Failed to list campaigns' }, { status: 500 })
  }
}

// POST: Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const model = (db as any).rallyCampaign
    if (!model || typeof model.create !== 'function') {
      return NextResponse.json({ error: 'Campaign model not available — please restart the server' }, { status: 503 })
    }

    const body = await request.json()
    const {
      title,
      contractAddress,
      campaignUrl,
      creator,
      xUsername,
      rewardPool,
      startDate,
      endDate,
      status,
      description,
      source,
      missionsJson,
      knowledgeBase,
      proposedAnglesJson,
      rulesJson,
      style,
      goal,
    } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Auto-generate campaign URL from contract address if not provided
    const finalCampaignUrl = campaignUrl || (contractAddress
      ? `https://app.rally.fun/campaigns/${contractAddress}`
      : null)

    const campaign = await model.create({
      data: {
        title: title.trim(),
        contractAddress: contractAddress?.trim() || null,
        campaignUrl: finalCampaignUrl,
        creator: creator?.trim() || null,
        xUsername: xUsername?.trim() || null,
        rewardPool: rewardPool?.trim() || null,
        startDate: startDate?.trim() || null,
        endDate: endDate?.trim() || null,
        status: status || 'active',
        description: description?.trim() || null,
        source: source || 'manual',
        isActive: status !== 'ended',
        // Pipeline-required fields
        missionsJson: typeof missionsJson === 'string' ? missionsJson : (missionsJson ? JSON.stringify(missionsJson) : null),
        knowledgeBase: typeof knowledgeBase === 'string' ? knowledgeBase?.trim() || null : null,
        proposedAnglesJson: typeof proposedAnglesJson === 'string' ? proposedAnglesJson : (proposedAnglesJson ? JSON.stringify(proposedAnglesJson) : null),
        rulesJson: typeof rulesJson === 'string' ? rulesJson : (rulesJson ? JSON.stringify(rulesJson) : null),
        style: typeof style === 'string' ? style?.trim() || null : null,
        goal: typeof goal === 'string' ? goal?.trim() || null : null,
      },
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Campaign manage POST error:', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}

// PUT: Update a campaign
export async function PUT(request: NextRequest) {
  try {
    const model = (db as any).rallyCampaign
    if (!model || typeof model.update !== 'function') {
      return NextResponse.json({ error: 'Campaign model not available' }, { status: 503 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    // If status is being updated, also update isActive
    if (updateData.status) {
      updateData.isActive = updateData.status === 'active'
    }

    // Auto-generate campaign URL from contract address
    if (updateData.contractAddress && !updateData.campaignUrl) {
      updateData.campaignUrl = `https://app.rally.fun/campaigns/${updateData.contractAddress}`
    }

    // Handle pipeline JSON fields — stringify if passed as arrays
    if (updateData.missionsJson !== undefined) {
      updateData.missionsJson = typeof updateData.missionsJson === 'string'
        ? updateData.missionsJson
        : (updateData.missionsJson ? JSON.stringify(updateData.missionsJson) : null)
    }
    if (updateData.proposedAnglesJson !== undefined) {
      updateData.proposedAnglesJson = typeof updateData.proposedAnglesJson === 'string'
        ? updateData.proposedAnglesJson
        : (updateData.proposedAnglesJson ? JSON.stringify(updateData.proposedAnglesJson) : null)
    }
    if (updateData.rulesJson !== undefined) {
      updateData.rulesJson = typeof updateData.rulesJson === 'string'
        ? updateData.rulesJson
        : (updateData.rulesJson ? JSON.stringify(updateData.rulesJson) : null)
    }

    const campaign = await model.update({
      where: { id },
      data: {
        ...updateData,
        title: updateData.title?.trim(),
        contractAddress: updateData.contractAddress?.trim() || undefined,
        campaignUrl: updateData.campaignUrl?.trim() || undefined,
        creator: updateData.creator?.trim() || undefined,
        xUsername: updateData.xUsername?.trim() || undefined,
        rewardPool: updateData.rewardPool?.trim() || undefined,
        startDate: updateData.startDate?.trim() || undefined,
        endDate: updateData.endDate?.trim() || undefined,
        description: updateData.description?.trim() || undefined,
        knowledgeBase: updateData.knowledgeBase?.trim() || undefined,
        style: updateData.style?.trim() || undefined,
        goal: updateData.goal?.trim() || undefined,
      },
    })

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Campaign manage PUT error:', error)
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}

// DELETE: Soft-delete a campaign
export async function DELETE(request: NextRequest) {
  try {
    const model = (db as any).rallyCampaign
    if (!model || typeof model.update !== 'function') {
      return NextResponse.json({ error: 'Campaign model not available' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    // Soft delete by setting isActive to false
    await model.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Campaign manage DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}
