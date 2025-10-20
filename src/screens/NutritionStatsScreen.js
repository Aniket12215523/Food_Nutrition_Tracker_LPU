import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import UserDataService from '../services/userDataService';

const { width } = Dimensions.get('window');

const NutritionStatsScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('today'); // today, week, month
  const [todayData, setTodayData] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [userGoals, setUserGoals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load user goals
      const goals = await UserDataService.getUserGoals();
      setUserGoals(goals);

      if (selectedPeriod === 'today') {
        const today = await UserDataService.getDailyIntake();
        setTodayData(today);
      } else if (selectedPeriod === 'week') {
        const weekly = await UserDataService.getWeeklyData();
        setWeeklyData(weekly);
      }
      
    } catch (error) {
      console.error('Error loading nutrition stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadData().then(() => setRefreshing(false));
  }, [selectedPeriod]);

  const getProgressPercentage = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return '#4CAF50';
    if (percentage >= 70) return '#FF9800';
    return '#F44336';
  };

  const renderTodayStats = () => {
    if (!todayData || !userGoals) return null;

    const { totalNutrition } = todayData;
    
    return (
      <View>
        {/* Macro Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Macros</Text>
          <View style={styles.macroGrid}>
            {/* Calories */}
            <View style={styles.macroCard}>
              <View style={styles.macroIcon}>
                <Ionicons name="flame" size={24} color="#FF6B35" />
              </View>
              <Text style={styles.macroValue}>{totalNutrition.calories}</Text>
              <Text style={styles.macroTarget}>/ {userGoals.dailyCalories}</Text>
              <Text style={styles.macroLabel}>Calories</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${getProgressPercentage(totalNutrition.calories, userGoals.dailyCalories)}%`,
                      backgroundColor: getProgressColor(getProgressPercentage(totalNutrition.calories, userGoals.dailyCalories))
                    }
                  ]}
                />
              </View>
            </View>

            {/* Protein */}
            <View style={styles.macroCard}>
              <View style={styles.macroIcon}>
                <Ionicons name="fitness" size={24} color="#2196F3" />
              </View>
              <Text style={styles.macroValue}>{totalNutrition.protein}g</Text>
              <Text style={styles.macroTarget}>/ {userGoals.dailyProtein}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${getProgressPercentage(totalNutrition.protein, userGoals.dailyProtein)}%`,
                      backgroundColor: getProgressColor(getProgressPercentage(totalNutrition.protein, userGoals.dailyProtein))
                    }
                  ]}
                />
              </View>
            </View>

            {/* Carbs */}
            <View style={styles.macroCard}>
              <View style={styles.macroIcon}>
                <Ionicons name="leaf" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.macroValue}>{totalNutrition.carbs}g</Text>
              <Text style={styles.macroTarget}>/ {userGoals.dailyCarbs}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${getProgressPercentage(totalNutrition.carbs, userGoals.dailyCarbs)}%`,
                      backgroundColor: getProgressColor(getProgressPercentage(totalNutrition.carbs, userGoals.dailyCarbs))
                    }
                  ]}
                />
              </View>
            </View>

            {/* Fat */}
            <View style={styles.macroCard}>
              <View style={styles.macroIcon}>
                <Ionicons name="water" size={24} color="#FF9800" />
              </View>
              <Text style={styles.macroValue}>{totalNutrition.fat}g</Text>
              <Text style={styles.macroTarget}>/ {userGoals.dailyFat}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${getProgressPercentage(totalNutrition.fat, userGoals.dailyFat)}%`,
                      backgroundColor: getProgressColor(getProgressPercentage(totalNutrition.fat, userGoals.dailyFat))
                    }
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Meals Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meals Today</Text>
          {['breakfast', 'lunch', 'snacks', 'dinner'].map(mealType => (
            <View key={mealType} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealTitle}>
                  {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </Text>
                <Text style={styles.mealCount}>
                  {todayData[mealType]?.length || 0} item{(todayData[mealType]?.length || 0) !== 1 ? 's' : ''}
                </Text>
              </View>
              
              {todayData[mealType]?.map((food, index) => (
                <View key={food.id || index} style={styles.foodItem}>
                  <Text style={styles.foodName}>{food.foodName}</Text>
                  <Text style={styles.foodCalories}>{food.nutrition?.calories || 0} cal</Text>
                </View>
              ))}
              
              {(!todayData[mealType] || todayData[mealType].length === 0) && (
                <Text style={styles.emptyMeal}>No food logged yet</Text>
              )}
            </View>
          ))}
        </View>

        {/* Micronutrients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Micronutrients</Text>
          <View style={styles.microGrid}>
            <View style={styles.microItem}>
              <Text style={styles.microValue}>{totalNutrition.fiber}g</Text>
              <Text style={styles.microLabel}>Fiber</Text>
            </View>
            <View style={styles.microItem}>
              <Text style={styles.microValue}>{totalNutrition.iron}mg</Text>
              <Text style={styles.microLabel}>Iron</Text>
            </View>
            <View style={styles.microItem}>
              <Text style={styles.microValue}>{totalNutrition.calcium}mg</Text>
              <Text style={styles.microLabel}>Calcium</Text>
            </View>
            <View style={styles.microItem}>
              <Text style={styles.microValue}>{totalNutrition.vitaminC}mg</Text>
              <Text style={styles.microLabel}>Vitamin C</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderWeeklyStats = () => {
    if (weeklyData.length === 0) return null;

    const weeklyAvg = {
      calories: Math.round(weeklyData.reduce((sum, day) => sum + day.calories, 0) / weeklyData.length),
      protein: Math.round(weeklyData.reduce((sum, day) => sum + day.protein, 0) / weeklyData.length * 10) / 10,
      mealsCount: Math.round(weeklyData.reduce((sum, day) => sum + day.mealsCount, 0) / weeklyData.length * 10) / 10
    };

    return (
      <View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Overview</Text>
          <View style={styles.weeklyGrid}>
            <View style={styles.weeklyCard}>
              <Text style={styles.weeklyValue}>{weeklyAvg.calories}</Text>
              <Text style={styles.weeklyLabel}>Avg Calories/Day</Text>
            </View>
            <View style={styles.weeklyCard}>
              <Text style={styles.weeklyValue}>{weeklyAvg.protein}g</Text>
              <Text style={styles.weeklyLabel}>Avg Protein/Day</Text>
            </View>
            <View style={styles.weeklyCard}>
              <Text style={styles.weeklyValue}>{weeklyAvg.mealsCount}</Text>
              <Text style={styles.weeklyLabel}>Avg Meals/Day</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Breakdown</Text>
          {weeklyData.map((dayData, index) => (
            <View key={dayData.date} style={styles.dayCard}>
              <Text style={styles.dayDate}>
                {new Date(dayData.date).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
              <View style={styles.dayStats}>
                <Text style={styles.dayStat}>{dayData.calories} cal</Text>
                <Text style={styles.dayStat}>{dayData.protein}g protein</Text>
                <Text style={styles.dayStat}>{dayData.mealsCount} meals</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4CAF50', '#45a049']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nutrition Stats</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {['today', 'week'].map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.activePeriodButton
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.activePeriodButtonText
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading nutrition data...</Text>
          </View>
        ) : (
          <>
            {selectedPeriod === 'today' && renderTodayStats()}
            {selectedPeriod === 'week' && renderWeeklyStats()}
          </>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 44,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    width: 40,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    marginHorizontal: 20,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
  },
  activePeriodButton: {
    backgroundColor: 'white',
  },
  periodButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  activePeriodButtonText: {
    color: '#4CAF50',
  },
  content: {
    flex: 1,
    marginTop: -10,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  macroCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  macroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  macroValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  macroTarget: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  mealCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  mealCount: {
    fontSize: 12,
    color: '#666',
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  foodName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  foodCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  emptyMeal: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  microGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  microItem: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  microValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  microLabel: {
    fontSize: 12,
    color: '#666',
  },
  weeklyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weeklyCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  weeklyValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  weeklyLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dayDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  dayStats: {
    flexDirection: 'row',
  },
  dayStat: {
    fontSize: 12,
    color: '#666',
    marginLeft: 16,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default NutritionStatsScreen;
