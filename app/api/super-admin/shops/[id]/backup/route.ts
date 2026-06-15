import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireSuperAdmin()
    const supabase = createAdminClient()

    // Gather all shop data for backup
    const [
      { data: shop },
      { data: settings },
      { data: categories },
      { data: products },
      { data: gallery },
      { data: templates },
      { data: pwaSettings },
      { data: marketingSettings },
    ] = await Promise.all([
      supabase.from('shops').select('*').eq('id', params.id).single(),
      supabase.from('shop_settings').select('*').eq('shop_id', params.id).single(),
      supabase.from('categories').select('*').eq('shop_id', params.id),
      supabase.from('products').select('*').eq('shop_id', params.id),
      supabase.from('gallery').select('*').eq('shop_id', params.id),
      supabase.from('whatsapp_templates').select('*').eq('shop_id', params.id),
      supabase.from('pwa_settings').select('*').eq('shop_id', params.id).single(),
      supabase.from('marketing_settings').select('*').eq('shop_id', params.id).single(),
    ])

    const backupData = {
      version: '2.0',
      created_at: new Date().toISOString(),
      shop_id: params.id,
      shop,
      settings,
      categories: categories ?? [],
      products: products ?? [],
      gallery: gallery ?? [],
      whatsapp_templates: templates ?? [],
      pwa_settings: pwaSettings,
      marketing_settings: marketingSettings,
    }

    const backupJson = JSON.stringify(backupData, null, 2)
    const sizeBytes = Buffer.byteLength(backupJson, 'utf8')

    // Store backup record (in production, upload JSON to Cloudinary/S3)
    const backupUrl = `data:application/json;base64,${Buffer.from(backupJson).toString('base64')}`

    await supabase.from('shop_backups').insert({
      shop_id: params.id,
      backup_url: backupUrl,
      size_bytes: sizeBytes,
      version: '2.0',
      created_by: user.id,
    })

    // Return JSON for download
    return new Response(backupJson, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="shop-backup-${params.id}-${Date.now()}.json"`,
      },
    })
  } catch (error: any) {
    console.error('[POST /api/super-admin/shops/[id]/backup]', error)
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 })
  }
}
