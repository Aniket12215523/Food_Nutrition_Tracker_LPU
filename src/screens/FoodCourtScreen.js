import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import UserDataService from '../services/userDataService';

const { width } = Dimensions.get('window');

const FoodCourtScreen = ({ route, navigation }) => {
  const { courtId, locationData } = route.params;
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name'); // name, calories, protein, price
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  // Get food items from our nutrition database
  const getFoodItems = () => {
    // For NK Food Court, use our nutrition database
    if (courtId === 'nk-food-court') {
      console.log('🍽️ Loading NK Food Court menu...');
      
      return [
        // North Indian Main Course
        {
          id: 'mix-veg',
          name: 'Mix Veg',
          category: 'North Indian',
          price: 70,
          nutrition: { calories: 140, protein: 5.2, carbs: 18, fat: 6.8, fiber: 5.5 },
          healthScore: 8,
          isVeg: true,
          ingredients: ['mixed vegetables', 'onion', 'tomato', 'spices', 'oil'],
          description: 'Fresh mixed vegetables cooked with aromatic spices',
          weight: '150g'
        },
        {
          id: 'aloo-jeera',
          name: 'Aloo Jeera',
          category: 'North Indian',
          price: 50,
          nutrition: { calories: 165, protein: 3.8, carbs: 24, fat: 7.2, fiber: 3.2 },
          healthScore: 7,
          isVeg: true,
          ingredients: ['potato', 'cumin', 'turmeric', 'oil', 'coriander'],
          description: 'Cumin-flavored spiced potatoes',
          weight: '120g'
        },
        {
          id: 'aloo-gobhi',
          name: 'Aloo Gobhi',
          category: 'North Indian',
          price: 70,
          nutrition: { calories: 155, protein: 4.5, carbs: 22, fat: 6.8, fiber: 4.2 },
          healthScore: 8,
          isVeg: true,
          ingredients: ['potato', 'cauliflower', 'turmeric', 'ginger', 'spices'],
          description: 'Classic potato and cauliflower curry',
          weight: '130g'
        },
        {
          id: 'palak-paneer',
          name: 'Palak Paneer',
          category: 'Paneer Special',
          price: 120,
          nutrition: { calories: 235, protein: 16.0, carbs: 12, fat: 16.2, fiber: 4.2 },
          healthScore: 8,
          isVeg: true,
          ingredients: ['paneer', 'spinach', 'garlic', 'ginger', 'cream'],
          description: 'Cottage cheese in creamy spinach gravy',
          weight: '170g'
        },
        {
          id: 'paneer-butter-masala',
          name: 'Paneer Butter Masala',
          category: 'Paneer Special',
          price: 140,
          nutrition: { calories: 295, protein: 16.8, carbs: 16, fat: 21.5, fiber: 3.0 },
          healthScore: 6,
          isVeg: true,
          ingredients: ['paneer', 'butter', 'tomato gravy', 'cream', 'cashew'],
          description: 'Rich and creamy paneer in butter tomato sauce',
          weight: '180g'
        },
        {
          id: 'dal-makhani',
          name: 'Dal Makhani',
          category: 'Dal',
          price: 90,
          nutrition: { calories: 210, protein: 12.5, carbs: 24, fat: 8.8, fiber: 9.2 },
          healthScore: 8,
          isVeg: true,
          ingredients: ['black dal', 'kidney beans', 'butter', 'cream', 'tomato'],
          description: 'Creamy black lentils slow-cooked with butter',
          weight: '150g'
        },
        {
          id: 'veg-biryani',
          name: 'Veg Biryani',
          category: 'Rice',
          price: 100,
          nutrition: { calories: 385, protein: 9.5, carbs: 58, fat: 14.2, fiber: 4.5 },
          healthScore: 7,
          isVeg: true,
          ingredients: ['basmati rice', 'mixed vegetables', 'yogurt', 'saffron', 'ghee'],
          description: 'Aromatic basmati rice with spiced vegetables',
          weight: '250g'
        },
        {
          id: 'butter-naan',
          name: 'Butter Naan',
          category: 'Tandoor Bread',
          price: 25,
          nutrition: { calories: 220, protein: 6.2, carbs: 35, fat: 7.5, fiber: 2.0 },
          healthScore: 6,
          isVeg: true,
          ingredients: ['refined flour', 'yogurt', 'butter', 'yeast', 'sugar'],
          description: 'Soft buttery Indian bread from tandoor',
          weight: '80g'
        },
        {
          id: 'tandoori-roti',
          name: 'Tandoori Roti',
          category: 'Tandoor Bread',
          price: 10,
          nutrition: { calories: 140, protein: 4.8, carbs: 26, fat: 2.2, fiber: 3.5 },
          healthScore: 8,
          isVeg: true,
          ingredients: ['wheat flour', 'water', 'salt'],
          description: 'Healthy whole wheat bread from tandoor',
          weight: '60g'
        },
        {
          id: 'gulab-jamun',
          name: 'Gulab Jamun',
          category: 'Desserts',
          price: 40,
          nutrition: { calories: 185, protein: 3.2, carbs: 28, fat: 7.5, fiber: 0.5 },
          healthScore: 3,
          isVeg: true,
          ingredients: ['milk powder', 'sugar syrup', 'ghee', 'cardamom'],
          description: 'Sweet milk dumplings in sugar syrup',
          weight: '60g'
        }
      ];
    }
    
    // For other locations, return sample data
    return [
      {
        id: 'sample-item',
        name: 'Sample Food Item',
        category: 'General',
        price: 50,
        nutrition: { calories: 200, protein: 8, carbs: 30, fat: 6, fiber: 3 },
        healthScore: 6,
        isVeg: true,
        ingredients: ['sample ingredients'],
        description: 'Menu coming soon for this location',
        weight: '100g'
      }
    ];
  };

  useEffect(() => {
    loadFoodItems();
    
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

  useEffect(() => {
    filterAndSortItems();
  }, [searchQuery, selectedCategory, sortBy]);

  const loadFoodItems = () => {
    setLoading(true);
    // Simulate loading
    setTimeout(() => {
      const items = getFoodItems();
      setFilteredItems(items);
      setLoading(false);
    }, 500);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadFoodItems();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filterAndSortItems = () => {
    let items = getFoodItems();
    
    // Filter by category
    if (selectedCategory !== 'All') {
      items = items.filter(item => item.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort items
    items.sort((a, b) => {
      switch (sortBy) {
        case 'calories':
          return a.nutrition.calories - b.nutrition.calories;
        case 'protein':
          return b.nutrition.protein - a.nutrition.protein;
        case 'price':
          return a.price - b.price;
        case 'health':
          return b.healthScore - a.healthScore;
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    setFilteredItems(items);
  };

  const getCategories = () => {
    const items = getFoodItems();
    const categories = ['All', ...new Set(items.map(item => item.category))];
    return categories;
  };

  const getHealthColor = (score) => {
    if (score >= 8) return '#4CAF50';
    if (score >= 6) return '#FF9800';
    return '#F44336';
  };

  const handleAddToMeal = async (item) => {
    try {
      const mealType = UserDataService.getMealTimeFromHour();
      
      // Create food data object
      const foodData = {
        foodName: item.name,
        nutrition: item.nutrition,
        healthScore: item.healthScore,
        category: item.category,
        servingSize: `1 serving (${item.weight})`,
        ingredients: item.ingredients,
        method: 'Manual Selection - ' + (locationData?.name || 'Food Court')
      };
      
      await UserDataService.addFoodToMeal(foodData, mealType);
      
      Alert.alert(
        'Added to Meal! 🍽️',
        `${item.name} added to your ${mealType}.`,
        [
          { text: 'OK' },
          { 
            text: 'View Stats', 
            onPress: () => navigation.navigate('NutritionStats') 
          }
        ]
      );
    } catch (error) {
      console.error('Error adding food to meal:', error);
      Alert.alert('Error', 'Failed to add item to meal. Please try again.');
    }
  };

  const renderFoodItem = ({ item }) => (
    <Animated.View
      style={[
        styles.foodCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={['white', '#f8f9fa']}
        style={styles.cardGradient}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.foodInfo}>
            <Text style={styles.foodName}>{item.name}</Text>
            <Text style={styles.foodCategory}>{item.category}</Text>
            <Text style={styles.foodDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceSymbol}>₹</Text>
            <Text style={styles.price}>{item.price}</Text>
          </View>
        </View>

        {/* Nutrition Info */}
        <View style={styles.nutritionRow}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.nutrition.calories}</Text>
            <Text style={styles.nutritionLabel}>cal</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.nutrition.protein}g</Text>
            <Text style={styles.nutritionLabel}>protein</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.nutrition.carbs}g</Text>
            <Text style={styles.nutritionLabel}>carbs</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.nutrition.fat}g</Text>
            <Text style={styles.nutritionLabel}>fat</Text>
          </View>
        </View>

        {/* Tags and Actions */}
        <View style={styles.cardFooter}>
          <View style={styles.tagsContainer}>
            {item.isVeg && (
              <View style={styles.vegTag}>
                <View style={styles.vegDot} />
                <Text style={styles.vegText}>VEG</Text>
              </View>
            )}
            
            <View style={[styles.healthTag, { backgroundColor: getHealthColor(item.healthScore) }]}>
              <Text style={styles.healthTagText}>{item.healthScore}/10</Text>
            </View>
            
            <Text style={styles.weightText}>{item.weight}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddToMeal(item)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.addButtonGradient}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderCategoryButton = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item && styles.categoryButtonActive
      ]}
      onPress={() => setSelectedCategory(item)}
    >
      <Text style={[
        styles.categoryButtonText,
        selectedCategory === item && styles.categoryButtonTextActive
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderSortButton = (sortOption, label, icon) => (
    <TouchableOpacity
      style={[
        styles.sortButton,
        sortBy === sortOption && styles.sortButtonActive
      ]}
      onPress={() => setSortBy(sortOption)}
    >
      <Ionicons 
        name={icon} 
        size={16} 
        color={sortBy === sortOption ? '#4CAF50' : '#666'} 
      />
      <Text style={[
        styles.sortButtonText,
        sortBy === sortOption && styles.sortButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#4CAF50', '#45a049']}
          style={styles.loadingGradient}
        >
          <Ionicons name="restaurant" size={48} color="white" />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={locationData?.color || '#4CAF50'} />
      
      {/* Header */}
      <LinearGradient
        colors={[locationData?.color || '#4CAF50', `${locationData?.color || '#4CAF50'}CC`]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.locationInfo}>
            <Text style={styles.locationName}>{locationData?.name || 'Food Court'}</Text>
            <Text style={styles.locationDetails}>{locationData?.location || 'Campus'}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.timingContainer}>
          <Ionicons name="time" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={styles.timingText}>{locationData?.timing || 'Open Now'}</Text>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search food items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <Animated.View style={styles.filtersPanel}>
          {/* Categories */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Categories</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={getCategories()}
              keyExtractor={(item) => item}
              renderItem={renderCategoryButton}
              contentContainerStyle={styles.categoriesList}
            />
          </View>

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            <View style={styles.sortOptions}>
              {renderSortButton('name', 'Name', 'text')}
              {renderSortButton('calories', 'Calories', 'flame')}
              {renderSortButton('protein', 'Protein', 'fitness')}
              {renderSortButton('price', 'Price', 'pricetag')}
              {renderSortButton('health', 'Health', 'heart')}
            </View>
          </View>
        </Animated.View>
      )}

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} found
        </Text>
        {selectedCategory !== 'All' && (
          <TouchableOpacity
            style={styles.clearFilters}
            onPress={() => setSelectedCategory('All')}
          >
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Food Items List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderFoodItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No items found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  locationDetails: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  filterToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: -10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  filtersPanel: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  categoriesList: {
    paddingRight: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  categoryButtonActive: {
    backgroundColor: '#4CAF50',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  sortButtonActive: {
    backgroundColor: '#e8f5e8',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clearFilters: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF5722',
    borderRadius: 12,
  },
  clearFiltersText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  foodCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardGradient: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  foodInfo: {
    flex: 1,
    marginRight: 16,
  },
  foodName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  foodCategory: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  foodDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  priceContainer: {
    alignItems: 'center',
  },
  priceSymbol: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  nutritionLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vegTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  vegText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  healthTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  healthTagText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  weightText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default FoodCourtScreen;
