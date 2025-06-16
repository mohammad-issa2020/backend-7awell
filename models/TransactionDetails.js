const { supabaseAdmin } = require('../database/supabase');

class TransactionDetails {
  static table = 'transaction_details';

  static async create(data) {
    const { data: result, error } = await supabaseAdmin
      .from(this.table)
      .insert([data])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  }

  static async findByTransactionId(transactionId) {
    const { data, error } = await supabaseAdmin
      .from(this.table)
      .select('*')
      .eq('transaction_id', transactionId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async update(transactionId, updateData) {
    const { data, error } = await supabaseAdmin
      .from(this.table)
      .update(updateData)
      .eq('transaction_id', transactionId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async delete(transactionId) {
    const { error } = await supabaseAdmin
      .from(this.table)
      .delete()
      .eq('transaction_id', transactionId);
    if (error) throw new Error(error.message);
    return true;
  }
}

module.exports = TransactionDetails; 