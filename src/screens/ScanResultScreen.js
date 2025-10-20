import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UserDataService from '../services/userDataService';

const { width } = Dimensions.get('window');

const ScanResultScreen = ({ route, navigation }) => {
  const { imageUri, foodData, userInput } = route.params;

  const getHealthScoreColor = (score) => {
    if (score >= 8) return '#4CAF50';
    if (score >= 6) return '#FF9800';
    return '#F44336';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#FF9800';
    return '#F44336';
  };

  const handleSave = () => {
    Alert.alert('Saved!', 'Food item saved to your history');
  };

const handleAddToMeal = async () => {
  try {
    // Determine current meal time
    const mealType = UserDataService.getMealTimeFromHour();
    
    // Save to user's daily intake
    await UserDataService.addFoodToMeal(foodData, mealType);
    
    Alert.alert(
      'Added to Meal!', 
      `Added to your ${mealType} for today.`,
      [
        { text: 'OK' },
        { text: 'View Stats', onPress: () => navigation.navigate('NutritionStats') }
      ]
    );
  } catch (error) {
    console.error('Error adding to meal:', error);
    Alert.alert('Error', 'Failed to add to meal. Please try again.');
  }
};

  return (
    <ScrollView style={styles.container}>
      {/* Food Image */}
      {imageUri && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.foodImage} />
          
          <View style={styles.badgeContainer}>
            <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(foodData.confidence) }]}>
              <Text style={styles.badgeText}>
                {Math.round(foodData.confidence * 100)}% confident
              </Text>
            </View>
            
            <View style={[styles.healthBadge, { backgroundColor: getHealthScoreColor(foodData.healthScore) }]}>
              <Text style={styles.badgeText}>
                Health: {foodData.healthScore}/10
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Food Information */}
      <View style={styles.contentContainer}>
        <Text style={styles.foodName}>{foodData.foodName}</Text>
        <Text style={styles.category}>{foodData.category}</Text>
        <Text style={styles.servingSize}>Serving: {foodData.servingSize}</Text>

        {/* 🎯 User Input Display */}
        {userInput && (
          <View style={styles.userInputContainer}>
            <Ionicons name="person" size={16} color="#4CAF50" />
            <Text style={styles.userInputText}>User provided: "{userInput}"</Text>
          </View>
        )}

        {/* Method Info */}
        <View style={styles.methodContainer}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.methodText}>Analyzed via {foodData.method}</Text>
        </View>

        {/* 🎯 NEW: AI Enhanced Notice */}
        {foodData.hasAIGeneratedNutrition && (
          <View style={styles.aiEnhancedContainer}>
            <Ionicons name="sparkles" size={16} color="#FF9800" />
            <Text style={styles.aiEnhancedText}>
              Nutrition data enhanced with AI analysis
            </Text>
          </View>
        )}

        {/* 🎯 ENHANCED: Individual Items Breakdown */}
        {foodData.individualItems && foodData.individualItems.length > 0 && (
          <View style={styles.individualItemsContainer}>
            <Text style={styles.sectionTitle}>
              Individual Items {foodData.totalFoodPieces && `(${foodData.totalFoodPieces} pieces total)`}
            </Text>
            
            {foodData.individualItems.map((item, index) => (
              <View key={index} style={styles.individualItem}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.itemQuantity}>
                    <Text style={styles.quantityText}>
                      {item.visibleCount}x
                    </Text>
                    <Text style={styles.weightText}>
                      {item.totalWeight || `${item.visibleCount} piece${item.visibleCount > 1 ? 's' : ''}`}
                    </Text>
                  </View>
                </View>
                
                {/* Per Unit Info */}
                {item.perUnitNutrition && (
                  <View style={styles.perUnitInfo}>
                    <Text style={styles.perUnitLabel}>
                      Per piece ({item.perUnitWeight || 'avg'}):
                    </Text>
                    <View style={styles.perUnitNutrition}>
                      <Text style={styles.nutritionItem}>
                        {item.perUnitNutrition.calories} cal
                      </Text>
                      <Text style={styles.nutritionItem}>
                        {item.perUnitNutrition.protein}g protein
                      </Text>
                      <Text style={styles.nutritionItem}>
                        {item.perUnitNutrition.carbs}g carbs
                      </Text>
                      <Text style={styles.nutritionItem}>
                        {item.perUnitNutrition.fat}g fat
                      </Text>
                      {item.perUnitNutrition.fiber > 0 && (
                        <Text style={styles.nutritionItem}>
                          {item.perUnitNutrition.fiber}g fiber
                        </Text>
                      )}
                    </View>
                  </View>
                )}
                
                {/* Total for this item */}
                <View style={styles.itemTotalInfo}>
                  <Text style={styles.itemTotalLabel}>
                    Total for {item.visibleCount} piece{item.visibleCount > 1 ? 's' : ''}:
                  </Text>
                  <View style={styles.itemTotalNutrition}>
                    <Text style={[styles.nutritionItem, styles.totalNutrition]}>
                      {item.totalNutrition?.calories || item.nutrition?.calories} cal
                    </Text>
                    <Text style={[styles.nutritionItem, styles.totalNutrition]}>
                      {item.totalNutrition?.protein || item.nutrition?.protein}g protein
                    </Text>
                    <Text style={[styles.nutritionItem, styles.totalNutrition]}>
                      {item.totalNutrition?.carbs || item.nutrition?.carbs}g carbs
                    </Text>
                    <Text style={[styles.nutritionItem, styles.totalNutrition]}>
                      {item.totalNutrition?.fat || item.nutrition?.fat}g fat
                    </Text>
                  </View>
                </View>
                
                {/* 🎯 NEW: AI Generated Badge */}
                {item.generatedByAI && (
                  <View style={styles.aiGeneratedBadge}>
                    <Ionicons name="sparkles" size={12} color="#FF9800" />
                    <Text style={styles.aiGeneratedText}>AI generated nutrition</Text>
                  </View>
                )}
                
                {/* User provided badge */}
                {item.userProvided && (
                  <View style={styles.userProvidedBadge}>
                    <Ionicons name="person" size={12} color="#4CAF50" />
                    <Text style={styles.userProvidedText}>User assisted</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* 🎯 FALLBACK: Original Combo Display (for backward compatibility) */}
        {foodData.isComboMeal && (!foodData.individualItems || foodData.individualItems.length === 0) && (
          <View style={styles.comboContainer}>
            <Text style={styles.comboTitle}>
              🍽️ Combo Meal ({foodData.itemCount} items)
            </Text>
            
            {foodData.individualItems?.map((item, index) => (
              <View key={index} style={styles.comboItem}>
                <Text style={styles.comboItemName}>{item.displayName || item.name}</Text>
                <Text style={styles.comboItemPortion}>
                  {item.portion?.size} portion ({item.portion?.estimatedWeight})
                </Text>
                <Text style={styles.comboItemCalories}>
                  {item.nutrition.calories} kcal
                </Text>
              </View>
            ))}
            
            {foodData.lpuSpecialties > 0 && (
              <Text style={styles.lpuSpecial}>
                ⭐ {foodData.lpuSpecialties} LPU Specialty dish(es)
              </Text>
            )}
          </View>
        )}

        {/* 🎯 ENHANCED: Total Nutrition Grid */}
        <View style={styles.nutritionContainer}>
          <Text style={styles.sectionTitle}>Total Nutrition Information</Text>
          {foodData.totalFoodPieces && (
            <Text style={styles.totalPiecesText}>
              Combined nutrition for {foodData.totalFoodPieces} pieces
            </Text>
          )}
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionGridItem}>
              <Text style={styles.nutritionValue}>{foodData.nutrition.calories}</Text>
              <Text style={styles.nutritionLabel}>Calories</Text>
            </View>
            <View style={styles.nutritionGridItem}>
              <Text style={styles.nutritionValue}>{foodData.nutrition.protein}g</Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={styles.nutritionGridItem}>
              <Text style={styles.nutritionValue}>{foodData.nutrition.carbs}g</Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            <View style={styles.nutritionGridItem}>
              <Text style={styles.nutritionValue}>{foodData.nutrition.fat}g</Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
            <View style={styles.nutritionGridItem}>
              <Text style={styles.nutritionValue}>{foodData.nutrition.fiber}g</Text>
              <Text style={styles.nutritionLabel}>Fiber</Text>
            </View>
            <View style={styles.nutritionGridItem}>
              <Text style={styles.nutritionValue}>{foodData.nutrition.iron}mg</Text>
              <Text style={styles.nutritionLabel}>Iron</Text>
            </View>
          </View>
        </View>

        {/* Dietary Info */}
        {foodData.dietaryInfo && (
          <View style={styles.dietaryContainer}>
            <Text style={styles.sectionTitle}>Dietary Information</Text>
            <View style={styles.dietaryTags}>
              {Object.entries(foodData.dietaryInfo).map(([key, value]) => {
                if (!value) return null;
                const label = key.replace(/^is/, '').replace(/([A-Z])/g, ' $1');
                return (
                  <View key={key} style={styles.dietaryTag}>
                    <Text style={styles.dietaryTagText}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Health Tips */}
        {foodData.tips && (
          <View style={styles.tipsContainer}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={20} color="#FF9800" />
              <Text style={styles.tipsTitle}>Health Tip</Text>
            </View>
            <Text style={styles.tipsText}>{foodData.tips}</Text>
          </View>
        )}

        {/* Warning for estimates */}
        {foodData.isEstimate && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={16} color="#FF9800" />
            <Text style={styles.warningText}>
              Nutrition values are estimated
            </Text>
          </View>
        )}

        {/* 🎯 User Assisted Info */}
        {foodData.userAssisted && (
          <View style={styles.userAssistedContainer}>
            <Ionicons name="people" size={16} color="#4CAF50" />
            <Text style={styles.userAssistedText}>
              Analysis improved with your input
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleAddToMeal}
          >
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text style={styles.primaryButtonText}>Add to Meal</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleSave}
          >
            <Ionicons name="bookmark-outline" size={24} color="#2196F3" />
            <Text style={styles.secondaryButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity 
            style={styles.bottomButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="camera" size={20} color="#666" />
            <Text style={styles.bottomButtonText}>Scan Again</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.bottomButton}
            onPress={() => navigation.navigate('MainCafeteria')}
          >
            <Ionicons name="restaurant" size={20} color="#666" />
            <Text style={styles.bottomButtonText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  imageContainer: {
    position: 'relative',
  },
  foodImage: {
    width: width,
    height: 250,
    resizeMode: 'cover',
  },
  badgeContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    alignItems: 'flex-end',
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  healthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentContainer: {
    padding: 16,
  },
  foodName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  category: {
    fontSize: 16,
    color: '#2196F3',
    marginBottom: 4,
  },
  servingSize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },

  // 🎯 User Input Styles
  userInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  userInputText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2e7d32',
    fontStyle: 'italic',
    flex: 1,
  },

  methodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
  },
  methodText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },

  // 🎯 NEW: AI Enhanced Notice
  aiEnhancedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  aiEnhancedText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#e65100',
    fontWeight: '500',
  },

  // 🎯 Individual Items Styles
  individualItemsContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  individualItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  itemQuantity: {
    alignItems: 'flex-end',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  weightText: {
    fontSize: 12,
    color: '#666',
  },
  perUnitInfo: {
    marginBottom: 8,
  },
  perUnitLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  perUnitNutrition: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  nutritionItem: {
    fontSize: 11,
    color: '#555',
    backgroundColor: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  itemTotalInfo: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
  itemTotalLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  itemTotalNutrition: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  totalNutrition: {
    backgroundColor: '#2196F3',
    color: 'white',
    fontWeight: 'bold',
  },

  // 🎯 NEW: AI Generated Badge
  aiGeneratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  aiGeneratedText: {
    fontSize: 10,
    color: '#FF9800',
    marginLeft: 4,
    fontWeight: '500',
  },

  userProvidedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  userProvidedText: {
    fontSize: 10,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },

  // Fallback combo styles (preserved)
  comboContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  comboTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  comboItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  comboItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  comboItemPortion: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 8,
  },
  comboItemCalories: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  lpuSpecial: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },

  // Nutrition container
  nutritionContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  totalPiecesText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  nutritionGridItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

  dietaryContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  dietaryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dietaryTag: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  dietaryTagText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
  },
  tipsContainer: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginLeft: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#F57C00',
    flex: 1,
  },

  // User assisted info
  userAssistedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  userAssistedText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '500',
  },

  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#2196F3',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  bottomButton: {
    alignItems: 'center',
  },
  bottomButtonText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default ScanResultScreen;
