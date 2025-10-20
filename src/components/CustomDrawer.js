import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

const CustomDrawer = (props) => {
  const menuItems = [
    { name: 'Home', screen: 'Home', icon: 'home-outline' },
    { name: 'Food Scanner', screen: 'Scanner', icon: 'camera-outline' },
    { name: 'Main Cafeteria', screen: 'MainCafeteria', icon: 'restaurant-outline' },
    { name: 'Food Court', screen: 'FoodCourt', icon: 'fast-food-outline' },
    { name: 'Hostel Mess', screen: 'HostelMess', icon: 'bed-outline' },
  ];

  return (
    <DrawerContentScrollView {...props} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>LPU Food Scanner</Text>
        <Text style={styles.subHeader}>Nutrition Tracker</Text>
      </View>
      
      {menuItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.menuItem}
          onPress={() => props.navigation.navigate(item.screen)}
        >
          <Ionicons name={item.icon} size={24} color="#2196F3" />
          <Text style={styles.menuText}>{item.name}</Text>
        </TouchableOpacity>
      ))}
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  subHeader: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#333',
  },
});

export default CustomDrawer;
