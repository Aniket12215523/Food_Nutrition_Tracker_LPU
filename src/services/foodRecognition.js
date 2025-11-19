import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import Constants from 'expo-constants';

class FoodRecognitionService {
  constructor() {
    this.APIs = {
      GEMINI_KEY: Constants.expoConfig?.extra?.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY,
      
      // ✅ UPDATED: 2.5 Flash primary, 2.0 Flash Exp backup
      GEMINI_MODELS: [
        'gemini-2.5-flash',      // PRIMARY: Most accurate (paid)
        'gemini-2.0-flash-exp',  // BACKUP: Free fallback
      ],
      
      GEMINI_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
    };
  }

  // ============================================================
  // UTILITY METHODS (SAME AS BEFORE)
  // ============================================================

  async safeFetch(url, options, timeout = 20000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const res = await fetch(url, { 
        ...options, 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
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
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  async imageToBase64(imageUri) {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      const manipulated = await ImageManipulator.manipulateAsync(imageUri, [], { base64: true });
      if (manipulated.base64) return manipulated.base64;
      throw new Error('Failed to convert image to Base64');
    }
  }

  async optimizeImageForAI(imageUri) {
    try {
      console.log('🖼️ Optimizing image...');
      
      const optimized = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 512 } }],
        {
          compress: 0.5,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true
        }
      );

