import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireShopOwner } from '@/lib/middleware/auth-guard'
import { canAddStaff } from '@/lib/middleware/plan-guard'
import { z } from 'zod'

const InviteStaffSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  role: z.enum(['manager', 'employee']),
  password: z.string().min(8).max(72),
  permissions: z.object({
    products: z.boolean().default(false),
    orders: z.boolean().default(false),
    customers: z.boolean().default(false),
    gallery: z.boolean().default(false),
    reports: z.boolean().default(false),
    settings: z.boolean().default(false),
    staff: z.boolean().default(false),
  }),
})

export async function GET(_req: NextRequest) {
  try {
    const user = await requireShopOwner()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('staff')
      .select('*, users(name, email, phone, avatar_url, is_active)')
      .eq('shop_id', user.shop_id!)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ staff: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireShopOwner()

    const limitCheck = await canAddStaff(user.shop_id!)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Staff limit reached. Your plan allows ${limitCheck.limit} staff members.`,
          code: 'PLAN_LIMIT_EXCEEDED',
        },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = InviteStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, email, phone, role, password, permissions } = parsed.data
    const supabase = createAdminClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      if (authError?.message?.includes('already registered')) {
        return NextResponse.json({ error: 'This email is already registered.' }, { status: 409 })
      }
      throw authError
    }

    // Create user profile as 'staff' role
    await supabase.from('users').insert({
      id: authData.user.id,
      email,
      name,
      phone: phone ?? null,
      role: 'staff',
      shop_id: user.shop_id!,
      is_active: true,
    })

    // Create staff record with permissions
    const { data: staffRecord, error: staffError } = await supabase
      .from('staff')
      .insert({
        shop_id: user.shop_id!,
        user_id: authData.user.id,
        role,
        permissions,
        is_active: true,
        invited_by: user.id,
      })
      .select()
      .single()

    if (staffError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw staffError
    }

    return NextResponse.json({ staff: staffRecord }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/admin/staff]', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to invite staff' }, { status: 500 })
  }
}
