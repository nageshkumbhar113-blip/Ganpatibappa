import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireShopOwner } from '@/lib/middleware/auth-guard'
import { z } from 'zod'
import crypto from 'crypto'

const AddDomainSchema = z.object({
  domain: z
    .string()
    .min(3)
    .max(253)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/, 'Invalid domain format'),
})

/** GET — list domains for current shop */
export async function GET() {
  try {
    const user = await requireShopOwner()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('domain_mappings')
      .select('*')
      .eq('shop_id', user.shop_id!)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ domains: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

/** POST — add a new custom domain */
export async function POST(req: NextRequest) {
  try {
    const user = await requireShopOwner()
    const body = await req.json()
    const parsed = AddDomainSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { domain } = parsed.data
    const supabase = createAdminClient()

    // Check if domain already mapped
    const { data: existing } = await supabase
      .from('domain_mappings')
      .select('id, shop_id')
      .eq('domain', domain)
      .single()

    if (existing) {
      if (existing.shop_id !== user.shop_id) {
        return NextResponse.json({ error: 'This domain is already in use by another shop.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Domain already added.' }, { status: 409 })
    }

    // Generate a DNS TXT verification token
    const txtRecord = `ganpatibappa-verify=${crypto.randomBytes(16).toString('hex')}`

    const { data, error } = await supabase
      .from('domain_mappings')
      .insert({
        shop_id: user.shop_id!,
        domain,
        is_primary: false,
        dns_verified: false,
        dns_txt_record: txtRecord,
        ssl_status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ domain: data }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/admin/domain]', err)
    return NextResponse.json({ error: 'Failed to add domain' }, { status: 500 })
  }
}

/** DELETE — remove a domain mapping */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireShopOwner()
    const { searchParams } = req.nextUrl
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('domain_mappings')
      .delete()
      .eq('id', id)
      .eq('shop_id', user.shop_id!)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove domain' }, { status: 500 })
  }
}
