import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import Constants from 'expo-constants';

class FoodRecognitionService {
  constructor() {
    this.APIs = {
      // Gemini API (With Billing Enabled - Higher Quotas & Better Reliability)
      GEMINI_KEY: Constants.expoConfig?.extra?.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY,
      
      // Multiple models for redundancy (all use same billing account)
      GEMINI_MODELS: [
        'gemini-2.5-flash',       // PRIMARY: Best balance (stable + cheap)
        'gemini-2.0-flash-exp',   // BACKUP: Fastest (experimental)
        'gemini-2.5pro',         // FALLBACK: Most accurate (higher cost)
      ],
      
      GOOGLE_VISION_KEY: Constants.expoConfig?.extra?.GOOGLE_VISION_KEY || process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY,
      GOOGLE_VISION_URL: 'https://vision.googleapis.com/v1/images:annotate',
    };

    this.perUnitNutrition = this.initializePerUnitDatabase();
  }

  // ============================================================
  // UTILITY METHODS
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

  async retryWithBackoff(fn, maxRetries = 2, baseDelay = 500) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const errorMsg = error.message || '';
        
        const isRetryable = errorMsg.includes('503') || 
                           errorMsg.includes('overloaded') || 
                           errorMsg.includes('429') ||
                           errorMsg.includes('RESOURCE_EXHAUSTED') ||
                           errorMsg.includes('UNAVAILABLE');
        
        if (!isRetryable || attempt === maxRetries - 1) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
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
      console.log('🖼️ Optimizing image for AI processing...');
      
