import { supabaseAdmin } from '../database/supabase.js';

class UserSession {
    constructor(data = {}) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.stytch_session_id = data.stytch_session_id;
        this.session_token = data.session_token;
        this.device_id = data.device_id;
        this.device_name = data.device_name;
        this.ip_address = data.ip_address;
        this.user_agent = data.user_agent;
        this.location_country = data.location_country;
        this.location_city = data.location_city;
        this.is_active = data.is_active ?? true;
        this.pin_verified = data.pin_verified ?? false;
        this.biometric_verified = data.biometric_verified ?? false;
        this.last_activity = data.last_activity;
        this.expires_at = data.expires_at;
        this.created_at = data.created_at;
    }

    static async create(sessionData) {
        try {
            // Validate required fields
            if (!sessionData.user_id) {
                throw new Error('user_id is required');
            }

            const { data, error } = await supabaseAdmin
                .from('user_sessions')
                .insert([sessionData])
                .select()
                .single();

            if (error) {
                if (error.code === '23502') { // Not null violation
                    throw new Error(`Required field missing: ${error.message}`);
                }
                throw error;
            }
            return new UserSession(data);
        } catch (error) {
            console.error('Error creating user session:', error);
            throw error;
        }
    }

    static async findByToken(sessionToken) {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_sessions')
                .select('*')
                .eq('session_token', sessionToken)
                .single();

            if (error) {
                if (error.code === 'PGRST116') { // No rows returned
                    return null;
                }
                throw error;
            }
            return data ? new UserSession(data) : null;
        } catch (error) {
            console.error('Error finding session by token:', error);
            throw error;
        }
    }

    static async findByStytchSessionId(stytchSessionId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_sessions')
                .select('*')
                .eq('stytch_session_id', stytchSessionId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') { // No rows returned
                    return null;
                }
                throw error;
            }
            return data ? new UserSession(data) : null;
        } catch (error) {
            console.error('Error finding session by Stytch ID:', error);
            throw error;
        }
    }

    static async findActiveSessionsByUserId(userId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_sessions')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .gt('expires_at', new Date().toISOString());

            if (error) throw error;
            return data.map(session => new UserSession(session));
        } catch (error) {
            console.error('Error finding active sessions:', error);
            throw error;
        }
    }

    async update(updates) {
        try {
            const { data, error } = await supabaseAdmin
                .from('user_sessions')
                .update(updates)
                .eq('id', this.id)
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116') { // No rows returned
                    throw new Error('Session not found');
                }
                throw error;
            }
            Object.assign(this, data);
            return this;
        } catch (error) {
            console.error('Error updating session:', error);
            throw error;
        }
    }

    async deactivate() {
        return this.update({ is_active: false });
    }

    async updateLastActivity() {
        return this.update({ last_activity: new Date().toISOString() });
    }

    async verifyPin() {
        return this.update({ pin_verified: true });
    }

    async verifyBiometric() {
        return this.update({ biometric_verified: true });
    }

    isExpired() {
        return new Date(this.expires_at) <= new Date();
    }

    isValid() {
        return this.is_active && !this.isExpired();
    }

    static async cleanupExpiredSessions() {
        try {
            const { error } = await supabaseAdmin
                .from('user_sessions')
                .update({ is_active: false })
                .lt('expires_at', new Date().toISOString())
                .eq('is_active', true);

            if (error) throw error;
        } catch (error) {
            console.error('Error cleaning up expired sessions:', error);
            throw error;
        }
    }
}

export default UserSession; 