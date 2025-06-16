class Transaction {
  static table = 'transactions';

  static async create(data) {
    const { supabaseAdmin } = await import('../database/supabase.js');
    
    // Validate required fields
    const requiredFields = ['reference', 'type', 'amount', 'asset_symbol'];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate amount is positive
    if (data.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Validate fee is non-negative
    if (data.fee && data.fee < 0) {
      throw new Error('Fee must be non-negative');
    }

    // Validate exchange rate is positive if provided
    if (data.exchange_rate && data.exchange_rate <= 0) {
      throw new Error('Exchange rate must be greater than 0');
    }

    const { data: result, error } = await supabaseAdmin
      .from(this.table)
      .insert([{
        ...data,
        status: data.status || 'pending',
        fee: data.fee || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(`Failed to create transaction: ${error.message}`);
    return result;
  }

  static async findById(id) {
    const { supabaseAdmin } = await import('../database/supabase.js');
    const { data, error } = await supabaseAdmin
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(`Failed to find transaction: ${error.message}`);
    return data;
  }

  static async findByReference(reference) {
    const { supabaseAdmin } = await import('../database/supabase.js');
    const { data, error } = await supabaseAdmin
      .from(this.table)
      .select('*')
      .eq('reference', reference)
      .single();
    if (error) throw new Error(`Failed to find transaction: ${error.message}`);
    return data;
  }

  static async findByUserId(userId, options = {}) {
    const { supabaseAdmin } = await import('../database/supabase.js');
    let query = supabaseAdmin
      .from(this.table)
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);

    // Add filters if provided
    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.type) {
      query = query.eq('type', options.type);
    }
    if (options.asset_symbol) {
      query = query.eq('asset_symbol', options.asset_symbol);
    }

    // Add sorting
    query = query.order('created_at', { ascending: false });

    // Add pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to find transactions: ${error.message}`);
    return data;
  }

  static async update(id, updateData) {
    const { supabaseAdmin } = await import('../database/supabase.js');

    // Validate amount is positive if provided
    if (updateData.amount && updateData.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Validate fee is non-negative if provided
    if (updateData.fee && updateData.fee < 0) {
      throw new Error('Fee must be non-negative');
    }

    // Validate exchange rate is positive if provided
    if (updateData.exchange_rate && updateData.exchange_rate <= 0) {
      throw new Error('Exchange rate must be greater than 0');
    }

    // Add updated_at timestamp
    const data = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    // If status is being updated to completed, set completed_at
    if (updateData.status === 'completed') {
      data.completed_at = new Date().toISOString();
    }

    const { data: result, error } = await supabaseAdmin
      .from(this.table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update transaction: ${error.message}`);
    return result;
  }

  static async delete(id) {
    const { supabaseAdmin } = await import('../database/supabase.js');
    const { error } = await supabaseAdmin
      .from(this.table)
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Failed to delete transaction: ${error.message}`);
    return true;
  }

  // Helper method to generate a unique reference
  static generateReference(type = 'transfer') {
    const prefix = {
      transfer: 'TXF',
      payment: 'PAY',
      cash_out: 'OUT',
      cash_in: 'CIN',
      exchange: 'EXC'
    }[type] || 'TXN';

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${prefix}${timestamp}${random}`;
  }
}

export default Transaction; 