import React , {useEffect, useRef} from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import NotificationService from './src/services/notificationService';

import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import FoodCourtScreen from './src/screens/FoodCourtScreen';
import CustomDrawer from './src/components/CustomDrawer';
import ScanResultScreen from './src/screens/ScanResultScreen';
import FoodLocationsHubScreen from './src/screens/FoodLocationsHubScreen';
import NutritionStatsScreen from './src/screens/NutritionStatsScreen';
import GoalSettingScreen from './src/screens/GoalSettingScreen';

const Drawer = createDrawerNavigator();

export default function App() {
  const notificationInitialized = useRef(false);

   useEffect(() => {
    const initializeNotifications = async () => {
    if (notificationInitialized.current) {
        console.log('🔔 Notifications already initialized, skipping...');
        return;
      }

      try {
        const initialized = await NotificationService.initialize();
        if (initialized) {
          console.log('🔔 Meal notifications enabled');
          notificationInitialized.current = true; // Mark as initialized
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };
    
    initializeNotifications();

    let subscription;
    
    try {
      // Import Notifications directly to avoid the service method issue
      const { Notifications } = require('expo-notifications');
      
      subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const screen = response.notification.request.content.data?.screen;
        if (screen) {
          console.log('📱 Notification tapped, navigate to:', screen);
        }
      });
    } catch (error) {
      console.log('📱 Notification responses not available in Expo Go');
    }
    
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);


  return (
    <PaperProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Drawer.Navigator
          drawerContent={(props) => <CustomDrawer {...props} />}
          screenOptions={{
            drawerPosition: 'left',
            headerShown: true,
            headerStyle: {
              backgroundColor: '#2196F3',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          {/* 🏠 Home Screen */}
          <Drawer.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ 
              title: 'LPU Food Scanner',
              headerShown: false
            }}
          />

          {/* 📱 Scanner Screen */}
          <Drawer.Screen 
            name="Scanner" 
            component={ScannerScreen}
            options={{ 
              title: 'Food Scanner',
              headerShown: false
            }}
          />

          {/* 🍽️ UPDATED: Food Location Navigation */}
          <Drawer.Screen 
            name="MainCafeteria" 
            component={FoodLocationsHubScreen}
            options={{ 
              title: 'Main Cafeteria',
              headerShown: false,
              drawerLabel: 'Main Cafeteria',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="restaurant" size={size} color={color} />
              )
            }}
            initialParams={{ initialSection: 'cafeterias' }}
          />

          <Drawer.Screen 
            name="FoodCourt" 
            component={FoodLocationsHubScreen}
            options={{ 
              title: 'Food Courts',
              headerShown: false,
              drawerLabel: 'Food Courts',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="fast-food" size={size} color={color} />
              )
            }}
            initialParams={{ initialSection: 'foodCourts' }}
          />

          <Drawer.Screen 
            name="HostelMess" 
            component={FoodLocationsHubScreen}
            options={{ 
              title: 'Hostel Mess',
              headerShown: false,
              drawerLabel: 'Hostel Mess',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="home" size={size} color={color} />
              )
            }}
            initialParams={{ initialSection: 'boysHostels' }}
          />

          {/* 🎯 Nutrition & Goals */}
          <Drawer.Screen 
            name="NutritionStats" 
            component={NutritionStatsScreen}
            options={{ 
              title: 'Nutrition Analytics',
              headerShown: false,
              drawerLabel: 'Nutrition Stats',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="analytics" size={size} color={color} />
              )
            }}
          />

          <Drawer.Screen 
            name="GoalSetting" 
            component={GoalSettingScreen}
            options={{ 
              title: 'Set Goals',
              headerShown: false,
              drawerLabel: 'Set Goals',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="flag" size={size} color={color} />
              )
            }}
          />

          {/* 🔒 Hidden Screens (accessed via navigation, not drawer) */}
          
          {/* General Food Locations Hub (accessed from HomeScreen) */}
          <Drawer.Screen 
            name="FoodLocationsHub" 
            component={FoodLocationsHubScreen}
            options={{ 
              title: 'Food Locations',
              headerShown: false,
              drawerItemStyle: { display: 'none' } // Hidden from drawer
            }}
          />

          {/* Individual Food Court Menu (accessed from hub) */}
          <Drawer.Screen 
            name="FoodCourtMenu" 
            component={FoodCourtScreen}
            options={{ 
              title: 'Food Menu',
              headerShown: false,
              drawerItemStyle: { display: 'none' } // Hidden from drawer
            }}
          />

          {/* Scan Result Screen */}
          <Drawer.Screen 
            name="ScanResult" 
            component={ScanResultScreen}
            options={{ 
              title: 'Scan Result',
              headerShown: false,
              drawerItemStyle: { display: 'none' } // Hidden from drawer
            }}
          />
        </Drawer.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
