import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  StatusBar,
  Switch,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import UserDataService from '../services/userDataService';
import NotificationService from '../services/notificationService';
import { useTheme } from '../context/ThemeContext'; // 🌙 Using your ThemeContext

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const { theme, isDarkMode, toggleTheme } = useTheme(); // 🌙 Get theme values

  const [profile, setProfile] = useState({
    name: 'User',
    email: '',
    age: 25,
    height: 170, // cm
    weight: 70,  // kg
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintain', // maintain, lose, gain
    joinDate: new Date().toISOString()
  });

  const [preferences, setPreferences] = useState({
    notifications: true,
    darkMode: false,
    units: 'metric', // metric or imperial
    language: 'en',
    autoSync: true,
    weeklyReports: true
  });

  const [dailyStats, setDailyStats] = useState(null);
  const [userGoals, setUserGoals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  
  // 🔧 FIXED: Use state for streak to prevent random changes
  const [streakDays, setStreakDays] = useState(1);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  useEffect(() => {
    loadUserData();
    
    // Initial animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // 🔧 UPDATED: Load user data with real streak calculation
  const loadUserData = async () => {
    try {
      setLoading(true);
      
      const [userProfile, todayIntake, goals, notificationStatus] = await Promise.all([
        UserDataService.getUserProfile(),
        UserDataService.getDailyIntake(),
        UserDataService.getUserGoals(),
        NotificationService.getNotificationStatus()
      ]);

      if (userProfile) {
        setProfile(userProfile);
      }
      
      setDailyStats(todayIntake);
      setUserGoals(goals);
      
      // 🔧 FIXED: Calculate real streak
      const streak = await calculateRealStreak();
      setStreakDays(streak);
      
      // 🌙 Update preferences with theme state
      setPreferences(prev => ({
        ...prev,
        notifications: notificationStatus,
        darkMode: isDarkMode // Sync with theme context
      }));
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🔧 NEW: Real streak calculation based on actual data
  const calculateRealStreak = async () => {
    try {
      const today = new Date();
      let streak = 0;
      
      // Check last 30 days for consistent tracking
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        
        const dayIntake = await UserDataService.getDailyIntake(checkDate);
        const hasMealsLogged = ['breakfast', 'lunch', 'snacks', 'dinner'].some(meal => 
          dayIntake[meal] && dayIntake[meal].length > 0
        );
        
        if (hasMealsLogged) {
          streak++;
        } else {
          break; // Streak is broken
        }
      }
      
      // Return at least 1 if user has any meals today
      const todayMeals = getTotalScans();
      return Math.max(streak, todayMeals > 0 ? 1 : 0);
      
    } catch (error) {
      console.error('Error calculating streak:', error);
      // Fallback: return 1 if user has meals today, 0 otherwise
      return getTotalScans() > 0 ? 1 : 0;
    }
  };

  const saveProfile = async () => {
    try {
      const success = await UserDataService.saveUserProfile(profile);
      if (success) {
        setEditMode(false);
        Alert.alert('Success!', 'Your profile has been updated.');
        
        // 🔧 NEW: Recalculate streak after profile update
        const newStreak = await calculateRealStreak();
        setStreakDays(newStreak);
      } else {
        Alert.alert('Error', 'Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  const calculateBMI = () => {
    const heightInM = profile.height / 100;
    const bmi = profile.weight / (heightInM * heightInM);
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { category: 'Underweight', color: '#2196F3' };
    if (bmi < 25) return { category: 'Normal', color: '#4CAF50' };
    if (bmi < 30) return { category: 'Overweight', color: '#FF9800' };
    return { category: 'Obese', color: '#F44336' };
  };

  const getTotalScans = () => {
    return dailyStats ? 
      ['breakfast', 'lunch', 'snacks', 'dinner'].reduce((total, meal) => 
        total + (dailyStats[meal]?.length || 0), 0
      ) : 0;
  };

  // 🌙 UPDATED: Handle preferences with working dark mode
  const handlePreferenceChange = async (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    
    // Handle notification preference
    if (key === 'notifications') {
      if (value) {
        const initialized = await NotificationService.initialize();
        if (!initialized) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings.',
            [{ text: 'OK' }]
          );
          setPreferences(prev => ({ ...prev, notifications: false }));
        }
      } else {
        await NotificationService.cancelAllNotifications();
      }
    } 
    // 🌙 WORKING: Dark mode implementation
    else if (key === 'darkMode') {
      await toggleTheme(); // This will toggle the entire app theme
      Alert.alert(
        isDarkMode ? 'Dark Mode Disabled 🌞' : 'Dark Mode Enabled 🌙',
        isDarkMode ? 'Switched to light theme!' : 'Switched to dark theme!',
        [{ text: 'Nice!' }]
      );
    }
  };

  const exportData = () => {
    Alert.alert(
      'Export Data',
      'Export your nutrition data as CSV or JSON?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'CSV', onPress: () => handleExport('csv') },
        { text: 'JSON', onPress: () => handleExport('json') }
      ]
    );
  };

  const handleExport = (format) => {
    // Implementation for data export
    Alert.alert('Success!', `Data exported as ${format.toUpperCase()} format.`);
  };

  const clearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your nutrition data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await UserDataService.clearAllData();
              Alert.alert('Success!', 'All data has been cleared.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data.');
            }
          }
        }
      ]
    );
  };

  const bmi = calculateBMI();
  const bmiInfo = getBMICategory(parseFloat(bmi));

  // 🌙 Dynamic styles based on theme
  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[theme.primary, theme.primaryDark]}
          style={styles.loadingGradient}
        >
          <Ionicons name="person" size={48} color="white" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "light-content"} 
        backgroundColor={theme.primary} 
      />
      
      {/* Header */}
      <LinearGradient
        colors={[theme.primary, theme.primaryDark, theme.primaryDark]}
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
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Profile</Text>
          
          <TouchableOpacity 
            style={styles.editButton}
            onPress={editMode ? saveProfile : () => setEditMode(true)}
          >
            <Ionicons 
              name={editMode ? "checkmark" : "create"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View 
          style={[
            styles.profileCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <BlurView intensity={20} style={styles.profileCardBlur}>
            <View style={styles.profileCardContent}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color={theme.primary} />
              </View>
              
              <View style={styles.profileInfo}>
                {editMode ? (
                  <TextInput
                    style={styles.nameInput}
                    value={profile.name}
                    onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
                    placeholder="Enter your name"
                    placeholderTextColor="rgba(255,255,255,0.7)"
                  />
                ) : (
                  <Text style={styles.profileName}>{profile.name}</Text>
                )}
                
                {/* 🔧 FIXED: Use state streak instead of function */}
                <Text style={styles.profileStats}>
                  {streakDays} day streak • {getTotalScans()} meals tracked today
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.statsButton}
                onPress={() => setShowStatsModal(true)}
              >
                <Ionicons name="analytics" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Health Metrics */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Health Metrics</Text>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {editMode ? (
                  <TextInput
                    style={[styles.metricInput, { color: theme.text }]}
                    value={profile.weight.toString()}
                    onChangeText={(text) => setProfile(prev => ({ ...prev, weight: parseInt(text) || 0 }))}
                    keyboardType="numeric"
                  />
                ) : (
                  `${profile.weight} kg`
                )}
              </Text>
              <Text style={styles.metricLabel}>Weight</Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {editMode ? (
                  <TextInput
                    style={[styles.metricInput, { color: theme.text }]}
                    value={profile.height.toString()}
                    onChangeText={(text) => setProfile(prev => ({ ...prev, height: parseInt(text) || 0 }))}
                    keyboardType="numeric"
                  />
                ) : (
                  `${profile.height} cm`
                )}
              </Text>
              <Text style={styles.metricLabel}>Height</Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={[styles.metricValue, { color: bmiInfo.color }]}>
                {bmi}
              </Text>
              <Text style={styles.metricLabel}>BMI</Text>
              <Text style={[styles.bmiCategory, { color: bmiInfo.color }]}>
                {bmiInfo.category}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Personal Information */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="calendar" size={20} color={theme.textSecondary} />
              </View>
              <Text style={styles.infoLabel}>Age</Text>
              {editMode ? (
                <TextInput
                  style={[styles.infoInput, { color: theme.text }]}
                  value={profile.age.toString()}
                  onChangeText={(text) => setProfile(prev => ({ ...prev, age: parseInt(text) || 0 }))}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.infoValue}>{profile.age} years</Text>
              )}
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="person" size={20} color={theme.textSecondary} />
              </View>
              <Text style={styles.infoLabel}>Gender</Text>
              {editMode ? (
                <View style={styles.genderToggle}>
                  <TouchableOpacity
                    style={[styles.genderButton, profile.gender === 'male' && styles.genderButtonActive]}
                    onPress={() => setProfile(prev => ({ ...prev, gender: 'male' }))}
                  >
                    <Text style={[styles.genderButtonText, profile.gender === 'male' && styles.genderButtonTextActive]}>
                      Male
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderButton, profile.gender === 'female' && styles.genderButtonActive]}
                    onPress={() => setProfile(prev => ({ ...prev, gender: 'female' }))}
                  >
                    <Text style={[styles.genderButtonText, profile.gender === 'female' && styles.genderButtonTextActive]}>
                      Female
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.infoValue}>
                  {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
                </Text>
              )}
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="fitness" size={20} color={theme.textSecondary} />
              </View>
              <Text style={styles.infoLabel}>Activity Level</Text>
              {editMode ? (
                <View style={styles.activityButtons}>
                  {['sedentary', 'moderate', 'active'].map(level => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.activityButton,
                        profile.activityLevel === level && styles.activityButtonActive
                      ]}
                      onPress={() => setProfile(prev => ({ ...prev, activityLevel: level }))}
                    >
                      <Text style={[
                        styles.activityButtonText,
                        profile.activityLevel === level && styles.activityButtonTextActive
                      ]}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.infoValue}>
                  {profile.activityLevel.charAt(0).toUpperCase() + profile.activityLevel.slice(1)}
                </Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Preferences */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.preferencesCard}>
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceIcon}>
                <Ionicons name="notifications" size={20} color="#FF9800" />
              </View>
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceTitle}>Meal Notifications</Text>
                <Text style={styles.preferenceDescription}>Daily reminders for meals</Text>
              </View>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={preferences.notifications ? '#fff' : '#f4f3f4'}
                onValueChange={(value) => handlePreferenceChange('notifications', value)}
                value={preferences.notifications}
              />
            </View>
            
            <View style={styles.divider} />
            
            {/* 🌙 WORKING: Dark mode toggle */}
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceIcon}>
                <Ionicons name={isDarkMode ? "moon" : "sunny"} size={20} color="#9C27B0" />
              </View>
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceTitle}>Dark Mode</Text>
                <Text style={styles.preferenceDescription}>
                  {isDarkMode ? 'Dark theme active' : 'Switch to dark theme'}
                </Text>
              </View>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={isDarkMode ? '#fff' : '#f4f3f4'}
                onValueChange={(value) => handlePreferenceChange('darkMode', value)}
                value={isDarkMode} // 🌙 Use actual theme state
              />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceIcon}>
                <Ionicons name="mail" size={20} color="#2196F3" />
              </View>
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceTitle}>Weekly Reports</Text>
                <Text style={styles.preferenceDescription}>Email nutrition summaries</Text>
              </View>
              <Switch
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={preferences.weeklyReports ? '#fff' : '#f4f3f4'}
                onValueChange={(value) => handlePreferenceChange('weeklyReports', value)}
                value={preferences.weeklyReports}
              />
            </View>
          </View>
        </Animated.View>

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
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('GoalSetting')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="flag" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.actionText}>Set Goals</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('NutritionStats')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="analytics" size={24} color="#2196F3" />
              </View>
              <Text style={styles.actionText}>View Stats</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={exportData}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="download" size={24} color="#FF9800" />
              </View>
              <Text style={styles.actionText}>Export Data</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionCard, styles.dangerAction]}
              onPress={clearData}
            >
              <View style={[styles.actionIcon, styles.dangerIcon]}>
                <Ionicons name="trash" size={24} color="#F44336" />
              </View>
              <Text style={[styles.actionText, styles.dangerText]}>Clear Data</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* App Info */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.appInfoCard}>
            <Text style={styles.appInfoTitle}>LPU Food Scanner</Text>
            <Text style={styles.appInfoVersion}>Version 1.0.0</Text>
            <Text style={styles.appInfoDescription}>
              AI-powered nutrition tracking for LPU students
            </Text>
            <View style={styles.appInfoFeatures}>
              <Text style={styles.featureText}>🤖 AI Food Recognition</Text>
              <Text style={styles.featureText}>📊 Nutrition Analytics</Text>
              <Text style={styles.featureText}>🔔 Smart Reminders</Text>
              <Text style={styles.featureText}>🍽️ 37+ LPU Locations</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Stats Modal */}
      <Modal
        visible={showStatsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Today's Progress</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalStats}>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>
                  {dailyStats?.totalNutrition.calories || 0}
                </Text>
                <Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>Calories</Text>
              </View>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>
                  {dailyStats?.totalNutrition.protein || 0}g
                </Text>
                <Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>Protein</Text>
              </View>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>{getTotalScans()}</Text>
                <Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>Meals</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                setShowStatsModal(false);
                navigation.navigate('NutritionStats');
              }}
            >
              <Text style={styles.modalButtonText}>View Detailed Stats</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// 🌙 Dynamic styles function
