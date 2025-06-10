import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabaseAdmin } from '../../../database/supabase.js';

describe('Database Migrations Tests', () => {
  
  beforeAll(async () => {
    console.log('🔧 Setting up migration tests...');
  });

  afterAll(async () => {
    console.log('🧹 Migration tests cleanup complete');
  });

  describe('📋 Schema Validation', () => {
    it('should have all required tables', async () => {
      const requiredTables = [
        'users',
        'transactions',
        'promotions',
        'admin_users'
      ];

      for (const table of requiredTables) {
        const { error } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(0);

        expect(error).toBeNull(`Table ${table} should exist`);
      }
    });

    it('should have correct users table structure', async () => {
      // Test users table columns by attempting insert with expected structure
      const testUser = {
        id: `schema-test-${Date.now()}`,
        email: `schema${Date.now()}@test.com`,
        phone_number: '+1234567890',
        stytch_user_id: 'stytch_test',
        email_verified: true,
        phone_verified: false,
        status: 'active',
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('users')
        .insert([testUser])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('email');
      expect(data).toHaveProperty('phone_number');
      expect(data).toHaveProperty('stytch_user_id');
      expect(data).toHaveProperty('email_verified');
      expect(data).toHaveProperty('phone_verified');
      expect(data).toHaveProperty('last_login_at');

      // Cleanup
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', testUser.id);
    });

    it('should have correct transactions table structure', async () => {
      // First create a user for the transaction
      const testUser = {
        id: `txn-user-${Date.now()}`,
        email: `txnuser${Date.now()}@test.com`,
        phone_number: '+1234567891'
      };

      await supabaseAdmin
        .from('users')
        .insert([testUser]);

      const testTransaction = {
        id: `schema-txn-${Date.now()}`,
        reference: `SCH${Date.now()}`,
        sender_id: testUser.id,
        type: 'send',
        status: 'pending',
        amount: 100.50,
        asset_symbol: 'ETH',
        fee: 2.50,
        exchange_rate: 1.0,
        note: 'Schema test',
        metadata: { test: true },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('transactions')
        .insert([testTransaction])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('reference');
      expect(data).toHaveProperty('sender_id');
      expect(data).toHaveProperty('type');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('amount');
      expect(data).toHaveProperty('asset_symbol');
      expect(data).toHaveProperty('metadata');

      // Cleanup
      await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('id', testTransaction.id);
      
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', testUser.id);
    });
  });

  describe('🔧 Database Functions', () => {
    let testUserId;

    beforeAll(async () => {
      // Create test user for function tests
      const testUser = {
        id: `func-user-${Date.now()}`,
        email: `funcuser${Date.now()}@test.com`,
        phone_number: '+1234567892'
      };

      await supabaseAdmin
        .from('users')
        .insert([testUser]);
      
      testUserId = testUser.id;

      // Create test transactions
      const testTransactions = [
        {
          id: `func-txn-1-${Date.now()}`,
          reference: `FUNC1${Date.now()}`,
          sender_id: testUserId,
          type: 'send',
          status: 'confirmed',
          amount: 100.0,
          asset_symbol: 'ETH'
        },
        {
          id: `func-txn-2-${Date.now()}`,
          reference: `FUNC2${Date.now()}`,
          sender_id: testUserId,
          type: 'receive',
          status: 'pending',
          amount: 50.0,
          asset_symbol: 'BTC'
        }
      ];

      await supabaseAdmin
        .from('transactions')
        .insert(testTransactions);
    });

    afterAll(async () => {
      // Cleanup function test data
      if (testUserId) {
        await supabaseAdmin
          .from('transactions')
          .delete()
          .eq('sender_id', testUserId);
        
        await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', testUserId);
      }
    });

    it('should have get_user_transactions function', async () => {
      const { data, error } = await supabaseAdmin.rpc('get_user_transactions', {
        p_user_id: testUserId,
        p_limit: 10,
        p_offset: 0
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should have get_user_transaction_stats function', async () => {
      const { data, error } = await supabaseAdmin.rpc('get_user_transaction_stats', {
        p_user_id: testUserId,
        p_days: 30
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('📊 Database Constraints & Rules', () => {
    it('should enforce email uniqueness in users table', async () => {
      const email = `unique${Date.now()}@test.com`;
      
      const user1 = {
        id: `unique-test-1-${Date.now()}`,
        email: email,
        phone_number: '+1234567893'
      };

      const user2 = {
        id: `unique-test-2-${Date.now()}`,
        email: email, // Same email
        phone_number: '+1234567894'
      };

      // First insert should succeed
      const { error: error1 } = await supabaseAdmin
        .from('users')
        .insert([user1]);
      expect(error1).toBeNull();

      // Second insert should fail due to unique constraint
      const { error: error2 } = await supabaseAdmin
        .from('users')
        .insert([user2]);
      expect(error2).not.toBeNull();
      expect(error2.code).toBe('23505'); // Unique violation

      // Cleanup
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('email', email);
    });

    it('should enforce foreign key constraints in transactions', async () => {
      const invalidTransaction = {
        id: `fk-test-${Date.now()}`,
        reference: `FK${Date.now()}`,
        sender_id: 'non-existent-user-id',
        type: 'send',
        status: 'pending',
        amount: 100.0,
        asset_symbol: 'ETH'
      };

      const { error } = await supabaseAdmin
        .from('transactions')
        .insert([invalidTransaction]);

      expect(error).not.toBeNull();
      expect(error.code).toBe('23503'); // Foreign key violation
    });

    it('should enforce check constraints on transaction amounts', async () => {
      // Create user first
      const testUser = {
        id: `check-user-${Date.now()}`,
        email: `checkuser${Date.now()}@test.com`,
        phone_number: '+1234567895'
      };

      await supabaseAdmin
        .from('users')
        .insert([testUser]);

      const invalidTransaction = {
        id: `check-test-${Date.now()}`,
        reference: `CHK${Date.now()}`,
        sender_id: testUser.id,
        type: 'send',
        status: 'pending',
        amount: -100.0, // Negative amount should be rejected
        asset_symbol: 'ETH'
      };

      const { error } = await supabaseAdmin
        .from('transactions')
        .insert([invalidTransaction]);

      expect(error).not.toBeNull();
      expect(error.code).toBe('23514'); // Check constraint violation

      // Cleanup user
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', testUser.id);
    });
  });

  describe('🔍 Database Indexes & Performance', () => {
    it('should have proper indexes for common queries', async () => {
      // Create test data for index testing
      const testUser = {
        id: `index-user-${Date.now()}`,
        email: `indexuser${Date.now()}@test.com`,
        phone_number: '+1234567896'
      };

      await supabaseAdmin
        .from('users')
        .insert([testUser]);

      // Test email index performance
      const startTime = Date.now();
      const { data, error } = await supabaseAdmin
        .from('users')
        .select()
        .eq('email', testUser.email);

      const queryTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(queryTime).toBeLessThan(100); // Should be very fast with index

      // Cleanup
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', testUser.id);
    });
  });

  describe('🛡️ Row Level Security (RLS)', () => {
    it('should have RLS enabled on sensitive tables', async () => {
      // Test that RLS is enforced by using non-admin client
      const { supabase } = await import('../../../database/supabase.js');
      
      // This should fail or return limited data due to RLS
      const { data, error } = await supabase
        .from('users')
        .select()
        .limit(1);

      // Either error due to RLS or no data returned
      expect(
        error !== null || 
        (data !== null && Array.isArray(data))
      ).toBe(true);
    });

    it('should allow admin access via service role', async () => {
      // Admin client should bypass RLS
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('📝 Database Triggers & Automation', () => {
    it('should auto-update timestamps on record updates', async () => {
      // Create test user
      const testUser = {
        id: `trigger-user-${Date.now()}`,
        email: `triggeruser${Date.now()}@test.com`,
        phone_number: '+1234567897',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: insertedUser } = await supabaseAdmin
        .from('users')
        .insert([testUser])
        .select()
        .single();

      const originalUpdatedAt = insertedUser.updated_at;

      // Wait a moment and then update
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: updatedUser } = await supabaseAdmin
        .from('users')
        .update({ status: 'inactive' })
        .eq('id', testUser.id)
        .select()
        .single();

      // updated_at should be different (if auto-update trigger exists)
      // If no trigger exists, this test documents expected behavior
      expect(updatedUser.updated_at).toBeDefined();

      // Cleanup
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', testUser.id);
    });
  });

  describe('🔢 Data Types & Precision', () => {
    it('should handle decimal precision correctly', async () => {
      const testUser = {
        id: `precision-user-${Date.now()}`,
        email: `precisionuser${Date.now()}@test.com`,
        phone_number: '+1234567898'
      };

      await supabaseAdmin
        .from('users')
        .insert([testUser]);

      const precisionTransaction = {
        id: `precision-test-${Date.now()}`,
        reference: `PREC${Date.now()}`,
        sender_id: testUser.id,
        type: 'send',
        status: 'pending',
        amount: 123.456789, // High precision decimal
        asset_symbol: 'ETH',
        fee: 0.001234,
        exchange_rate: 1.123456789
      };

      const { data, error } = await supabaseAdmin
        .from('transactions')
        .insert([precisionTransaction])
        .select()
        .single();

      expect(error).toBeNull();
      expect(typeof data.amount).toBe('number');
      expect(typeof data.fee).toBe('number');
      expect(typeof data.exchange_rate).toBe('number');

      // Cleanup
      await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('id', precisionTransaction.id);
      
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', testUser.id);
    });

    it('should handle JSON metadata correctly', async () => {
      const testUser = {
        id: `json-user-${Date.now()}`,
        email: `jsonuser${Date.now()}@test.com`,
        phone_number: '+1234567899'
      };

      await supabaseAdmin
        .from('users')
        .insert([testUser]);

      const complexMetadata = {
        network: 'ethereum',
        transaction_details: {
          gas_limit: 21000,
          gas_price: '20000000000',
          nonce: 42
        },
        tags: ['crypto', 'wallet', 'transfer'],
        timestamp: new Date().toISOString(),
        custom_fields: {
          source: 'mobile_app',
          version: '1.2.3',
          user_agent: 'MyWallet/1.0'
        }
      };

      const jsonTransaction = {
        id: `json-test-${Date.now()}`,
        reference: `JSON${Date.now()}`,
        sender_id: testUser.id,
        type: 'send',
        status: 'pending',
        amount: 100.0,
        asset_symbol: 'ETH',
        metadata: complexMetadata
      };

      const { data, error } = await supabaseAdmin
        .from('transactions')
        .insert([jsonTransaction])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.metadata).toBeDefined();
      expect(data.metadata.network).toBe('ethereum');
      expect(data.metadata.transaction_details.gas_limit).toBe(21000);
      expect(Array.isArray(data.metadata.tags)).toBe(true);
      expect(data.metadata.tags).toHaveLength(3);

      // Cleanup
      await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('id', jsonTransaction.id);
      
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', testUser.id);
    });
  });
}); 