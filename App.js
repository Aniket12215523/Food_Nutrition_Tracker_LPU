import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';

import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import FoodCourtScreen from './src/screens/FoodCourtScreen';
import CustomDrawer from './src/components/CustomDrawer';
import ScanResultScreen from './src/screens/ScanResultScreen';

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
            options={{ title: 'LPU Food Scanner' }}
          />
          <Drawer.Screen 
            name="Scanner" 
            component={ScannerScreen}
            options={{ title: 'Food Scanner' }}
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
          <Drawer.Screen 
          name="ScanResult" 
          component={ScanResultScreen}
          options={{ 
            title: 'Scan Result',
            drawerItemStyle: { display: 'none' } // Hide from drawer menu
          }}
        />
        </Drawer.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
