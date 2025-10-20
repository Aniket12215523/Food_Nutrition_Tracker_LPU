import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

class FoodRecognitionService {
  constructor() {
    this.APIs = {
      GEMINI_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
      GEMINI_URL: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',

      HF_KEY: process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY,
      HF_URL: 'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',

      GOOGLE_VISION_KEY: process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY,
      GOOGLE_VISION_URL: 'https://vision.googleapis.com/v1/images:annotate',
    };

    // Local database for known foods (fast lookup)
    this.perUnitNutrition = this.initializePerUnitDatabase();
  }

  async safeFetch(url, options) {
    const res = await fetch(url, options);
    const text = await res.text();
    if (!res.ok) {
      console.error('❌ API Response:', text);
      throw new Error(`API error ${res.status}: ${text}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async imageToBase64(imageUri) {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('✅ Base64 conversion via FileSystem');
      return base64;
    } catch (error) {
      console.warn('⚠️ FileSystem failed, retrying via ImageManipulator...');
      const manipulated = await ImageManipulator.manipulateAsync(imageUri, [], { base64: true });
      if (manipulated.base64) {
        console.log('✅ Base64 conversion via ImageManipulator');
        return manipulated.base64;
      }
      throw new Error('❌ Failed to convert image to Base64');
    }
  }

  // 🎯 MAIN METHOD: Support user input + image analysis
  async recognizeFood(imageUri, userInput = null) {
    const base64Image = await this.imageToBase64(imageUri);
    
    const prompt = userInput ? 
      this.createUserAssistedPrompt(userInput) : 
      this.createQuantityDetectionPrompt();

    const methods = [
      { name: 'Gemini Vision', func: () => this.analyzeWithGemini(base64Image, prompt, userInput) },
      { name: 'Hugging Face Vision', func: () => this.analyzeWithHuggingFace(base64Image) },
      { name: 'Google Vision', func: () => this.analyzeWithGoogleVision(base64Image) },
    ];

    for (const { name, func } of methods) {
      try {
        console.log(`🧠 Trying ${name}...`);
        const result = await func();
        if (result) {
          console.log(`✅ ${name} succeeded!`);
          return { ...result, usedModel: name, imageUri, userInput };
        }
      } catch (error) {
        console.warn(`⚠️ ${name} failed:`, error.message);
      }
    }

    const fallback = this.getFallbackData(imageUri, userInput);
    console.log('⚡ All AIs failed → using fallback');
    return { ...fallback, usedModel: 'Local Fallback' };
  }

  createQuantityDetectionPrompt() {
    return `You are an expert food analyst. Look at this image and COUNT EXACTLY how many of each food item you see.

CRITICAL INSTRUCTIONS:
1. COUNT each visible food item carefully
2. Be very specific about quantities (1, 2, 3, 4, 5, 6, 7, 8, etc.)
3. Don't estimate - COUNT what you actually see
4. If items are stacked/overlapping, count visible portions
5. Identify specific food names (Pizza, Burger, Dosa, Paratha, etc.)

EXAMPLE RESPONSE:
{
  "detectedItems": [
    {
      "foodName": "Margherita Pizza",
      "visibleCount": 2,
      "perUnitWeight": "150g",
      "totalWeight": "300g"
    },
    {
      "foodName": "French Fries",
      "visibleCount": 1,
      "perUnitWeight": "100g", 
      "totalWeight": "100g"
    }
  ],
  "confidence": 0.9
}

IMPORTANT: 
- Be specific with food names (Margherita Pizza, not just Pizza)
- Count accurately - this is more important than anything else
- Don't artificially limit nutrition values
- Return ONLY the JSON structure above`;
  }

  createUserAssistedPrompt(userInput) {
    return `The user has provided this information about the food: "${userInput}"

Use this user input to help identify the food items, but still COUNT the quantities you see in the image.

If user says "3 parathas and dal" but you see 2 parathas, use what you SEE (2 parathas).
If user helps identify food type but not quantity, count what's visible.

Return the same JSON structure as before, but use the user's food identification to help with accuracy:

{
  "detectedItems": [
    {
      "foodName": "User-identified food name",
      "visibleCount": "COUNT_FROM_IMAGE",
      "userProvided": true,
      "perUnitWeight": "weight per piece",
      "totalWeight": "total weight"
    }
  ],
  "confidence": 0.95,
  "userAssisted": true
}`;
  }

  async analyzeWithGemini(base64Image, prompt, userInput = null) {
    if (!this.APIs.GEMINI_KEY) throw new Error('Missing Gemini API key');

    try {
      const url = `${this.APIs.GEMINI_URL}?key=${this.APIs.GEMINI_KEY}`;
      const response = await this.safeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
            ],
          }],
        }),
      });

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Gemini returned no text output');
      }

      console.log('✅ Gemini response received, processing...');
      return this.processQuantityResponse(text, userInput);

    } catch (error) {
      console.error('❌ Gemini error:', error);
      throw error;
    }
  }

  async processQuantityResponse(text, userInput = null) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsedData = JSON.parse(jsonMatch[0]);
          console.log('✅ Successfully parsed quantity data');
          return await this.formatQuantityResponse(parsedData, userInput);
        } catch (jsonError) {
          console.warn('⚠️ JSON parsing failed, using intelligent extraction');
        }
      }

      return this.extractQuantitiesFromText(text, userInput);
      
    } catch (error) {
      console.error('❌ Quantity processing failed:', error);
      throw error;
    }
  }

  // 🎯 ENHANCED: Format response with AI nutrition generation
  async formatQuantityResponse(data, userInput = null) {
    if (!data.detectedItems) {
      throw new Error('No detected items in response');
    }

    const processedItems = [];

    for (const item of data.detectedItems) {
      // Get base data from local database or prepare for AI generation
      const perUnitData = this.getPerUnitNutrition(item.foodName);
      const count = parseInt(item.visibleCount) || 1;

      let finalPerUnitData = perUnitData;
      
      // 🎯 NEW: Generate AI nutrition if needed
      if (perUnitData.needsAIGeneration) {
        console.log('🤖 Generating AI nutrition for:', item.foodName);
        
        const aiNutrition = await this.generateNutritionFromAI(
          item.foodName, 
          count, 
          item.perUnitWeight || perUnitData.weight
        );
        
        if (aiNutrition) {
          finalPerUnitData = {
            displayName: item.foodName,
            weight: aiNutrition.standardWeight || item.perUnitWeight || perUnitData.weight,
            nutrition: aiNutrition.perUnitNutrition,
            category: aiNutrition.category || 'Food Item',
            healthScore: aiNutrition.healthScore || 6,
            ingredients: aiNutrition.ingredients || ['mixed ingredients'],
            tips: aiNutrition.tips || 'Enjoy as part of a balanced diet'
          };
        } else {
          // Enhanced fallback for unknown foods
          finalPerUnitData = this.generateSmartFallback(item.foodName);
        }
      }

      // Calculate total nutrition
      const totalNutrition = this.multiplyNutrition(finalPerUnitData.nutrition, count);

      processedItems.push({
        name: finalPerUnitData.displayName || item.foodName,
        visibleCount: count,
        perUnitWeight: finalPerUnitData.weight,
        totalWeight: `${parseInt(finalPerUnitData.weight) * count}g`,
        perUnitNutrition: finalPerUnitData.nutrition,
        totalNutrition: totalNutrition,
        userProvided: userInput ? true : false,
        category: finalPerUnitData.category,
        healthScore: finalPerUnitData.healthScore,
        ingredients: finalPerUnitData.ingredients,
        tips: finalPerUnitData.tips,
        generatedByAI: perUnitData.needsAIGeneration, // 🎯 NEW: Flag for UI
        portion: {
          size: count > 3 ? 'Large' : count > 1 ? 'Medium' : 'Small',
          quantity: `${count} piece${count > 1 ? 's' : ''}`,
          weight: `${parseInt(finalPerUnitData.weight) * count}g`
        }
      });
    }

    const grandTotalNutrition = this.calculateGrandTotal(processedItems);

    return {
      foodName: this.createFoodName(processedItems),
      isComboMeal: processedItems.length > 1,
      itemCount: processedItems.length,
      totalFoodPieces: processedItems.reduce((sum, item) => sum + item.visibleCount, 0),
      individualItems: processedItems,
      confidence: data.confidence || 0.9,
      category: this.categorizeCombo(processedItems),
      servingSize: this.createServingDescription(processedItems),
      nutrition: grandTotalNutrition,
      healthScore: this.calculateAccurateHealthScore(grandTotalNutrition),
      dietaryInfo: this.getDietaryInfo(processedItems),
      ingredients: this.extractIngredients(processedItems),
      tips: this.generateQuantityTips(processedItems, grandTotalNutrition),
      method: userInput ? 'Gemini 2.5 - User Assisted + AI Nutrition' : 'Gemini 2.5 - AI Nutrition Enhanced',
      timestamp: new Date().toISOString(),
      userAssisted: userInput ? true : false,
      hasAIGeneratedNutrition: processedItems.some(item => item.generatedByAI) // 🎯 NEW: For UI
    };
  }

  // 🎯 NEW: Generate nutrition from AI for unknown foods
  async generateNutritionFromAI(foodName, quantity, weight) {
    try {
      console.log(`🤖 Generating nutrition for: ${quantity}x ${foodName} (${weight})`);
      
      const nutritionPrompt = `You are a professional nutritionist database. Provide accurate nutrition information for this specific food item.

Food: ${foodName}
Quantity: ${quantity} piece(s)
Estimated Weight per piece: ${weight}

Return ONLY this JSON structure with realistic nutrition values per piece:
{
  "perUnitNutrition": {
    "calories": 250,
    "protein": 12.5,
    "carbs": 30.2,
    "fat": 8.7,
    "fiber": 3.1,
    "sugar": 5.2,
    "sodium": 380,
    "iron": 1.8,
    "calcium": 85,
    "vitaminC": 2
  },
  "standardWeight": "125g",
  "category": "Fast Food",
  "healthScore": 5,
  "ingredients": ["wheat flour", "cheese", "tomato sauce", "vegetables", "oil"],
  "tips": "High in sodium and calories - enjoy occasionally"
}

Base your values on:
- Standard nutritional databases (USDA, Indian food composition tables)
- Typical preparation methods for this food
- Realistic portion sizes for one piece
- Regional variations if applicable (Indian vs Western preparation)

Be accurate and realistic. Return per-piece nutrition only. No explanatory text.`;

      const url = `${this.APIs.GEMINI_URL}?key=${this.APIs.GEMINI_KEY}`;
      const response = await this.safeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: nutritionPrompt }]
          }],
        }),
      });

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('No nutrition data from AI');
      }

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const nutritionData = JSON.parse(jsonMatch[0]);
        console.log('✅ AI generated nutrition for', foodName);
        return nutritionData;
      }

      throw new Error('Failed to parse AI nutrition data');

    } catch (error) {
      console.error('❌ AI nutrition generation failed:', error);
      return null;
    }
  }

  // 🎯 ENHANCED: Get per-unit nutrition (local DB or mark for AI generation)
  getPerUnitNutrition(foodName) {
    const searchTerm = foodName.toLowerCase();
    
    // First check local database for known foods
    for (const [key, data] of Object.entries(this.perUnitNutrition)) {
      if (searchTerm.includes(key) || searchTerm.includes(data.displayName.toLowerCase())) {
        console.log('✅ Found in local database:', data.displayName);
        return data;
      }
    }
    
    // 🎯 NEW: Mark for AI nutrition generation
    console.log('🤖 Food not in database, will use AI nutrition:', foodName);
    return {
      displayName: foodName,
      weight: this.estimateWeight(foodName),
      nutrition: 'AI_GENERATE',
      needsAIGeneration: true
    };
  }

  // 🎯 NEW: Estimate weight based on food type
  estimateWeight(foodName) {
    const name = foodName.toLowerCase();
    
    // Weight estimation based on food type
    if (name.includes('pizza')) return '150g';
    if (name.includes('burger')) return '180g';
    if (name.includes('sandwich')) return '120g';
    if (name.includes('pasta')) return '200g';
    if (name.includes('noodles')) return '150g';
    if (name.includes('dosa')) return '100g';
    if (name.includes('idli')) return '40g';
    if (name.includes('vada')) return '50g';
    if (name.includes('cake')) return '80g';
    if (name.includes('cookie')) return '15g';
    
    return '100g'; // Default weight
  }

  // 🎯 NEW: Smart fallback for unknown foods
  generateSmartFallback(foodName) {
    const foodType = this.categorizeFoodType(foodName);
    
    const categoryNutrition = {
      'pizza': {
        calories: 266, protein: 11, carbs: 33, fat: 10, fiber: 2, 
        sugar: 4, sodium: 598, iron: 2.5, calcium: 144, vitaminC: 2
      },
      'burger': {
        calories: 295, protein: 17, carbs: 28, fat: 14, fiber: 2,
        sugar: 4, sodium: 396, iron: 2.5, calcium: 135, vitaminC: 2
      },
      'pasta': {
        calories: 220, protein: 8, carbs: 43, fat: 1, fiber: 3,
        sugar: 3, sodium: 142, iron: 1.8, calcium: 18, vitaminC: 0
      },
      'noodles': {
        calories: 138, protein: 5, carbs: 25, fat: 2, fiber: 1,
        sugar: 1, sodium: 182, iron: 1.8, calcium: 18, vitaminC: 0
      },
      'sandwich': {
        calories: 250, protein: 12, carbs: 30, fat: 8, fiber: 3,
        sugar: 4, sodium: 450, iron: 2.2, calcium: 80, vitaminC: 5
      },
      'cake': {
        calories: 320, protein: 4, carbs: 58, fat: 12, fiber: 1,
        sugar: 45, sodium: 285, iron: 1.2, calcium: 80, vitaminC: 0
      },
      'default': {
        calories: 200, protein: 8, carbs: 28, fat: 7, fiber: 3,
        sugar: 5, sodium: 300, iron: 1.8, calcium: 60, vitaminC: 5
      }
    };

    const nutrition = categoryNutrition[foodType] || categoryNutrition['default'];
    
    return {
      displayName: foodName,
      weight: this.estimateWeight(foodName),
      nutrition: nutrition,
      category: 'Food Item',
      healthScore: 6,
      ingredients: ['mixed ingredients'],
      tips: 'Nutrition estimated based on similar foods'
    };
  }

  // Helper to categorize food types
  categorizeFoodType(foodName) {
    const name = foodName.toLowerCase();
    
    if (name.includes('pizza')) return 'pizza';
    if (name.includes('burger')) return 'burger';
    if (name.includes('pasta')) return 'pasta';
    if (name.includes('noodles')) return 'noodles';
    if (name.includes('sandwich')) return 'sandwich';
    if (name.includes('cake') || name.includes('pastry')) return 'cake';
    
    return 'default';
  }

  // Extract quantities from text when JSON fails
  extractQuantitiesFromText(text, userInput = null) {
    console.log('🔍 Extracting quantities from text...');
    
    const quantityPatterns = [
      /(\d+)\s*(pizza|burger|sandwich|pasta|noodles|dosa|idli|vada)/gi,
      /(\d+)\s*(paratha|roti|chapati)/gi,
      /(\d+)\s*(bonda|samosa)/gi,
      /(\d+)\s*(poori|puri)/gi,
    ];
    
    const detectedItems = [];
    
    for (const pattern of quantityPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const count = parseInt(match[1]);
        const foodType = match[2].toLowerCase();
        
        if (count > 0 && count <= 20) {
          detectedItems.push({
            foodName: foodType.charAt(0).toUpperCase() + foodType.slice(1),
            visibleCount: count,
            perUnitWeight: this.estimateWeight(foodType),
            userProvided: userInput ? true : false
          });
        }
      }
    }
    
    // If no quantities found, assume 1 of detected food
    if (detectedItems.length === 0) {
      const foodTypes = ['pizza', 'burger', 'paratha', 'dosa', 'noodles'];
      for (const foodType of foodTypes) {
        if (text.toLowerCase().includes(foodType)) {
          detectedItems.push({
            foodName: foodType.charAt(0).toUpperCase() + foodType.slice(1),
            visibleCount: 1,
            perUnitWeight: this.estimateWeight(foodType),
            userProvided: false
          });
          break;
        }
      }
    }
    
    return this.formatQuantityResponse({ detectedItems, confidence: 0.8 }, userInput);
  }

  // All other helper methods remain the same
  multiplyNutrition(perUnitNutrition, count) {
    const result = {};
    
    Object.keys(perUnitNutrition).forEach(key => {
      const value = perUnitNutrition[key] * count;
      
      if (key === 'calories' || key === 'sodium' || key === 'calcium') {
        result[key] = Math.round(value);
      } else {
        result[key] = Math.round(value * 10) / 10;
      }
    });
    
    return result;
  }

  calculateGrandTotal(items) {
    const grandTotal = {
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
      sugar: 0, sodium: 0, iron: 0, calcium: 0, vitaminC: 0
    };
    
    items.forEach(item => {
      if (item.totalNutrition) {
        Object.keys(grandTotal).forEach(key => {
          grandTotal[key] += item.totalNutrition[key] || 0;
        });
      }
    });
    
    Object.keys(grandTotal).forEach(key => {
      if (key === 'calories' || key === 'sodium' || key === 'calcium') {
        grandTotal[key] = Math.round(grandTotal[key]);
      } else {
        grandTotal[key] = Math.round(grandTotal[key] * 10) / 10;
      }
    });
    
    return grandTotal;
  }

  createFoodName(items) {
    if (items.length === 1) {
      const item = items[0];
      return item.visibleCount > 1 ? 
        `${item.visibleCount} ${item.name}s` : 
        item.name;
    } else {
      const descriptions = items.slice(0, 3).map(item => 
        `${item.visibleCount} ${item.name}${item.visibleCount > 1 ? 's' : ''}`
      );
      return `Combo: ${descriptions.join(' + ')}${items.length > 3 ? ' + more' : ''}`;
    }
  }

  createServingDescription(items) {
    const totalPieces = items.reduce((sum, item) => sum + item.visibleCount, 0);
    const totalWeight = items.reduce((sum, item) => sum + (parseInt(item.totalWeight) || 0), 0);
    
    return `${totalPieces} piece${totalPieces > 1 ? 's' : ''} total (${totalWeight}g)`;
  }

  generateQuantityTips(items, nutrition) {
    const tips = [];
    const totalPieces = items.reduce((sum, item) => sum + item.visibleCount, 0);
    const hasAIGenerated = items.some(item => item.generatedByAI);
    
    if (totalPieces >= 6) {
      tips.push('Large meal - consider sharing or saving some for later');
    } else if (totalPieces >= 3) {
      tips.push('Good portion size for a satisfying meal');
    }
    
    if (nutrition.protein > 20) {
      tips.push(`High protein content (${nutrition.protein}g) - great for muscle building`);
    }
    
    if (nutrition.calories > 600) {
      tips.push('High-calorie meal - balance with lighter foods during the day');
    }
    
    if (hasAIGenerated) {
      tips.push('Nutrition data enhanced with AI analysis');
    }
    
    return tips.length > 0 ? tips.join('. ') + '.' : 'Enjoy your meal!';
  }

  categorizeCombo(items) {
    if (items.length === 1) {
      return items[0].category || 'Food Item';
    }
    return 'Combo Meal';
  }

  calculateAccurateHealthScore(nutrition) {
    if (!nutrition) return 6;
    
    let score = 6;
    
    if (nutrition.protein > 15) score += 1;
    if (nutrition.fiber > 8) score += 1;
    if (nutrition.iron > 3) score += 0.5;
    if (nutrition.vitaminC > 10) score += 0.5;
    
    if (nutrition.sodium > 800) score -= 1;
    if (nutrition.calories > 800) score -= 0.5;
    if (nutrition.fat > 30) score -= 0.5;
    if (nutrition.sugar > 25) score -= 0.5;
    
    return Math.max(1, Math.min(10, Math.round(score * 2) / 2));
  }

  getDietaryInfo(items) {
    const hasNonVeg = items.some(item => 
      item.ingredients?.some(ing => ['chicken', 'mutton', 'meat', 'egg'].includes(ing.toLowerCase()))
    );

    const hasDairy = items.some(item =>
      item.ingredients?.some(ing => ['butter', 'ghee', 'cream', 'milk', 'cheese'].includes(ing.toLowerCase()))
    );

    const hasGluten = items.some(item =>
      item.ingredients?.some(ing => ['wheat', 'flour', 'bread'].includes(ing.toLowerCase()))
    );

    const totalProtein = items.reduce((sum, item) => sum + (item.totalNutrition?.protein || 0), 0);

    return {
      isVegetarian: !hasNonVeg,
      isVegan: !hasNonVeg && !hasDairy,
      isGlutenFree: !hasGluten,
      isHighProtein: totalProtein > 20,
      isBalanced: items.length >= 2
    };
  }

  extractIngredients(items) {
    const ingredients = new Set();
    
    items.forEach(item => {
      if (item.ingredients) {
        item.ingredients.forEach(ing => ingredients.add(ing));
      }
    });
    
    return Array.from(ingredients).slice(0, 8);
  }

  // Local database for known foods (unchanged)
  
initializePerUnitDatabase() {
  return {
    // === EXISTING ITEMS (preserved) ===
    'paratha': {
      displayName: 'Plain Paratha',
      weight: '70g',
      nutrition: {
        calories: 180, protein: 4.0, carbs: 28, fat: 6.5, fiber: 3.0,
        sugar: 2, sodium: 180, iron: 1.8, calcium: 25, vitaminC: 0
      },
      category: 'Indian Bread',
      healthScore: 7,
      ingredients: ['wheat flour', 'oil', 'salt'],
      tips: 'Good source of carbohydrates and energy'
    },

    // === NORTH INDIAN MAIN COURSE ===
    'mix_veg': {
      displayName: 'Mix Veg',
      weight: '150g',
      nutrition: {
        calories: 140, protein: 5.2, carbs: 18, fat: 6.8, fiber: 5.5,
        sugar: 8, sodium: 320, iron: 2.4, calcium: 85, vitaminC: 25
      },
      category: 'North Indian',
      healthScore: 8,
      ingredients: ['mixed vegetables', 'onion', 'tomato', 'spices', 'oil'],
      tips: 'Rich in vitamins and minerals from fresh vegetables'
    },

    'aloo_jeera': {
      displayName: 'Aloo Jeera',
      weight: '120g',
      nutrition: {
        calories: 165, protein: 3.8, carbs: 24, fat: 7.2, fiber: 3.2,
        sugar: 3, sodium: 280, iron: 1.8, calcium: 28, vitaminC: 12
      },
      category: 'North Indian',
      healthScore: 7,
      ingredients: ['potato', 'cumin', 'turmeric', 'oil', 'coriander'],
      tips: 'Simple and flavorful potato preparation'
    },

    'aloo_gobhi': {
      displayName: 'Aloo Gobhi',
      weight: '130g',
      nutrition: {
        calories: 155, protein: 4.5, carbs: 22, fat: 6.8, fiber: 4.2,
        sugar: 6, sodium: 300, iron: 2.1, calcium: 35, vitaminC: 45
      },
      category: 'North Indian',
      healthScore: 8,
      ingredients: ['potato', 'cauliflower', 'turmeric', 'ginger', 'spices'],
      tips: 'Good source of vitamin C and fiber'
    },

    'gobhi_masala': {
      displayName: 'Gobhi Masala',
      weight: '125g',
      nutrition: {
        calories: 148, protein: 4.2, carbs: 20, fat: 7.0, fiber: 4.8,
        sugar: 7, sodium: 310, iron: 2.0, calcium: 42, vitaminC: 50
      },
      category: 'North Indian',
      healthScore: 8,
      ingredients: ['cauliflower', 'onion', 'tomato', 'garam masala', 'oil'],
      tips: 'High in vitamin C and antioxidants'
    },

    'aloo_mutter': {
      displayName: 'Aloo Mutter',
      weight: '135g',
      nutrition: {
        calories: 162, protein: 5.8, carbs: 23, fat: 6.5, fiber: 5.2,
        sugar: 8, sodium: 290, iron: 2.5, calcium: 35, vitaminC: 18
      },
      category: 'North Indian',
      healthScore: 8,
      ingredients: ['potato', 'green peas', 'tomato', 'cumin', 'coriander'],
      tips: 'Good protein from peas and complex carbs'
    },

    'banarasi_dum_aloo': {
      displayName: 'Banarasi Dum Aloo',
      weight: '140g',
      nutrition: {
        calories: 195, protein: 4.2, carbs: 26, fat: 9.5, fiber: 3.8,
        sugar: 5, sodium: 380, iron: 2.2, calcium: 32, vitaminC: 15
      },
      category: 'North Indian',
      healthScore: 7,
      ingredients: ['baby potato', 'yogurt', 'cashew', 'garam masala', 'ghee'],
      tips: 'Rich and creamy traditional recipe'
    },

    'kashmiri_dum_aloo': {
      displayName: 'Kashmiri Dum Aloo',
      weight: '140g',
      nutrition: {
        calories: 210, protein: 4.5, carbs: 28, fat: 10.2, fiber: 4.0,
        sugar: 6, sodium: 350, iron: 2.4, calcium: 38, vitaminC: 12
      },
      category: 'North Indian',
      healthScore: 7,
      ingredients: ['baby potato', 'yogurt', 'fennel', 'saffron', 'ghee'],
      tips: 'Aromatic Kashmiri specialty with unique spices'
    },

    'aloo_bhurji': {
      displayName: 'Aloo Bhurji',
      weight: '110g',
      nutrition: {
        calories: 145, protein: 3.5, carbs: 20, fat: 6.8, fiber: 2.8,
        sugar: 4, sodium: 260, iron: 1.6, calcium: 22, vitaminC: 18
      },
      category: 'North Indian',
      healthScore: 7,
      ingredients: ['potato', 'onion', 'green chili', 'turmeric', 'coriander'],
      tips: 'Light and spiced mashed potato dish'
    },

    'baingan_bharta': {
      displayName: 'Baingan Bharta',
      weight: '130g',
      nutrition: {
        calories: 125, protein: 3.8, carbs: 15, fat: 6.5, fiber: 6.2,
        sugar: 9, sodium: 280, iron: 1.8, calcium: 28, vitaminC: 8
      },
      category: 'North Indian',
      healthScore: 8,
      ingredients: ['eggplant', 'onion', 'tomato', 'garlic', 'mustard oil'],
      tips: 'High fiber and low calorie vegetable dish'
    },

    'bhindi_masala': {
      displayName: 'Bhindi Masala',
      weight: '120g',
      nutrition: {
        calories: 135, protein: 4.2, carbs: 16, fat: 7.0, fiber: 5.8,
        sugar: 4, sodium: 240, iron: 2.0, calcium: 65, vitaminC: 22
      },
      category: 'North Indian',
      healthScore: 8,
      ingredients: ['okra', 'onion', 'turmeric', 'coriander', 'oil'],
      tips: 'Rich in fiber and vitamin C'
    },

    'keema_gobhi_mutter': {
      displayName: 'Keema Gobhi Mutter',
      weight: '145g',
      nutrition: {
        calories: 185, protein: 8.5, carbs: 18, fat: 9.2, fiber: 4.5,
        sugar: 8, sodium: 380, iron: 3.2, calcium: 45, vitaminC: 35
      },
      category: 'North Indian',
      healthScore: 7,
      ingredients: ['soy keema', 'cauliflower', 'peas', 'garam masala', 'oil'],
      tips: 'High protein vegetarian keema alternative'
    },

    'palak_chana': {
      displayName: 'Palak Chana',
      weight: '140g',
      nutrition: {
        calories: 168, protein: 8.8, carbs: 22, fat: 5.5, fiber: 8.2,
        sugar: 5, sodium: 320, iron: 4.5, calcium: 125, vitaminC: 28
      },
      category: 'North Indian',
      healthScore: 9,
      ingredients: ['spinach', 'chickpeas', 'onion', 'garlic', 'cumin'],
      tips: 'Excellent source of iron and protein'
    },

    'palak_corn': {
      displayName: 'Palak Corn',
      weight: '130g',
      nutrition: {
        calories: 142, protein: 6.2, carbs: 20, fat: 5.8, fiber: 5.5,
        sugar: 8, sodium: 280, iron: 3.8, calcium: 105, vitaminC: 32
      },
      category: 'North Indian',
      healthScore: 8,
      ingredients: ['spinach', 'sweet corn', 'onion', 'garlic', 'spices'],
      tips: 'Rich in iron from spinach and fiber from corn'
    },

    'palak_kofta': {
      displayName: 'Palak Kofta',
      weight: '160g',
      nutrition: {
        calories: 195, protein: 7.5, carbs: 18, fat: 12.0, fiber: 4.8,
        sugar: 6, sodium: 350, iron: 4.2, calcium: 145, vitaminC: 25
      },
      category: 'North Indian',
      healthScore: 7,
      ingredients: ['spinach kofta', 'spinach gravy', 'paneer', 'cream', 'spices'],
      tips: 'Protein-rich with iron from spinach'
    },

    'tomato_chutney': {
      displayName: 'Tomato Chutney',
      weight: '50g',
      nutrition: {
        calories: 45, protein: 1.8, carbs: 8, fat: 1.2, fiber: 2.2,
        sugar: 6, sodium: 180, iron: 0.8, calcium: 15, vitaminC: 18
      },
      category: 'Condiment',
      healthScore: 7,
      ingredients: ['tomato', 'tamarind', 'jaggery', 'mustard seeds', 'chili'],
      tips: 'Rich in vitamin C and antioxidants'
    },

    'black_chana_masala': {
      displayName: 'Black Chana Masala',
      weight: '150g',
      nutrition: {
        calories: 185, protein: 10.5, carbs: 26, fat: 6.2, fiber: 9.5,
        sugar: 4, sodium: 380, iron: 4.8, calcium: 65, vitaminC: 8
      },
      category: 'North Indian',
      healthScore: 9,
      ingredients: ['black chickpeas', 'onion', 'tomato', 'garam masala', 'oil'],
      tips: 'Excellent source of plant protein and fiber'
    },

    'white_chana_masala': {
      displayName: 'White Chana Masala',
      weight: '150g',
      nutrition: {
        calories: 175, protein: 9.8, carbs: 25, fat: 5.8, fiber: 8.8,
        sugar: 5, sodium: 360, iron: 4.2, calcium: 58, vitaminC: 10
      },
      category: 'North Indian',
      healthScore: 9,
      ingredients: ['white chickpeas', 'onion', 'tomato', 'cumin', 'coriander'],
      tips: 'High protein and fiber legume preparation'
    },

    'veg_kofta': {
      displayName: 'Veg Kofta',
      weight: '180g',
      nutrition: {
        calories: 225, protein: 8.2, carbs: 22, fat: 13.5, fiber: 4.5,
        sugar: 8, sodium: 420, iron: 2.8, calcium: 85, vitaminC: 15
      },
      category: 'North Indian',
      healthScore: 6,
      ingredients: ['mixed vegetable kofta', 'tomato gravy', 'cashew', 'cream'],
      tips: 'Rich and creamy - enjoy in moderation'
    },

    'malai_kofta': {
      displayName: 'Malai Kofta',
      weight: '180g',
      nutrition: {
        calories: 245, protein: 9.5, carbs: 20, fat: 16.2, fiber: 3.8,
        sugar: 9, sodium: 380, iron: 2.5, calcium: 125, vitaminC: 12
      },
      category: 'North Indian',
      healthScore: 6,
      ingredients: ['paneer kofta', 'cream gravy', 'cashew', 'butter', 'spices'],
      tips: 'High in protein but also high in calories'
    },

    'kadhi_pakora': {
      displayName: 'Kadhi Pakora',
      weight: '200g',
      nutrition: {
        calories: 185, protein: 6.8, carbs: 20, fat: 9.5, fiber: 3.2,
        sugar: 8, sodium: 420, iron: 2.2, calcium: 95, vitaminC: 5
      },
      category: 'North Indian',
      healthScore: 7,
      ingredients: ['yogurt curry', 'besan pakora', 'turmeric', 'ginger', 'cumin'],
      tips: 'Probiotic benefits from yogurt'
    },

    // === DAL VARIETIES ===
    'dal_makhani': {
      displayName: 'Dal Makhani',
      weight: '150g',
      nutrition: {
        calories: 210, protein: 12.5, carbs: 24, fat: 8.8, fiber: 9.2,
        sugar: 4, sodium: 380, iron: 4.8, calcium: 85, vitaminC: 3
      },
      category: 'Dal',
      healthScore: 8,
      ingredients: ['black dal', 'kidney beans', 'butter', 'cream', 'tomato'],
      tips: 'Rich source of plant protein and iron'
    },

    'yellow_dal': {
      displayName: 'Yellow Dal',
      weight: '150g',
      nutrition: {
        calories: 155, protein: 11.2, carbs: 22, fat: 4.5, fiber: 8.5,
        sugar: 3, sodium: 280, iron: 4.2, calcium: 45, vitaminC: 2
      },
      category: 'Dal',
      healthScore: 9,
      ingredients: ['yellow lentils', 'turmeric', 'cumin', 'garlic', 'coriander'],
      tips: 'Complete protein source with high fiber'
    },

    'punjabi_dal_tadka': {
      displayName: 'Punjabi Dal Tadka',
      weight: '150g',
      nutrition: {
        calories: 168, protein: 11.8, carbs: 23, fat: 5.2, fiber: 8.8,
        sugar: 3, sodium: 320, iron: 4.5, calcium: 52, vitaminC: 5
      },
      category: 'Dal',
      healthScore: 9,
      ingredients: ['mixed lentils', 'onion', 'tomato', 'ghee', 'whole spices'],
      tips: 'Traditional Punjabi style with rich flavor'
    },

    'rajma_tadka': {
      displayName: 'Rajma Tadka',
      weight: '150g',
      nutrition: {
        calories: 195, protein: 12.8, carbs: 26, fat: 6.2, fiber: 10.5,
        sugar: 4, sodium: 380, iron: 4.8, calcium: 65, vitaminC: 8
      },
      category: 'Dal',
      healthScore: 9,
      ingredients: ['kidney beans', 'onion', 'tomato', 'garam masala', 'oil'],
      tips: 'Excellent source of protein and fiber'
    },

    'white_chana_gravy': {
      displayName: 'White Chana Gravy',
      weight: '150g',
      nutrition: {
        calories: 182, protein: 10.2, carbs: 25, fat: 6.0, fiber: 9.2,
        sugar: 5, sodium: 350, iron: 4.5, calcium: 62, vitaminC: 12
      },
      category: 'Dal',
      healthScore: 9,
      ingredients: ['white chickpeas', 'onion gravy', 'tomato', 'cumin', 'bay leaves'],
      tips: 'High protein legume with complex carbs'
    },

    'black_chana_gravy': {
      displayName: 'Black Chana Gravy',
      weight: '150g',
      nutrition: {
        calories: 188, protein: 10.8, carbs: 26, fat: 6.2, fiber: 9.8,
        sugar: 4, sodium: 370, iron: 5.2, calcium: 68, vitaminC: 10
      },
      category: 'Dal',
      healthScore: 9,
      ingredients: ['black chickpeas', 'onion', 'tomato', 'garam masala', 'oil'],
      tips: 'Higher iron content than white chickpeas'
    },

    // === TANDOOR BREADS ===
    'tandoori_roti': {
      displayName: 'Tandoori Roti',
      weight: '60g',
      nutrition: {
        calories: 140, protein: 4.8, carbs: 26, fat: 2.2, fiber: 3.5,
        sugar: 1, sodium: 200, iron: 2.0, calcium: 25, vitaminC: 0
      },
      category: 'Tandoor Bread',
      healthScore: 8,
      ingredients: ['wheat flour', 'water', 'salt'],
      tips: 'Healthy whole wheat bread option'
    },

    'tandoori_butter_roti': {
      displayName: 'Tandoori Butter Roti',
      weight: '65g',
      nutrition: {
        calories: 165, protein: 5.0, carbs: 26, fat: 5.8, fiber: 3.5,
        sugar: 1, sodium: 220, iron: 2.0, calcium: 28, vitaminC: 0
      },
      category: 'Tandoor Bread',
      healthScore: 7,
      ingredients: ['wheat flour', 'butter', 'water', 'salt'],
      tips: 'Buttery flavor with extra calories'
    },

    'butter_naan': {
      displayName: 'Butter Naan',
      weight: '80g',
      nutrition: {
        calories: 220, protein: 6.2, carbs: 35, fat: 7.5, fiber: 2.0,
        sugar: 3, sodium: 380, iron: 2.2, calcium: 45, vitaminC: 0
      },
      category: 'Tandoor Bread',
      healthScore: 6,
      ingredients: ['refined flour', 'yogurt', 'butter', 'yeast', 'sugar'],
      tips: 'Soft and buttery but higher in calories'
    },

    'plain_naan': {
      displayName: 'Plain Naan',
      weight: '75g',
      nutrition: {
        calories: 195, protein: 5.8, carbs: 35, fat: 4.2, fiber: 1.8,
        sugar: 3, sodium: 350, iron: 2.0, calcium: 40, vitaminC: 0
      },
      category: 'Tandoor Bread',
      healthScore: 6,
      ingredients: ['refined flour', 'yogurt', 'yeast', 'oil', 'salt'],
      tips: 'Classic Indian bread - pairs well with curry'
    },

    'lachha_parantha': {
      displayName: 'Lachha Parantha',
      weight: '85g',
      nutrition: {
        calories: 240, protein: 6.0, carbs: 32, fat: 10.5, fiber: 3.2,
        sugar: 2, sodium: 280, iron: 2.2, calcium: 35, vitaminC: 0
      },
      category: 'Tandoor Bread',
      healthScore: 6,
      ingredients: ['wheat flour', 'ghee', 'oil', 'salt'],
      tips: 'Layered bread with higher fat content'
    },

    'mirchi_lachha_parantha': {
      displayName: 'Mirchi Lachha Parantha',
      weight: '90g',
      nutrition: {
        calories: 255, protein: 6.5, carbs: 33, fat: 11.2, fiber: 3.8,
        sugar: 2, sodium: 320, iron: 2.4, calcium: 38, vitaminC: 15
      },
      category: 'Tandoor Bread',
      healthScore: 6,
      ingredients: ['wheat flour', 'green chili', 'ghee', 'coriander', 'salt'],
      tips: 'Spicy layered bread with vitamin C from chilies'
    },

    'garlic_naan': {
      displayName: 'Garlic Naan',
      weight: '80g',
      nutrition: {
        calories: 205, protein: 6.0, carbs: 34, fat: 5.5, fiber: 2.2,
        sugar: 3, sodium: 370, iron: 2.2, calcium: 42, vitaminC: 2
      },
      category: 'Tandoor Bread',
      healthScore: 7,
      ingredients: ['refined flour', 'garlic', 'butter', 'yogurt', 'herbs'],
      tips: 'Garlic provides antioxidants and flavor'
    },

    'stuffed_kulcha': {
      displayName: 'Stuffed Kulcha',
      weight: '100g',
      nutrition: {
        calories: 280, protein: 8.5, carbs: 38, fat: 11.0, fiber: 4.0,
        sugar: 3, sodium: 420, iron: 2.8, calcium: 55, vitaminC: 8
      },
      category: 'Tandoor Bread',
      healthScore: 6,
      ingredients: ['refined flour', 'potato stuffing', 'yogurt', 'ghee', 'spices'],
      tips: 'Filling bread with vegetable stuffing'
    },

    // === TAWA BREADS ===
    'tawa_roti': {
      displayName: 'Tawa Roti',
      weight: '50g',
      nutrition: {
        calories: 120, protein: 3.5, carbs: 22, fat: 1.2, fiber: 2.8,
        sugar: 1, sodium: 150, iron: 1.5, calcium: 18, vitaminC: 0
      },
      category: 'Tawa Bread',
      healthScore: 8,
      ingredients: ['wheat flour', 'water', 'salt'],
      tips: 'Simple and healthy whole wheat bread'
    },

    'tawa_butter_roti': {
      displayName: 'Tawa Butter Roti',
      weight: '55g',
      nutrition: {
        calories: 145, protein: 3.8, carbs: 22, fat: 4.8, fiber: 2.8,
        sugar: 1, sodium: 170, iron: 1.5, calcium: 22, vitaminC: 0
      },
      category: 'Tawa Bread',
      healthScore: 7,
      ingredients: ['wheat flour', 'butter', 'water', 'salt'],
      tips: 'Buttery version with extra flavor'
    },

    'plain_parantha': {
      displayName: 'Plain Parantha',
      weight: '70g',
      nutrition: {
        calories: 180, protein: 4.0, carbs: 28, fat: 6.5, fiber: 3.0,
        sugar: 2, sodium: 180, iron: 1.8, calcium: 25, vitaminC: 0
      },
      category: 'Tawa Bread',
      healthScore: 7,
      ingredients: ['wheat flour', 'oil', 'salt'],
      tips: 'Classic Indian flatbread'
    },

    // === PANEER SPECIALTIES ===
    'shahi_paneer': {
      displayName: 'Shahi Paneer',
      weight: '180g',
      nutrition: {
        calories: 285, protein: 16.5, carbs: 15, fat: 20.5, fiber: 2.8,
        sugar: 8, sodium: 420, iron: 2.2, calcium: 285, vitaminC: 12
      },
      category: 'Paneer Special',
      healthScore: 6,
      ingredients: ['paneer', 'cashew gravy', 'cream', 'tomato', 'spices'],
      tips: 'High protein but also high in calories'
    },

    'kadai_paneer': {
      displayName: 'Kadai Paneer',
      weight: '170g',
      nutrition: {
        calories: 265, protein: 15.8, carbs: 12, fat: 18.2, fiber: 3.2,
        sugar: 6, sodium: 380, iron: 2.0, calcium: 275, vitaminC: 35
      },
      category: 'Paneer Special',
      healthScore: 7,
      ingredients: ['paneer', 'bell peppers', 'onion', 'tomato', 'kadai masala'],
      tips: 'Good protein with vegetables'
    },

    'achari_paneer': {
      displayName: 'Achari Paneer',
      weight: '175g',
      nutrition: {
        calories: 275, protein: 16.2, carbs: 14, fat: 19.0, fiber: 2.5,
        sugar: 7, sodium: 450, iron: 2.2, calcium: 280, vitaminC: 15
      },
      category: 'Paneer Special',
      healthScore: 6,
      ingredients: ['paneer', 'pickle spices', 'yogurt', 'onion', 'oil'],
      tips: 'Tangy flavor with high sodium content'
    },

    'mutter_paneer': {
      displayName: 'Mutter Paneer',
      weight: '170g',
      nutrition: {
        calories: 245, protein: 15.5, carbs: 16, fat: 15.8, fiber: 4.5,
        sugar: 8, sodium: 360, iron: 2.8, calcium: 270, vitaminC: 25
      },
      category: 'Paneer Special',
      healthScore: 7,
      ingredients: ['paneer', 'green peas', 'tomato gravy', 'garam masala'],
      tips: 'Added fiber and vitamins from peas'
    },

    'cheese_tomato': {
      displayName: 'Cheese Tomato',
      weight: '160g',
      nutrition: {
        calories: 220, protein: 12.5, carbs: 12, fat: 14.8, fiber: 2.8,
        sugar: 9, sodium: 380, iron: 1.5, calcium: 245, vitaminC: 28
      },
      category: 'Paneer Special',
      healthScore: 7,
      ingredients: ['cheese', 'fresh tomato', 'onion', 'herbs', 'cream'],
      tips: 'Rich in vitamin C from tomatoes'
    },

    'paneer_do_piaza': {
      displayName: 'Paneer Do Piaza',
      weight: '175g',
      nutrition: {
        calories: 255, protein: 15.2, carbs: 18, fat: 16.5, fiber: 3.5,
        sugar: 10, sodium: 370, iron: 2.0, calcium: 275, vitaminC: 18
      },
      category: 'Paneer Special',
      healthScore: 7,
      ingredients: ['paneer', 'onion', 'bell peppers', 'tomato', 'garam masala'],
      tips: 'Double onion preparation with good protein'
    },

    'palak_paneer': {
      displayName: 'Palak Paneer',
      weight: '170g',
      nutrition: {
        calories: 235, protein: 16.0, carbs: 12, fat: 16.2, fiber: 4.2,
        sugar: 5, sodium: 340, iron: 4.8, calcium: 320, vitaminC: 22
      },
      category: 'Paneer Special',
      healthScore: 8,
      ingredients: ['paneer', 'spinach', 'garlic', 'ginger', 'cream'],
      tips: 'Excellent source of iron and calcium'
    },

    'paneer_butter_masala': {
      displayName: 'Paneer Butter Masala',
      weight: '180g',
      nutrition: {
        calories: 295, protein: 16.8, carbs: 16, fat: 21.5, fiber: 3.0,
        sugar: 10, sodium: 420, iron: 2.2, calcium: 290, vitaminC: 15
      },
      category: 'Paneer Special',
      healthScore: 6,
      ingredients: ['paneer', 'butter', 'tomato gravy', 'cream', 'cashew'],
      tips: 'Rich and creamy - high in calories'
    },

    'paneer_tikka_butter_masala': {
      displayName: 'Paneer Tikka Butter Masala',
      weight: '185g',
      nutrition: {
        calories: 315, protein: 17.5, carbs: 18, fat: 23.0, fiber: 3.2,
        sugar: 12, sodium: 450, iron: 2.5, calcium: 295, vitaminC: 18
      },
      category: 'Paneer Special',
      healthScore: 6,
      ingredients: ['grilled paneer', 'butter masala', 'cream', 'tomato', 'spices'],
      tips: 'Grilled paneer in rich gravy'
    },

    // === RICE & PULAO ===
    'plain_rice': {
      displayName: 'Plain Rice',
      weight: '150g',
      nutrition: {
        calories: 165, protein: 3.8, carbs: 36, fat: 0.5, fiber: 0.8,
        sugar: 0, sodium: 5, iron: 1.2, calcium: 15, vitaminC: 0
      },
      category: 'Rice',
      healthScore: 6,
      ingredients: ['basmati rice', 'water', 'salt'],
      tips: 'Simple carbohydrate source'
    },

    'jeera_rice': {
      displayName: 'Jeera Rice',
      weight: '150g',
      nutrition: {
        calories: 185, protein: 4.0, carbs: 36, fat: 3.2, fiber: 1.0,
        sugar: 0, sodium: 180, iron: 1.5, calcium: 18, vitaminC: 0
      },
      category: 'Rice',
      healthScore: 7,
      ingredients: ['basmati rice', 'cumin', 'ghee', 'bay leaves'],
      tips: 'Aromatic rice with digestive cumin'
    },

    'veg_pulao': {
      displayName: 'Veg Pulao',
      weight: '180g',
      nutrition: {
        calories: 245, protein: 6.5, carbs: 42, fat: 6.8, fiber: 3.2,
        sugar: 4, sodium: 320, iron: 2.2, calcium: 35, vitaminC: 15
      },
      category: 'Rice',
      healthScore: 7,
      ingredients: ['basmati rice', 'mixed vegetables', 'whole spices', 'ghee'],
      tips: 'Nutritious one-pot meal with vegetables'
    },

    'gobhi_rice': {
      displayName: 'Gobhi Rice',
      weight: '170g',
      nutrition: {
        calories: 225, protein: 5.8, carbs: 40, fat: 5.5, fiber: 3.8,
        sugar: 5, sodium: 280, iron: 2.0, calcium: 32, vitaminC: 25
      },
      category: 'Rice',
      healthScore: 7,
      ingredients: ['basmati rice', 'cauliflower', 'turmeric', 'cumin', 'oil'],
      tips: 'Cauliflower adds vitamins and fiber'
    },

    'veg_biryani': {
      displayName: 'Veg Biryani',
      weight: '250g',
      nutrition: {
        calories: 385, protein: 9.5, carbs: 58, fat: 14.2, fiber: 4.5,
        sugar: 6, sodium: 520, iron: 3.2, calcium: 65, vitaminC: 18
      },
      category: 'Rice',
      healthScore: 7,
      ingredients: ['basmati rice', 'mixed vegetables', 'yogurt', 'saffron', 'ghee'],
      tips: 'Festive rice dish with aromatic spices'
    },

    'hyderabadi_biryani': {
      displayName: 'Hyderabadi Biryani',
      weight: '260g',
      nutrition: {
        calories: 420, protein: 11.2, carbs: 62, fat: 16.5, fiber: 5.0,
        sugar: 7, sodium: 580, iron: 3.5, calcium: 75, vitaminC: 20
      },
      category: 'Rice',
      healthScore: 7,
      ingredients: ['basmati rice', 'vegetables', 'yogurt', 'saffron', 'fried onions'],
      tips: 'Traditional Hyderabadi style preparation'
    },

    'paneer_biryani': {
      displayName: 'Paneer Biryani',
      weight: '270g',
      nutrition: {
        calories: 445, protein: 16.8, carbs: 58, fat: 18.2, fiber: 4.8,
        sugar: 8, sodium: 620, iron: 3.2, calcium: 285, vitaminC: 15
      },
      category: 'Rice',
      healthScore: 7,
      ingredients: ['basmati rice', 'paneer', 'yogurt', 'saffron', 'whole spices'],
      tips: 'High protein biryani with paneer'
    },

    'veg_fried_rice': {
      displayName: 'Veg Fried Rice',
      weight: '200g',
      nutrition: {
        calories: 285, protein: 7.2, carbs: 48, fat: 8.5, fiber: 3.5,
        sugar: 5, sodium: 480, iron: 2.5, calcium: 45, vitaminC: 22
      },
      category: 'Rice',
      healthScore: 6,
      ingredients: ['rice', 'mixed vegetables', 'soy sauce', 'garlic', 'oil'],
      tips: 'Indo-Chinese style fried rice'
    },

    'chilly_garlic_rice': {
      displayName: 'Chilly Garlic Rice',
      weight: '190g',
      nutrition: {
        calories: 265, protein: 6.0, carbs: 45, fat: 7.8, fiber: 2.8,
        sugar: 4, sodium: 520, iron: 2.2, calcium: 35, vitaminC: 18
      },
      category: 'Rice',
      healthScore: 6,
      ingredients: ['rice', 'green chili', 'garlic', 'soy sauce', 'oil'],
      tips: 'Spicy and flavorful Chinese-style rice'
    },

    // === HAPPY MEALS / THALIS ===
    'normal_thali': {
      displayName: 'Normal Thali',
      weight: '400g',
      nutrition: {
        calories: 520, protein: 18.5, carbs: 72, fat: 18.2, fiber: 12.5,
        sugar: 15, sodium: 680, iron: 6.8, calcium: 185, vitaminC: 35
      },
      category: 'Complete Meal',
      healthScore: 8,
      ingredients: ['tawa butter chapati', 'rice', 'dal', 'raita', 'salad', 'pickle'],
      tips: 'Well-balanced complete meal'
    },

    'nk_special_thali': {
      displayName: 'NK Special Thali',
      weight: '450g',
      nutrition: {
        calories: 625, protein: 22.8, carbs: 78, fat: 24.5, fiber: 14.2,
        sugar: 18, sodium: 820, iron: 8.2, calcium: 245, vitaminC: 42
      },
      category: 'Complete Meal',
      healthScore: 8,
      ingredients: ['tandoori butter roti', 'flavoured rice', 'sabji', 'dal', 'raita', 'salad', 'paneer sabji', 'dessert'],
      tips: 'Premium thali with paneer dish'
    },

    // === DESSERTS ===
    'gulab_jamun': {
      displayName: 'Gulab Jamun',
      weight: '60g',
      nutrition: {
        calories: 185, protein: 3.2, carbs: 28, fat: 7.5, fiber: 0.5,
        sugar: 25, sodium: 25, iron: 0.8, calcium: 65, vitaminC: 0
      },
      category: 'Dessert',
      healthScore: 3,
      ingredients: ['milk powder', 'sugar syrup', 'ghee', 'cardamom'],
      tips: 'High sugar dessert - enjoy occasionally'
    },

    'moong_dal_halwa': {
      displayName: 'Moong Dal Halwa',
      weight: '80g',
      nutrition: {
        calories: 220, protein: 6.8, carbs: 32, fat: 8.5, fiber: 2.8,
        sugar: 28, sodium: 15, iron: 2.2, calcium: 45, vitaminC: 0
      },
      category: 'Dessert',
      healthScore: 4,
      ingredients: ['moong dal', 'sugar', 'ghee', 'milk', 'cardamom'],
      tips: 'Traditional sweet with protein from lentils'
    },

    'stick_kulfi': {
      displayName: 'Stick Kulfi',
      weight: '70g',
      nutrition: {
        calories: 145, protein: 4.2, carbs: 18, fat: 6.8, fiber: 0,
        sugar: 16, sodium: 35, iron: 0.5, calcium: 125, vitaminC: 1
      },
      category: 'Dessert',
      healthScore: 4,
      ingredients: ['milk', 'sugar', 'cardamom', 'pistachios'],
      tips: 'Traditional Indian ice cream'
    },

    'ice_cream': {
      displayName: 'Ice Cream',
      weight: '75g',
      nutrition: {
        calories: 135, protein: 3.8, carbs: 16, fat: 6.2, fiber: 0,
        sugar: 14, sodium: 45, iron: 0.3, calcium: 95, vitaminC: 1
      },
      category: 'Dessert',
      healthScore: 4,
      ingredients: ['milk', 'cream', 'sugar', 'flavoring'],
      tips: 'Cool treat with calcium from dairy'
    }
  };
}


  // Rest of the methods (HuggingFace, GoogleVision, etc.) remain unchanged
  async analyzeWithHuggingFace(base64Image) {
    try {
      const response = await this.safeFetch(this.APIs.HF_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.APIs.HF_KEY && { 'Authorization': `Bearer ${this.APIs.HF_KEY}` })
        },
        body: JSON.stringify({
          inputs: base64Image,
          options: { wait_for_model: true }
        })
      });

      if (Array.isArray(response) && response.length > 0) {
        const topResult = response[0];
        return this.formatSimpleResponse(topResult.label || 'Unknown Food', 'Hugging Face Vision', topResult.score || 0.7);
      }
      
      throw new Error('No valid results from Hugging Face');
    } catch (error) {
      console.error('❌ Hugging Face error:', error);
      throw error;
    }
  }

  async analyzeWithGoogleVision(base64Image) {
    if (!this.APIs.GOOGLE_VISION_KEY) throw new Error('Missing Google Vision API key');

    const url = `${this.APIs.GOOGLE_VISION_URL}?key=${this.APIs.GOOGLE_VISION_KEY}`;
    const response = await this.safeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'LABEL_DETECTION', maxResults: 5 }],
        }],
      }),
    });

    const label = response?.responses?.[0]?.labelAnnotations?.[0]?.description || 'Unknown food';
    const score = response?.responses?.[0]?.labelAnnotations?.[0]?.score || 0.7;
    return this.formatSimpleResponse(label, 'Google Vision', score);
  }

  formatSimpleResponse(label, method, confidence = 0.75) {
    const perUnitData = this.getPerUnitNutrition(label);
    
    // If needs AI generation, create simplified response
    if (perUnitData.needsAIGeneration) {
      const fallbackData = this.generateSmartFallback(label);
      return {
        foodName: fallbackData.displayName,
        isComboMeal: false,
        itemCount: 1,
        totalFoodPieces: 1,
        individualItems: [{
          name: fallbackData.displayName,
          visibleCount: 1,
          perUnitWeight: fallbackData.weight,
          totalWeight: fallbackData.weight,
          perUnitNutrition: fallbackData.nutrition,
          totalNutrition: fallbackData.nutrition,
          generatedByAI: false,
          portion: {
            size: 'Medium',
            quantity: '1 piece',
            weight: fallbackData.weight
          }
        }],
        confidence: confidence,
        category: fallbackData.category,
        servingSize: `1 piece (${fallbackData.weight})`,
        nutrition: fallbackData.nutrition,
        healthScore: fallbackData.healthScore,
        dietaryInfo: {
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: false,
          isHighProtein: false,
          isBalanced: false
        },
        ingredients: fallbackData.ingredients,
        tips: fallbackData.tips,
        timestamp: new Date().toISOString(),
        method,
        hasAIGeneratedNutrition: false
      };
    }
    
    // Use local database data
    return {
      foodName: perUnitData.displayName,
      isComboMeal: false,
      itemCount: 1,
      totalFoodPieces: 1,
      individualItems: [{
        name: perUnitData.displayName,
        visibleCount: 1,
        perUnitWeight: perUnitData.weight,
        totalWeight: perUnitData.weight,
        perUnitNutrition: perUnitData.nutrition,
        totalNutrition: perUnitData.nutrition,
        generatedByAI: false,
        portion: {
          size: 'Medium',
          quantity: '1 piece',
          weight: perUnitData.weight
        }
      }],
      confidence: confidence,
      category: perUnitData.category,
      servingSize: `1 piece (${perUnitData.weight})`,
      nutrition: perUnitData.nutrition,
      healthScore: perUnitData.healthScore,
      dietaryInfo: {
        isVegetarian: true,
        isVegan: false,
        isGlutenFree: false,
        isHighProtein: false,
        isBalanced: false
      },
      ingredients: perUnitData.ingredients,
      tips: perUnitData.tips,
      timestamp: new Date().toISOString(),
      method,
      hasAIGeneratedNutrition: false
    };
  }

  getFallbackData(imageUri, userInput = null) {
    const parathaData = this.getPerUnitNutrition('paratha');
    const bondaData = this.getPerUnitNutrition('bonda');
    
    const items = [
      {
        name: parathaData.displayName,
        visibleCount: 2,
        perUnitWeight: parathaData.weight,
        totalWeight: `${parseInt(parathaData.weight) * 2}g`,
        perUnitNutrition: parathaData.nutrition,
        totalNutrition: this.multiplyNutrition(parathaData.nutrition, 2),
        generatedByAI: false,
        portion: {
          size: 'Medium',
          quantity: '2 pieces',
          weight: `${parseInt(parathaData.weight) * 2}g`
        }
      },
      {
        name: bondaData.displayName,
        visibleCount: 1,
        perUnitWeight: bondaData.weight,
        totalWeight: bondaData.weight,
        perUnitNutrition: bondaData.nutrition,
        totalNutrition: bondaData.nutrition,
        generatedByAI: false,
        portion: {
          size: 'Small',
          quantity: '1 piece',
          weight: bondaData.weight
        }
      }
    ];
    
    const grandTotal = this.calculateGrandTotal(items);
    
    return {
      foodName: 'Indian Combo: 2 Plain Parathas + 1 Aloo Bonda',
      isComboMeal: true,
      itemCount: 2,
      totalFoodPieces: 3,
      individualItems: items,
      confidence: 0.6,
      category: 'Indian Combo',
      servingSize: '3 pieces total (185g)',
      nutrition: grandTotal,
      healthScore: 6.5,
      dietaryInfo: {
        isVegetarian: true,
        isVegan: false,
        isGlutenFree: false,
        isHighProtein: false,
        isBalanced: true
      },
      ingredients: ['wheat flour', 'potato', 'spices', 'oil'],
      tips: 'Estimated quantities - AI analysis failed',
      timestamp: new Date().toISOString(),
      method: 'Local Fallback',
      imageUri,
      userInput,
      isEstimate: true,
      hasAIGeneratedNutrition: false
    };
  }

  async recognizeBarcode(barcode) {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();
      const product = data.product;
      
      if (!product) throw new Error('Product not found');

      const nutriments = product.nutriments || {};
      
      return {
        foodName: product.product_name || 'Unknown Product',
        isComboMeal: false,
        itemCount: 1,
        totalFoodPieces: 1,
        confidence: 0.95,
        category: 'Packaged Food',
        servingSize: '100g',
        brand: product.brands || 'Unknown Brand',
        nutrition: {
          calories: Math.round(nutriments['energy-kcal_100g'] || 0),
          protein: Math.round((nutriments.proteins_100g || 0) * 10) / 10,
          carbs: Math.round((nutriments.carbohydrates_100g || 0) * 10) / 10,
          fat: Math.round((nutriments.fat_100g || 0) * 10) / 10,
          fiber: Math.round((nutriments.fiber_100g || 0) * 10) / 10,
          sugar: Math.round((nutriments.sugars_100g || 0) * 10) / 10,
          sodium: Math.round(nutriments.sodium_100g || 0),
          iron: Math.round((nutriments.iron_100g || 0) * 10) / 10,
          calcium: Math.round(nutriments.calcium_100g || 0),
          vitaminC: Math.round((nutriments['vitamin-c_100g'] || 0) * 10) / 10
        },
        ingredients: product.ingredients_text ? 
          product.ingredients_text.split(',').map(i => i.trim()).slice(0, 8) : [],
        healthScore: this.calculatePackagedHealthScore(nutriments),
        dietaryInfo: {
          isVegetarian: product.labels?.includes('Vegetarian') || false,
          isVegan: product.labels?.includes('Vegan') || false,
          isGlutenFree: product.labels?.includes('Gluten-free') || false,
          isLowCarb: (nutriments.carbohydrates_100g || 0) < 10,
          isHighProtein: (nutriments.proteins_100g || 0) > 15
        },
        tips: 'Check product label for complete nutritional information',
        method: 'Barcode Recognition',
        timestamp: new Date().toISOString(),
        barcode: barcode,
        hasAIGeneratedNutrition: false
      };
    } catch (error) {
      console.error('❌ Barcode recognition error:', error);
      throw new Error(`Could not find product information for barcode: ${barcode}`);
    }
  }

  calculatePackagedHealthScore(nutriments) {
    let score = 5;
    if ((nutriments.proteins_100g || 0) > 10) score += 1;
    if ((nutriments.fiber_100g || 0) > 5) score += 1;
    if ((nutriments.sodium_100g || 0) < 300) score += 1;
    if ((nutriments.sugars_100g || 0) > 15) score -= 1;
    if ((nutriments.fat_100g || 0) > 20) score -= 1;
    if ((nutriments.sodium_100g || 0) > 800) score -= 2;
    return Math.max(1, Math.min(10, score));
  }
}

export default new FoodRecognitionService();
