const { supabaseAdmin } = require('../database/supabase');

/**
 * نموذج Wallet للتعامل مع المحافظ في قاعدة البيانات
 */
class Wallet {
  /**
   * إنشاء محفظة جديدة
   * @param {Object} walletData - بيانات المحفظة
   * @returns {Object} المحفظة المُنشأة
   */
  static async create(walletData) {
    try {
      const {
        userId,
        address,
        network = 'ethereum',
        provider = 'web3auth',
        backupMethods = ['device']
      } = walletData;

      const { data, error } = await supabaseAdmin
        .from('wallets')
        .insert([{
          user_id: userId,
          address: address.toLowerCase(),
          provider,
          network,
          status: 'active',
          backup_methods: backupMethods,
          created_at: new Date().toISOString(),
          last_used: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error creating wallet:', error);
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  }

  /**
   * الحصول على محفظة بواسطة ID
   * @param {string} walletId - معرف المحفظة
   * @returns {Object|null} بيانات المحفظة
   */
  static async findById(walletId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .select(`
          *,
          users!inner(
            id,
            phone_number,
            email,
            first_name,
            last_name
          )
        `)
        .eq('id', walletId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error finding wallet by ID:', error);
      throw new Error(`Failed to find wallet: ${error.message}`);
    }
  }

  /**
   * الحصول على محفظة بواسطة العنوان
   * @param {string} address - عنوان المحفظة
   * @returns {Object|null} بيانات المحفظة
   */
  static async findByAddress(address) {
    try {
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .select(`
          *,
          users!inner(
            id,
            phone_number,
            email,
            first_name,
            last_name
          )
        `)
        .eq('address', address.toLowerCase())
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error finding wallet by address:', error);
      throw new Error(`Failed to find wallet: ${error.message}`);
    }
  }

  /**
   * الحصول على جميع محافظ المستخدم
   * @param {string} userId - معرف المستخدم
   * @returns {Array} قائمة المحافظ
   */
  static async findByUserId(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error finding wallets by user ID:', error);
      throw new Error(`Failed to find wallets: ${error.message}`);
    }
  }

  /**
   * الحصول على المحفظة الرئيسية للمستخدم
   * @param {string} userId - معرف المستخدم
   * @returns {Object|null} المحفظة الرئيسية
   */
  static async getPrimaryWallet(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: true }) // الأقدم هي الرئيسية
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('❌ Error getting primary wallet:', error);
      return null;
    }
  }

  /**
   * تحديث بيانات المحفظة
   * @param {string} walletId - معرف المحفظة
   * @param {Object} updateData - البيانات المراد تحديثها
   * @returns {Object} المحفظة المحدثة
   */
  static async update(walletId, updateData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletId)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error updating wallet:', error);
      throw new Error(`Failed to update wallet: ${error.message}`);
    }
  }

  /**
   * تحديث آخر استخدام للمحفظة
   * @param {string} walletId - معرف المحفظة
   * @returns {boolean} نجح التحديث أم لا
   */
  static async updateLastUsed(walletId) {
    try {
      const { error } = await supabaseAdmin
        .from('wallets')
        .update({ 
          last_used: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', walletId);

      if (error) {
        console.error('❌ Error updating wallet last used:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error updating wallet last used:', error);
      return false;
    }
  }

  /**
   * إضافة طريقة نسخ احتياطي
   * @param {string} walletId - معرف المحفظة
   * @param {string} backupMethod - طريقة النسخ الاحتياطي
   * @returns {boolean} نجح الإضافة أم لا
   */
  static async addBackupMethod(walletId, backupMethod) {
    try {
      // الحصول على المحفظة الحالية
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('backup_methods')
        .eq('id', walletId)
        .single();

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // إضافة الطريقة الجديدة إذا لم تكن موجودة
      const currentMethods = wallet.backup_methods || [];
      if (!currentMethods.includes(backupMethod)) {
        currentMethods.push(backupMethod);

        const { error } = await supabaseAdmin
          .from('wallets')
          .update({ 
            backup_methods: currentMethods,
            updated_at: new Date().toISOString()
          })
          .eq('id', walletId);

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error adding backup method:', error);
      return false;
    }
  }

  /**
   * إلغاء تفعيل المحفظة (حذف ناعم)
   * @param {string} walletId - معرف المحفظة
   * @returns {boolean} نجح الإلغاء أم لا
   */
  static async deactivate(walletId) {
    try {
      const { error } = await supabaseAdmin
        .from('wallets')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', walletId);

      if (error) {
        console.error('❌ Error deactivating wallet:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error deactivating wallet:', error);
      return false;
    }
  }

  /**
   * البحث عن المحافظ بواسطة الشبكة
   * @param {string} network - اسم الشبكة
   * @param {number} limit - عدد النتائج
   * @returns {Array} قائمة المحافظ
   */
  static async findByNetwork(network, limit = 50) {
    try {
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .select(`
          *,
          users!inner(
            id,
            phone_number,
            email,
            first_name,
            last_name
          )
        `)
        .eq('network', network)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error finding wallets by network:', error);
      throw new Error(`Failed to find wallets: ${error.message}`);
    }
  }

  /**
   * الحصول على إحصائيات المحافظ
   * @returns {Object} إحصائيات المحافظ
   */
  static async getStatistics() {
    try {
      // إجمالي المحافظ النشطة
      const { count: totalActiveWallets } = await supabaseAdmin
        .from('wallets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // المحافظ حسب الشبكة
      const { data: networkStats } = await supabaseAdmin
        .from('wallets')
        .select('network')
        .eq('status', 'active');

      // المحافظ حسب المزود
      const { data: providerStats } = await supabaseAdmin
        .from('wallets')
        .select('provider')
        .eq('status', 'active');

      // تجميع الإحصائيات
      const networks = {};
      const providers = {};

      networkStats?.forEach(wallet => {
        networks[wallet.network] = (networks[wallet.network] || 0) + 1;
      });

      providerStats?.forEach(wallet => {
        providers[wallet.provider] = (providers[wallet.provider] || 0) + 1;
      });

      return {
        totalActiveWallets: totalActiveWallets || 0,
        networkDistribution: networks,
        providerDistribution: providers,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting wallet statistics:', error);
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  /**
   * التحقق من وجود محفظة للمستخدم
   * @param {string} userId - معرف المستخدم
   * @returns {boolean} يوجد محفظة أم لا
   */
  static async userHasWallet(userId) {
    try {
      const { data } = await supabaseAdmin
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1);

      return data && data.length > 0;
    } catch (error) {
      console.error('❌ Error checking wallet existence:', error);
      return false;
    }
  }
}

module.exports = Wallet; 