const { supabaseAdmin } = require('../database/supabase');

class WalletActivity {
  static table = 'wallet_activities';

  static async create(data) {
    const { data: result, error } = await supabaseAdmin
      .from(this.table)
      .insert([data])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  }

  static async findById(id) {
    const { data, error } = await supabaseAdmin
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async findByWalletId(walletId) {
    const { data, error } = await supabaseAdmin
      .from(this.table)
      .select('*')
      .eq('wallet_id', walletId);
    if (error) throw new Error(error.message);
    return data;
  }

  static async findByUserId(userId) {
    const { data, error } = await supabaseAdmin
      .from(this.table)
      .select('*')
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return data;
  }

  static async update(id, updateData) {
    const { data, error } = await supabaseAdmin
      .from(this.table)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async delete(id) {
    const { error } = await supabaseAdmin
      .from(this.table)
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
}

module.exports = WalletActivity; 