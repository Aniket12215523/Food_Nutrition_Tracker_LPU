import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserDataService from './userDataService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,  
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.INIT_KEY = 'notifications_initialized_today';
    this.mealTimes = {
      breakfast: { hour: 8, minute: 0, title: 'Breakfast Time! 🌅', message: 'Start your day with a healthy breakfast' },
      lunch: { hour: 13, minute: 0, title: 'Lunch Break! ☀️', message: 'Time for a nutritious lunch' },
      snacks: { hour: 17, minute: 0, title: 'Snack Time! 🍎', message: 'Grab a healthy snack to keep energy up' },
      dinner: { hour: 20, minute: 0, title: 'Dinner Time! 🌙', message: 'End your day with a balanced dinner' }
    };
    
    this.reminderTimes = {
      breakfast: { hour: 9, minute: 30, message: 'Did you have breakfast? Track it now!' },
      lunch: { hour: 14, minute: 30, message: 'Don\'t forget to log your lunch!' },
      snacks: { hour: 18, minute: 0, message: 'Track your afternoon snack' },
      dinner: { hour: 21, minute: 30, message: 'Remember to log your dinner!' }
    };
  }

  // 🔧 NEW: Check if already initialized today
  async shouldInitialize() {
    try {
      const today = new Date().toDateString();
      const lastInitDate = await AsyncStorage.getItem(this.INIT_KEY);
      
      if (lastInitDate === today) {
        console.log('🔔 Notifications already initialized today');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking initialization status:', error);
      return true; // Initialize if we can't check
    }
  }

  // 🔧 NEW: Mark as initialized
  async markAsInitialized() {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(this.INIT_KEY, today);
    } catch (error) {
      console.error('Error marking as initialized:', error);
    }
  }

  // 🔧 UPDATED: Initialize notifications with duplicate prevention
  async initialize() {
    try {
      // Check if we should initialize
      const shouldInit = await this.shouldInitialize();
      if (!shouldInit) {
        return true; // Already initialized today
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('Failed to get push token for push notification!');
          return false;
        }
        
        console.log('✅ Notifications permission granted');
        await this.scheduleDailyMealReminders();
        await this.markAsInitialized(); // 🔧 NEW: Mark as initialized
        return true;
      } else {
        console.log('Must use physical device for Push Notifications');
        return false;
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // 🔧 UPDATED: Better scheduling with duplicate prevention
  async scheduleDailyMealReminders() {
    try {
      // Cancel existing notifications to prevent duplicates
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Cleared existing notifications');
      
      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Schedule meal time notifications
      for (const [mealType, config] of Object.entries(this.mealTimes)) {
        await this.scheduleMealNotification(mealType, config, 'mealTime');
        // Small delay between scheduling
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Schedule reminder notifications (for missed meals)
      for (const [mealType, config] of Object.entries(this.reminderTimes)) {
        await this.scheduleMealNotification(mealType, config, 'reminder');
        // Small delay between scheduling
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log('✅ All meal notifications scheduled');
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  }

  // Schedule individual meal notification
  async scheduleMealNotification(mealType, config, type) {
    try {
      const now = new Date();
      const notificationTime = new Date();
      notificationTime.setHours(config.hour, config.minute, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (notificationTime <= now) {
        notificationTime.setDate(notificationTime.getDate() + 1);
      }
      
      const identifier = `${mealType}_${type}`;
      
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: config.title || `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Reminder 🍽️`,
          body: config.message,
          data: { mealType, type, screen: 'NutritionStats' },
          sound: true,
        },
        trigger: {
          hour: config.hour,
          minute: config.minute,
          repeats: true, // Repeat daily
        },
      });
      
      console.log(`📱 Scheduled ${type} notification for ${mealType} at ${config.hour}:${config.minute.toString().padStart(2, '0')}`);
    } catch (error) {
      console.error(`Error scheduling ${mealType} notification:`, error);
    }
  }

  // Smart notifications based on user's meal tracking
  async checkMissedMeals() {
    try {
      const todayIntake = await UserDataService.getDailyIntake();
      const currentHour = new Date().getHours();
      
      // Check for missed meals
      const missedMeals = [];
      
      // Check breakfast (after 10 AM)
      if (currentHour >= 10 && (!todayIntake.breakfast || todayIntake.breakfast.length === 0)) {
        missedMeals.push('breakfast');
      }
      
      // Check lunch (after 3 PM)
      if (currentHour >= 15 && (!todayIntake.lunch || todayIntake.lunch.length === 0)) {
        missedMeals.push('lunch');
      }
      
      // Check dinner (after 9 PM)
      if (currentHour >= 21 && (!todayIntake.dinner || todayIntake.dinner.length === 0)) {
        missedMeals.push('dinner');
      }
      
      // Send notifications for missed meals (limit to prevent spam)
      for (const mealType of missedMeals.slice(0, 1)) { // Only send one at a time
        await this.sendMissedMealNotification(mealType);
      }
      
      return missedMeals;
    } catch (error) {
      console.error('Error checking missed meals:', error);
      return [];
    }
  }

  // Send notification for missed meal
  async sendMissedMealNotification(mealType) {
    try {
      const messages = {
        breakfast: {
          title: 'Missed Breakfast? 🥞',
          body: 'Don\'t skip the most important meal! Track it now if you had something.',
        },
        lunch: {
          title: 'Lunch Missing! 🍽️',
          body: 'Your body needs fuel. Add your lunch to complete your nutrition tracking.',
        },
        dinner: {
          title: 'Dinner Not Logged 🌙',
          body: 'Complete your day by tracking your dinner for better nutrition insights.',
        },
      };
      
      const message = messages[mealType];
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: { mealType, type: 'missedMeal', screen: 'Scanner' },
          sound: true,
        },
        trigger: null, // Send immediately
      });
      
      console.log(`📱 Sent missed meal notification for ${mealType}`);
    } catch (error) {
      console.error(`Error sending missed meal notification for ${mealType}:`, error);
    }
  }

  // Send goal achievement notifications
  async sendGoalNotification(type, message) {
    try {
      const titles = {
        calorie_goal: '🎯 Calorie Goal Reached!',
        protein_goal: '💪 Protein Goal Achieved!',
        daily_complete: '🏆 Daily Goals Complete!',
        over_calories: '⚠️ Calorie Limit Exceeded',
      };
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: titles[type] || '🎯 Nutrition Update',
          body: message,
          data: { type: 'goal', screen: 'NutritionStats' },
          sound: true,
        },
        trigger: null,
      });
      
      console.log(`🎯 Sent goal notification: ${type}`);
    } catch (error) {
      console.error('Error sending goal notification:', error);
    }
  }

  // 🔧 UPDATED: Send meal completion with rate limiting
  async sendMealCompletionNotification(mealType, nutrition) {
    try {
      // Rate limiting: only one completion notification per meal per day
      const today = new Date().toDateString();
      const key = `completion_${mealType}_${today}`;
      const alreadySent = await AsyncStorage.getItem(key);
      
      if (alreadySent) {
        console.log(`✅ Completion notification for ${mealType} already sent today`);
        return;
      }

      const messages = {
        breakfast: `Great start! ☀️ You've logged ${nutrition.calories} calories for breakfast.`,
        lunch: `Lunch logged! 🍽️ ${nutrition.calories} calories added to your daily total.`,
        snacks: `Snack tracked! 🍎 Keep up the good nutrition habits.`,
        dinner: `Dinner complete! 🌙 ${nutrition.calories} calories logged. Great job today!`
      };
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Logged! ✅`,
          body: messages[mealType],
          data: { mealType, type: 'completion', screen: 'NutritionStats' },
          sound: false, // Gentle notification
        },
        trigger: null,
      });
      
      // Mark as sent
      await AsyncStorage.setItem(key, 'sent');
      console.log(`✅ Sent completion notification for ${mealType}`);
    } catch (error) {
      console.error('Error sending completion notification:', error);
    }
  }

  // Handle notification responses
  static addNotificationResponseListener(callback) {
  try {
    return Notifications.addNotificationResponseReceivedListener(callback);
  } catch (error) {
    console.log('📱 Notification response listener not available');
    return { remove: () => {} }; // Return dummy subscription
  }
}

  // Check if user has enabled notifications
  async getNotificationStatus() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification status:', error);
      return false;
    }
  }

  // 🔧 UPDATED: Cancel all notifications and reset initialization
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(this.INIT_KEY); // Reset initialization flag
      console.log('🔕 All notifications cancelled and reset');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  // Get scheduled notifications (for debugging)
  async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📋 Scheduled notifications:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // 🔧 NEW: Development helper - reset initialization
  async resetInitialization() {
    try {
      await AsyncStorage.removeItem(this.INIT_KEY);
      await this.cancelAllNotifications();
      console.log('🔄 Notification initialization reset');
    } catch (error) {
      console.error('Error resetting notifications:', error);
    }
  }

  // 🔧 NEW: Force reinitialize (for settings toggle)
  async reinitialize() {
    try {
      await this.resetInitialization();
      await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay
      return await this.initialize();
    } catch (error) {
      console.error('Error reinitializing notifications:', error);
      return false;
    }
  }

  // 🔧 NEW: Check if notifications are properly scheduled
  async verifyNotifications() {
    try {
      const scheduled = await this.getScheduledNotifications();
      const expectedCount = Object.keys(this.mealTimes).length + Object.keys(this.reminderTimes).length;
      
      console.log(`📊 Notifications status: ${scheduled.length}/${expectedCount} scheduled`);
      
      return {
        scheduled: scheduled.length,
        expected: expectedCount,
        isComplete: scheduled.length === expectedCount
      };
    } catch (error) {
      console.error('Error verifying notifications:', error);
      return { scheduled: 0, expected: 8, isComplete: false };
    }
  }
}

export default new NotificationService();
