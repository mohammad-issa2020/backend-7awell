import { supabaseAdmin } from '../database/supabase.js';

class ContactSyncStatus {
  static TABLE_NAME = 'contact_sync_status';

  constructor(data) {
    this.user_id = data.user_id;
    this.last_sync = data.last_sync;
    this.device_contacts_count = data.device_contacts_count;
    this.synced_contacts_count = data.synced_contacts_count;
    this.status = data.status;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create(data) {
    const { data: syncStatus, error } = await supabaseAdmin
      .from(this.TABLE_NAME)
      .insert([data])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create sync status: ${error.message}`);
    }

    return new ContactSyncStatus(syncStatus);
  }

  static async findByUserId(userId) {
    const { data: syncStatus, error } = await supabaseAdmin
      .from(this.TABLE_NAME)
      .select()
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find sync status: ${error.message}`);
    }

    return syncStatus ? new ContactSyncStatus(syncStatus) : null;
  }

  static async update(userId, updates) {
    const { data: syncStatus, error } = await supabaseAdmin
      .from(this.TABLE_NAME)
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update sync status: ${error.message}`);
    }

    return new ContactSyncStatus(syncStatus);
  }

  static async updateSyncStatus(userId, deviceCount, syncedCount, status) {
    const { data: syncStatus, error } = await supabaseAdmin
      .rpc('update_contact_sync_status', {
        p_user_id: userId,
        p_device_contacts_count: deviceCount,
        p_synced_contacts_count: syncedCount,
        p_status: status
      });

    if (error) {
      throw new Error(`Failed to update sync status: ${error.message}`);
    }

    return new ContactSyncStatus(syncStatus);
  }

  static async delete(userId) {
    const { error } = await supabaseAdmin
      .from(this.TABLE_NAME)
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete sync status: ${error.message}`);
    }

    return true;
  }

  static async getPendingSyncs() {
    const { data: syncStatuses, error } = await supabaseAdmin
      .from(this.TABLE_NAME)
      .select()
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to get pending syncs: ${error.message}`);
    }

    return syncStatuses.map(status => new ContactSyncStatus(status));
  }

  static async getFailedSyncs() {
    const { data: syncStatuses, error } = await supabaseAdmin
      .from(this.TABLE_NAME)
      .select()
      .eq('status', 'failed');

    if (error) {
      throw new Error(`Failed to get failed syncs: ${error.message}`);
    }

    return syncStatuses.map(status => new ContactSyncStatus(status));
  }
}

export default ContactSyncStatus; 