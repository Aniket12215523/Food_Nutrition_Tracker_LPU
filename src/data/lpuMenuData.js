// src/data/lpuMenuData.js

export const lpuFoodCourts = {
  'main-cafeteria': {
    id: 'main-cafeteria',
    name: 'Main Cafeteria',
    location: 'Block 32, LPU Campus',
    timings: '7:00 AM - 10:00 PM',
    description: 'Main dining facility with diverse cuisines',
    items: [
      {
        id: 'mc001',
        name: 'Rajma Rice Bowl',
        price: 75,
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300',
        nutrition: {
          calories: 320,
          protein: 12,
          carbs: 58,
          fat: 6,
          fiber: 8,
          iron: 3.2
        },
        ingredients: ['rajma', 'rice', 'onion', 'tomato', 'spices'],
        availability: ['lunch', 'dinner'],
        category: 'North Indian',
        isVeg: true
      },
      {
        id: 'mc002',
        name: 'Chicken Biryani',
        price: 120,
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03246963d7d9?w=300',
        nutrition: {
          calories: 450,
          protein: 25,
          carbs: 65,
          fat: 12,
          fiber: 3,
          iron: 2.8
        },
        ingredients: ['chicken', 'basmati rice', 'spices', 'yogurt', 'onions'],
        availability: ['lunch', 'dinner'],
        category: 'Biryani',
        isVeg: false
      },
      {
        id: 'mc003',
        name: 'Masala Dosa',
        price: 60,
        imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=300',
        nutrition: {
          calories: 280,
          protein: 8,
          carbs: 45,
          fat: 8,
          fiber: 4,
          iron: 2.1
        },
        ingredients: ['rice', 'lentils', 'potato', 'curry leaves', 'spices'],
        availability: ['breakfast', 'lunch'],
        category: 'South Indian',
        isVeg: true
      }
    ]
  },
  'food-court': {
    id: 'food-court',
    name: 'UniMall Food Court',
    location: 'UniMall, LPU Campus', 
    timings: '8:00 AM - 11:00 PM',
    description: 'Multiple food outlets including Chatori Junction, Hunger Hub',
    items: [
      {
        id: 'fc001',
        name: 'Chatori Junction Thali',
        price: 85,
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300',
        nutrition: {
          calories: 420,
          protein: 15,
          carbs: 62,
          fat: 14,
          fiber: 12,
          iron: 4.5
        },
        ingredients: ['roti', 'dal', 'sabzi', 'rice', 'pickle', 'salad'],
        availability: ['lunch', 'dinner'],
        category: 'Complete Meal',
        isVeg: true
      },
      {
        id: 'fc002',
        name: 'Chinese Noodles',
        price: 70,
        imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300',
        nutrition: {
          calories: 350,
          protein: 10,
          carbs: 55,
          fat: 12,
          fiber: 4,
          iron: 2.3
        },
        ingredients: ['noodles', 'vegetables', 'soy sauce', 'garlic', 'ginger'],
        availability: ['lunch', 'dinner', 'snacks'],
        category: 'Chinese',
        isVeg: true
      },
      {
        id: 'fc003',
        name: 'Pizza Slice',
        price: 45,
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300',
        nutrition: {
          calories: 285,
          protein: 12,
          carbs: 35,
          fat: 11,
          fiber: 2,
          iron: 1.8
        },
        ingredients: ['refined flour', 'cheese', 'tomato sauce', 'vegetables'],
        availability: ['snacks', 'lunch', 'dinner'],
        category: 'Fast Food',
        isVeg: true
      }
    ]
  },
  'hostel-mess': {
    id: 'hostel-mess',
    name: 'Hostel Mess',
    location: 'Various Hostel Blocks',
    timings: '7:30 AM - 9:30 PM',
    description: 'Subsidized meals for hostel residents',
    items: [
      {
        id: 'hm001',
        name: 'Daily Mess Thali',
        price: 40,
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300',
        nutrition: {
          calories: 380,
          protein: 14,
          carbs: 58,
          fat: 12,
          fiber: 10,
          iron: 3.8
        },
        ingredients: ['roti', 'dal', 'seasonal vegetable', 'rice', 'curd'],
        availability: ['breakfast', 'lunch', 'dinner'],
        category: 'Complete Meal',
        isVeg: true
      },
      {
        id: 'hm002',
        name: 'Paratha with Curd',
        price: 25,
        imageUrl: 'https://images.unsplash.com/photo-1574653877327-2ebaa01fb8ec?w=300',
        nutrition: {
          calories: 320,
          protein: 8,
          carbs: 45,
          fat: 12,
          fiber: 3,
          iron: 2.1
        },
        ingredients: ['wheat flour', 'ghee', 'potato/aloo', 'curd', 'pickle'],
        availability: ['breakfast'],
        category: 'Breakfast',
        isVeg: true
      }
    ]
  }
};

export const getAllFoodItems = () => {
  let allItems = [];
  Object.values(lpuFoodCourts).forEach(court => {
    allItems = [...allItems, ...court.items.map(item => ({
      ...item,
      courtName: court.name,
      courtId: court.id
    }))];
  });
  return allItems;
};

export const getFoodCourtById = (courtId) => {
  return lpuFoodCourts[courtId] || null;
};

export const searchFoodItems = (query) => {
  const allItems = getAllFoodItems();
  return allItems.filter(item => 
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase()) ||
    item.ingredients.some(ing => ing.toLowerCase().includes(query.toLowerCase()))
  );
};
