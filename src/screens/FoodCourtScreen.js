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
import { useData } from '../context/DataContext';

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
  const { addFoodToMeal } = useData();

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  // Get food items from our nutrition database
  const getFoodItems = () => {
     console.log('🔍 FoodCourtScreen - courtId:', courtId);
     console.log('🔍 FoodCourtScreen - locationData:', locationData);

// 🔧 COMPLETE Boys Hostel Mess Menu (BH-1 to BH-8)
    if (courtId?.includes('bh-') || courtId?.includes('boys-hostel') || locationData?.name?.toLowerCase().includes('boys hostel')) {
    console.log('🍽️ Loading Boys Hostel Mess menu...');
  return [
    // === BREAKFAST ITEMS ===
    // Wednesday & Friday
    { id: 'bh_poori', name: 'Poori', price: 0, category: 'Breakfast', nutrition: { calories: 150, protein: 4, carbs: 28, fat: 4, fiber: 2 }, healthScore: 6, ingredients: ['Wheat flour', 'Oil', 'Salt'], weight: '2 pieces' },
    { id: 'bh_stuffed_gobi_parantha', name: 'Stuffed Gobi Parantha', price: 0, category: 'Breakfast', nutrition: { calories: 280, protein: 8, carbs: 35, fat: 12, fiber: 4 }, healthScore: 7, ingredients: ['Wheat flour', 'Cauliflower', 'Spices', 'Ghee'], weight: '1 large' },
    { id: 'bh_stuffed_aloo_parantha', name: 'Stuffed Aloo Parantha', price: 0, category: 'Breakfast', nutrition: { calories: 260, protein: 7, carbs: 38, fat: 10, fiber: 3 }, healthScore: 7, ingredients: ['Wheat flour', 'Potato', 'Spices', 'Ghee'], weight: '1 large' },
    { id: 'bh_stuffed_mix_parantha', name: 'Stuffed Mix Parantha', price: 0, category: 'Breakfast', nutrition: { calories: 270, protein: 8, carbs: 36, fat: 11, fiber: 4 }, healthScore: 7, ingredients: ['Wheat flour', 'Mixed vegetables', 'Spices', 'Ghee'], weight: '1 large' },
    { id: 'bh_plain_parantha', name: 'Plain Parantha', price: 0, category: 'Breakfast', nutrition: { calories: 200, protein: 5, carbs: 28, fat: 8, fiber: 2 }, healthScore: 6, ingredients: ['Wheat flour', 'Ghee', 'Salt'], weight: '1 piece' },
    
    // Thursday & Saturday
    { id: 'bh_kulcha_toasted', name: 'Kulcha (Toasted)', price: 0, category: 'Breakfast', nutrition: { calories: 180, protein: 5, carbs: 32, fat: 4, fiber: 2 }, healthScore: 6, ingredients: ['Refined flour', 'Yogurt', 'Baking powder'], weight: '1 piece' },
    { id: 'bh_matar_gravy', name: 'Matar Gravy', price: 0, category: 'Breakfast', nutrition: { calories: 120, protein: 6, carbs: 18, fat: 4, fiber: 5 }, healthScore: 8, ingredients: ['Green peas', 'Tomato', 'Onion', 'Spices'], weight: '100g' },
    
    // Sides & Accompaniments
    { id: 'bh_pickle', name: 'Mixed Pickle', price: 0, category: 'Sides', nutrition: { calories: 25, protein: 1, carbs: 3, fat: 1, fiber: 1 }, healthScore: 5, ingredients: ['Mixed vegetables', 'Mustard oil', 'Spices'], weight: '20g' },
    { id: 'bh_packed_curd', name: 'Packed Curd', price: 0, category: 'Dairy', nutrition: { calories: 80, protein: 5, carbs: 6, fat: 4, fiber: 0 }, healthScore: 8, ingredients: ['Fresh milk', 'Curd culture'], weight: '100g' },
    { id: 'bh_aloo_bhaji', name: 'Aloo Bhaji', price: 0, category: 'Breakfast', nutrition: { calories: 120, protein: 3, carbs: 18, fat: 5, fiber: 3 }, healthScore: 7, ingredients: ['Potato', 'Onion', 'Spices', 'Oil'], weight: '100g' },
    { id: 'bh_soya_paneer_bhurji', name: 'Soya Paneer Bhurji', price: 0, category: 'Breakfast', nutrition: { calories: 180, protein: 12, carbs: 8, fat: 12, fiber: 4 }, healthScore: 8, ingredients: ['Soya chunks', 'Paneer', 'Onion', 'Spices'], weight: '100g' },
    
    // Special Items
    { id: 'bh_aloo_bonda', name: 'Aloo Bonda', price: 0, category: 'Snacks', nutrition: { calories: 140, protein: 3, carbs: 20, fat: 6, fiber: 2 }, healthScore: 6, ingredients: ['Potato', 'Gram flour', 'Spices', 'Oil'], weight: '2 pieces' },
    { id: 'bh_indori_poha', name: 'Indori Poha', price: 0, category: 'Breakfast', nutrition: { calories: 160, protein: 4, carbs: 28, fat: 4, fiber: 2 }, healthScore: 7, ingredients: ['Flattened rice', 'Onion', 'Peanuts', 'Spices'], weight: '150g' },
    { id: 'bh_cold_sandwich', name: 'Cold Sandwich', price: 0, category: 'Breakfast', nutrition: { calories: 200, protein: 8, carbs: 32, fat: 6, fiber: 3 }, healthScore: 7, ingredients: ['Bread', 'Vegetables', 'Chutney', 'Butter'], weight: '1 sandwich' },
    { id: 'bh_red_sauce_pasta', name: 'Red Sauce Pasta', price: 0, category: 'Breakfast', nutrition: { calories: 220, protein: 6, carbs: 40, fat: 5, fiber: 3 }, healthScore: 7, ingredients: ['Pasta', 'Tomato sauce', 'Vegetables', 'Herbs'], weight: '200g' },
    { id: 'bh_vermicelli_upma', name: 'Vermicelli Upma', price: 0, category: 'Breakfast', nutrition: { calories: 180, protein: 5, carbs: 32, fat: 4, fiber: 2 }, healthScore: 7, ingredients: ['Vermicelli', 'Vegetables', 'Spices', 'Oil'], weight: '150g' },
    { id: 'bh_vegetable_pasta', name: 'Vegetable Pasta', price: 0, category: 'Breakfast', nutrition: { calories: 200, protein: 6, carbs: 35, fat: 5, fiber: 4 }, healthScore: 8, ingredients: ['Pasta', 'Mixed vegetables', 'Olive oil', 'Herbs'], weight: '200g' },
    { id: 'bh_veg_stuffed_toast', name: 'Veg Stuffed Toast', price: 0, category: 'Breakfast', nutrition: { calories: 180, protein: 6, carbs: 28, fat: 6, fiber: 3 }, healthScore: 7, ingredients: ['Bread', 'Mixed vegetables', 'Cheese', 'Spices'], weight: '2 slices' },
    
    // Beverages
    { id: 'bh_masala_tea', name: 'Masala Tea', price: 0, category: 'Beverages', nutrition: { calories: 80, protein: 3, carbs: 12, fat: 3, fiber: 0 }, healthScore: 6, ingredients: ['Tea leaves', 'Milk', 'Sugar', 'Spices'], weight: '150ml' },
    { id: 'bh_plain_milk', name: 'Plain Milk', price: 0, category: 'Beverages', nutrition: { calories: 100, protein: 6, carbs: 8, fat: 5, fiber: 0 }, healthScore: 8, ingredients: ['Fresh milk'], weight: '200ml' },
    { id: 'bh_coffee', name: 'Coffee', price: 0, category: 'Beverages', nutrition: { calories: 60, protein: 2, carbs: 8, fat: 2, fiber: 0 }, healthScore: 6, ingredients: ['Coffee powder', 'Milk', 'Sugar'], weight: '150ml' },
    { id: 'bh_banana', name: 'Banana', price: 0, category: 'Fruits', nutrition: { calories: 90, protein: 1, carbs: 23, fat: 0, fiber: 3 }, healthScore: 9, ingredients: ['Fresh banana'], weight: '1 medium' },
    
    // Bread Items
    { id: 'bh_white_bread_jam', name: 'White Bread with Jam', price: 0, category: 'Breakfast', nutrition: { calories: 200, protein: 6, carbs: 38, fat: 4, fiber: 2 }, healthScore: 5, ingredients: ['White bread', 'Mixed fruit jam'], weight: '2 slices + jam' },
    { id: 'bh_brown_bread_jam', name: 'Brown Bread with Jam', price: 0, category: 'Breakfast', nutrition: { calories: 180, protein: 7, carbs: 34, fat: 3, fiber: 4 }, healthScore: 7, ingredients: ['Brown bread', 'Mixed fruit jam'], weight: '2 slices + jam' },

    // === LUNCH ITEMS ===
    // Main Dishes
    { id: 'bh_palaksha_unadka_kulambha', name: 'Palaksha Unadka Kulambha', price: 0, category: 'Lunch', nutrition: { calories: 140, protein: 5, carbs: 20, fat: 5, fiber: 4 }, healthScore: 8, ingredients: ['Spinach', 'Lentils', 'Spices', 'Coconut'], weight: '150g' },
    { id: 'bh_malabar_sambhar', name: 'Malabar Sambhar', price: 0, category: 'Lunch', nutrition: { calories: 120, protein: 6, carbs: 18, fat: 4, fiber: 5 }, healthScore: 8, ingredients: ['Lentils', 'Vegetables', 'Tamarind', 'Coconut'], weight: '150ml' },
    { id: 'bh_tamarind_rasam', name: 'Tamarind Rasam', price: 0, category: 'Lunch', nutrition: { calories: 60, protein: 2, carbs: 12, fat: 2, fiber: 2 }, healthScore: 7, ingredients: ['Tamarind', 'Tomato', 'Spices', 'Curry leaves'], weight: '150ml' },
    { id: 'bh_black_channa_palya', name: 'Black Channa Palya', price: 0, category: 'Lunch', nutrition: { calories: 180, protein: 8, carbs: 25, fat: 6, fiber: 7 }, healthScore: 8, ingredients: ['Black chickpeas', 'Coconut', 'Spices'], weight: '150g' },
    { id: 'bh_aloo_palak_tomato', name: 'Aloo Palak Tomato', price: 0, category: 'Lunch', nutrition: { calories: 130, protein: 4, carbs: 20, fat: 5, fiber: 4 }, healthScore: 8, ingredients: ['Potato', 'Spinach', 'Tomato', 'Spices'], weight: '150g' },
    { id: 'bh_potato_wedges', name: 'Potato Wedges', price: 0, category: 'Lunch', nutrition: { calories: 160, protein: 3, carbs: 28, fat: 5, fiber: 3 }, healthScore: 6, ingredients: ['Potato', 'Spices', 'Oil'], weight: '150g' },
    { id: 'bh_avail', name: 'Avail (Mixed Vegetable)', price: 0, category: 'Lunch', nutrition: { calories: 100, protein: 3, carbs: 15, fat: 4, fiber: 4 }, healthScore: 8, ingredients: ['Mixed vegetables', 'Coconut', 'Spices'], weight: '150g' },
    { id: 'bh_cabbage_65', name: 'Cabbage 65', price: 0, category: 'Lunch', nutrition: { calories: 120, protein: 3, carbs: 12, fat: 7, fiber: 3 }, healthScore: 7, ingredients: ['Cabbage', 'Spices', 'Gram flour', 'Oil'], weight: '150g' },
    
    // Specialty Dishes
    { id: 'bh_pudina_rice', name: 'Pudina Rice', price: 0, category: 'Rice', nutrition: { calories: 200, protein: 4, carbs: 38, fat: 4, fiber: 2 }, healthScore: 7, ingredients: ['Basmati rice', 'Mint', 'Spices', 'Ghee'], weight: '150g' },
    { id: 'bh_masala_sadam', name: 'Masala Sadam', price: 0, category: 'Rice', nutrition: { calories: 220, protein: 5, carbs: 40, fat: 5, fiber: 2 }, healthScore: 7, ingredients: ['Rice', 'Mixed spices', 'Vegetables', 'Oil'], weight: '150g' },
    { id: 'bh_kavukyappa_sambhar_curry', name: 'Kavukyappa Sambhar Curry', price: 0, category: 'Lunch', nutrition: { calories: 140, protein: 6, carbs: 20, fat: 5, fiber: 5 }, healthScore: 8, ingredients: ['Lentils', 'Vegetables', 'Tamarind', 'Spices'], weight: '150g' },
    { id: 'bh_andhara_veg_biryani', name: 'Andhara Veg Biryani', price: 0, category: 'Rice', nutrition: { calories: 280, protein: 7, carbs: 50, fat: 7, fiber: 4 }, healthScore: 7, ingredients: ['Basmati rice', 'Mixed vegetables', 'Biryani spices', 'Ghee'], weight: '200g' },
    
    // Curries & Gravies
    { id: 'bh_hari_moong_dal', name: 'Hari Moong Dal', price: 0, category: 'Dal', nutrition: { calories: 140, protein: 8, carbs: 20, fat: 4, fiber: 6 }, healthScore: 9, ingredients: ['Green moong dal', 'Turmeric', 'Spices'], weight: '150ml' },
    { id: 'bh_punjabi_kadhi', name: 'Punjabi Kadhi', price: 0, category: 'Curry', nutrition: { calories: 120, protein: 4, carbs: 15, fat: 5, fiber: 2 }, healthScore: 7, ingredients: ['Gram flour', 'Yogurt', 'Spices', 'Pakoda'], weight: '150ml' },
    { id: 'bh_dal_palak', name: 'Dal Palak', price: 0, category: 'Dal', nutrition: { calories: 160, protein: 10, carbs: 20, fat: 5, fiber: 8 }, healthScore: 9, ingredients: ['Lentils', 'Spinach', 'Spices', 'Ghee'], weight: '150ml' },
    
    // Rice Varieties
    { id: 'bh_plain_rice', name: 'Plain Rice', price: 0, category: 'Rice', nutrition: { calories: 180, protein: 4, carbs: 40, fat: 1, fiber: 1 }, healthScore: 6, ingredients: ['Basmati rice'], weight: '150g' },
    { id: 'bh_jeera_rice', name: 'Jeera Rice', price: 0, category: 'Rice', nutrition: { calories: 200, protein: 4, carbs: 38, fat: 4, fiber: 1 }, healthScore: 7, ingredients: ['Basmati rice', 'Cumin seeds', 'Ghee'], weight: '150g' },
    { id: 'bh_chhitranna_rice', name: 'Chhitranna Rice', price: 0, category: 'Rice', nutrition: { calories: 210, protein: 4, carbs: 40, fat: 5, fiber: 2 }, healthScore: 7, ingredients: ['Rice', 'Lemon', 'Turmeric', 'Mustard seeds', 'Curry leaves'], weight: '150g' },
    { id: 'bh_khushka', name: 'Khushka', price: 0, category: 'Rice', nutrition: { calories: 190, protein: 4, carbs: 38, fat: 3, fiber: 1 }, healthScore: 6, ingredients: ['Basmati rice', 'Whole spices', 'Ghee'], weight: '150g' },
    
    // Breads
    { id: 'bh_roti', name: 'Roti', price: 0, category: 'Bread', nutrition: { calories: 80, protein: 3, carbs: 15, fat: 1, fiber: 2 }, healthScore: 8, ingredients: ['Wheat flour', 'Water', 'Salt'], weight: '1 piece' },
    { id: 'bh_roti_makai', name: 'Roti (Makai/Corn)', price: 0, category: 'Bread', nutrition: { calories: 85, protein: 3, carbs: 17, fat: 1, fiber: 3 }, healthScore: 8, ingredients: ['Corn flour', 'Wheat flour', 'Water'], weight: '1 piece' },
    
    // Salads & Sides
    { id: 'bh_green_salad', name: 'Green Salad', price: 0, category: 'Salad', nutrition: { calories: 25, protein: 2, carbs: 5, fat: 0, fiber: 3 }, healthScore: 10, ingredients: ['Cucumber', 'Tomato', 'Onion', 'Lemon', 'Salt'], weight: '100g' },
    { id: 'bh_fryums', name: 'Fryums', price: 0, category: 'Sides', nutrition: { calories: 80, protein: 2, carbs: 15, fat: 2, fiber: 1 }, healthScore: 5, ingredients: ['Rice flour', 'Spices', 'Oil'], weight: '20g' },
    { id: 'bh_appalam', name: 'Appalam', price: 0, category: 'Sides', nutrition: { calories: 60, protein: 2, carbs: 10, fat: 2, fiber: 1 }, healthScore: 5, ingredients: ['Black gram flour', 'Spices', 'Oil'], weight: '1 piece' },
    
    // Specialty Regional Items
    { id: 'bh_finni_chole', name: 'Finni Chole', price: 0, category: 'Lunch', nutrition: { calories: 220, protein: 10, carbs: 30, fat: 7, fiber: 8 }, healthScore: 8, ingredients: ['Chickpeas', 'Tomato', 'Onion', 'Spices'], weight: '150g' },
    { id: 'bh_dal_makhni', name: 'Dal Makhni', price: 0, category: 'Dal', nutrition: { calories: 200, protein: 8, carbs: 20, fat: 10, fiber: 6 }, healthScore: 7, ingredients: ['Black lentils', 'Butter', 'Cream', 'Spices'], weight: '150ml' },
    { id: 'bh_rajma', name: 'Rajma', price: 0, category: 'Curry', nutrition: { calories: 200, protein: 12, carbs: 28, fat: 4, fiber: 10 }, healthScore: 9, ingredients: ['Kidney beans', 'Onion', 'Tomato', 'Spices'], weight: '150g' },
    { id: 'bh_gha_kofta_curry', name: 'Gha Kofta Curry', price: 0, category: 'Curry', nutrition: { calories: 180, protein: 6, carbs: 15, fat: 12, fiber: 3 }, healthScore: 7, ingredients: ['Mixed vegetables', 'Gram flour', 'Gravy', 'Spices'], weight: '150g' },
    { id: 'bh_punjabi_kadhi_pakoda', name: 'Punjabi Kadhi Pakoda', price: 0, category: 'Curry', nutrition: { calories: 160, protein: 5, carbs: 18, fat: 8, fiber: 3 }, healthScore: 7, ingredients: ['Gram flour', 'Yogurt', 'Pakoda', 'Spices'], weight: '150g' },
    
    // More Vegetable Dishes
    { id: 'bh_khatta_meetha_methi', name: 'Khatta Meetha Methi', price: 0, category: 'Lunch', nutrition: { calories: 100, protein: 4, carbs: 12, fat: 4, fiber: 5 }, healthScore: 8, ingredients: ['Fenugreek leaves', 'Jaggery', 'Tamarind', 'Spices'], weight: '100g' },
    { id: 'bh_manchurian', name: 'Manchurian', price: 0, category: 'Indo-Chinese', nutrition: { calories: 160, protein: 4, carbs: 20, fat: 7, fiber: 3 }, healthScore: 6, ingredients: ['Mixed vegetables', 'Soy sauce', 'Cornflour', 'Spices'], weight: '150g' },
    { id: 'bh_mix_veg', name: 'Mix Veg', price: 0, category: 'Lunch', nutrition: { calories: 120, protein: 4, carbs: 18, fat: 4, fiber: 4 }, healthScore: 8, ingredients: ['Mixed vegetables', 'Onion', 'Tomato', 'Spices'], weight: '150g' },
    { id: 'bh_aloo_gajar_matar', name: 'Aloo Gajar Matar', price: 0, category: 'Lunch', nutrition: { calories: 140, protein: 4, carbs: 22, fat: 5, fiber: 4 }, healthScore: 8, ingredients: ['Potato', 'Carrot', 'Green peas', 'Spices'], weight: '150g' },
    { id: 'bh_aloo_cabbage_matar', name: 'Aloo Cabbage Matar', price: 0, category: 'Lunch', nutrition: { calories: 130, protein: 4, carbs: 20, fat: 4, fiber: 4 }, healthScore: 8, ingredients: ['Potato', 'Cabbage', 'Green peas', 'Spices'], weight: '150g' },
    
    // More Rice Varieties
    { id: 'bh_fried_rice', name: 'Fried Rice', price: 0, category: 'Rice', nutrition: { calories: 220, protein: 5, carbs: 40, fat: 5, fiber: 2 }, healthScore: 7, ingredients: ['Rice', 'Mixed vegetables', 'Soy sauce', 'Oil'], weight: '150g' },
    { id: 'bh_mint_rice', name: 'Mint Rice', price: 0, category: 'Rice', nutrition: { calories: 200, protein: 4, carbs: 38, fat: 4, fiber: 2 }, healthScore: 7, ingredients: ['Rice', 'Mint leaves', 'Spices', 'Ghee'], weight: '150g' },
    { id: 'bh_thakkali_sadam', name: 'Thakkali Sadam', price: 0, category: 'Rice', nutrition: { calories: 190, protein: 4, carbs: 36, fat: 4, fiber: 2 }, healthScore: 7, ingredients: ['Rice', 'Tomato', 'Spices', 'Oil'], weight: '150g' },
    { id: 'bh_puliyodharai', name: 'Puliyodharai', price: 0, category: 'Rice', nutrition: { calories: 210, protein: 4, carbs: 40, fat: 5, fiber: 2 }, healthScore: 7, ingredients: ['Rice', 'Tamarind', 'Spices', 'Peanuts'], weight: '150g' },
    { id: 'bh_coconut_rice', name: 'Coconut Rice', price: 0, category: 'Rice', nutrition: { calories: 230, protein: 4, carbs: 38, fat: 7, fiber: 2 }, healthScore: 7, ingredients: ['Rice', 'Coconut', 'Curry leaves', 'Mustard seeds'], weight: '150g' },
    
    // Lentil Varieties
    { id: 'bh_onion_raita', name: 'Onion Raita', price: 0, category: 'Raita', nutrition: { calories: 60, protein: 3, carbs: 8, fat: 2, fiber: 1 }, healthScore: 8, ingredients: ['Yogurt', 'Onion', 'Mint', 'Spices'], weight: '100g' },
    { id: 'bh_boondi_raita', name: 'Boondi Raita', price: 0, category: 'Raita', nutrition: { calories: 80, protein: 4, carbs: 10, fat: 3, fiber: 1 }, healthScore: 7, ingredients: ['Yogurt', 'Boondi', 'Mint', 'Spices'], weight: '100g' },
    { id: 'bh_mix_veg_raita', name: 'Mix Veg Raita', price: 0, category: 'Raita', nutrition: { calories: 70, protein: 4, carbs: 8, fat: 2, fiber: 2 }, healthScore: 8, ingredients: ['Yogurt', 'Mixed vegetables', 'Mint', 'Spices'], weight: '100g' },
    { id: 'bh_lauki_mint_raita', name: 'Lauki Mint Raita', price: 0, category: 'Raita', nutrition: { calories: 50, protein: 3, carbs: 6, fat: 2, fiber: 2 }, healthScore: 9, ingredients: ['Yogurt', 'Bottle gourd', 'Mint', 'Spices'], weight: '100g' },
    { id: 'bh_majjiga_pulusu', name: 'Majjiga Pulusu', price: 0, category: 'Curry', nutrition: { calories: 80, protein: 4, carbs: 10, fat: 3, fiber: 2 }, healthScore: 8, ingredients: ['Buttermilk', 'Vegetables', 'Gram flour', 'Spices'], weight: '150ml' },
    
    // More Bread Varieties
    { id: 'bh_bhatura_roti', name: 'Bhatura/Roti', price: 0, category: 'Bread', nutrition: { calories: 120, protein: 4, carbs: 20, fat: 3, fiber: 2 }, healthScore: 6, ingredients: ['Refined flour', 'Yogurt', 'Oil'], weight: '1 piece' },
    
    // === EVENING SNACKS ===
    { id: 'bh_bread_roll', name: 'Bread Roll', price: 0, category: 'Snacks', nutrition: { calories: 160, protein: 5, carbs: 22, fat: 6, fiber: 2 }, healthScore: 6, ingredients: ['Bread', 'Potato filling', 'Spices', 'Oil'], weight: '1 piece' },
    { id: 'bh_samosa', name: 'Samosa', price: 0, category: 'Snacks', nutrition: { calories: 140, protein: 4, carbs: 18, fat: 6, fiber: 2 }, healthScore: 5, ingredients: ['Wheat flour', 'Potato', 'Peas', 'Spices', 'Oil'], weight: '1 piece' },
    { id: 'bh_kachouri', name: 'Kachouri', price: 0, category: 'Snacks', nutrition: { calories: 150, protein: 5, carbs: 20, fat: 6, fiber: 3 }, healthScore: 6, ingredients: ['Wheat flour', 'Lentil filling', 'Spices', 'Oil'], weight: '1 piece' },
    { id: 'bh_veg_baji', name: 'Veg Baji', price: 0, category: 'Snacks', nutrition: { calories: 120, protein: 3, carbs: 15, fat: 6, fiber: 3 }, healthScore: 6, ingredients: ['Mixed vegetables', 'Gram flour', 'Spices', 'Oil'], weight: '4-5 pieces' },
    { id: 'bh_french_fries', name: 'French Fries', price: 0, category: 'Snacks', nutrition: { calories: 180, protein: 3, carbs: 25, fat: 8, fiber: 3 }, healthScore: 5, ingredients: ['Potato', 'Oil', 'Salt'], weight: '100g' },
    { id: 'bh_green_chutney', name: 'Green Chutney', price: 0, category: 'Condiments', nutrition: { calories: 15, protein: 1, carbs: 2, fat: 1, fiber: 1 }, healthScore: 7, ingredients: ['Mint', 'Coriander', 'Green chili', 'Lemon'], weight: '20g' },
    { id: 'bh_imly_chutney', name: 'Imly Chutney', price: 0, category: 'Condiments', nutrition: { calories: 30, protein: 0, carbs: 8, fat: 0, fiber: 1 }, healthScore: 6, ingredients: ['Tamarind', 'Jaggery', 'Spices'], weight: '20g' },
    { id: 'bh_aloo_sabji', name: 'Aloo Sabji', price: 0, category: 'Snacks', nutrition: { calories: 120, protein: 3, carbs: 18, fat: 5, fiber: 3 }, healthScore: 7, ingredients: ['Potato', 'Onion', 'Spices', 'Oil'], weight: '100g' },
    { id: 'bh_tomato_ketchup', name: 'Tomato Ketchup', price: 0, category: 'Condiments', nutrition: { calories: 20, protein: 0, carbs: 5, fat: 0, fiber: 0 }, healthScore: 4, ingredients: ['Tomato', 'Sugar', 'Vinegar', 'Spices'], weight: '15g' },
    
    // === DINNER ITEMS ===
    // Main Curries
    { id: 'bh_sensaga_pappu', name: 'Sensaga Pappu', price: 0, category: 'Dinner', nutrition: { calories: 160, protein: 8, carbs: 20, fat: 6, fiber: 6 }, healthScore: 8, ingredients: ['Lentils', 'Peanuts', 'Spices', 'Ghee'], weight: '150ml' },
    { id: 'bh_aviyuga_sambhar', name: 'Aviyuga Sambhar', price: 0, category: 'Dinner', nutrition: { calories: 140, protein: 6, carbs: 20, fat: 5, fiber: 5 }, healthScore: 8, ingredients: ['Mixed lentils', 'Vegetables', 'Tamarind', 'Spices'], weight: '150ml' },
    { id: 'bh_thakkali_sambhar', name: 'Thakkali Sambhar', price: 0, category: 'Dinner', nutrition: { calories: 120, protein: 6, carbs: 18, fat: 4, fiber: 5 }, healthScore: 8, ingredients: ['Lentils', 'Tomato', 'Tamarind', 'Spices'], weight: '150ml' },
    { id: 'bh_tomato_pappu', name: 'Tomato Pappu', price: 0, category: 'Dinner', nutrition: { calories: 130, protein: 7, carbs: 18, fat: 4, fiber: 5 }, healthScore: 8, ingredients: ['Lentils', 'Tomato', 'Turmeric', 'Ghee'], weight: '150ml' },
    { id: 'bh_ridge_gourd_pappu', name: 'Ridge Gourd Pappu', price: 0, category: 'Dinner', nutrition: { calories: 120, protein: 6, carbs: 15, fat: 4, fiber: 4 }, healthScore: 8, ingredients: ['Lentils', 'Ridge gourd', 'Spices', 'Ghee'], weight: '150ml' },
    
    // Vegetable Curries
    { id: 'bh_mix_veg_palya', name: 'Mix Veg Palya', price: 0, category: 'Dinner', nutrition: { calories: 110, protein: 4, carbs: 16, fat: 4, fiber: 4 }, healthScore: 8, ingredients: ['Mixed vegetables', 'Coconut', 'Spices'], weight: '150g' },
    { id: 'bh_arikula_vepudu', name: 'Arikula Vepudu', price: 0, category: 'Dinner', nutrition: { calories: 100, protein: 3, carbs: 12, fat: 5, fiber: 3 }, healthScore: 7, ingredients: ['Raw banana', 'Spices', 'Oil'], weight: '150g' },
    { id: 'bh_potato_peas_palyal', name: 'Potato Peas Palyal', price: 0, category: 'Dinner', nutrition: { calories: 140, protein: 5, carbs: 22, fat: 4, fiber: 4 }, healthScore: 8, ingredients: ['Potato', 'Green peas', 'Coconut', 'Spices'], weight: '150g' },
    { id: 'bh_cauliflower_palyal', name: 'Cauliflower Palyal', price: 0, category: 'Dinner', nutrition: { calories: 90, protein: 4, carbs: 12, fat: 3, fiber: 4 }, healthScore: 8, ingredients: ['Cauliflower', 'Coconut', 'Spices'], weight: '150g' },
    { id: 'bh_paneer_chettinad_curry', name: 'Paneer Chettinad Curry', price: 0, category: 'Dinner', nutrition: { calories: 220, protein: 12, carbs: 8, fat: 16, fiber: 3 }, healthScore: 7, ingredients: ['Paneer', 'Coconut', 'Chettinad spices'], weight: '150g' },
    { id: 'bh_chikudukaya_curry', name: 'Chikudukaya Curry', price: 0, category: 'Dinner', nutrition: { calories: 100, protein: 3, carbs: 15, fat: 4, fiber: 4 }, healthScore: 8, ingredients: ['Broad beans', 'Coconut', 'Spices'], weight: '150g' },
    { id: 'bh_beans_fogath', name: 'Beans Fogath', price: 0, category: 'Dinner', nutrition: { calories: 80, protein: 3, carbs: 12, fat: 3, fiber: 4 }, healthScore: 8, ingredients: ['Green beans', 'Coconut', 'Curry leaves'], weight: '150g' },
    
    // Specialty Dishes
    { id: 'bh_soya_mutter_biryani', name: 'Soya Mutter Biryani', price: 0, category: 'Dinner', nutrition: { calories: 300, protein: 12, carbs: 45, fat: 8, fiber: 6 }, healthScore: 8, ingredients: ['Rice', 'Soya chunks', 'Green peas', 'Biryani spices'], weight: '200g' },
    { id: 'bh_veg_dum_biryani', name: 'Veg Dum Biryani', price: 0, category: 'Dinner', nutrition: { calories: 280, protein: 7, carbs: 50, fat: 7, fiber: 4 }, healthScore: 7, ingredients: ['Basmati rice', 'Mixed vegetables', 'Biryani spices', 'Ghee'], weight: '200g' },
    { id: 'bh_channa_dal', name: 'Channa Dal', price: 0, category: 'Dinner', nutrition: { calories: 150, protein: 8, carbs: 22, fat: 4, fiber: 7 }, healthScore: 9, ingredients: ['Split chickpeas', 'Turmeric', 'Spices', 'Ghee'], weight: '150ml' },
    { id: 'bh_moong_masoor_dal', name: 'Moong Masoor Dal', price: 0, category: 'Dinner', nutrition: { calories: 140, protein: 9, carbs: 20, fat: 4, fiber: 8 }, healthScore: 9, ingredients: ['Moong dal', 'Masoor dal', 'Spices', 'Ghee'], weight: '150ml' },
    { id: 'bh_kadai_dal_fry', name: 'Kadai Dal Fry', price: 0, category: 'Dinner', nutrition: { calories: 160, protein: 8, carbs: 22, fat: 5, fiber: 7 }, healthScore: 8, ingredients: ['Mixed lentils', 'Onion', 'Tomato', 'Spices'], weight: '150ml' },
    
    // More Vegetable Dishes
    { id: 'bh_manchurian_dry', name: 'Manchurian (Dry)', price: 0, category: 'Dinner', nutrition: { calories: 140, protein: 4, carbs: 18, fat: 6, fiber: 3 }, healthScore: 6, ingredients: ['Cauliflower', 'Soy sauce', 'Cornflour', 'Spices'], weight: '150g' },
    { id: 'bh_tawa_veg', name: 'Tawa Veg', price: 0, category: 'Dinner', nutrition: { calories: 120, protein: 4, carbs: 16, fat: 5, fiber: 4 }, healthScore: 8, ingredients: ['Mixed vegetables', 'Spices', 'Oil'], weight: '150g' },
    { id: 'bh_soya_chap_makhni', name: 'Soya Chap Makhni', price: 0, category: 'Dinner', nutrition: { calories: 200, protein: 15, carbs: 12, fat: 12, fiber: 5 }, healthScore: 8, ingredients: ['Soya chaap', 'Tomato gravy', 'Butter', 'Cream'], weight: '150g' },
    { id: 'bh_aloo_matar_dry', name: 'Aloo Matar (Dry)', price: 0, category: 'Dinner', nutrition: { calories: 140, protein: 5, carbs: 22, fat: 4, fiber: 4 }, healthScore: 8, ingredients: ['Potato', 'Green peas', 'Spices', 'Oil'], weight: '150g' },
    { id: 'bh_aloo_gobhi_matar', name: 'Aloo Gobhi Matar', price: 0, category: 'Dinner', nutrition: { calories: 130, protein: 5, carbs: 20, fat: 4, fiber: 5 }, healthScore: 8, ingredients: ['Potato', 'Cauliflower', 'Green peas', 'Spices'], weight: '150g' },
    { id: 'bh_paneer_do_pyaza', name: 'Paneer Do Pyaza', price: 0, category: 'Dinner', nutrition: { calories: 200, protein: 12, carbs: 10, fat: 14, fiber: 3 }, healthScore: 7, ingredients: ['Paneer', 'Onion', 'Tomato', 'Spices'], weight: '150g' },
    { id: 'bh_paneer_butter_masala', name: 'Paneer Butter Masala', price: 0, category: 'Dinner', nutrition: { calories: 280, protein: 14, carbs: 12, fat: 20, fiber: 2 }, healthScore: 6, ingredients: ['Paneer', 'Tomato', 'Butter', 'Cream', 'Spices'], weight: '150g' },
    
    // More Rice Dishes
    { id: 'bh_corn_coriander_pulao', name: 'Corn Coriander Pulao', price: 0, category: 'Dinner', nutrition: { calories: 220, protein: 5, carbs: 40, fat: 5, fiber: 3 }, healthScore: 7, ingredients: ['Rice', 'Sweet corn', 'Coriander', 'Spices'], weight: '150g' },
    { id: 'bh_matar_pulao', name: 'Matar Pulao', price: 0, category: 'Dinner', nutrition: { calories: 200, protein: 6, carbs: 38, fat: 4, fiber: 3 }, healthScore: 8, ingredients: ['Rice', 'Green peas', 'Spices', 'Ghee'], weight: '150g' },
    
    // Additional Items from Menu
    { id: 'bh_yellow_dal_fry', name: 'Yellow Dal Fry', price: 0, category: 'Dinner', nutrition: { calories: 150, protein: 8, carbs: 22, fat: 4, fiber: 7 }, healthScore: 9, ingredients: ['Yellow lentils', 'Onion', 'Tomato', 'Spices'], weight: '150ml' },
    { id: 'bh_palak_corn_masala', name: 'Palak Corn Masala', price: 0, category: 'Dinner', nutrition: { calories: 120, protein: 5, carbs: 18, fat: 4, fiber: 5 }, healthScore: 8, ingredients: ['Spinach', 'Sweet corn', 'Spices'], weight: '150g' },
    { id: 'bh_mash_ki_dal', name: 'Mash Ki Dal', price: 0, category: 'Dinner', nutrition: { calories: 140, protein: 9, carbs: 20, fat: 4, fiber: 8 }, healthScore: 9, ingredients: ['Black gram dal', 'Spices', 'Ghee'], weight: '150ml' },
    { id: 'bh_dal_palak_combo', name: 'Dal Palak', price: 0, category: 'Dinner', nutrition: { calories: 160, protein: 10, carbs: 20, fat: 5, fiber: 8 }, healthScore: 9, ingredients: ['Lentils', 'Spinach', 'Spices', 'Ghee'], weight: '150ml' },
    { id: 'bh_whole_masoor_dal', name: 'Whole Masoor Dal', price: 0, category: 'Dinner', nutrition: { calories: 140, protein: 9, carbs: 22, fat: 3, fiber: 8 }, healthScore: 9, ingredients: ['Whole red lentils', 'Spices', 'Ghee'], weight: '150ml' }
  ];
}


  // 🔧 NEW: Protein House Menu
  if (courtId === 'protein-house' || locationData?.name?.toLowerCase().includes('protein house')) {
    console.log('🏋️ Loading Protein House menu...');
    return [
      { 
        id: 'ph_protein_shake_chocolate', 
        name: 'Chocolate Protein Shake', 
        price: 120,
        category: 'Protein Shakes',
        nutrition: { calories: 200, protein: 25, carbs: 15, fat: 3, fiber: 2 },
        healthScore: 9,
        ingredients: ['Whey protein', 'Milk', 'Cocoa powder', 'Banana'],
        weight: '300ml'
      },
      { 
        id: 'ph_protein_shake_vanilla', 
        name: 'Vanilla Protein Shake', 
        price: 120,
        category: 'Protein Shakes',
        nutrition: { calories: 190, protein: 25, carbs: 12, fat: 3, fiber: 1 },
        healthScore: 9,
        ingredients: ['Whey protein', 'Milk', 'Vanilla extract', 'Honey'],
        weight: '300ml'
      },
      { 
        id: 'ph_mass_gainer_shake', 
        name: 'Mass Gainer Shake', 
        price: 150,
        category: 'Mass Gainers',
        nutrition: { calories: 450, protein: 30, carbs: 60, fat: 8, fiber: 3 },
        healthScore: 8,
        ingredients: ['Mass gainer powder', 'Milk', 'Banana', 'Oats'],
        weight: '400ml'
      },
      { 
        id: 'ph_pre_workout', 
        name: 'Pre-Workout Energy Drink', 
        price: 80,
        category: 'Pre-Workout',
        nutrition: { calories: 25, protein: 0, carbs: 6, fat: 0, fiber: 0 },
        healthScore: 7,
        ingredients: ['Caffeine', 'Beta-alanine', 'Creatine', 'Natural flavors'],
        weight: '250ml'
      },
      { 
        id: 'ph_bcaa_drink', 
        name: 'BCAA Energy Drink', 
        price: 70,
        category: 'BCAA',
        nutrition: { calories: 15, protein: 5, carbs: 2, fat: 0, fiber: 0 },
        healthScore: 8,
        ingredients: ['Branched-chain amino acids', 'Electrolytes', 'Natural flavors'],
        weight: '250ml'
      },
      { 
        id: 'ph_protein_bar_peanut', 
        name: 'Peanut Butter Protein Bar', 
        price: 100,
        category: 'Protein Bars',
        nutrition: { calories: 220, protein: 20, carbs: 18, fat: 8, fiber: 4 },
        healthScore: 8,
        ingredients: ['Whey protein', 'Peanut butter', 'Oats', 'Dark chocolate'],
        weight: '60g'
      },
      { 
        id: 'ph_protein_bar_chocolate', 
        name: 'Chocolate Protein Bar', 
        price: 100,
        category: 'Protein Bars',
        nutrition: { calories: 200, protein: 18, carbs: 20, fat: 6, fiber: 3 },
        healthScore: 8,
        ingredients: ['Whey protein', 'Dark chocolate', 'Almonds', 'Dates'],
        weight: '60g'
      },
      
      { 
        id: 'ph_paneer_tikka', 
        name: 'High Protein Paneer Tikka', 
        price: 120,
        category: 'Protein Foods',
        nutrition: { calories: 200, protein: 15, carbs: 6, fat: 12, fiber: 2 },
        healthScore: 8,
        ingredients: ['Fresh paneer', 'Greek yogurt', 'Spices', 'Vegetables'],
        weight: '150g'
      },
      { 
        id: 'ph_protein_smoothie_bowl', 
        name: 'Protein Smoothie Bowl', 
        price: 140,
        category: 'Healthy Bowls',
        nutrition: { calories: 280, protein: 20, carbs: 35, fat: 8, fiber: 6 },
        healthScore: 9,
        ingredients: ['Protein powder', 'Greek yogurt', 'Berries', 'Granola', 'Nuts'],
        weight: '350g'
      }
    ];
  }
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
      
      // 🚀 Use context for real-time update
      const success = await addFoodToMeal(foodData, mealType);
      
      if (success) {
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
      } else {
        Alert.alert('Error', 'Failed to add item to meal. Please try again.');
      }
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
