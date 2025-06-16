import { supabaseAdmin } from '../database/supabase.js';

class ActivityLog {
    constructor(data = {}) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.action = data.action;
        this.details = data.details || {};
        this.ip_address = data.ip_address;
        this.device_id = data.device_id;
        this.created_at = data.created_at;
    }

    static async create(data) {
        try {
            const { data: result, error } = await supabaseAdmin
                .from('activity_logs')
                .insert([{
                    user_id: data.user_id,
                    action: data.action,
                    details: data.details || {},
                    ip_address: data.ip_address,
                    device_id: data.device_id
                }])
                .select()
                .single();

            if (error) {
                if (error.code === '23502') { // Not null violation
                    throw new Error(`Required field missing: ${error.message}`);
                }
                throw error;
            }

            return new ActivityLog(result);
        } catch (error) {
            console.error('Error creating activity log:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const { data, error } = await supabaseAdmin
                .from('activity_logs')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') { // No rows returned
                    return null;
                }
                throw error;
            }

            return data ? new ActivityLog(data) : null;
        } catch (error) {
            console.error('Error finding activity log by ID:', error);
            throw error;
        }
    }

    static async findByUserId(userId, options = {}) {
        try {
            let query = supabaseAdmin
                .from('activity_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            // Add pagination if specified
            if (options.limit) {
                query = query.limit(options.limit);
            }
            if (options.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data.map(log => new ActivityLog(log));
        } catch (error) {
            console.error('Error finding activity logs by user ID:', error);
            throw error;
        }
    }

    static async update(id, updateData) {
        try {
            const { data, error } = await supabaseAdmin
                .from('activity_logs')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116') { // No rows returned
                    throw new Error('Activity log not found');
                }
                throw error;
            }

            return new ActivityLog(data);
        } catch (error) {
            console.error('Error updating activity log:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const { error } = await supabaseAdmin
                .from('activity_logs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting activity log:', error);
            throw error;
        }
    }

    // Helper method to format log details
    static formatDetails(action, additionalDetails = {}) {
        return {
            action,
            timestamp: new Date().toISOString(),
            ...additionalDetails
        };
    }
}

export default ActivityLog; 