      console.log('✅ Image optimized');
      return optimized.base64;
    } catch (error) {
      console.warn('⚠️ Optimization failed:', error.message);
      return await this.imageToBase64(imageUri);
    }
  }

  // ============================================================
  // PROMPTS (COMPLETE NUTRITION DATA)
  // ============================================================

  createCompleteDetectionPrompt() {
    return `You are an expert nutritionist analyzing Indian food. Return ONLY valid JSON with complete nutrition information:

{
  "detectedItems": [
    {
      "foodName": "specific dish name",
      "visibleCount": number,
      "perUnitWeight": "weight per piece (e.g., 70g)",
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
      "category": "Food Category",
      "healthScore": 7,
      "ingredients": ["ingredient1", "ingredient2"],
      "tips": "Health tip"
    }
  ],
  "confidence": 0.9
}

RULES:
- Use specific names (Dal Makhani, Chapati, Basmati Rice, Raita, Mango Pickle, etc.)
- Count ALL visible items separately
- Realistic weights: Chapati 60g, Rice 150g, Dal 120-150g, Pickle 20g, Chutney 25g
- Accurate per-piece nutrition from USDA/Indian food databases
- Health scores: 1-10 (10=healthiest)
- Return ONLY JSON, no markdown`;
  }

  createUserAssistedPrompt(userInput) {
    return `User says image contains: "${userInput}"

Return ONLY valid JSON with complete nutrition:

{
  "detectedItems": [
    {
      "foodName": "${userInput}",
      "visibleCount": count,
      "perUnitWeight": "weight",
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
      "category": "category",
      "healthScore": 7,
      "ingredients": ["ingredient1"],
      "tips": "tip"
    }
  ],
  "confidence": 0.9
}

Return ONLY JSON.`;
  }

  // ============================================================
  // MAIN RECOGNITION WITH MULTI-MODEL FALLBACK
  // ============================================================

  async recognizeFood(imageUri, userInput = null) {
    console.log('🎯 Starting food recognition...');
    const startTime = Date.now();

    const base64Image = await this.optimizeImageForAI(imageUri);
    console.log(`⚡ Image processed in ${Date.now() - startTime}ms`);

    const prompt = userInput ? 
      this.createUserAssistedPrompt(userInput) : 
      this.createCompleteDetectionPrompt();

    // Try models in order: 2.5 Flash → 2.0 Flash Exp
    for (let i = 0; i < this.APIs.GEMINI_MODELS.length; i++) {
      const model = this.APIs.GEMINI_MODELS[i];
      
      try {
        console.log(`🧠 Trying ${model}...`);
        
        const result = await this.analyzeWithGemini(base64Image, prompt, model, userInput);
        
        if (result) {
          const totalTime = Date.now() - startTime;
          console.log(`✅ ${model} succeeded in ${totalTime}ms`);
          
          return { 
            ...result, 
            usedModel: model === 'gemini-2.5-flash' ? 'Gemini 2.5 Flash' : 'Gemini 2.0 Flash Exp', 
            imageUri, 
            userInput, 
            processingTime: totalTime 
          };
        }
      } catch (error) {
        console.warn(`⚠️ ${model} failed:`, error.message);
        
        // If not last model, try next
        if (i < this.APIs.GEMINI_MODELS.length - 1) {
          console.log(`🔄 Trying backup model...`);
          continue;
        }
      }
    }

    // All models failed, use fallback
    console.log('🔄 All models failed, using fallback');
    return this.getFallbackData(imageUri, userInput);
  }

  async analyzeWithGemini(base64Image, prompt, model, userInput = null) {
    if (!this.APIs.GEMINI_KEY) {
      throw new Error('Missing Gemini API key');
    }

    const url = `${this.APIs.GEMINI_URL}/${model}:generateContent?key=${this.APIs.GEMINI_KEY}`;
    
    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        topK: 32,
        topP: 1,
        responseMimeType: "application/json"
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    };

    const response = await this.safeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 30000);

    const candidate = response?.candidates?.[0];
    if (!candidate) throw new Error('No response from Gemini');

    const finishReason = candidate.finishReason;
    if (finishReason && finishReason !== 'STOP') {
      throw new Error(`Gemini stopped: ${finishReason}`);
    }

    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');

    console.log('✅ Response received');
    return await this.processGeminiResponse(text, userInput);
  }

  // ============================================================
  // PROCESS RESPONSE (NO DATABASE NEEDED)
  // ============================================================

  async processGeminiResponse(text, userInput = null) {
    try {
      console.log('🔍 Parsing response...');
      
      let cleanText = text.trim();
      cleanText = cleanText.replace(/``````\n?/g, '');
      
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const jsonString = cleanText.substring(jsonStart, jsonEnd);
        const parsedData = JSON.parse(jsonString);
        
        console.log('✅ Successfully parsed');
        return this.formatFoodData(parsedData, userInput);
      }
      
      throw new Error('Invalid JSON response');
    } catch (error) {
      console.error('❌ Parsing failed:', error);
      throw error;
    }
  }

  formatFoodData(data, userInput = null) {
    if (!data.detectedItems || data.detectedItems.length === 0) {
      throw new Error('No items detected');
    }

    const processedItems = data.detectedItems.map(item => {
      const count = parseInt(item.visibleCount) || 1;
      const perUnitNutrition = item.perUnitNutrition || {};
      
      // Calculate total nutrition
      const totalNutrition = {};
      Object.keys(perUnitNutrition).forEach(key => {
        const value = perUnitNutrition[key] * count;
        totalNutrition[key] = (key === 'calories' || key === 'sodium' || key === 'calcium') ? 
          Math.round(value) : Math.round(value * 10) / 10;
      });

      return {
        name: item.foodName,
        visibleCount: count,
        perUnitWeight: item.perUnitWeight || '100g',
        totalWeight: `${parseInt(item.perUnitWeight || 100) * count}g`,
        perUnitNutrition: perUnitNutrition,
        totalNutrition: totalNutrition,
        category: item.category || 'Food Item',
        healthScore: item.healthScore || 6,
        ingredients: item.ingredients || ['mixed ingredients'],
        tips: item.tips || 'Enjoy as part of a balanced diet',
        userProvided: userInput ? true : false,
        portion: {
          size: count > 3 ? 'Large' : count > 1 ? 'Medium' : 'Small',
          quantity: `${count} piece${count > 1 ? 's' : ''}`,
          weight: `${parseInt(item.perUnitWeight || 100) * count}g`
        }
      };
    });

    // Calculate grand totals
    const grandTotalNutrition = {
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
      sugar: 0, sodium: 0, iron: 0, calcium: 0, vitaminC: 0
    };
    
    processedItems.forEach(item => {
      Object.keys(grandTotalNutrition).forEach(key => {
        grandTotalNutrition[key] += item.totalNutrition[key] || 0;
      });
    });
    
    Object.keys(grandTotalNutrition).forEach(key => {
      if (key === 'calories' || key === 'sodium' || key === 'calcium') {
        grandTotalNutrition[key] = Math.round(grandTotalNutrition[key]);
      } else {
        grandTotalNutrition[key] = Math.round(grandTotalNutrition[key] * 10) / 10;
      }
    });

    const totalPieces = processedItems.reduce((sum, item) => sum + item.visibleCount, 0);
    const totalWeight = processedItems.reduce((sum, item) => sum + parseInt(item.totalWeight), 0);

    return {
      foodName: this.createFoodName(processedItems),
      isComboMeal: processedItems.length > 1,
      itemCount: processedItems.length,
      totalFoodPieces: totalPieces,
      individualItems: processedItems,
      confidence: data.confidence || 0.9,
      category: processedItems.length > 1 ? 'Combo Meal' : processedItems[0].category,
      servingSize: `${totalPieces} piece${totalPieces > 1 ? 's' : ''} total (${totalWeight}g)`,
      nutrition: grandTotalNutrition,
      healthScore: this.calculateHealthScore(grandTotalNutrition),
      dietaryInfo: this.getDietaryInfo(processedItems),
      ingredients: this.extractIngredients(processedItems),
      tips: this.generateTips(processedItems, grandTotalNutrition),
      method: 'Gemini Complete Analysis',
      timestamp: new Date().toISOString(),
      userAssisted: userInput ? true : false,
      hasAIGeneratedNutrition: true
    };
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  createFoodName(items) {
    if (items.length === 1) {
      const item = items[0];
      return item.visibleCount > 1 ? 
        `${item.visibleCount} ${item.name}s` : 
        item.name;
    }
    const descriptions = items.slice(0, 3).map(item => 
      `${item.visibleCount} ${item.name}${item.visibleCount > 1 ? 's' : ''}`
    );
    return `Combo: ${descriptions.join(' + ')}${items.length > 3 ? ' + more' : ''}`;
  }

  calculateHealthScore(nutrition) {
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

  generateTips(items, nutrition) {
    const tips = [];
    const totalPieces = items.reduce((sum, item) => sum + item.visibleCount, 0);
    
    if (totalPieces >= 6) tips.push('Large meal - consider sharing');
    else if (totalPieces >= 3) tips.push('Good portion size');
    
    if (nutrition.protein > 20) tips.push(`High protein (${nutrition.protein}g)`);
    if (nutrition.calories > 600) tips.push('High-calorie meal - balance with lighter foods');
    
    return tips.length > 0 ? tips.join('. ') + '.' : 'Enjoy your meal!';
  }

  getFallbackData(imageUri, userInput = null) {
    return {
      foodName: 'Indian Meal',
      isComboMeal: false,
      itemCount: 1,
      totalFoodPieces: 1,
      individualItems: [{
        name: 'Mixed Food',
        visibleCount: 1,
        perUnitWeight: '200g',
        totalWeight: '200g',
        perUnitNutrition: {
          calories: 300, protein: 10, carbs: 40, fat: 10, fiber: 5,
          sugar: 5, sodium: 300, iron: 2, calcium: 50, vitaminC: 5
        },
        totalNutrition: {
          calories: 300, protein: 10, carbs: 40, fat: 10, fiber: 5,
          sugar: 5, sodium: 300, iron: 2, calcium: 50, vitaminC: 5
        },
        category: 'Food',
        healthScore: 6,
        ingredients: ['mixed'],
        tips: 'Unable to analyze - estimate only',
        portion: { size: 'Small', quantity: '1 piece', weight: '200g' }
      }],
      confidence: 0.5,
      category: 'Food',
      servingSize: '1 piece (200g)',
      nutrition: {
        calories: 300, protein: 10, carbs: 40, fat: 10, fiber: 5,
        sugar: 5, sodium: 300, iron: 2, calcium: 50, vitaminC: 5
      },
      healthScore: 6,
      dietaryInfo: {
        isVegetarian: true, isVegan: false, isGlutenFree: false,
        isHighProtein: false, isBalanced: false
      },
      ingredients: ['mixed'],
      tips: 'Analysis failed - using estimates',
      method: 'Fallback',
      timestamp: new Date().toISOString(),
      userAssisted: userInput ? true : false,
      isEstimate: true,
      hasAIGeneratedNutrition: false
    };
  }

  // ============================================================
  // BARCODE RECOGNITION (KEEP AS IS)
  // ============================================================

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
        healthScore: this.calculateHealthScore({
          protein: nutriments.proteins_100g || 0,
          fiber: nutriments.fiber_100g || 0,
          sodium: nutriments.sodium_100g || 0,
          calories: nutriments['energy-kcal_100g'] || 0,
          fat: nutriments.fat_100g || 0,
          sugar: nutriments.sugars_100g || 0,
          iron: 0, vitaminC: 0, carbs: 0, calcium: 0
        }),
        dietaryInfo: {
          isVegetarian: product.labels?.includes('Vegetarian') || false,
          isVegan: product.labels?.includes('Vegan') || false,
          isGlutenFree: product.labels?.includes('Gluten-free') || false,
          isLowCarb: (nutriments.carbohydrates_100g || 0) < 10,
          isHighProtein: (nutriments.proteins_100g || 0) > 15
        },
        tips: 'Check product label for complete information',
        method: 'Barcode Recognition',
        timestamp: new Date().toISOString(),
        barcode: barcode,
        hasAIGeneratedNutrition: false
      };
    } catch (error) {
      console.error('❌ Barcode error:', error);
      throw new Error(`Could not find product: ${barcode}`);
    }
  }
}

export default new FoodRecognitionService();
