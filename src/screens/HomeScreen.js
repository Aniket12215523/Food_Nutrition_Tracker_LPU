import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import UserDataService from '../services/userDataService';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dailyStats, setDailyStats] = useState(null);
  const [userGoals, setUserGoals] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    loadUserData();
    
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Initial animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    return () => clearInterval(timer);
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load all user data
      const [todayIntake, goals, scans] = await Promise.all([
        UserDataService.getDailyIntake(),
        UserDataService.getUserGoals(),
        UserDataService.getRecentScans(4)
      ]);

      setDailyStats(todayIntake);
      setUserGoals(goals);
      setRecentScans(scans);
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadUserData().then(() => setRefreshing(false));
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return '🌅 Good Morning';
    if (hour < 17) return '☀️ Good Afternoon';
    if (hour < 21) return '🌆 Good Evening';
    return '🌙 Good Night';
  };

  const getMealTime = () => {
    const hour = currentTime.getHours();
    if (hour < 10) return 'Breakfast Time';
    if (hour < 14) return 'Lunch Time';
    if (hour < 18) return 'Snack Time';
    if (hour < 22) return 'Dinner Time';
    return 'Late Night';
  };

  const getCalorieProgress = () => {
    if (!dailyStats || !userGoals) return 0;
    return (dailyStats.totalNutrition.calories / userGoals.dailyCalories) * 100;
  };

  const getProteinProgress = () => {
    if (!dailyStats || !userGoals) return 0;
    return (dailyStats.totalNutrition.protein / userGoals.dailyProtein) * 100;
  };

  const getTotalScannedMeals = () => {
    if (!dailyStats) return 0;
    return ['breakfast', 'lunch', 'snacks', 'dinner'].reduce((count, mealType) => {
      return count + (dailyStats[mealType]?.length || 0);
    }, 0);
  };

  const getOverallHealthScore = () => {
    if (!dailyStats || !userGoals) return 5;
    
    const calorieScore = Math.min(dailyStats.totalNutrition.calories / userGoals.dailyCalories, 1) * 3;
    const proteinScore = Math.min(dailyStats.totalNutrition.protein / userGoals.dailyProtein, 1) * 3;
    const fiberScore = Math.min(dailyStats.totalNutrition.fiber / (userGoals.dailyFiber || 25), 1) * 2;
    const mealScore = getTotalScannedMeals() >= 3 ? 2 : getTotalScannedMeals();
    
    return Math.round(calorieScore + proteinScore + fiberScore + mealScore);
  };

  const handleQuickScan = () => {
    navigation.navigate('Scanner');
  };

  const handleBrowseMenu = () => {
    navigation.navigate('MainCafeteria');
  };

  const handleViewProfile = () => {
    Alert.alert('Profile', 'Profile screen coming soon!');
  };

  const handleViewStats = () => {
    navigation.navigate('NutritionStats');
  };

  const handleSetGoals = () => {
    navigation.navigate('GoalSetting');
  };

  // 🎯 NEW: Handle drawer menu
  const handleDrawerOpen = () => {
    navigation.openDrawer();
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const scanTime = new Date(timestamp);
    const diffInHours = Math.floor((now - scanTime) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#4CAF50', '#45a049']}
          style={styles.loadingGradient}
        >
          <Ionicons name="nutrition" size={48} color="white" />
          <Text style={styles.loadingText}>Loading your nutrition data...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#4CAF50', '#45a049', '#3d8b40']}
        style={styles.header}
      >
        <Animated.View 
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* 🎯 FIXED: Add drawer menu button */}
          <TouchableOpacity style={styles.drawerButton} onPress={handleDrawerOpen}>
            <Ionicons name="menu" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.greetingSection}>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.usernameText}>Welcome back! 👋</Text>
            <Text style={styles.mealTimeText}>{getMealTime()}</Text>
          </View>
          
          <TouchableOpacity style={styles.profileButton} onPress={handleViewProfile}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={24} color="#4CAF50" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Daily Progress Cards */}
        <Animated.View 
          style={[
            styles.progressSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.progressCards}>
            {/* Calories Progress */}
            <BlurView intensity={20} style={styles.progressCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Ionicons name="flame" size={20} color="#FF6B35" />
                  <Text style={styles.cardTitle}>Calories</Text>
                </View>
                <Text style={styles.cardValue}>
                  {dailyStats?.totalNutrition.calories || 0}
                </Text>
                <Text style={styles.cardTarget}>
                  of {userGoals?.dailyCalories || 2200}
                </Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${Math.min(getCalorieProgress(), 100)}%`,
                        backgroundColor: getCalorieProgress() > 100 ? '#FF6B35' : '#4CAF50'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.progressPercent}>
                  {Math.round(getCalorieProgress())}%
                </Text>
              </View>
            </BlurView>

            {/* Protein Progress */}
            <BlurView intensity={20} style={styles.progressCard}>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Ionicons name="fitness" size={20} color="#2196F3" />
                  <Text style={styles.cardTitle}>Protein</Text>
                </View>
                <Text style={styles.cardValue}>
                  {dailyStats?.totalNutrition.protein || 0}g
                </Text>
                <Text style={styles.cardTarget}>
                  of {userGoals?.dailyProtein || 80}g
                </Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${Math.min(getProteinProgress(), 100)}%`,
                        backgroundColor: getProteinProgress() > 100 ? '#FF6B35' : '#2196F3'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.progressPercent}>
                  {Math.round(getProteinProgress())}%
                </Text>
              </View>
            </BlurView>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {/* AI Scan Button */}
            <TouchableOpacity style={styles.primaryAction} onPress={handleQuickScan}>
              <LinearGradient
                colors={['#FF6B35', '#FF8E53']}
                style={styles.actionGradient}
              >
                <Ionicons name="scan" size={32} color="white" />
                <Text style={styles.primaryActionText}>AI Food Scan</Text>
                <Text style={styles.primaryActionSubtext}>Instant nutrition analysis</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              {/* Browse Menu */}
              <TouchableOpacity style={styles.secondaryAction} onPress={handleBrowseMenu}>
                <View style={styles.actionIcon}>
                  <Ionicons name="restaurant" size={24} color="#4CAF50" />
                </View>
                <Text style={styles.actionText}>Browse Menu</Text>
                <Text style={styles.actionSubtext}>NK Food Court</Text>
              </TouchableOpacity>

              {/* View Stats */}
              <TouchableOpacity style={styles.secondaryAction} onPress={handleViewStats}>
                <View style={styles.actionIcon}>
                  <Ionicons name="analytics" size={24} color="#2196F3" />
                </View>
                <Text style={styles.actionText}>Nutrition Stats</Text>
                <Text style={styles.actionSubtext}>View insights</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Today's Summary */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryIcon}>
                <Ionicons name="camera" size={20} color="#4CAF50" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryValue}>{getTotalScannedMeals()}</Text>
                <Text style={styles.summaryLabel}>Meals Scanned</Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <View style={styles.summaryIcon}>
                <Ionicons name="trending-up" size={20} color="#FF6B35" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryValue}>
                  {Math.round(Math.max(getCalorieProgress(), getProteinProgress()))}%
                </Text>
                <Text style={styles.summaryLabel}>Goal Progress</Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <View style={styles.summaryIcon}>
                <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryValue}>{getOverallHealthScore()}/10</Text>
                <Text style={styles.summaryLabel}>Health Score</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Recent Scans */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
            <TouchableOpacity onPress={() => navigation.navigate('NutritionStats')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScans}>
            {recentScans.length > 0 ? (
              recentScans.map((item, index) => (
                <View key={item.id || index} style={styles.recentScanItem}>
                  <View style={styles.scanItemHeader}>
                    <Text style={styles.scanItemName} numberOfLines={2}>
                      {item.foodName || 'Unknown Food'}
                    </Text>
                    <View style={[styles.healthBadge, { backgroundColor: getHealthColor(item.healthScore || 6) }]}>
                      <Text style={styles.healthBadgeText}>{item.healthScore || 6}/10</Text>
                    </View>
                  </View>
                  <Text style={styles.scanItemCalories}>
                    {item.nutrition?.calories || 0} cal
                  </Text>
                  <Text style={styles.scanItemTime}>
                    {formatTimeAgo(item.scannedAt || item.timestamp)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.noScansContainer}>
                <Ionicons name="camera-outline" size={48} color="#ccc" />
                <Text style={styles.noScansText}>No recent scans</Text>
                <Text style={styles.noScansSubtext}>Start scanning food to see your history!</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {/* AI Features Highlight */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.aiFeatureCard}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.aiCardGradient}
            >
              <View style={styles.aiCardContent}>
                <View style={styles.aiIcon}>
                  <Ionicons name="sparkles" size={24} color="white" />
                </View>
                <View style={styles.aiTextContent}>
                  <Text style={styles.aiTitle}>Powered by AI</Text>
                  <Text style={styles.aiDescription}>
                    Advanced nutrition analysis with Gemini 2.5 Flash
                  </Text>
                  <Text style={styles.aiStats}>
                    70+ LPU foods recognized • Real-time analysis • Batch processing
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Tips Section */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>💡 Today's Tip</Text>
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb" size={20} color="#FF9800" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipText}>
                {getTotalScannedMeals() === 0 
                  ? "Start your nutrition journey by scanning your first meal! Our AI can analyze combo meals and provide detailed breakdowns."
                  : getTotalScannedMeals() < 3
                  ? "Great start! Try scanning all your meals today to get complete nutrition insights and better goal tracking."
                  : "Excellent! You're consistently tracking your meals. Check your nutrition stats to see weekly trends and patterns."
                }
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button for Goal Settings */}
      <TouchableOpacity 
        style={styles.goalSettingFab}
        onPress={handleSetGoals}
      >
        <Ionicons name="settings" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

// Helper function for health score colors
const getHealthColor = (score) => {
  if (score >= 8) return '#4CAF50';
  if (score >= 6) return '#FF9800';
  return '#F44336';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    fontSize: 18,
    color: 'white',
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    paddingTop: StatusBar.currentHeight || 44,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  // 🎯 FIXED: Add drawer button styles
  drawerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  greetingSection: {
    flex: 1,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  usernameText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  mealTimeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  profileButton: {
    padding: 4,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    paddingHorizontal: 20,
  },
  progressCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCard: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  cardTarget: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressPercent: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    marginTop: -10,
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
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  quickActions: {
    marginBottom: 8,
    marginTop: 4,
  },
  primaryAction: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionGradient: {
    padding: 24,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  primaryActionSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryContent: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  recentScans: {
    paddingLeft: 20,
  },
  recentScanItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 160,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scanItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  scanItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  healthBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  healthBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  scanItemCalories: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  scanItemTime: {
    fontSize: 12,
    color: '#666',
  },
  noScansContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    marginLeft: 20,
    width: width - 40,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noScansText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  noScansSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  aiFeatureCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  aiCardGradient: {
    padding: 20,
  },
  aiCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  aiTextContent: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  aiDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 6,
  },
  aiStats: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tipCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  goalSettingFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bottomSpacing: {
    height: 100, // Extra space for the FAB
  },
});

export default HomeScreen;
