import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CredSchema = z.object({
  cloud_name: z.string().min(1),
  api_key: z.string().min(1),
  api_secret: z.string().optional(),
  upload_preset: z.string().optional(),
})

export async function GET() {
  const user = await requireAdmin()
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('cloudinary_settings')
    .select('cloud_name, api_key, is_active')
    .eq('shop_id', user.shop_id!)
    .single()

  return NextResponse.json({ credentials: data ? { ...data, api_secret: '••••••••', upload_preset: '' } : null })
}

export async function PUT(request: Request) {
  const user = await requireAdmin()
  const body = await request.json()
  const parsed = CredSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const supabase = createAdminClient()

  const updateData: any = {
    cloud_name: parsed.data.cloud_name,
    api_key: parsed.data.api_key,
    shop_id: user.shop_id!,
    is_active: true,
  }
  // Only update api_secret if it's not a placeholder
  if (parsed.data.api_secret && !parsed.data.api_secret.startsWith('•')) {
    updateData.api_secret = parsed.data.api_secret
  }

  const { error } = await supabase
    .from('cloudinary_settings')
    .upsert(updateData, { onConflict: 'shop_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