      const optimized = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 512 } }],
        {
          compress: 0.5,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true
        }
      );

      console.log('✅ Image optimized for faster AI processing');
      return optimized.base64;
    } catch (error) {
      console.warn('⚠️ Image optimization failed:', error.message);
      return await this.imageToBase64(imageUri);
    }
  }

  // ============================================================
  // PROMPTS
  // ============================================================

  createOptimizedQuantityDetectionPrompt() {
    return `Analyze this Indian food image and return ONLY valid JSON (no markdown, no explanations):

{
  "detectedItems": [
    {
      "foodName": "specific dish name in English",
      "visibleCount": number of pieces visible,
      "perUnitWeight": "estimated weight per piece (e.g., 70g, 150g)"
    }
  ],
  "confidence": 0.0-1.0
}

Rules:
- Use specific Indian food names (e.g., "Chapati", "Dal Makhani", "Basmati Rice", "Raita", "Mango Pickle")
- Count all visible food items separately
- For thalis/combo meals, list each item separately with accurate counts
- Use realistic portion weights (Chapati: 60g, Rice: 150g, Dal: 120-150g, Pickle: 20g, Chutney: 25g)
- Start response with { and end with }
- Return ONLY the JSON object`;
  }

  createUserAssistedPrompt(userInput) {
    return `User says this image contains: "${userInput}"

Analyze and return ONLY valid JSON:

{
  "detectedItems": [
    {
      "foodName": "${userInput}",
      "visibleCount": count visible pieces,
      "perUnitWeight": "estimated weight (e.g., 70g)"
    }
  ],
  "confidence": 0.9
}

Return ONLY JSON, no markdown.`;
  }

  // ============================================================
  // MAIN RECOGNITION METHOD
  // ============================================================

  async recognizeFood(imageUri, userInput = null) {
    console.log('🎯 Starting food recognition...');
    console.log('🎯 Analyzing with user input:', userInput);
    const startTime = Date.now();

    const base64Image = await this.optimizeImageForAI(imageUri);
    console.log(`⚡ Image processed in ${Date.now() - startTime}ms`);

    const prompt = userInput ? 
      this.createUserAssistedPrompt(userInput) : 
      this.createOptimizedQuantityDetectionPrompt();

    // Try Gemini models (with billing - higher quotas, no 503 errors)
    try {
      console.log('🧠 Trying Gemini Vision (Paid Tier)...');
      const result = await this.analyzeWithGeminiMultiModel(base64Image, prompt, userInput);
      
      if (result) {
        const totalTime = Date.now() - startTime;
        console.log(`✅ Gemini succeeded in ${totalTime}ms!`);
        return { 
          ...result, 
          usedModel: 'Gemini Vision (Paid)', 
          imageUri, 
          userInput, 
          processingTime: totalTime 
        };
      }
    } catch (error) {
      console.warn(`⚠️ All Gemini models failed:`, error.message);
    }

    // Fallback to local database
    console.log('🔄 Gemini unavailable, using local database fallback...');
    const fallback = this.getFallbackData(imageUri, userInput);
    return { 
      ...fallback, 
      usedModel: 'Local Fallback', 
      processingTime: Date.now() - startTime 
    };
  }

  // ============================================================
  // GEMINI MULTI-MODEL SUPPORT (WITH BILLING)
  // ============================================================

  async analyzeWithGeminiMultiModel(base64Image, prompt, userInput = null) {
    if (!this.APIs.GEMINI_KEY) {
      throw new Error('Missing Gemini API key');
    }

    const models = this.APIs.GEMINI_MODELS;
    let lastError = null;

    // Try each Gemini model in sequence
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      
      try {
        console.log(`🚀 Calling Gemini API (${model})...`);
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.APIs.GEMINI_KEY}`;
        
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
        if (!candidate) {
          throw new Error('Gemini returned no candidates');
        }

        const finishReason = candidate.finishReason;
        if (finishReason && finishReason !== 'STOP') {
          console.warn('Gemini finish reason:', finishReason);
          
          if (finishReason === 'MAX_TOKENS') {
            throw new Error('Gemini response too long');
          }
          if (finishReason === 'SAFETY') {
            throw new Error('Content blocked by safety filters');
          }
          throw new Error(`Gemini stopped: ${finishReason}`);
        }

        const text = candidate?.content?.parts?.[0]?.text;
        if (!text || text.trim().length === 0) {
          throw new Error('Gemini returned empty text');
        }

        console.log(`✅ Gemini response received from ${model}`);
        return await this.processQuantityResponse(text, userInput);

      } catch (error) {
        lastError = error;
        const errorMsg = error.message || '';
        
        // With paid tier, 503 should be rare, but still handle it
        const isOverloaded = errorMsg.includes('503') || 
                            errorMsg.includes('overloaded') ||
                            errorMsg.includes('UNAVAILABLE');
        
        if (isOverloaded && i < models.length - 1) {
          console.warn(`⚠️ ${model} temporarily unavailable, trying next model...`);
          await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause
          continue;
        }
        
        console.error(`❌ Gemini error (${model}):`, error);
        if (i === models.length - 1) {
          throw lastError;
        }
      }
    }
    
    throw lastError || new Error('All Gemini models failed');
  }

  // ============================================================
  // RESPONSE PROCESSING WITH PARALLEL AI NUTRITION
  // ============================================================

  async processQuantityResponse(text, userInput = null) {
    try {
      console.log('🔍 Raw AI response:', text.substring(0, 200) + '...');
      
      let cleanText = text.trim();
      cleanText = cleanText.replace(/``````\n?/g, '');
      
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const jsonString = cleanText.substring(jsonStart, jsonEnd);
        console.log('🎯 Extracted JSON:', jsonString);
        
        try {
          const parsedData = JSON.parse(jsonString);
          console.log('✅ Successfully parsed quantity data');
          return await this.formatQuantityResponse(parsedData, userInput);
        } catch (jsonError) {
          console.warn('⚠️ JSON parsing failed:', jsonError.message);
        }
      }
      
      console.log('🔍 Using intelligent extraction fallback...');
      return await this.extractQuantitiesFromText(text, userInput);
    } catch (error) {
      console.error('❌ Quantity processing failed:', error);
      throw error;
    }
  }

  async formatQuantityResponse(data, userInput = null) {
    if (!data.detectedItems) {
      throw new Error('No detected items in response');
    }

    const processedItems = [];
    
    // STEP 1: Identify items that need AI nutrition
    const itemsNeedingAI = [];
    const itemsWithLocalData = [];

    for (const item of data.detectedItems) {
      const perUnitData = this.getPerUnitNutrition(item.foodName);
      const count = parseInt(item.visibleCount) || 1;

      if (perUnitData.needsAIGeneration) {
        itemsNeedingAI.push({
          originalItem: item,
          count,
          perUnitData
        });
      } else {
        itemsWithLocalData.push({
          originalItem: item,
          count,
          perUnitData
        });
      }
    }

    // STEP 2: Generate AI nutrition IN PARALLEL with retry
    if (itemsNeedingAI.length > 0) {
      console.log(`🚀 Generating AI nutrition for ${itemsNeedingAI.length} items IN PARALLEL...`);
      
      const aiNutritionPromises = itemsNeedingAI.map(({ originalItem, count, perUnitData }) => 
        this.retryWithBackoff(
          () => this.generateNutritionFromAI(
            originalItem.foodName,
            count,
            originalItem.perUnitWeight || perUnitData.weight
          ),
          2,
          500
        ).catch(error => {
          console.warn(`⚠️ AI nutrition failed for ${originalItem.foodName}, using fallback`);
          return null;
        })
      );

      const aiNutritionResults = await Promise.all(aiNutritionPromises);

      // STEP 3: Build items with AI nutrition
      for (let i = 0; i < itemsNeedingAI.length; i++) {
        const { originalItem, count, perUnitData } = itemsNeedingAI[i];
        const aiNutrition = aiNutritionResults[i];

        let finalPerUnitData;
        
        if (aiNutrition) {
          finalPerUnitData = {
            displayName: originalItem.foodName,
            weight: aiNutrition.standardWeight || originalItem.perUnitWeight || perUnitData.weight,
            nutrition: aiNutrition.perUnitNutrition,
            category: aiNutrition.category || 'Food Item',
            healthScore: aiNutrition.healthScore || 6,
            ingredients: aiNutrition.ingredients || ['mixed ingredients'],
            tips: aiNutrition.tips || 'Enjoy as part of a balanced diet'
          };
        } else {
          finalPerUnitData = this.generateSmartFallback(originalItem.foodName);
        }

        const totalNutrition = this.multiplyNutrition(finalPerUnitData.nutrition, count);

        processedItems.push({
          name: finalPerUnitData.displayName || originalItem.foodName,
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
          generatedByAI: true,
          portion: {
            size: count > 3 ? 'Large' : count > 1 ? 'Medium' : 'Small',
            quantity: `${count} piece${count > 1 ? 's' : ''}`,
            weight: `${parseInt(finalPerUnitData.weight) * count}g`
          }
        });
      }
    }

    // STEP 4: Process items with local data
    for (const { originalItem, count, perUnitData } of itemsWithLocalData) {
      const totalNutrition = this.multiplyNutrition(perUnitData.nutrition, count);

      processedItems.push({
        name: perUnitData.displayName || originalItem.foodName,
        visibleCount: count,
        perUnitWeight: perUnitData.weight,
        totalWeight: `${parseInt(perUnitData.weight) * count}g`,
        perUnitNutrition: perUnitData.nutrition,
        totalNutrition: totalNutrition,
        userProvided: userInput ? true : false,
        category: perUnitData.category,
        healthScore: perUnitData.healthScore,
        ingredients: perUnitData.ingredients,
        tips: perUnitData.tips,
        generatedByAI: false,
        portion: {
          size: count > 3 ? 'Large' : count > 1 ? 'Medium' : 'Small',
          quantity: `${count} piece${count > 1 ? 's' : ''}`,
          weight: `${parseInt(perUnitData.weight) * count}g`
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
      method: userInput ? 'Gemini Vision - User Assisted' : 'Gemini Vision - AI Enhanced',
      timestamp: new Date().toISOString(),
      userAssisted: userInput ? true : false,
      hasAIGeneratedNutrition: processedItems.some(item => item.generatedByAI)
    };
  }

  // ============================================================
  // AI NUTRITION GENERATION (USING GEMINI)
  // ============================================================

  async generateNutritionFromAI(foodName, quantity, weight) {
    try {
      console.log(`🤖 Generating AI nutrition for: ${foodName}`);
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

Base your values on standard nutritional databases (USDA, Indian food composition tables).
Be accurate and realistic. Return per-piece nutrition only. No explanatory text.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.APIs.GEMINI_KEY}`;      
      const response = await this.safeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: nutritionPrompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: "application/json"
          }
        }),
      }, 8000);

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const nutritionData = JSON.parse(jsonMatch[0]);
          console.log('✅ AI generated nutrition for', foodName);
          return nutritionData;
        }
      }

      throw new Error('No nutrition data from AI');

    } catch (error) {
      console.error('❌ AI nutrition generation failed:', error);
      return null;
    }
  }

  // ============================================================
  // IMPROVED DATABASE MATCHING (EXACT MATCH FIRST)
  // ============================================================

  getPerUnitNutrition(foodName) {
    const searchTerm = foodName.toLowerCase();
    
    // STEP 1: Try EXACT match first
    for (const [key, data] of Object.entries(this.perUnitNutrition)) {
      const normalizedKey = key.toLowerCase();
      const normalizedDisplay = data.displayName.toLowerCase();
      
      if (normalizedKey === searchTerm || normalizedDisplay === searchTerm) {
        console.log('✅ Found EXACT match in local database:', data.displayName);
        return data;
      }
    }
    
    // STEP 2: Try compound word match (e.g., "dal makhani" → "dal_makhani")
    const normalizedSearch = searchTerm.replace(/\s+/g, '_');
    for (const [key, data] of Object.entries(this.perUnitNutrition)) {
      const keyWithSpaces = key.replace(/_/g, ' ');
      if (normalizedSearch === key || searchTerm === keyWithSpaces) {
        console.log('✅ Found COMPOUND match in local database:', data.displayName);
        return data;
      }
    }
    
    // STEP 3: Try partial match (only for common words)
    for (const [key, data] of Object.entries(this.perUnitNutrition)) {
      if (searchTerm.includes(key) && key.length > 3) {
        console.log('✅ Found PARTIAL match in local database:', data.displayName);
        return data;
      }
    }
    
    // STEP 4: NO MATCH - Keep Gemini's original name and use AI nutrition
    console.log('🤖 Food not in database, will use AI nutrition:', foodName);
    return {
      displayName: foodName,  // ← PRESERVE GEMINI'S ORIGINAL NAME
      weight: this.estimateWeight(foodName),
      nutrition: 'AI_GENERATE',
      needsAIGeneration: true
    };
  }

  generateSmartFallback(foodName) {
    const foodType = this.categorizeFoodType(foodName);
    
    const categoryNutrition = {
      'rice': {
        calories: 165, protein: 3.8, carbs: 36, fat: 0.5, fiber: 0.8,
        sugar: 0, sodium: 5, iron: 1.2, calcium: 15, vitaminC: 0
      },
      'dal': {
        calories: 155, protein: 11.2, carbs: 22, fat: 4.5, fiber: 8.5,
        sugar: 3, sodium: 280, iron: 4.2, calcium: 45, vitaminC: 2
      },
      'curry': {
        calories: 125, protein: 4.5, carbs: 14, fat: 6.5, fiber: 4.5,
        sugar: 5, sodium: 320, iron: 2.2, calcium: 65, vitaminC: 18
      },
      'chutney': {
        calories: 45, protein: 1.5, carbs: 8, fat: 1.2, fiber: 2,
        sugar: 5, sodium: 180, iron: 0.8, calcium: 25, vitaminC: 15
      },
      'pickle': {
        calories: 30, protein: 0.5, carbs: 2, fat: 2.5, fiber: 1,
        sugar: 1, sodium: 380, iron: 0.3, calcium: 8, vitaminC: 3
      },
      'curd': {
        calories: 60, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0,
        sugar: 4.7, sodium: 45, iron: 0.1, calcium: 120, vitaminC: 1
      },
      'ghee': {
        calories: 900, protein: 0, carbs: 0, fat: 100, fiber: 0,
        sugar: 0, sodium: 0, iron: 0, calcium: 4, vitaminC: 0
      },
      'chicken': {
        calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0,
        sugar: 0, sodium: 74, iron: 0.9, calcium: 11, vitaminC: 0
      },
      'pizza': {
        calories: 266, protein: 11, carbs: 33, fat: 10, fiber: 2,
        sugar: 4, sodium: 598, iron: 2.5, calcium: 144, vitaminC: 2
      },
      'burger': {
        calories: 295, protein: 17, carbs: 28, fat: 14, fiber: 2,
        sugar: 4, sodium: 396, iron: 2.5, calcium: 135, vitaminC: 2
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

  categorizeFoodType(foodName) {
    const name = foodName.toLowerCase();
    
    if (name.includes('rice') || name.includes('basmati')) return 'rice';
    if (name.includes('dal')) return 'dal';
    if (name.includes('curry') || name.includes('vegetable')) return 'curry';
    if (name.includes('chutney')) return 'chutney';
    if (name.includes('pickle') || name.includes('achar')) return 'pickle';
    if (name.includes('curd') || name.includes('raita') || name.includes('yogurt')) return 'curd';
    if (name.includes('ghee')) return 'ghee';
    if (name.includes('chicken') || name.includes('tikka')) return 'chicken';
    if (name.includes('pizza')) return 'pizza';
    if (name.includes('burger')) return 'burger';
    
    return 'default';
  }

  estimateWeight(foodName) {
    const name = foodName.toLowerCase();
    
    // Small condiments
    if (name.includes('pickle') || name.includes('achar')) return "20g";
    if (name.includes('chutney')) return "25g";
    if (name.includes('raita')) return "80g";
    if (name.includes('ghee')) return "20g";
    
    // Breads
    if (name.includes('chapati') || name.includes('roti')) return "60g";
    if (name.includes('paratha')) return "70g";
    if (name.includes('naan')) return "80g";
    
    // Rice & Grains
    if (name.includes('rice')) return "150g";
    
    // Curries & Gravies
    if (name.includes('curry') || name.includes('dal') || name.includes('gravy')) return "120g";
    
    // Snacks
    if (name.includes('samosa') || name.includes('pakora') || name.includes('vada') || name.includes('bonda')) {
      return "50g";
    }
    
    // Sweets
    if (name.includes('gulab jamun') || name.includes('rasgulla')) return "60g";
    
    // Fast Food
    if (name.includes('pizza')) return "150g";
    if (name.includes('burger')) return "180g";
    if (name.includes('sandwich')) return "120g";
    if (name.includes('pasta') || name.includes('noodles')) return "200g";
    
    return "100g";
  }

  async extractQuantitiesFromText(text, userInput = null) {
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
    
    return await this.formatQuantityResponse({ detectedItems, confidence: 0.8 }, userInput);
  }

  // ============================================================
  // NUTRITION CALCULATIONS
  // ============================================================

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

  // ============================================================
  // HELPER METHODS
  // ============================================================

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

  // ============================================================
  // FALLBACK DATA
  // ============================================================

  getFallbackData(imageUri, userInput = null) {
    const parathaData = this.getPerUnitNutrition('paratha');
    const riceData = this.getPerUnitNutrition('basmati');
    const dalData = this.getPerUnitNutrition('dal');
    
    const items = [
      {
        name: parathaData.displayName,
        visibleCount: 3,
        perUnitWeight: parathaData.weight,
        totalWeight: `${parseInt(parathaData.weight) * 3}g`,
        perUnitNutrition: parathaData.nutrition,
        totalNutrition: this.multiplyNutrition(parathaData.nutrition, 3),
        generatedByAI: false,
        category: parathaData.category,
        healthScore: parathaData.healthScore,
        ingredients: parathaData.ingredients,
        tips: parathaData.tips,
        portion: {
          size: 'Medium',
          quantity: '3 pieces',
          weight: `${parseInt(parathaData.weight) * 3}g`
        }
      },
      {
        name: riceData.displayName,
        visibleCount: 1,
        perUnitWeight: riceData.weight,
        totalWeight: riceData.weight,
        perUnitNutrition: riceData.nutrition,
        totalNutrition: riceData.nutrition,
        generatedByAI: false,
        category: riceData.category,
        healthScore: riceData.healthScore,
        ingredients: riceData.ingredients,
        tips: riceData.tips,
        portion: {
          size: 'Small',
          quantity: '1 piece',
          weight: riceData.weight
        }
      },
      {
        name: dalData.displayName,
        visibleCount: 1,
        perUnitWeight: dalData.weight,
        totalWeight: dalData.weight,
        perUnitNutrition: dalData.nutrition,
        totalNutrition: dalData.nutrition,
        generatedByAI: false,
        category: dalData.category,
        healthScore: dalData.healthScore,
        ingredients: dalData.ingredients,
        tips: dalData.tips,
        portion: {
          size: 'Small',
          quantity: '1 piece',
          weight: dalData.weight
        }
      }
    ];
    
    const grandTotal = this.calculateGrandTotal(items);
    
    return {
      foodName: 'Indian Thali: 3 Parathas + Rice + Dal',
      isComboMeal: true,
      itemCount: 3,
      totalFoodPieces: 5,
      individualItems: items,
      confidence: 0.7,
      category: 'Indian Thali',
      servingSize: '5 pieces total (560g)',
      nutrition: grandTotal,
      healthScore: this.calculateAccurateHealthScore(grandTotal),
      dietaryInfo: {
        isVegetarian: true,
        isVegan: false,
        isGlutenFree: false,
        isHighProtein: false,
        isBalanced: true
      },
      ingredients: ['wheat flour', 'basmati rice', 'lentils', 'spices', 'oil'],
      tips: 'Gemini temporarily unavailable - using local database estimates',
      timestamp: new Date().toISOString(),
      method: 'Local Fallback (Gemini Unavailable)',
      imageUri,
      userInput,
      isEstimate: true,
      hasAIGeneratedNutrition: false
    };
  }

  // ============================================================
  // BARCODE RECOGNITION
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

  // ============================================================
  // EXPANDED LOCAL NUTRITION DATABASE
  // ============================================================

  initializePerUnitDatabase() {
    return {
      // BREADS
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

      'chapati': {
        displayName: 'Chapati',
        weight: '60g',
        nutrition: {
          calories: 140, protein: 4.8, carbs: 26, fat: 2.2, fiber: 3.5,
          sugar: 1, sodium: 200, iron: 2.0, calcium: 25, vitaminC: 0
        },
        category: 'Indian Bread',
        healthScore: 8,
        ingredients: ['wheat flour', 'water', 'salt'],
        tips: 'Healthy whole wheat bread option'
      },

      'roti': {
        displayName: 'Roti',
        weight: '60g',
        nutrition: {
          calories: 140, protein: 4.8, carbs: 26, fat: 2.2, fiber: 3.5,
          sugar: 1, sodium: 200, iron: 2.0, calcium: 25, vitaminC: 0
        },
        category: 'Indian Bread',
        healthScore: 8,
        ingredients: ['wheat flour', 'water', 'salt'],
        tips: 'Healthy whole wheat bread option'
      },

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

      // RICE
      'basmati': {
        displayName: 'Basmati Rice',
        weight: '150g',
        nutrition: {
          calories: 165, protein: 3.8, carbs: 36, fat: 0.5, fiber: 0.8,
          sugar: 0, sodium: 5, iron: 1.2, calcium: 15, vitaminC: 0
        },
        category: 'Rice',
        healthScore: 6,
        ingredients: ['basmati rice', 'water'],
        tips: 'Simple carbohydrate source'
      },

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

      // DAL (EXPANDED)
      'dal': {
        displayName: 'Dal',
        weight: '150g',
        nutrition: {
          calories: 155, protein: 11.2, carbs: 22, fat: 4.5, fiber: 8.5,
          sugar: 3, sodium: 280, iron: 4.2, calcium: 45, vitaminC: 2
        },
        category: 'Dal',
        healthScore: 9,
        ingredients: ['lentils', 'turmeric', 'cumin', 'garlic'],
        tips: 'Complete protein source with high fiber'
      },

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

      'dal_fry': {
        displayName: 'Dal Fry',
        weight: '150g',
        nutrition: {
          calories: 145, protein: 10.5, carbs: 20, fat: 4.2, fiber: 7.8,
          sugar: 2.5, sodium: 320, iron: 3.8, calcium: 42, vitaminC: 2
        },
        category: 'Dal',
        healthScore: 9,
        ingredients: ['toor dal', 'onion', 'tomato', 'garlic', 'cumin', 'oil'],
        tips: 'Protein-rich lentil dish with added vegetables'
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

      // CURRY
      'dry_vegetable_curry': {
        displayName: 'Dry Vegetable Curry',
        weight: '120g',
        nutrition: {
          calories: 125, protein: 4.5, carbs: 14, fat: 6.5, fiber: 4.5,
          sugar: 5, sodium: 320, iron: 2.2, calcium: 65, vitaminC: 18
        },
        category: 'Vegetable Curry',
        healthScore: 8,
        ingredients: ['mixed vegetables', 'onion', 'tomato', 'spices', 'oil'],
        tips: 'Rich in fiber and vitamins from fresh vegetables'
      },

      // CONDIMENTS
      'green_chutney': {
        displayName: 'Green Chutney',
        weight: '25g',
        nutrition: {
          calories: 45, protein: 1.5, carbs: 8, fat: 1.2, fiber: 2,
          sugar: 5, sodium: 180, iron: 0.8, calcium: 25, vitaminC: 15
        },
        category: 'Condiment',
        healthScore: 8,
        ingredients: ['coriander', 'mint', 'green chili', 'lemon', 'salt'],
        tips: 'Fresh herbs provide vitamins and antioxidants'
      },

      'chutney': {
        displayName: 'Chutney',
        weight: '25g',
        nutrition: {
          calories: 45, protein: 1.5, carbs: 8, fat: 1.2, fiber: 2,
          sugar: 5, sodium: 180, iron: 0.8, calcium: 25, vitaminC: 15
        },
        category: 'Condiment',
        healthScore: 8,
        ingredients: ['herbs', 'spices', 'lemon', 'salt'],
        tips: 'Fresh herbs provide vitamins'
      },

      'pickle': {
        displayName: 'Mango Pickle',
        weight: '20g',
        nutrition: {
          calories: 30, protein: 0.5, carbs: 2, fat: 2.5, fiber: 1,
          sugar: 1, sodium: 380, iron: 0.3, calcium: 8, vitaminC: 3
        },
        category: 'Condiment',
        healthScore: 4,
        ingredients: ['mango', 'oil', 'spices', 'salt'],
        tips: 'High in sodium - use sparingly'
      },

      'mango_pickle': {
        displayName: 'Mango Pickle',
        weight: '20g',
        nutrition: {
          calories: 30, protein: 0.5, carbs: 2, fat: 2.5, fiber: 1,
          sugar: 1, sodium: 380, iron: 0.3, calcium: 8, vitaminC: 3
        },
        category: 'Condiment',
        healthScore: 4,
        ingredients: ['mango', 'oil', 'spices', 'salt'],
        tips: 'High in sodium - use sparingly'
      },

      // DAIRY
      'curd': {
        displayName: 'Curd',
        weight: '120g',
        nutrition: {
          calories: 60, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0,
          sugar: 4.7, sodium: 45, iron: 0.1, calcium: 120, vitaminC: 1
        },
        category: 'Dairy',
        healthScore: 9,
        ingredients: ['milk', 'yogurt culture'],
        tips: 'Excellent source of probiotics and calcium'
      },

      'raita': {
        displayName: 'Raita',
        weight: '120g',
        nutrition: {
          calories: 70, protein: 3.8, carbs: 6, fat: 3.5, fiber: 0.5,
          sugar: 5, sodium: 180, iron: 0.2, calcium: 125, vitaminC: 3
        },
        category: 'Dairy',
        healthScore: 8,
        ingredients: ['yogurt', 'cucumber', 'spices', 'salt'],
        tips: 'Cooling side dish with probiotics'
      },

      'ghee': {
        displayName: 'Ghee',
        weight: '20g',
        nutrition: {
          calories: 180, protein: 0, carbs: 0, fat: 20, fiber: 0,
          sugar: 0, sodium: 0, iron: 0, calcium: 1, vitaminC: 0
        },
        category: 'Cooking Fat',
        healthScore: 4,
        ingredients: ['milk fat'],
        tips: 'High in calories and saturated fat - use in moderation'
      },

      // NON-VEG
      'chicken_tikka': {
        displayName: 'Chicken Tikka',
        weight: '35g',
        nutrition: {
          calories: 58, protein: 10.9, carbs: 0.5, fat: 1.3, fiber: 0,
          sugar: 0.3, sodium: 26, iron: 0.3, calcium: 4, vitaminC: 0.5
        },
        category: 'Non-Veg',
        healthScore: 9,
        ingredients: ['chicken', 'yogurt', 'spices', 'lemon'],
        tips: 'High protein, low fat grilled chicken'
      },

      'chicken': {
        displayName: 'Chicken',
        weight: '100g',
        nutrition: {
          calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0,
          sugar: 0, sodium: 74, iron: 0.9, calcium: 11, vitaminC: 0
        },
        category: 'Non-Veg',
        healthScore: 9,
        ingredients: ['chicken breast'],
        tips: 'Excellent source of lean protein'
      },

      // VEGETABLES
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

      // PANEER
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

      // SNACKS
      'samosa': {
        displayName: 'Samosa',
        weight: '50g',
        nutrition: {
          calories: 145, protein: 3.2, carbs: 18, fat: 7.2, fiber: 2.5,
          sugar: 1.5, sodium: 220, iron: 1.2, calcium: 15, vitaminC: 3
        },
        category: 'Snack',
        healthScore: 5,
        ingredients: ['wheat flour', 'potato', 'peas', 'spices', 'oil'],
        tips: 'Deep-fried snack - enjoy occasionally'
      },

      'pakora': {
        displayName: 'Pakora',
        weight: '40g',
        nutrition: {
          calories: 120, protein: 3.5, carbs: 12, fat: 7, fiber: 2,
          sugar: 1, sodium: 180, iron: 1.0, calcium: 20, vitaminC: 2
        },
        category: 'Snack',
        healthScore: 5,
        ingredients: ['gram flour', 'vegetables', 'spices', 'oil'],
        tips: 'Deep-fried snack - high in calories'
      },

      'bonda': {
        displayName: 'Bonda',
        weight: '50g',
        nutrition: {
          calories: 130, protein: 2.8, carbs: 16, fat: 6.5, fiber: 2,
          sugar: 1.2, sodium: 200, iron: 1.1, calcium: 18, vitaminC: 2.5
        },
        category: 'Snack',
        healthScore: 5,
        ingredients: ['potato', 'gram flour', 'spices', 'oil'],
        tips: 'Deep-fried snack - consume in moderation'
      },

      // FAST FOOD
      'pizza': {
        displayName: 'Pizza',
        weight: '150g',
        nutrition: {
          calories: 266, protein: 11, carbs: 33, fat: 10, fiber: 2,
          sugar: 4, sodium: 598, iron: 2.5, calcium: 144, vitaminC: 2
        },
        category: 'Fast Food',
        healthScore: 5,
        ingredients: ['wheat flour', 'cheese', 'tomato sauce', 'vegetables'],
        tips: 'High in sodium - enjoy occasionally'
      },

      'burger': {
        displayName: 'Burger',
        weight: '180g',
        nutrition: {
          calories: 295, protein: 17, carbs: 28, fat: 14, fiber: 2,
          sugar: 4, sodium: 396, iron: 2.5, calcium: 135, vitaminC: 2
        },
        category: 'Fast Food',
        healthScore: 5,
        ingredients: ['bun', 'patty', 'cheese', 'vegetables', 'sauce'],
        tips: 'High in calories and sodium'
      },

      'sandwich': {
        displayName: 'Sandwich',
        weight: '120g',
        nutrition: {
          calories: 250, protein: 12, carbs: 30, fat: 8, fiber: 3,
          sugar: 4, sodium: 450, iron: 2.2, calcium: 80, vitaminC: 5
        },
        category: 'Fast Food',
        healthScore: 6,
        ingredients: ['bread', 'vegetables', 'cheese', 'sauce'],
        tips: 'Can be healthy with whole grain bread'
      }
    };
  }
}

export default new FoodRecognitionService();
