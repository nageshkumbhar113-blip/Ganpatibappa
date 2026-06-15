// ============================================================
// types/database.ts
// Complete Supabase Database TypeScript types for all 36 tables
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      // ── SHOPS ──────────────────────────────────────────────
      shops: {
        Row: {
          id: string
          slug: string
          name: string
          owner_id: string | null
          logo_url: string | null
          banner_url: string | null
          whatsapp: string | null
          address: string | null
          status: 'active' | 'suspended' | 'deleted'
          domain: string | null
          subdomain: string | null
          theme_config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          owner_id?: string | null
          logo_url?: string | null
          banner_url?: string | null
          whatsapp?: string | null
          address?: string | null
          status?: 'active' | 'suspended' | 'deleted'
          domain?: string | null
          subdomain?: string | null
          theme_config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['shops']['Insert']>
      }

      // ── SHOP_SETTINGS ──────────────────────────────────────
      shop_settings: {
        Row: {
          id: string
          shop_id: string
          about_text: string | null
          contact_email: string | null
          show_prices: boolean
          allow_whatsapp_order: boolean
          meta_title: string | null
          meta_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          about_text?: string | null
          contact_email?: string | null
          show_prices?: boolean
          allow_whatsapp_order?: boolean
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['shop_settings']['Insert']>
      }

      // ── USERS ──────────────────────────────────────────────
      users: {
        Row: {
          id: string
          email: string
          role: 'super_admin' | 'admin' | 'staff' | 'customer'
          shop_id: string | null
          name: string | null
          phone: string | null
          avatar_url: string | null
          fcm_token: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: 'super_admin' | 'admin' | 'staff' | 'customer'
          shop_id?: string | null
          name?: string | null
          phone?: string | null
          avatar_url?: string | null
          fcm_token?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }

      // ── SUBSCRIPTION_PLANS ─────────────────────────────────
      subscription_plans: {
        Row: {
          id: string
          name: 'trial' | 'basic' | 'premium'
          display_name: string
          price: number
          billing_cycle: 'monthly' | 'yearly' | 'one_time'
          duration_days: number
          max_products: number
          max_staff: number
          features: Json
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: 'trial' | 'basic' | 'premium'
          display_name: string
          price?: number
          billing_cycle?: 'monthly' | 'yearly' | 'one_time'
          duration_days?: number
          max_products?: number
          max_staff?: number
          features?: Json
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['subscription_plans']['Insert']>
      }

      // ── SHOP_SUBSCRIPTIONS ─────────────────────────────────
      shop_subscriptions: {
        Row: {
          id: string
          shop_id: string
          plan_id: string
          started_at: string
          expires_at: string
          status: 'trial' | 'active' | 'expired' | 'suspended' | 'cancelled'
          renewal_reminder_sent: boolean
          payment_reference: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          plan_id: string
          started_at?: string
          expires_at: string
          status?: 'trial' | 'active' | 'expired' | 'suspended' | 'cancelled'
          renewal_reminder_sent?: boolean
          payment_reference?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['shop_subscriptions']['Insert']>
      }

      // ── CATEGORIES ─────────────────────────────────────────
      categories: {
        Row: {
          id: string
          shop_id: string
          name: string
          slug: string
          image_url: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          slug: string
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }

      // ── PRODUCTS ───────────────────────────────────────────
      products: {
        Row: {
          id: string
          shop_id: string
          category_id: string | null
          name: string
          slug: string
          description: string | null
          price: number
          offer_price: number | null
          height_cm: number | null
          material: string | null
          weight_kg: number | null
          stock: number
          is_featured: boolean
          is_active: boolean
          images: string[]
          video_url: string | null
          seo_title: string | null
          seo_description: string | null
          seo_keywords: string | null
          og_image_url: string | null
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          category_id?: string | null
          name: string
          slug: string
          description?: string | null
          price?: number
          offer_price?: number | null
          height_cm?: number | null
          material?: string | null
          weight_kg?: number | null
          stock?: number
          is_featured?: boolean
          is_active?: boolean
          images?: string[]
          video_url?: string | null
          seo_title?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          og_image_url?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }

      // ── ORDERS ─────────────────────────────────────────────
      orders: {
        Row: {
          id: string
          shop_id: string
          customer_id: string | null
          order_number: string
          customer_name: string
          customer_phone: string
          customer_email: string | null
          customer_address: string | null
          total_amount: number
          advance_amount: number
          status: 'pending' | 'confirmed' | 'in_production' | 'ready' | 'delivered' | 'cancelled'
          payment_method: 'upi' | 'qr' | 'cod' | 'partial' | 'bank_transfer'
          payment_status: 'pending' | 'partial' | 'paid' | 'refunded'
          payment_screenshot_url: string | null
          pickup_date: string | null
          delivery_date: string | null
          notes: string | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          customer_id?: string | null
          order_number?: string
          customer_name: string
          customer_phone: string
          customer_email?: string | null
          customer_address?: string | null
          total_amount?: number
          advance_amount?: number
          status?: 'pending' | 'confirmed' | 'in_production' | 'ready' | 'delivered' | 'cancelled'
          payment_method?: 'upi' | 'qr' | 'cod' | 'partial' | 'bank_transfer'
          payment_status?: 'pending' | 'partial' | 'paid' | 'refunded'
          payment_screenshot_url?: string | null
          pickup_date?: string | null
          delivery_date?: string | null
          notes?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }

      // ── ORDER_ITEMS ────────────────────────────────────────
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_image: string | null
          price: number
          quantity: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_image?: string | null
          price: number
          quantity?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
      }

      // ── ADVANCE_PAYMENTS ───────────────────────────────────
      advance_payments: {
        Row: {
          id: string
          order_id: string
          shop_id: string
          amount: number
          payment_method: 'upi' | 'qr' | 'bank_transfer' | 'cash'
          screenshot_url: string | null
          status: 'pending' | 'verified' | 'rejected'
          verified_by: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          shop_id: string
          amount: number
          payment_method: 'upi' | 'qr' | 'bank_transfer' | 'cash'
          screenshot_url?: string | null
          status?: 'pending' | 'verified' | 'rejected'
          verified_by?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['advance_payments']['Insert']>
      }

      // ── QUOTATIONS ─────────────────────────────────────────
      quotations: {
        Row: {
          id: string
          shop_id: string
          customer_id: string | null
          quotation_number: string
          customer_name: string
          customer_phone: string
          customer_email: string | null
          items: Json
          total_amount: number
          valid_until: string | null
          status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          customer_id?: string | null
          quotation_number?: string
          customer_name: string
          customer_phone: string
          customer_email?: string | null
          items?: Json
          total_amount?: number
          valid_until?: string | null
          status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['quotations']['Insert']>
      }

      // ── GALLERY ────────────────────────────────────────────
      gallery: {
        Row: {
          id: string
          shop_id: string
          image_url: string
          caption: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          image_url: string
          caption?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['gallery']['Insert']>
      }

      // ── REVIEWS ────────────────────────────────────────────
      reviews: {
        Row: {
          id: string
          shop_id: string
          product_id: string | null
          customer_id: string | null
          customer_name: string
          rating: number
          comment: string | null
          is_approved: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          product_id?: string | null
          customer_id?: string | null
          customer_name: string
          rating: number
          comment?: string | null
          is_approved?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
      }

      // ── WISHLISTS ──────────────────────────────────────────
      wishlists: {
        Row: {
          id: string
          shop_id: string
          customer_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          customer_id: string
          product_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['wishlists']['Insert']>
      }

      // ── RECENTLY_VIEWED ────────────────────────────────────
      recently_viewed: {
        Row: {
          id: string
          shop_id: string
          customer_id: string
          product_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          customer_id: string
          product_id: string
          viewed_at?: string
        }
        Update: Partial<Database['public']['Tables']['recently_viewed']['Insert']>
      }

      // ── INQUIRIES ──────────────────────────────────────────
      inquiries: {
        Row: {
          id: string
          shop_id: string
          name: string
          phone: string
          email: string | null
          product_id: string | null
          message: string
          status: 'new' | 'read' | 'replied' | 'closed'
          admin_reply: string | null
          replied_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          phone: string
          email?: string | null
          product_id?: string | null
          message: string
          status?: 'new' | 'read' | 'replied' | 'closed'
          admin_reply?: string | null
          replied_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['inquiries']['Insert']>
      }

      // ── WHATSAPP_TEMPLATES ─────────────────────────────────
      whatsapp_templates: {
        Row: {
          id: string
          shop_id: string
          name: string
          template: string
          type: 'order_confirm' | 'ready' | 'delivery' | 'custom' | 'festival' | 'reminder'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          template: string
          type?: 'order_confirm' | 'ready' | 'delivery' | 'custom' | 'festival' | 'reminder'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['whatsapp_templates']['Insert']>
      }

      // ── EMAIL_TEMPLATES ────────────────────────────────────
      email_templates: {
        Row: {
          id: string
          shop_id: string
          name: string
          subject: string
          body_html: string
          type: 'order_confirm' | 'ready' | 'delivery' | 'newsletter' | 'renewal' | 'custom'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          subject: string
          body_html: string
          type?: 'order_confirm' | 'ready' | 'delivery' | 'newsletter' | 'renewal' | 'custom'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['email_templates']['Insert']>
      }

      // ── NEWSLETTER_SUBSCRIBERS ─────────────────────────────
      newsletter_subscribers: {
        Row: {
          id: string
          shop_id: string
          email: string
          name: string | null
          is_active: boolean
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          id?: string
          shop_id: string
          email: string
          name?: string | null
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['newsletter_subscribers']['Insert']>
      }

      // ── NOTIFICATIONS ──────────────────────────────────────
      notifications: {
        Row: {
          id: string
          shop_id: string
          title: string
          body: string
          type: 'order' | 'payment' | 'review' | 'inquiry' | 'system' | 'info' | 'stock_low' | 'renewal'
          reference_id: string | null
          is_read: boolean
          target_user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          title: string
          body: string
          type?: 'order' | 'payment' | 'review' | 'inquiry' | 'system' | 'info' | 'stock_low' | 'renewal'
          reference_id?: string | null
          is_read?: boolean
          target_user_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }

      // ── FCM_SUBSCRIPTIONS ──────────────────────────────────
      fcm_subscriptions: {
        Row: {
          id: string
          shop_id: string | null
          user_id: string
          fcm_token: string
          role: 'admin' | 'staff' | 'customer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id?: string | null
          user_id: string
          fcm_token: string
          role: 'admin' | 'staff' | 'customer'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['fcm_subscriptions']['Insert']>
      }

      // ── SCHEDULED_NOTIFICATIONS ───────────────────────────
      scheduled_notifications: {
        Row: {
          id: string
          shop_id: string
          title: string
          body: string
          image_url: string | null
          target: 'all' | 'customers' | 'admins'
          scheduled_at: string
          status: 'pending' | 'sent' | 'failed' | 'cancelled'
          sent_count: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          title: string
          body: string
          image_url?: string | null
          target?: 'all' | 'customers' | 'admins'
          scheduled_at: string
          status?: 'pending' | 'sent' | 'failed' | 'cancelled'
          sent_count?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['scheduled_notifications']['Insert']>
      }

      // ── FESTIVAL_CAMPAIGNS ─────────────────────────────────
      festival_campaigns: {
        Row: {
          id: string
          shop_id: string
          name: string
          festival_name: string | null
          message: string
          image_url: string | null
          target_audience: 'all' | 'customers' | 'subscribers'
          whatsapp_enabled: boolean
          email_enabled: boolean
          push_enabled: boolean
          scheduled_at: string | null
          status: 'draft' | 'scheduled' | 'sent' | 'failed'
          sent_count: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          festival_name?: string | null
          message: string
          image_url?: string | null
          target_audience?: 'all' | 'customers' | 'subscribers'
          whatsapp_enabled?: boolean
          email_enabled?: boolean
          push_enabled?: boolean
          scheduled_at?: string | null
          status?: 'draft' | 'scheduled' | 'sent' | 'failed'
          sent_count?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['festival_campaigns']['Insert']>
      }

      // ── STAFF ──────────────────────────────────────────────
      staff: {
        Row: {
          id: string
          shop_id: string
          user_id: string
          role: 'manager' | 'employee'
          permissions: Json
          is_active: boolean
          invited_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          user_id: string
          role?: 'manager' | 'employee'
          permissions?: Json
          is_active?: boolean
          invited_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['staff']['Insert']>
      }

      // ── LOGIN_HISTORY ──────────────────────────────────────
      login_history: {
        Row: {
          id: string
          user_id: string
          shop_id: string | null
          ip_address: string | null
          user_agent: string | null
          location: string | null
          status: 'success' | 'failed' | 'blocked' | '2fa_required'
          failure_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          shop_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          location?: string | null
          status?: 'success' | 'failed' | 'blocked' | '2fa_required'
          failure_reason?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['login_history']['Insert']>
      }

      // ── TWO_FACTOR_AUTH ────────────────────────────────────
      two_factor_auth: {
        Row: {
          id: string
          user_id: string
          secret: string
          is_enabled: boolean
          backup_codes: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          secret: string
          is_enabled?: boolean
          backup_codes?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['two_factor_auth']['Insert']>
      }

      // ── IP_RESTRICTIONS ────────────────────────────────────
      ip_restrictions: {
        Row: {
          id: string
          shop_id: string
          ip_address: string
          action: 'allow' | 'block'
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          ip_address: string
          action?: 'allow' | 'block'
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['ip_restrictions']['Insert']>
      }

      // ── AUDIT_LOGS ─────────────────────────────────────────
      audit_logs: {
        Row: {
          id: string
          shop_id: string | null
          user_id: string | null
          staff_id: string | null
          action: string
          table_name: string | null
          record_id: string | null
          old_value: Json | null
          new_value: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shop_id?: string | null
          user_id?: string | null
          staff_id?: string | null
          action: string
          table_name?: string | null
          record_id?: string | null
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }

      // ── ACTIVITY_LOGS ──────────────────────────────────────
      activity_logs: {
        Row: {
          id: string
          shop_id: string
          user_id: string | null
          description: string
          category: 'product' | 'order' | 'customer' | 'settings' | 'payment' | 'staff' | 'security' | 'general'
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          user_id?: string | null
          description: string
          category?: 'product' | 'order' | 'customer' | 'settings' | 'payment' | 'staff' | 'security' | 'general'
          ip_address?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['activity_logs']['Insert']>
      }

      // ── MARKETING_SETTINGS ─────────────────────────────────
      marketing_settings: {
        Row: {
          id: string
          shop_id: string
          google_analytics_id: string | null
          google_search_console_code: string | null
          facebook_pixel_id: string | null
          og_default_image: string | null
          robots_txt_custom: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          google_analytics_id?: string | null
          google_search_console_code?: string | null
          facebook_pixel_id?: string | null
          og_default_image?: string | null
          robots_txt_custom?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['marketing_settings']['Insert']>
      }

      // ── DOMAIN_MAPPINGS ────────────────────────────────────
      domain_mappings: {
        Row: {
          id: string
          shop_id: string
          domain: string
          is_primary: boolean
          dns_verified: boolean
          dns_txt_record: string | null
          ssl_status: 'pending' | 'active' | 'expiring' | 'expired' | 'error'
          ssl_expires_at: string | null
          domain_expires_at: string | null
          last_checked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          domain: string
          is_primary?: boolean
          dns_verified?: boolean
          dns_txt_record?: string | null
          ssl_status?: 'pending' | 'active' | 'expiring' | 'expired' | 'error'
          ssl_expires_at?: string | null
          domain_expires_at?: string | null
          last_checked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['domain_mappings']['Insert']>
      }

      // ── CLOUDINARY_SETTINGS ────────────────────────────────
      cloudinary_settings: {
        Row: {
          id: string
          shop_id: string
          cloud_name: string
          api_key: string
          api_secret: string
          upload_limit_mb: number
          is_active: boolean
          last_tested_at: string | null
          test_status: 'success' | 'failed' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          cloud_name: string
          api_key: string
          api_secret: string
          upload_limit_mb?: number
          is_active?: boolean
          last_tested_at?: string | null
          test_status?: 'success' | 'failed' | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['cloudinary_settings']['Insert']>
      }

      // ── CLOUDINARY_USAGE ───────────────────────────────────
      cloudinary_usage: {
        Row: {
          id: string
          shop_id: string
          storage_bytes: number
          bandwidth_bytes: number
          month_year: string
          last_updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          storage_bytes?: number
          bandwidth_bytes?: number
          month_year: string
          last_updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['cloudinary_usage']['Insert']>
      }

      // ── PWA_SETTINGS ───────────────────────────────────────
      pwa_settings: {
        Row: {
          id: string
          shop_id: string
          app_name: string
          short_name: string
          theme_color: string
          background_color: string
          icon_url: string | null
          splash_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          app_name: string
          short_name: string
          theme_color?: string
          background_color?: string
          icon_url?: string | null
          splash_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['pwa_settings']['Insert']>
      }

      // ── SHOP_BACKUPS ───────────────────────────────────────
      shop_backups: {
        Row: {
          id: string
          shop_id: string
          backup_url: string | null
          size_bytes: number | null
          version: string | null
          status: 'pending' | 'completed' | 'failed'
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          backup_url?: string | null
          size_bytes?: number | null
          version?: string | null
          status?: 'pending' | 'completed' | 'failed'
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['shop_backups']['Insert']>
      }

      // ── SHOP_CLONE_HISTORY ─────────────────────────────────
      shop_clone_history: {
        Row: {
          id: string
          source_shop_id: string
          target_shop_id: string
          cloned_items: Json
          cloned_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source_shop_id: string
          target_shop_id: string
          cloned_items?: Json
          cloned_by?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['shop_clone_history']['Insert']>
      }
    }

    Functions: {
      is_super_admin: { Args: Record<never, never>; Returns: boolean }
      get_my_role: { Args: Record<never, never>; Returns: string }
      get_my_shop_id: { Args: Record<never, never>; Returns: string }
      is_subscription_active: { Args: { p_shop_id: string }; Returns: boolean }
      shop_has_feature: { Args: { p_shop_id: string; p_feature: string }; Returns: boolean }
      get_plan_product_limit: { Args: { p_shop_id: string }; Returns: number }
      setup_new_shop: {
        Args: {
          p_shop_id: string
          p_shop_name: string
          p_cloud_name: string
          p_cloud_api_key: string
          p_cloud_secret: string
        }
        Returns: void
      }
      suspend_expired_shops: { Args: Record<never, never>; Returns: number }
    }
  }
}

// ── Convenience Row types ───────────────────────────────────
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// ── Named type aliases ──────────────────────────────────────
export type Shop              = Tables<'shops'>
export type ShopSettings      = Tables<'shop_settings'>
export type User              = Tables<'users'>
export type SubscriptionPlan  = Tables<'subscription_plans'>
export type ShopSubscription  = Tables<'shop_subscriptions'>
export type Category          = Tables<'categories'>
export type Product           = Tables<'products'>
export type Order             = Tables<'orders'>
export type OrderItem         = Tables<'order_items'>
export type AdvancePayment    = Tables<'advance_payments'>
export type Quotation         = Tables<'quotations'>
export type Gallery           = Tables<'gallery'>
export type Review            = Tables<'reviews'>
export type Wishlist          = Tables<'wishlists'>
export type RecentlyViewed    = Tables<'recently_viewed'>
export type Inquiry           = Tables<'inquiries'>
export type WhatsAppTemplate  = Tables<'whatsapp_templates'>
export type EmailTemplate     = Tables<'email_templates'>
export type NewsletterSubscriber = Tables<'newsletter_subscribers'>
export type Notification      = Tables<'notifications'>
export type FcmSubscription   = Tables<'fcm_subscriptions'>
export type ScheduledNotification = Tables<'scheduled_notifications'>
export type FestivalCampaign  = Tables<'festival_campaigns'>
export type Staff             = Tables<'staff'>
export type LoginHistory      = Tables<'login_history'>
export type TwoFactorAuth     = Tables<'two_factor_auth'>
export type IpRestriction     = Tables<'ip_restrictions'>
export type AuditLog          = Tables<'audit_logs'>
export type ActivityLog       = Tables<'activity_logs'>
export type MarketingSettings = Tables<'marketing_settings'>
export type DomainMapping     = Tables<'domain_mappings'>
export type CloudinarySettings = Tables<'cloudinary_settings'>
export type CloudinaryUsage   = Tables<'cloudinary_usage'>
export type PwaSettings       = Tables<'pwa_settings'>
export type ShopBackup        = Tables<'shop_backups'>
export type ShopCloneHistory  = Tables<'shop_clone_history'>

// ── Staff Permissions ───────────────────────────────────────
export interface StaffPermissions {
  products:  boolean
  orders:    boolean
  customers: boolean
  gallery:   boolean
  reports:   boolean
  settings:  boolean
  staff:     boolean
}

// ── Plan Features ───────────────────────────────────────────
export interface PlanFeatures {
  custom_domain:       boolean
  bulk_import:         boolean
  invoice_pdf:         boolean
  quotation:           boolean
  full_seo:            boolean
  google_analytics:    boolean
  facebook_pixel:      boolean
  campaigns:           boolean
  bulk_notifications:  boolean
  two_fa:              boolean
  ip_restrictions:     boolean
  shop_backup:         boolean
  clone_shop:          boolean
  reports_excel:       boolean
  cloudinary_own:      boolean
}

// ── Shop with subscription ──────────────────────────────────
export interface ShopWithSubscription extends Shop {
  shop_subscriptions: ShopSubscription & {
    subscription_plans: SubscriptionPlan
  }
}

// ── Order with items ────────────────────────────────────────
export interface OrderWithItems extends Order {
  order_items: OrderItem[]
}

// ── Product with category ───────────────────────────────────
export interface ProductWithCategory extends Product {
  categories: Category | null
}
