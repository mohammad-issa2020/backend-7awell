import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import UserSettings from '../models/UserSettings.js';
import Wallet from '../models/Wallet.js';
import NotificationSettings from '../models/NotificationSettings.js';

const userController = {
  async getUserProfile(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get user basic info
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get profile
      const profile = await UserProfile.findByUserId(userId);
      // Get settings
      const settings = await UserSettings.findByUserId(userId);
      // Get notification settings
      const notifications = await NotificationSettings.findByUserId(userId);
      // Get main wallet
      const mainWallet = await Wallet.getPrimaryWallet(userId);

      // Compose user object
      const userData = {
        id: user.id,
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        phone: user.phone,
        email: user.email,
        address: profile?.address || '',
        country: profile?.country || '',
        dob: profile?.date_of_birth || '',
        gender: profile?.gender || '',
        avatar: profile?.avatar_url || '',
        kycLevel: user.kyc_level || '',
        wallets: {
          main: mainWallet?.wallet_address || ''
        },
        iban: user.iban || ''
      };

      // Compose settings object
      const settingsData = {
        language: settings?.language || 'en',
        theme: settings?.theme || 'light',
        notifications: {
          pushEnabled: notifications?.push_enabled ?? false,
          transactionAlerts: notifications?.transaction_alerts ?? false,
          securityAlerts: notifications?.security_alerts ?? false,
          promotions: notifications?.promotions ?? false,
          emailNotifications: notifications?.email_notifications ?? false,
          whatsappNotifications: notifications?.whatsapp_notifications ?? false
        },
        security: {
          biometricEnabled: settings?.biometric_enabled ?? false,
          twoFactorEnabled: settings?.two_factor_enabled ?? false,
          transactionPin: settings?.transaction_pin ?? false
        }
      };

      return res.json({ user: userData, settings: settingsData });
    } catch (error) {
      console.error('Get user profile error:', error);
      return res.status(500).json({ error: 'Failed to get user profile' });
    }
  },

  async updatePreferences(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { language, theme, notifications, security } = req.body;

      // Update user settings
      let updatedSettings = null;
      const settings = await UserSettings.findByUserId(userId);
      if (settings) {
        const settingsInstance = new UserSettings(settings);
        updatedSettings = await settingsInstance.update({
          ...(language && { language }),
          ...(theme && { theme }),
          ...(security?.biometricEnabled !== undefined && { biometric_enabled: security.biometricEnabled }),
          ...(security?.twoFactorEnabled !== undefined && { two_factor_enabled: security.twoFactorEnabled }),
          ...(security?.transactionPin !== undefined && { transaction_pin: security.transactionPin })
        });
      }

      // Update notification settings
      let updatedNotifications = null;
      if (notifications) {
        updatedNotifications = await NotificationSettings.updatePreferences(userId, {
          ...(notifications.pushEnabled !== undefined && { push_enabled: notifications.pushEnabled }),
          ...(notifications.transactionAlerts !== undefined && { transaction_alerts: notifications.transactionAlerts }),
          ...(notifications.securityAlerts !== undefined && { security_alerts: notifications.securityAlerts }),
          ...(notifications.promotions !== undefined && { promotions: notifications.promotions }),
          ...(notifications.emailNotifications !== undefined && { email_notifications: notifications.emailNotifications }),
          ...(notifications.whatsappNotifications !== undefined && { whatsapp_notifications: notifications.whatsappNotifications })
        });
      }

      // Return updated settings
      const settingsData = {
        language: updatedSettings?.language || settings?.language || 'en',
        theme: updatedSettings?.theme || settings?.theme || 'light',
        notifications: {
          pushEnabled: updatedNotifications?.push_enabled ?? notifications?.pushEnabled ?? false,
          transactionAlerts: updatedNotifications?.transaction_alerts ?? notifications?.transactionAlerts ?? false,
          securityAlerts: updatedNotifications?.security_alerts ?? notifications?.securityAlerts ?? false,
          promotions: updatedNotifications?.promotions ?? notifications?.promotions ?? false,
          emailNotifications: updatedNotifications?.email_notifications ?? notifications?.emailNotifications ?? false,
          whatsappNotifications: updatedNotifications?.whatsapp_notifications ?? notifications?.whatsappNotifications ?? false
        },
        security: {
          biometricEnabled: updatedSettings?.biometric_enabled ?? security?.biometricEnabled ?? false,
          twoFactorEnabled: updatedSettings?.two_factor_enabled ?? security?.twoFactorEnabled ?? false,
          transactionPin: updatedSettings?.transaction_pin ?? security?.transactionPin ?? false
        }
      };

      return res.json({ settings: settingsData });
    } catch (error) {
      console.error('Update preferences error:', error);
      return res.status(500).json({ error: 'Failed to update preferences' });
    }
  }
};

export default userController; 