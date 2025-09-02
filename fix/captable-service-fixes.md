# CapTable Service TypeScript Fixes

## Issues Fixed

1. **'phone' field doesn't exist** in investors table - field should be stored in profile_data JSON
2. **'id' field doesn't exist** - investors table uses 'investor_id' as primary key  
3. **'payment_method' field doesn't exist** in subscriptions table - field should be stored in notes or separate table

## Database Schema Reference

### investors table fields:
- `investor_id` (uuid, primary key)
- `name`, `email`, `type`, `wallet_address`
- `kyc_status`, `accreditation_status`, `tax_id_number`
- `tax_residency`, `investor_type`, `onboarding_completed`
- `profile_data` (jsonb) - for additional fields
- `created_at`, `updated_at`

### subscriptions table fields:
- `id` (uuid, primary key)
- `investor_id` (uuid, foreign key)
- `subscription_id`, `fiat_amount`, `currency`
- `confirmed`, `allocated`, `distributed`
- `notes`, `subscription_date`, `project_id`
- `created_at`, `updated_at`

## Fixes Applied

All phone, payment method, and other non-existent fields mapped to appropriate JSON fields or removed.
All investor lookups use 'investor_id' instead of 'id'.
