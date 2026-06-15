// Script to push Drizzle schema to the database
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";
import { sql } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set");
}

const client = postgres(databaseUrl, { max: 1 });
const db = drizzle(client, { schema });

async function pushSchema() {
  console.log("🚀 Pushing schema to database...");

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE,
      password TEXT,
      name TEXT NOT NULL,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(100),
      address TEXT,
      google_id TEXT,
      apple_id TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS user_addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      type VARCHAR(50) NOT NULL,
      title VARCHAR(100) NOT NULL,
      address TEXT NOT NULL,
      details TEXT,
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      icon VARCHAR(100) NOT NULL,
      image TEXT,
      type VARCHAR(50) DEFAULT 'primary',
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS restaurants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      image TEXT NOT NULL,
      phone VARCHAR(20),
      rating VARCHAR(10) DEFAULT '0.0',
      review_count INTEGER DEFAULT 0,
      delivery_time VARCHAR(50) NOT NULL,
      is_open BOOLEAN NOT NULL DEFAULT true,
      minimum_order DECIMAL(10,2) DEFAULT 0,
      delivery_fee DECIMAL(10,2) DEFAULT 0,
      per_km_fee DECIMAL(10,2) DEFAULT 0,
      commission_rate DECIMAL(5,2) DEFAULT 0,
      category_id UUID REFERENCES categories(id),
      opening_time VARCHAR(50) DEFAULT '08:00',
      closing_time VARCHAR(50) DEFAULT '23:00',
      working_days VARCHAR(50) DEFAULT '0,1,2,3,4,5,6',
      is_temporarily_closed BOOLEAN DEFAULT false,
      temporary_close_reason TEXT,
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      address TEXT,
      is_featured BOOLEAN DEFAULT false,
      is_new BOOLEAN DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS restaurant_sections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID REFERENCES restaurants(id),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS menu_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      brand VARCHAR(100),
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      original_price DECIMAL(10,2),
      image TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      sizes TEXT,
      colors TEXT,
      sales_count INTEGER DEFAULT 0,
      rating VARCHAR(10) DEFAULT '0.0',
      review_count INTEGER DEFAULT 0,
      is_available BOOLEAN NOT NULL DEFAULT true,
      is_special_offer BOOLEAN NOT NULL DEFAULT false,
      is_featured BOOLEAN DEFAULT false,
      is_new BOOLEAN DEFAULT false,
      restaurant_id UUID REFERENCES restaurants(id)
    )`,
    `CREATE TABLE IF NOT EXISTS drivers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      is_available BOOLEAN NOT NULL DEFAULT true,
      is_active BOOLEAN NOT NULL DEFAULT true,
      commission_rate DECIMAL(5,2) DEFAULT 70,
      payment_mode VARCHAR(20) NOT NULL DEFAULT 'commission',
      salary_amount DECIMAL(10,2) DEFAULT 0,
      email VARCHAR(100),
      vehicle_type VARCHAR(50),
      vehicle_number VARCHAR(50),
      current_location VARCHAR(200),
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      earnings DECIMAL(10,2) DEFAULT 0,
      completed_orders INTEGER NOT NULL DEFAULT 0,
      average_rating DECIMAL(3,2) DEFAULT 0.00,
      review_count INTEGER DEFAULT 0,
      allow_profile_edit BOOLEAN DEFAULT true,
      can_view_wallet BOOLEAN DEFAULT true,
      can_view_stats BOOLEAN DEFAULT true,
      can_toggle_availability BOOLEAN DEFAULT true,
      notes TEXT,
      join_date TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_number VARCHAR(50) NOT NULL UNIQUE,
      customer_name VARCHAR(100) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      customer_email VARCHAR(100),
      customer_id UUID REFERENCES users(id),
      delivery_address TEXT NOT NULL,
      customer_location_lat DECIMAL(10,8),
      customer_location_lng DECIMAL(11,8),
      notes TEXT,
      payment_method VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      items TEXT NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      delivery_fee DECIMAL(10,2) NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      estimated_time VARCHAR(50) DEFAULT '30-45 دقيقة',
      delivery_preference VARCHAR(20) DEFAULT 'now',
      scheduled_date VARCHAR(50),
      scheduled_time_slot VARCHAR(100),
      driver_earnings DECIMAL(10,2) DEFAULT 0,
      driver_commission_rate DECIMAL(5,2) DEFAULT 0,
      driver_commission_amount DECIMAL(10,2) DEFAULT 0,
      commission_processed BOOLEAN NOT NULL DEFAULT false,
      restaurant_earnings DECIMAL(10,2) DEFAULT 0,
      company_earnings DECIMAL(10,2) DEFAULT 0,
      distance DECIMAL(10,2) DEFAULT 0,
      restaurant_id UUID REFERENCES restaurants(id),
      restaurant_name VARCHAR(200),
      restaurant_phone VARCHAR(20),
      driver_id UUID REFERENCES drivers(id),
      is_rated BOOLEAN NOT NULL DEFAULT false,
      is_wasel_li BOOLEAN NOT NULL DEFAULT false,
      pickup_address TEXT,
      pickup_location_lat DECIMAL(10,8),
      pickup_location_lng DECIMAL(11,8),
      pickup_phone VARCHAR(20),
      pickup_name VARCHAR(100),
      wasel_li_item_type VARCHAR(100),
      is_scheduled BOOLEAN NOT NULL DEFAULT false,
      scheduled_date_time TIMESTAMP,
      is_scheduled_order_sent BOOLEAN NOT NULL DEFAULT false,
      cancel_reason TEXT,
      discount DECIMAL(10,2) DEFAULT 0,
      coupon_code VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS special_offers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      image TEXT NOT NULL,
      discount_percent INTEGER,
      discount_amount DECIMAL(10,2),
      minimum_order DECIMAL(10,2) DEFAULT 0,
      restaurant_id UUID REFERENCES restaurants(id),
      category_id UUID REFERENCES categories(id),
      section_id UUID REFERENCES restaurant_sections(id),
      valid_until TIMESTAMP,
      show_badge BOOLEAN DEFAULT true,
      badge_text_1 VARCHAR(50) DEFAULT 'طازج يومياً',
      badge_text_2 VARCHAR(50) DEFAULT 'عروض حصرية',
      menu_item_id UUID REFERENCES menu_items(id),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS admin_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      username VARCHAR(50) UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      phone VARCHAR(20),
      password TEXT,
      user_type VARCHAR(50) NOT NULL DEFAULT 'admin',
      permissions TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS system_settings_table (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR(100) UNIQUE NOT NULL,
      value TEXT NOT NULL,
      category VARCHAR(100) DEFAULT 'general',
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS ratings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES orders(id),
      restaurant_id UUID REFERENCES restaurants(id),
      customer_name VARCHAR(100) NOT NULL,
      customer_phone VARCHAR(20),
      rating INTEGER NOT NULL,
      comment TEXT,
      is_approved BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      recipient_type VARCHAR(50) NOT NULL,
      recipient_id TEXT,
      order_id UUID,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS order_tracking (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES orders(id) NOT NULL,
      status VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_by_type VARCHAR(50) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_phone VARCHAR(20) NOT NULL UNIQUE,
      balance DECIMAL(10,2) DEFAULT 0.00,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS wallet_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      wallet_id UUID REFERENCES wallets(id),
      type VARCHAR(50) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      description TEXT,
      order_id UUID REFERENCES orders(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS restaurant_earnings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID REFERENCES restaurants(id),
      owner_name VARCHAR(100) NOT NULL,
      owner_phone VARCHAR(20) NOT NULL,
      total_earnings DECIMAL(10,2) DEFAULT 0.00,
      pending_amount DECIMAL(10,2) DEFAULT 0.00,
      paid_amount DECIMAL(10,2) DEFAULT 0.00,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS cart (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) NOT NULL,
      menu_item_id UUID REFERENCES menu_items(id) NOT NULL,
      restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      special_instructions TEXT,
      added_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS favorites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) NOT NULL,
      restaurant_id UUID REFERENCES restaurants(id),
      menu_item_id UUID REFERENCES menu_items(id),
      added_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS driver_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID REFERENCES drivers(id) NOT NULL,
      order_id UUID REFERENCES orders(id) NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS driver_earnings_table (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID REFERENCES drivers(id) NOT NULL,
      total_earned DECIMAL(10,2) DEFAULT 0,
      withdrawn DECIMAL(10,2) DEFAULT 0,
      pending DECIMAL(10,2) DEFAULT 0,
      last_paid_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS driver_wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID REFERENCES drivers(id) NOT NULL UNIQUE,
      balance DECIMAL(10,2) DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS driver_balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID REFERENCES drivers(id) NOT NULL UNIQUE,
      total_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
      available_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
      withdrawn_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      pending_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS driver_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID REFERENCES drivers(id) NOT NULL,
      type VARCHAR(50) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      description TEXT,
      balance_before DECIMAL(10,2) DEFAULT 0,
      balance_after DECIMAL(10,2) DEFAULT 0,
      reference_id VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS driver_commissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID REFERENCES drivers(id) NOT NULL,
      order_id UUID REFERENCES orders(id) NOT NULL,
      order_amount DECIMAL(10,2) NOT NULL,
      commission_rate DECIMAL(5,2) NOT NULL,
      commission_amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS driver_withdrawals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID REFERENCES drivers(id) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      bank_details TEXT,
      admin_notes TEXT,
      processed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS restaurant_wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID REFERENCES restaurants(id) NOT NULL UNIQUE,
      balance DECIMAL(10,2) DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS commission_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL,
      entity_id UUID,
      commission_percent DECIMAL(5,2) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(50) NOT NULL,
      entity_id UUID NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      bank_details TEXT,
      admin_notes TEXT,
      rejection_reason TEXT,
      approved_by UUID,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS driver_work_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID REFERENCES drivers(id) NOT NULL,
      start_time TIMESTAMP NOT NULL DEFAULT NOW(),
      end_time TIMESTAMP,
      is_active BOOLEAN NOT NULL DEFAULT true,
      total_deliveries INTEGER DEFAULT 0,
      total_earnings DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS employees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      phone VARCHAR(20) NOT NULL,
      position VARCHAR(50) NOT NULL,
      department VARCHAR(50) NOT NULL,
      branch VARCHAR(50) DEFAULT 'الفرع الرئيسي',
      salary DECIMAL(10,2) NOT NULL,
      hire_date TIMESTAMP NOT NULL DEFAULT NOW(),
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      address TEXT,
      emergency_contact VARCHAR(100),
      permissions TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES employees(id) NOT NULL,
      date TIMESTAMP NOT NULL DEFAULT NOW(),
      check_in TIMESTAMP,
      check_out TIMESTAMP,
      status VARCHAR(20) NOT NULL,
      hours_worked DECIMAL(4,2),
      notes TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS leave_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES employees(id) NOT NULL,
      type VARCHAR(50) NOT NULL,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      reason TEXT,
      submitted_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS loyalty_points (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) NOT NULL,
      total_points INTEGER NOT NULL DEFAULT 0,
      redeemed_points INTEGER NOT NULL DEFAULT 0,
      available_points INTEGER NOT NULL DEFAULT 0,
      tier VARCHAR(20) NOT NULL DEFAULT 'bronze',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) NOT NULL,
      order_id UUID REFERENCES orders(id),
      type VARCHAR(30) NOT NULL,
      points INTEGER NOT NULL,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      customer_name VARCHAR(100) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      order_id UUID REFERENCES orders(id),
      category VARCHAR(50) NOT NULL,
      subject VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'open',
      priority VARCHAR(20) NOT NULL DEFAULT 'normal',
      assigned_to UUID REFERENCES admin_users(id),
      admin_response TEXT,
      resolved_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS referral_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) NOT NULL,
      code VARCHAR(20) NOT NULL UNIQUE,
      total_referrals INTEGER NOT NULL DEFAULT 0,
      total_earned DECIMAL(10,2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS referral_usages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referral_code_id UUID REFERENCES referral_codes(id) NOT NULL,
      referrer_id UUID REFERENCES users(id) NOT NULL,
      referred_user_id UUID REFERENCES users(id) NOT NULL,
      points_awarded INTEGER DEFAULT 0,
      discount_awarded DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS device_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      driver_id UUID REFERENCES drivers(id),
      token TEXT NOT NULL UNIQUE,
      platform VARCHAR(20) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS restaurant_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      phone VARCHAR(20) NOT NULL,
      password TEXT NOT NULL,
      role VARCHAR(30) NOT NULL DEFAULT 'owner',
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_login_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS delivery_fee_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID REFERENCES restaurants(id),
      base_fee DECIMAL(10,2) DEFAULT 0,
      per_km_fee DECIMAL(10,2) DEFAULT 0,
      minimum_fee DECIMAL(10,2) DEFAULT 0,
      maximum_fee DECIMAL(10,2),
      free_delivery_threshold DECIMAL(10,2),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS delivery_zones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      polygon TEXT,
      fee DECIMAL(10,2) DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS financial_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      period VARCHAR(50) NOT NULL,
      total_revenue DECIMAL(10,2) DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      total_drivers_earnings DECIMAL(10,2) DEFAULT 0,
      total_restaurants_earnings DECIMAL(10,2) DEFAULT 0,
      company_profit DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS geo_zones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      polygon TEXT NOT NULL,
      fee DECIMAL(10,2) DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS delivery_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      condition_type VARCHAR(50) NOT NULL,
      condition_value DECIMAL(10,2),
      fee_type VARCHAR(50) NOT NULL,
      fee_value DECIMAL(10,2) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS delivery_discounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      value DECIMAL(10,2) NOT NULL,
      min_order_amount DECIMAL(10,2) DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      valid_until TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id VARCHAR(100) NOT NULL,
      sender_id VARCHAR(100) NOT NULL,
      sender_type VARCHAR(50) NOT NULL,
      receiver_id VARCHAR(100) NOT NULL,
      receiver_type VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(100),
      performed_by VARCHAR(100) NOT NULL,
      performed_by_type VARCHAR(50) NOT NULL,
      details TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS payment_gateways (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      config TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS payment_methods (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      icon TEXT,
      description TEXT,
      instructions TEXT,
      requires_document BOOLEAN DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS payment_method_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_method_id UUID REFERENCES payment_methods(id) NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      document_type VARCHAR(50) NOT NULL,
      is_required BOOLEAN DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS coupons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) NOT NULL UNIQUE,
      type VARCHAR(50) NOT NULL,
      value DECIMAL(10,2) NOT NULL,
      minimum_order DECIMAL(10,2) DEFAULT 0,
      maximum_discount DECIMAL(10,2),
      usage_limit INTEGER,
      used_count INTEGER DEFAULT 0,
      user_limit INTEGER DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT true,
      valid_from TIMESTAMP,
      valid_until TIMESTAMP,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS coupon_usages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      coupon_id UUID REFERENCES coupons(id) NOT NULL,
      user_id UUID REFERENCES users(id),
      user_phone VARCHAR(20),
      order_id UUID REFERENCES orders(id),
      discount_amount DECIMAL(10,2) NOT NULL,
      used_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS wasalni_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      request_number VARCHAR(50) NOT NULL UNIQUE,
      customer_name VARCHAR(100) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      customer_id UUID REFERENCES users(id),
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      from_lat DECIMAL(10,8),
      from_lng DECIMAL(11,8),
      to_lat DECIMAL(10,8),
      to_lng DECIMAL(11,8),
      order_type VARCHAR(50) DEFAULT 'delivery',
      notes TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      driver_id UUID REFERENCES drivers(id),
      estimated_fee DECIMAL(10,2),
      scheduled_date VARCHAR(50),
      scheduled_time VARCHAR(50),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
  ];

  for (const tableSQL of tables) {
    try {
      await client.unsafe(tableSQL);
    } catch (err: any) {
      console.error(`Error creating table:`, err.message);
    }
  }

  console.log("✅ Schema push complete!");
  await client.end();
}

pushSchema().catch((err) => {
  console.error("Schema push failed:", err);
  process.exit(1);
});