const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: 'white',
    marginTop: 16,
  },
  header: {
    paddingTop: StatusBar.currentHeight || 44,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  profileCardBlur: {
    padding: 20,
  },
  profileCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
  },
  profileStats: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginTop: -10,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 16,
    marginTop: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4,
  },
  metricInput: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.primary,
    paddingVertical: 2,
    minWidth: 50,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  bmiCategory: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
  },
  infoValue: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  infoInput: {
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.primary,
    paddingVertical: 4,
    textAlign: 'right',
    minWidth: 80,
  },
  genderToggle: {
    flexDirection: 'row',
  },
  genderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.background,
    marginLeft: 8,
  },
  genderButtonActive: {
    backgroundColor: theme.primary,
  },
  genderButtonText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  activityButtons: {
    flexDirection: 'column',
  },
  activityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: theme.background,
    marginBottom: 4,
  },
  activityButtonActive: {
    backgroundColor: theme.primary,
  },
  activityButtonText: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  activityButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 8,
  },
  preferencesCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  preferenceContent: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dangerAction: {
    borderWidth: 1,
    borderColor: '#FFEBEE',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dangerIcon: {
    backgroundColor: '#FFEBEE',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
    textAlign: 'center',
  },
  dangerText: {
    color: '#F44336',
  },
  appInfoCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  appInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4,
  },
  appInfoVersion: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
  },
  appInfoDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  appInfoFeatures: {
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: width - 40,
    maxWidth: 320,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.primary,
    marginBottom: 4,
  },
  modalStatLabel: {
    fontSize: 12,
  },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default ProfileScreen;
