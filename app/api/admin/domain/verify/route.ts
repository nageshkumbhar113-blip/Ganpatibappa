import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireShopOwner } from '@/lib/middleware/auth-guard'
import dns from 'dns'
import { promisify } from 'util'

const resolveTxt = promisify(dns.resolveTxt)

export async function POST(req: NextRequest) {
  try {
    const user = await requireShopOwner()
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const supabase = createAdminClient()

    // Get domain record
    const { data: mapping, error } = await supabase
      .from('domain_mappings')
      .select('domain, dns_txt_record')
      .eq('id', id)
      .eq('shop_id', user.shop_id!)
      .single()

    if (error || !mapping) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Check DNS TXT record
    let verified = false
    try {
      const records = await resolveTxt(mapping.domain)
      const flat = records.flat()
      verified = flat.some((r) => r === mapping.dns_txt_record)
    } catch {
      // DNS lookup failed — domain not configured
      verified = false
    }

    if (verified) {
      await supabase
        .from('domain_mappings')
        .update({ dns_verified: true, ssl_status: 'active', last_checked_at: new Date().toISOString() })
        .eq('id', id)
        .eq('shop_id', user.shop_id!)

      return NextResponse.json({ verified: true, message: 'Domain verified successfully!' })
    }

    await supabase
      .from('domain_mappings')
      .update({ last_checked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('shop_id', user.shop_id!)

    return NextResponse.json({
      verified: false,
      message: 'TXT record not found. DNS changes can take up to 24 hours to propagate.',
    })
  } catch (err: any) {
    console.error('[POST /api/admin/domain/verify]', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
