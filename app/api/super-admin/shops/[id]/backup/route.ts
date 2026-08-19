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

    // Gather all shop data for backup — sequential, not Promise.all: concurrent
    // Supabase requests from a single invocation have been observed to
    // silently drop one result with no error, which for a backup means a
    // table quietly missing from the export with nothing to show for it.
    const { data: shop } = await supabase.from('shops').select('*').eq('id', params.id).single()
    const { data: settings } = await supabase.from('shop_settings').select('*').eq('shop_id', params.id).single()
    const { data: categories } = await supabase.from('categories').select('*').eq('shop_id', params.id)
    const { data: products } = await supabase.from('products').select('*').eq('shop_id', params.id)
    const { data: gallery } = await supabase.from('gallery').select('*').eq('shop_id', params.id)
    const { data: templates } = await supabase.from('whatsapp_templates').select('*').eq('shop_id', params.id)
    const { data: pwaSettings } = await supabase.from('pwa_settings').select('*').eq('shop_id', params.id).single()
    const { data: marketingSettings } = await supabase.from('marketing_settings').select('*').eq('shop_id', params.id).single()

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
