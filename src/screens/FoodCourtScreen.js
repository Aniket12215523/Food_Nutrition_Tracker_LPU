// src/screens/FoodCourtScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFoodCourtById } from '../data/lpuMenuData';
import FoodCard from '../components/FoodCard';

const FoodCourtScreen = ({ route, navigation }) => {
  const { courtId } = route.params;
  const [foodCourt, setFoodCourt] = useState(null);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const court = getFoodCourtById(courtId);
    setFoodCourt(court);
    if (court) {
      setFilteredItems(court.items);
    }
  }, [courtId]);

  useEffect(() => {
    filterItems();
  }, [searchQuery, selectedCategory, foodCourt]);

  const filterItems = () => {
    if (!foodCourt) return;
    
    let items = foodCourt.items;
    
    // Filter by category
    if (selectedCategory !== 'All') {
      items = items.filter(item => item.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    setFilteredItems(items);
  };

  const getCategories = () => {
    if (!foodCourt) return ['All'];
    const categories = ['All', ...new Set(foodCourt.items.map(item => item.category))];
    return categories;
  };

  const handleFoodItemPress = (item) => {
    // Navigate to food detail screen (we'll create this next)
    navigation.navigate('FoodDetail', { item });
  };

  if (!foodCourt) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{foodCourt.name}</Text>
        <Text style={styles.subtitle}>{foodCourt.location}</Text>
        <Text style={styles.timings}>
          <Ionicons name="time-outline" size={16} color="#666" /> {foodCourt.timings}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search food items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={getCategories()}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === item && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === item && styles.categoryTextActive
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Food Items */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FoodCard item={item} onPress={handleFoodItemPress} />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  timings: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 1,
  },
  categoryButtonActive: {
    backgroundColor: '#2196F3',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
});

export default FoodCourtScreen;
