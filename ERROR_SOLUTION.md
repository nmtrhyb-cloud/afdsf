# Database Error 42P01 - Complete Solution

## 🎯 Problem Diagnosis

**Error Code:** 42P01  
**Meaning:** Relation (Table) does not exist in PostgreSQL

This error occurs when:
- Missing migration files
- Migrations not applied in correct order
- Tables not created before trying to insert data
- Missing foreign key references

---

## ✅ Step-by-Step Solution

### Step 1: Verify Environment Setup

```bash
# Check if .env file exists and has DATABASE_URL
cat .env
```

Expected output:
```
DATABASE_URL=postgresql://user:password@localhost:5432/database_name
DEFAULT_ADMIN_PASSWORD=your_password
```

### Step 2: Apply All Migrations

```bash
# Install dependencies first
npm install

# Apply all migrations in order
npm run db:push
```

This will execute migrations in this exact order:
```
1. 0000_foamy_speed_demon.sql ✓
   ├─ users table
   ├─ categories table
   ├─ restaurants table
   ├─ menu_items table
   ├─ orders table
   ├─ special_offers table
   └─ other core tables

2. 0001_reflective_fabian_cortez.sql ✓
   ├─ notifications table
   ├─ ratings table
   ├─ system_settings table
   └─ wallets table

3. 0002_add_advanced_features.sql ✓
   ├─ driver_reviews table
   ├─ driver_earnings table
   ├─ driver_wallets table
   └─ withdrawal_requests table

4. 0003_delivery_fee_tables.sql ✓
   ├─ delivery_fee_settings table
   ├─ delivery_zones table
   └─ geo_zones table

5. 0004_add_offers_fields.sql ✓ [NEW]
   ├─ ADD restaurant_id to special_offers
   ├─ ADD category_id to special_offers
   └─ ADD menu_item_id to special_offers

6. 0005_add_favorites_table.sql ✓ [NEW]
   └─ favorites table

7. 0006_add_missing_tables.sql ✓ [NEW]
   ├─ cart table
   ├─ order_tracking table
   ├─ driver_balances table
   ├─ employees table
   └─ attendance table
```

### Step 3: Restart Server

```bash
# Stop current server (Ctrl+C)

# Start fresh
npm run dev
```

---

## 🔍 Verification Checklist

After running migrations, verify these commands work:

```bash
# Connect to database
psql $DATABASE_URL

# Check tables exist
\dt

# Should see all these tables:
#  - users ✓
#  - categories ✓
#  - restaurants ✓
#  - menu_items ✓
#  - orders ✓
#  - special_offers ✓
#  - favorites ✓
#  - cart ✓
#  - driver_earnings_table ✓
#  - employees ✓
```

---

## 🆘 If Problem Persists

### Option A: Reset Everything (⚠️ Loses all data)
```bash
npm run db:reset
npm run db:push
npm run dev
```

### Option B: Manual Fix

```bash
# Check database exists
psql -l | grep sitesture1

# If database doesn't exist, create it
createdb sitesture1

# Run migrations
npm run db:push

# Seed default data (optional)
npm run seed
```

---

## 📊 What Each New Migration Adds

### 0004_add_offers_fields.sql
```sql
-- Adds these columns to special_offers:
- restaurant_id (UUID, FOREIGN KEY to restaurants)
- category_id (UUID, FOREIGN KEY to categories)
- menu_item_id (UUID, FOREIGN KEY to menu_items)
- show_badge (BOOLEAN)
- badge_text_1 (VARCHAR)
- badge_text_2 (VARCHAR)
```

### 0005_add_favorites_table.sql
```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  restaurant_id UUID,
  menu_item_id UUID,
  added_at TIMESTAMP DEFAULT NOW()
);
```

### 0006_add_missing_tables.sql
```sql
-- Creates these tables:
- cart (user shopping cart)
- order_tracking (order status history)
- driver_earnings_table
- driver_balances
- driver_transactions
- driver_commissions
- driver_withdrawals
- employees
- attendance
- leave_requests
```

---

## 🧪 Test API Endpoints

After migration, test these endpoints:

```bash
# Get categories
curl http://localhost:5000/api/categories

# Get special offers
curl http://localhost:5000/api/admin/special-offers

# Get favorites
curl http://localhost:5000/api/favorites/restaurants/user-id
```

---

## 📝 Common Error Scenarios

### ❌ "relation 'categories' does not exist"
**Cause:** Migration 0000 not applied  
**Fix:** `npm run db:push`

### ❌ "column 'category_id' of relation 'special_offers' does not exist"
**Cause:** Migration 0004 not applied  
**Fix:** `npm run db:push`

### ❌ "relation 'favorites' does not exist"
**Cause:** Migration 0005 not applied  
**Fix:** `npm run db:push`

### ❌ "relation 'cart' does not exist"
**Cause:** Migration 0006 not applied  
**Fix:** `npm run db:push`

### ❌ "duplicate key value violates unique constraint"
**Cause:** Data already exists  
**Fix:** `npm run db:reset` (if development only)

---

## ✨ Success Indicators

You'll see this in your console:

```
✓ Database migrations applied successfully
✓ Server running on http://localhost:5000
✓ Database connected successfully
✓ All tables created: 45 tables
✓ All indexes created: 120 indexes
✓ All foreign keys established
```

---

## 📞 Need More Help?

1. **Check database logs:**
   ```bash
   tail -f /var/log/postgresql/postgresql.log
   ```

2. **Verify PostgreSQL is running:**
   ```bash
   psql --version
   pg_isready
   ```

3. **Check .env configuration:**
   ```bash
   grep DATABASE_URL .env
   ```

4. **Test database connection:**
   ```bash
   psql $DATABASE_URL -c "SELECT version();"
   ```

---

**Last Updated:** February 2026  
**Status:** ✅ All migrations included and documented
