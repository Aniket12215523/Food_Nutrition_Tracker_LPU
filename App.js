import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import FoodCourtScreen from './src/screens/FoodCourtScreen';
import CustomDrawer from './src/components/CustomDrawer';
import ScanResultScreen from './src/screens/ScanResultScreen';

import NutritionStatsScreen from './src/screens/NutritionStatsScreen';
import GoalSettingScreen from './src/screens/GoalSettingScreen';

const Drawer = createDrawerNavigator();

export default function App() {
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
          <Drawer.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ 
              title: 'LPU Food Scanner',
              headerShown: false // Hide header for custom home screen design
            }}
          />
          <Drawer.Screen 
            name="Scanner" 
            component={ScannerScreen}
            options={{ 
              title: 'Food Scanner',
              headerShown: false // Hide header for custom scanner design
            }}
          />
          <Drawer.Screen 
            name="MainCafeteria" 
            component={FoodCourtScreen}
            options={{ title: 'Main Cafeteria' }}
            initialParams={{ courtId: 'main-cafeteria' }}
          />
          <Drawer.Screen 
            name="FoodCourt" 
            component={FoodCourtScreen}
            options={{ title: 'Food Court' }}
            initialParams={{ courtId: 'food-court' }}
          />
          <Drawer.Screen 
            name="HostelMess" 
            component={FoodCourtScreen}
            options={{ title: 'Hostel Mess' }}
            initialParams={{ courtId: 'hostel-mess' }}
          />
          
          {/* 🎯 ADD THESE NEW SCREENS */}
          <Drawer.Screen 
            name="NutritionStats" 
            component={NutritionStatsScreen}
            options={{ 
              title: 'Nutrition Analytics',
              headerShown: false, // Custom header in the screen
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
              headerShown: false, // Custom header in the screen
              drawerLabel: 'Set Goals',
              drawerIcon: ({ color, size }) => (
                <Ionicons name="flag" size={size} color={color} />
              )
            }}
          />
          
          {/* Hidden screens (not shown in drawer) */}
          <Drawer.Screen 
            name="ScanResult" 
            component={ScanResultScreen}
            options={{ 
              title: 'Scan Result',
              headerShown: false, // Custom header in the screen
              drawerItemStyle: { display: 'none' } // Hide from drawer menu
            }}
          />
        </Drawer.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
