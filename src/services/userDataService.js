import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './notificationService';

class UserDataService {
  constructor() {
    this.STORAGE_KEYS = {
      USER_GOALS: 'user_goals',
      DAILY_INTAKE: 'daily_intake_',
      RECENT_SCANS: 'recent_scans',
      USER_PROFILE: 'user_profile'
    };
  }

  // === USER GOALS ===
  async getUserGoals() {
    try {
      const goals = await AsyncStorage.getItem(this.STORAGE_KEYS.USER_GOALS);
      return goals ? JSON.parse(goals) : {
        dailyCalories: 2200,
        dailyProtein: 80,
        dailyCarbs: 275,
        dailyFat: 73,
        dailyFiber: 25,
        waterGlasses: 8,
        mealsPerDay: 4
      };
    } catch (error) {
      console.error('Error loading user goals:', error);
      return null;
    }
  }

  async saveUserGoals(goals) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.USER_GOALS, JSON.stringify(goals));
      return true;
    } catch (error) {
      console.error('Error saving user goals:', error);
      return false;
    }
  }

  // === DAILY INTAKE TRACKING ===
  getDailyIntakeKey(date = new Date()) {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return this.STORAGE_KEYS.DAILY_INTAKE + dateStr;
  }

  async getDailyIntake(date = new Date()) {
    try {
      const key = this.getDailyIntakeKey(date);
      const intake = await AsyncStorage.getItem(key);
      return intake ? JSON.parse(intake) : {
        breakfast: [],
        lunch: [],
        snacks: [],
        dinner: [],
        totalNutrition: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sodium: 0,
          iron: 0,
          calcium: 0,
          vitaminC: 0
        },
        waterGlasses: 0,
        date: date.toISOString().split('T')[0]
      };
    } catch (error) {
      console.error('Error loading daily intake:', error);
      return null;
    }
  }

