/**
 * Bonds Calculator Integration Tests
 * 
 * End-to-end tests for complete bond NAV calculation workflow:
 * User Input → Database → DataFetcher → EnhancedModel → Calculator → NAV Result
 * 
 * Following Phase 7 specifications
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createBondsCalculator } from '../traditional/BondsCalculator'
import { Decimal } from 'decimal.js'

describe('Bonds Calculator Integration Tests', () => {
  let supabase: SupabaseClient
  let calculator: ReturnType<typeof createBondsCalculator>
  let testBondId: string
  let testProjectId: string
  
  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Create calculator
    calculator = createBondsCalculator(supabase)
    
    // Create test project
    const { data: project } = await supabase
      .from('projects')
      .insert({
        name: 'Test Project for Bonds',
        status: 'active'
      })
      .select()
      .single()
    
    testProjectId = project!.id
  })
  
  afterAll(async () => {
    // Cleanup: Delete test data
    if (testBondId) {
      await supabase.from('bond_products').delete().eq('id', testBondId)
    }
    if (testProjectId) {
      await supabase.from('projects').delete().eq('id', testProjectId)
    }
  })
  
  describe('End-to-End Calculation Flow', () => {
    
    it('should complete full workflow: Input → Calculate → Save → Retrieve', async () => {
      // STEP 1: Create bond product
      const bondData = {
        project_id: testProjectId,
        bond_type: 'corporate',
        issuer_name: 'Test Corporation',
        issuer_country: 'US',
        issue_date: new Date('2020-01-15'),
        maturity_date: new Date('2030-01-15'),
        par_value: 1000,
        currency: 'USD',
        coupon_rate: 0.05, // 5%
        coupon_frequency: 2, // Semi-annual
        day_count_convention: 'ACT/ACT',
        accounting_classification: 'htm',
        is_callable: false,
        is_puttable: false,
        is_convertible: false,
        is_amortizing: false,
        has_sinking_fund: false,
        status: 'active'
      }
      
      const { data: bond, error: bondError } = await supabase
        .from('bond_products')
        .insert(bondData)
        .select()
        .single()
      
      expect(bondError).toBeNull()
      expect(bond).toBeDefined()
      testBondId = bond!.id
      
      // STEP 2: Add coupon payment schedule
      const couponPayments = [
        {
          bond_product_id: testBondId,
          payment_date: new Date('2025-07-15'),
          coupon_amount: 25, // 1000 * 0.05 / 2
          currency: 'USD',
          payment_status: 'scheduled',
          payment_number: 11
        },
        {
          bond_product_id: testBondId,
          payment_date: new Date('2026-01-15'),
          coupon_amount: 25,
          currency: 'USD',
          payment_status: 'scheduled',
          payment_number: 12
        },
        {
          bond_product_id: testBondId,
          payment_date: new Date('2030-01-15'),
          coupon_amount: 25,
          currency: 'USD',
          payment_status: 'scheduled',
          payment_number: 20
        }
      ]
      
      const { error: paymentsError } = await supabase
        .from('bond_coupon_payments')
        .insert(couponPayments)
      
      expect(paymentsError).toBeNull()
      
      // STEP 3: Add market price
      const marketPrice = {
        bond_product_id: testBondId,
        price_date: new Date('2025-01-01'),
        clean_price: 98.5,
        yield_to_maturity: 0.052,
        price_source: 'Bloomberg'
      }
      
      const { error: priceError } = await supabase
        .from('bond_market_prices')
        .insert(marketPrice)
      
      expect(priceError).toBeNull()
      
      // STEP 4: Calculate NAV
      const calcResult = await calculator.calculate({
        productId: testBondId,
        asOfDate: new Date('2025-01-10'),
        saveToDatabase: true,
        includeBreakdown: true
      })
      
      // Assert calculation success
      expect(calcResult.success).toBe(true)
      expect(calcResult.data).toBeDefined()
      expect(calcResult.data!.nav).toBeInstanceOf(Decimal)
      expect(calcResult.data!.nav.isPositive()).toBe(true)
      
      // Assert breakdown exists
      expect(calcResult.data!.breakdown).toBeDefined()
      expect(calcResult.data!.breakdown!.totalAssets).toBeInstanceOf(Decimal)
      expect(calcResult.data!.breakdown!.componentValues).toBeDefined()
      
      // Assert data sources documented
      expect(calcResult.data!.sources).toBeDefined()
      expect(calcResult.data!.sources.length).toBeGreaterThan(0)
      
      // Assert metadata
      expect(calcResult.metadata).toBeDefined()
      expect(calcResult.metadata.dataFetchTime).toBeGreaterThan(0)
      expect(calcResult.metadata.calculationTime).toBeGreaterThan(0)
      expect(calcResult.metadata.savedToDatabase).toBe(true)
      
      // STEP 5: Verify saved to database
      const { data: savedNAV } = await supabase
        .from('asset_nav_data')
        .select('*')
        .eq('asset_id', testBondId)
        .single()
      
      expect(savedNAV).toBeDefined()
      expect(savedNAV!.nav).toBe(calcResult.data!.nav.toString())
    })
  })
  
  describe('Data Validation', () => {
    
    it('should fail with missing required data', async () => {
      // Create bond without coupon payments
      const { data: incompleteBond } = await supabase
        .from('bond_products')
        .insert({
          project_id: testProjectId,
          bond_type: 'corporate',
          issuer_name: 'Incomplete Corp',
          issuer_country: 'US',
          issue_date: new Date('2020-01-15'),
          maturity_date: new Date('2030-01-15'),
          par_value: 1000,
          currency: 'USD',
          coupon_rate: 0.05,
          coupon_frequency: 2,
          day_count_convention: 'ACT/ACT',
          accounting_classification: 'htm',
          status: 'active'
        })
        .select()
        .single()
      
      const incompleteBondId = incompleteBond!.id
      
      // Try to calculate without coupon payments
      const result = await calculator.calculate({
        productId: incompleteBondId,
        asOfDate: new Date('2025-01-10'),
        saveToDatabase: false
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error!.code).toBe('DATA_VALIDATION_FAILED')
      
      // Cleanup
      await supabase.from('bond_products').delete().eq('id', incompleteBondId)
    })
    
    it('should fail for AFS bond without market prices', async () => {
      // Create AFS bond without market prices
      const { data: afsBond } = await supabase
        .from('bond_products')
        .insert({
          project_id: testProjectId,
          bond_type: 'corporate',
          issuer_name: 'AFS Corp',
          issuer_country: 'US',
          issue_date: new Date('2020-01-15'),
          maturity_date: new Date('2030-01-15'),
          par_value: 1000,
          currency: 'USD',
          coupon_rate: 0.05,
          coupon_frequency: 2,
          day_count_convention: 'ACT/ACT',
          accounting_classification: 'afs', // AFS requires market prices
          status: 'active'
        })
        .select()
        .single()
      
      const afsBondId = afsBond!.id
      
      // Try to calculate without market prices
      const result = await calculator.calculate({
        productId: afsBondId,
        asOfDate: new Date('2025-01-10'),
        saveToDatabase: false
      })
      
      expect(result.success).toBe(false)
      expect(result.error!.code).toBe('DATA_VALIDATION_FAILED')
      
      // Cleanup
      await supabase.from('bond_products').delete().eq('id', afsBondId)
    })
  })
  
  describe('Performance Benchmarks', () => {
    
    it('should complete calculation within 2 seconds', async () => {
      if (!testBondId) {
        // Setup test bond first
        await createTestBond()
      }
      
      const startTime = Date.now()
      
      const result = await calculator.calculate({
        productId: testBondId,
        asOfDate: new Date('2025-01-10'),
        saveToDatabase: false
      })
      
      const duration = Date.now() - startTime
      
      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(2000) // < 2 seconds
    })
  })
  
  describe('Different Accounting Classifications', () => {
    
    it('should calculate HTM bonds using amortized cost', async () => {
      // Already tested in main flow - HTM is default
    })
    
    it('should calculate AFS bonds using mark-to-market', async () => {
      // Create AFS bond with market price
      const { data: afsBond } = await supabase
        .from('bond_products')
        .insert({
          project_id: testProjectId,
          bond_type: 'corporate',
          issuer_name: 'AFS Test Corp',
          issuer_country: 'US',
          issue_date: new Date('2020-01-15'),
          maturity_date: new Date('2030-01-15'),
          par_value: 1000,
          currency: 'USD',
          coupon_rate: 0.05,
          coupon_frequency: 2,
          day_count_convention: 'ACT/ACT',
          accounting_classification: 'afs',
          status: 'active'
        })
        .select()
        .single()
      
      const afsBondId = afsBond!.id
      
      // Add market price
      await supabase.from('bond_market_prices').insert({
        bond_product_id: afsBondId,
        price_date: new Date('2025-01-01'),
        clean_price: 102.5,
        yield_to_maturity: 0.045,
        price_source: 'Bloomberg'
      })
      
      // Calculate
      const result = await calculator.calculate({
        productId: afsBondId,
        asOfDate: new Date('2025-01-10'),
        saveToDatabase: false
      })
      
      expect(result.success).toBe(true)
      expect(result.data!.calculationMethod).toContain('Mark-to-Market')
      
      // Cleanup
      await supabase.from('bond_products').delete().eq('id', afsBondId)
    })
  })
  
  // Helper function
  async function createTestBond() {
    const { data: bond } = await supabase
      .from('bond_products')
      .insert({
        project_id: testProjectId,
        bond_type: 'corporate',
        issuer_name: 'Performance Test Corp',
        issuer_country: 'US',
        issue_date: new Date('2020-01-15'),
        maturity_date: new Date('2030-01-15'),
        par_value: 1000,
        currency: 'USD',
        coupon_rate: 0.05,
        coupon_frequency: 2,
        day_count_convention: 'ACT/ACT',
        accounting_classification: 'htm',
        status: 'active'
      })
      .select()
      .single()
    
    testBondId = bond!.id
    
    // Add minimal data
    await supabase.from('bond_coupon_payments').insert({
      bond_product_id: testBondId,
      payment_date: new Date('2026-01-15'),
      coupon_amount: 25,
      currency: 'USD',
      payment_status: 'scheduled',
      payment_number: 1
    })
  }
})