async addFoodToMeal(foodData, mealType, date = new Date()) {
    try {
      const dailyIntake = await this.getDailyIntake(date);
      
      // Add food to specific meal
      if (!dailyIntake[mealType]) {
        dailyIntake[mealType] = [];
      }
      
      const foodEntry = {
        ...foodData,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      };
      
      dailyIntake[mealType].push(foodEntry);
      
      // Recalculate total nutrition
      dailyIntake.totalNutrition = this.calculateTotalNutrition(dailyIntake);
      
      // Save updated data
      const key = this.getDailyIntakeKey(date);
      await AsyncStorage.setItem(key, JSON.stringify(dailyIntake));
      
      // Also update recent scans
      await this.addToRecentScans(foodEntry);
      
      // 🔧 FIXED: Safe notification calls with error handling
      try {
        if (NotificationService && typeof NotificationService.sendMealCompletionNotification === 'function') {
          await NotificationService.sendMealCompletionNotification(mealType, foodData.nutrition);
        }
      } catch (notificationError) {
        console.log('Note: Notification not sent (development mode or error):', notificationError.message);
      }
      
      // 🔧 FIXED: Safe goal check
      try {
        await this.checkGoalAchievements(dailyIntake.totalNutrition);
      } catch (goalError) {
        console.log('Note: Goal check skipped:', goalError.message);
      }
      
      return dailyIntake;
    } catch (error) {
      console.error('Error adding food to meal:', error);
      return null;
    }
  }

  // 🔧 UPDATED: Safe goal achievements check
  async checkGoalAchievements(totalNutrition) {
    try {
      const goals = await this.getUserGoals();
      if (!goals) return;
      
      // Skip notifications in development mode
      if (__DEV__) {
        console.log('🎯 Goal check (dev mode):', {
          calories: `${Math.round((totalNutrition.calories / goals.dailyCalories) * 100)}%`,
          protein: `${Math.round((totalNutrition.protein / goals.dailyProtein) * 100)}%`
        });
        return;
      }
      
      // Check if NotificationService methods exist
      if (!NotificationService || typeof NotificationService.sendGoalNotification !== 'function') {
        console.log('Note: Goal notifications not available');
        return;
      }
      
      // Check calorie goal
      if (totalNutrition.calories >= goals.dailyCalories * 0.9 && totalNutrition.calories <= goals.dailyCalories * 1.1) {
        await NotificationService.sendGoalNotification(
          'calorie_goal',
          `Perfect! You've reached ${Math.round((totalNutrition.calories / goals.dailyCalories) * 100)}% of your calorie goal.`
        );
      }
      
      // Check protein goal
      if (totalNutrition.protein >= goals.dailyProtein) {
        await NotificationService.sendGoalNotification(
          'protein_goal',
          `Excellent! You've hit your protein target with ${totalNutrition.protein}g.`
        );
      }
      
      // Check if over calories
      if (totalNutrition.calories > goals.dailyCalories * 1.2) {
        await NotificationService.sendGoalNotification(
          'over_calories',
          `You've exceeded your calorie goal by ${Math.round(totalNutrition.calories - goals.dailyCalories)} calories.`
        );
      }
      
      // Check daily completion
      const caloriePercent = (totalNutrition.calories / goals.dailyCalories) * 100;
      const proteinPercent = (totalNutrition.protein / goals.dailyProtein) * 100;
      
      if (caloriePercent >= 90 && proteinPercent >= 90) {
        await NotificationService.sendGoalNotification(
          'daily_complete',
          'Amazing! You\'ve completed your daily nutrition goals. Keep it up!'
        );
      }
      
    } catch (error) {
      console.error('Error checking goal achievements:', error);
    }
  }

  calculateTotalNutrition(dailyIntake) {
    const total = {
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
      sodium: 0, iron: 0, calcium: 0, vitaminC: 0
    };

    ['breakfast', 'lunch', 'snacks', 'dinner'].forEach(mealType => {
      if (dailyIntake[mealType]) {
        dailyIntake[mealType].forEach(food => {
          if (food.nutrition) {
            Object.keys(total).forEach(key => {
              total[key] += food.nutrition[key] || 0;
            });
          }
        });
      }
    });

    // Round values
    Object.keys(total).forEach(key => {
      if (key === 'calories' || key === 'sodium' || key === 'calcium') {
        total[key] = Math.round(total[key]);
      } else {
        total[key] = Math.round(total[key] * 10) / 10;
      }
    });

    return total;
  }

  async updateWaterIntake(glasses, date = new Date()) {
    try {
      const dailyIntake = await this.getDailyIntake(date);
      dailyIntake.waterGlasses = glasses;
      
      const key = this.getDailyIntakeKey(date);
      await AsyncStorage.setItem(key, JSON.stringify(dailyIntake));
      return dailyIntake;
    } catch (error) {
      console.error('Error updating water intake:', error);
      return null;
    }
  }

  // === RECENT SCANS ===
  async getRecentScans(limit = 10) {
    try {
      const scans = await AsyncStorage.getItem(this.STORAGE_KEYS.RECENT_SCANS);
      const recentScans = scans ? JSON.parse(scans) : [];
      return recentScans.slice(0, limit);
    } catch (error) {
      console.error('Error loading recent scans:', error);
      return [];
    }
  }

  async addToRecentScans(foodData) {
    try {
      const recentScans = await this.getRecentScans(50); // Keep max 50
      
      const scanEntry = {
        ...foodData,
        scannedAt: new Date().toISOString(),
        id: Date.now().toString()
      };
      
      // Add to beginning of array
      recentScans.unshift(scanEntry);
      
      // Keep only last 50 scans
      const updatedScans = recentScans.slice(0, 50);
      
      await AsyncStorage.setItem(this.STORAGE_KEYS.RECENT_SCANS, JSON.stringify(updatedScans));
      return updatedScans;
    } catch (error) {
      console.error('Error adding to recent scans:', error);
      return null;
    }
  }

  // === WEEKLY ANALYTICS ===
  async getWeeklyData(startDate = new Date()) {
    try {
      const weeklyData = [];
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() - 6); // Last 7 days
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() - i);
        
        const dailyIntake = await this.getDailyIntake(date);
        weeklyData.push({
          date: date.toISOString().split('T')[0],
          ...dailyIntake.totalNutrition,
          mealsCount: this.getMealsCount(dailyIntake)
        });
      }
      
      return weeklyData.reverse(); // Oldest to newest
    } catch (error) {
      console.error('Error loading weekly data:', error);
      return [];
    }
  }

  getMealsCount(dailyIntake) {
    let count = 0;
    ['breakfast', 'lunch', 'snacks', 'dinner'].forEach(mealType => {
      if (dailyIntake[mealType] && dailyIntake[mealType].length > 0) {
        count++;
      }
    });
    return count;
  }

  // === USER PROFILE ===
  async getUserProfile() {
    try {
      const profile = await AsyncStorage.getItem(this.STORAGE_KEYS.USER_PROFILE);
      return profile ? JSON.parse(profile) : {
        name: 'User',
        age: 25,
        height: 170, // cm
        weight: 70,  // kg
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'maintain' // maintain, lose, gain
      };
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  async saveUserProfile(profile) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      return true;
    } catch (error) {
      console.error('Error saving user profile:', error);
      return false;
    }
  }

  // === UTILITIES ===
  async clearAllData() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Good Morning';
    if (hour < 17) return '☀️ Good Afternoon';
    if (hour < 21) return '🌆 Good Evening';
    return '🌙 Good Night';
  }

  getMealTimeFromHour() {
    const hour = new Date().getHours();
    if (hour < 10) return 'breakfast';
    if (hour < 14) return 'lunch';
    if (hour < 18) return 'snacks';
    return 'dinner';
  }
}

export default new UserDataService();
