import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Promotion from '../../models/Promotion.js';
import { quickSetups } from '../../tests/setup/presets.js';

describe('Promotion Model', () => {
  let setup;
  let testPromotions;
  let testPromotion;

  beforeAll(async () => {
    // load promotions system
    setup = await quickSetups.promotions('unit');
    testPromotions = setup.getData('promotions');
    
    // get a sample promotion for testing
    testPromotion = testPromotions.find(p => p.is_active === true) || testPromotions[0];
    
    if (!testPromotion) {
      throw new Error('No test promotion data available');
    }
  });

  afterAll(async () => {
    // cleanup preset data
    await setup.cleanup();
  });

  describe('Create', () => {
    it('should create a new promotion successfully', () => {
      const promotion = new Promotion({
        title: 'Winter Sale',
        description: 'Get 30% off on winter items',
        priority: 2,
        start_date: new Date('2024-12-01'),
        end_date: new Date('2025-02-28'),
        locale: 'en',
        is_active: true
      });

      expect(promotion).toBeDefined();
      expect(promotion.title).toBe('Winter Sale');
      expect(promotion.description).toBe('Get 30% off on winter items');
      expect(promotion.priority).toBe(2);
      expect(promotion.locale).toBe('en');
      expect(promotion.is_active).toBe(true);
    });

    it('should set default values correctly', () => {
      const promotion = new Promotion();
      expect(promotion.priority).toBe(1);
      expect(promotion.locale).toBe('en');
      expect(promotion.is_active).toBe(true);
    });

    it('should create promotion with preset data structure', () => {
      // Skip test if no test promotion available
      if (!testPromotion) {
        console.log('⚠️ Skipping test - no test promotion available');
        return;
      }
      
      // verify promotion from preset has expected structure
      expect(testPromotion).toBeDefined();
      expect(testPromotion.title).toBeDefined();
      expect(testPromotion.description).toBeDefined();
      expect(testPromotion.priority).toBeDefined();
      expect(testPromotion.start_date).toBeDefined();
      expect(testPromotion.end_date).toBeDefined();
      expect(testPromotion.locale).toBeDefined();
      expect(typeof testPromotion.is_active).toBe('boolean');
    });
  });

  describe('Validation', () => {
    it('should validate required fields for creation', () => {
      const promotion = new Promotion();
      const validation = promotion.validateForCreation();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Title is required');
      expect(validation.errors).toContain('Description is required');
      expect(validation.errors).toContain('Start date is required');
      expect(validation.errors).toContain('End date is required');
    });

    it('should validate date range', () => {
      const promotion = new Promotion({
        title: 'Invalid Dates',
        description: 'Test description',
        start_date: new Date('2024-12-31'),
        end_date: new Date('2024-01-01')
      });

      const validation = promotion.validateForCreation();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('End date must be after start date');
    });

    it('should validate locale format', () => {
      const promotion = new Promotion({
        title: 'Test',
        description: 'Test description',
        start_date: new Date(),
        end_date: new Date(Date.now() + 86400000),
        locale: 'invalid'
      });

      const validation = promotion.validateForCreation();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Locale must be in format "en" or "en-US"');
    });

    it('should validate preset promotion data', () => {
      // Skip test if no test promotions available
      if (!testPromotions || testPromotions.length === 0) {
        console.log('⚠️ Skipping test - no test promotions available');
        return;
      }
      
      // verify all promotions from preset are valid
      testPromotions.forEach((promoData, index) => {
        const promotion = new Promotion(promoData);
        const validation = promotion.validateForCreation();
        
        expect(validation.isValid).toBe(true, 
          `Promotion ${index} should be valid: ${validation.errors.join(', ')}`);
        expect(validation.errors.length).toBe(0);
      });
    });
  });

  describe('Update', () => {
    it('should update promotion successfully', () => {
      // create promotion from preset data
      const promotion = new Promotion(testPromotion);
      
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
        priority: 3
      };

      promotion.update(updateData);
      
      expect(promotion.title).toBe('Updated Title');
      expect(promotion.description).toBe('Updated description');
      expect(promotion.priority).toBe(3);
      expect(promotion.updated_at).toBeDefined();
    });

    it('should validate updates correctly', () => {
      const promotion = new Promotion(testPromotion);
      
      // apply invalid updates
      promotion.title = '';
      promotion.priority = -1;

      const validation = promotion.validateForUpdate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Title cannot be empty');
      expect(validation.errors).toContain('Priority must be a positive number');
    });

    it('should preserve unchanged fields during update', () => {
      const promotion = new Promotion(testPromotion);
      const originalLocale = promotion.locale;
      const originalStartDate = promotion.start_date;
      
      promotion.update({
        title: 'New Title',
        description: 'New description'
      });
      
      expect(promotion.title).toBe('New Title');
      expect(promotion.description).toBe('New description');
      expect(promotion.locale).toBe(originalLocale);
      expect(promotion.start_date).toBe(originalStartDate);
    });
  });

  describe('Data Transformation', () => {
    it('should transform to create data correctly', () => {
      const promotion = new Promotion(testPromotion);
      const createData = promotion.toCreateData();
      
      expect(createData.title).toBe(promotion.title.trim());
      expect(createData.description).toBe(promotion.description.trim());
      expect(createData.priority).toBe(promotion.priority);
      expect(createData.locale).toBe(promotion.locale);
      expect(createData.is_active).toBe(promotion.is_active);
      expect(createData.created_at).toBeDefined();
      expect(createData.updated_at).toBeDefined();
    });

    it('should transform to update data correctly', () => {
      const promotion = new Promotion(testPromotion);
      const updateData = promotion.toUpdateData();
      
      expect(updateData.title).toBe(promotion.title.trim());
      expect(updateData.description).toBe(promotion.description.trim());
      expect(updateData.priority).toBe(promotion.priority);
      expect(updateData.locale).toBe(promotion.locale);
      expect(updateData.is_active).toBe(promotion.is_active);
      expect(updateData.updated_at).toBeDefined();
    });

    it('should handle empty strings in transformation', () => {
      const promotion = new Promotion({
        title: '  Spaced Title  ',
        description: '  Spaced Description  ',
        priority: 1,
        start_date: new Date(),
        end_date: new Date(Date.now() + 86400000),
        locale: 'en',
        is_active: true
      });
      
      const createData = promotion.toCreateData();
      expect(createData.title).toBe('Spaced Title');
      expect(createData.description).toBe('Spaced Description');
    });
  });

  describe('Static Methods', () => {
    it('should create from database row', () => {
      const dbRow = {
        id: 1,
        title: 'DB Promotion',
        description: 'DB Description',
        priority: 1,
        start_date: new Date(),
        end_date: new Date(Date.now() + 86400000),
        locale: 'en',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const promotion = Promotion.fromDatabase(dbRow);
      
      expect(promotion).toBeDefined();
      expect(promotion.id).toBe(dbRow.id);
      expect(promotion.title).toBe(dbRow.title);
      expect(promotion.description).toBe(dbRow.description);
    });

    it('should create from array of database rows', () => {
      const dbRows = [
        {
          id: 1,
          title: 'Promo 1',
          description: 'Desc 1',
          priority: 1,
          start_date: new Date(),
          end_date: new Date(Date.now() + 86400000),
          locale: 'en',
          is_active: true
        },
        {
          id: 2,
          title: 'Promo 2',
          description: 'Desc 2',
          priority: 2,
          start_date: new Date(),
          end_date: new Date(Date.now() + 86400000),
          locale: 'en',
          is_active: true
        }
      ];

      const promotions = Promotion.fromDatabaseArray(dbRows);
      
      expect(Array.isArray(promotions)).toBe(true);
      expect(promotions.length).toBe(2);
      expect(promotions[0].title).toBe('Promo 1');
      expect(promotions[1].title).toBe('Promo 2');
    });

    it('should create from preset data array', () => {
      const promotions = Promotion.fromDatabaseArray(testPromotions);
      
      expect(Array.isArray(promotions)).toBe(true);
      expect(promotions.length).toBe(testPromotions.length);
      
      promotions.forEach((promotion, index) => {
        expect(promotion.title).toBe(testPromotions[index].title);
        expect(promotion.description).toBe(testPromotions[index].description);
        expect(promotion.priority).toBe(testPromotions[index].priority);
      });
    });
  });

  describe('Promotion Data Validation', () => {
    it('should validate promotion relationships from preset data', () => {
      // Skip test if no test promotions available
      if (!testPromotions || testPromotions.length === 0) {
        console.log('⚠️ Skipping test - no test promotions available');
        return;
      }
      
      // verify promotions from preset have expected structure
      expect(testPromotions.length).toBeGreaterThan(0);
      
      // verify each promotion has required fields
      testPromotions.forEach(promotion => {
        expect(promotion.title).toBeDefined();
        expect(promotion.description).toBeDefined();
        expect(promotion.priority).toBeDefined();
        expect(promotion.start_date).toBeDefined();
        expect(promotion.end_date).toBeDefined();
        expect(promotion.locale).toBeDefined();
        expect(typeof promotion.is_active).toBe('boolean');
      });
    });

    it('should validate promotion priority distribution', () => {
      // verify different priorities exist
      const priorities = testPromotions.map(p => p.priority);
      const uniquePriorities = [...new Set(priorities)];
      
      expect(uniquePriorities.length).toBeGreaterThan(0);
      
      // verify priorities are positive numbers
      priorities.forEach(priority => {
        expect(priority).toBeGreaterThan(0);
        expect(Number.isInteger(priority)).toBe(true);
      });
    });

    it('should validate promotion status distribution', () => {
      const activePromotions = testPromotions.filter(p => p.is_active === true);
      const inactivePromotions = testPromotions.filter(p => p.is_active === false);
      
      // should have both active and inactive promotions
      expect(activePromotions.length).toBeGreaterThan(0);
      expect(inactivePromotions.length).toBeGreaterThan(0);
      
      // verify each promotion status is boolean
      testPromotions.forEach(promotion => {
        expect(typeof promotion.is_active).toBe('boolean');
      });
    });

    it('should validate promotion date ranges', () => {
      // Skip test if no test promotions available
      if (!testPromotions || testPromotions.length === 0) {
        console.log('⚠️ Skipping test - no test promotions available');
        return;
      }
      
      testPromotions.forEach((promotion, index) => {
        // Skip if dates are undefined
        if (!promotion.start_date || !promotion.end_date) {
          console.log(`⚠️ Skipping promotion ${index} - missing dates`);
          return;
        }
        
        const startDate = new Date(promotion.start_date);
        const endDate = new Date(promotion.end_date);
        
        expect(startDate).toBeInstanceOf(Date);
        expect(endDate).toBeInstanceOf(Date);
        expect(startDate.getTime()).not.toBeNaN();
        expect(endDate.getTime()).not.toBeNaN();
        expect(endDate.getTime()).toBeGreaterThan(startDate.getTime(), 
          `Promotion ${index} should have end date after start date`);
      });
    });

    it('should validate promotion locales', () => {
      // Skip test if no test promotions available
      if (!testPromotions || testPromotions.length === 0) {
        console.log('⚠️ Skipping test - no test promotions available');
        return;
      }
      
      const locales = testPromotions.map(p => p.locale).filter(locale => locale != null);
      
      if (locales.length === 0) {
        console.log('⚠️ Skipping test - no locales found in promotions');
        return;
      }
      
      const uniqueLocales = [...new Set(locales)];
      
      // verify locales are valid format
      uniqueLocales.forEach(locale => {
        expect(locale).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
      });
      
      // should have at least English locale
      expect(locales).toContain('en');
    });

    it('should handle promotion business logic', () => {
      // test seasonal promotions
      const seasonalPromotions = testPromotions.filter(p => 
        p.title.toLowerCase().includes('summer') || 
        p.title.toLowerCase().includes('winter') ||
        p.title.toLowerCase().includes('spring') ||
        p.title.toLowerCase().includes('fall')
      );
      
      if (seasonalPromotions.length > 0) {
        seasonalPromotions.forEach(promo => {
          // seasonal promotions should have reasonable duration
          const startDate = new Date(promo.start_date);
          const endDate = new Date(promo.end_date);
          const durationDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
          
          expect(durationDays).toBeGreaterThan(0);
          expect(durationDays).toBeLessThan(365); // less than a year
        });
      }
    });

    it('should validate promotion content quality', () => {
      testPromotions.forEach((promotion, index) => {
        // titles should be reasonable length
        expect(promotion.title.length).toBeGreaterThan(3, 
          `Promotion ${index} title too short`);
        expect(promotion.title.length).toBeLessThan(100, 
          `Promotion ${index} title too long`);
        
        // descriptions should be meaningful
        expect(promotion.description.length).toBeGreaterThan(10, 
          `Promotion ${index} description too short`);
        expect(promotion.description.length).toBeLessThan(500, 
          `Promotion ${index} description too long`);
        
        // should not contain placeholder text
        expect(promotion.title.toLowerCase()).not.toContain('lorem');
        expect(promotion.description.toLowerCase()).not.toContain('lorem');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle promotions with same priority', () => {
      const priority1Promotions = testPromotions.filter(p => p.priority === 1);
      
      if (priority1Promotions.length > 1) {
        // multiple promotions can have same priority
        expect(priority1Promotions.length).toBeGreaterThan(1);
        
        // but they should have different titles
        const titles = priority1Promotions.map(p => p.title);
        const uniqueTitles = [...new Set(titles)];
        expect(uniqueTitles.length).toBe(titles.length);
      }
    });

    it('should handle promotion date edge cases', () => {
      // create promotion starting today
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const promotion = new Promotion({
        title: 'Today Promotion',
        description: 'Starts today',
        start_date: today,
        end_date: tomorrow,
        priority: 1,
        locale: 'en',
        is_active: true
      });
      
      const validation = promotion.validateForCreation();
      expect(validation.isValid).toBe(true);
    });

    it('should handle different locale formats', () => {
      const localeFormats = ['en', 'en-US', 'ar', 'ar-SA', 'fr-FR'];
      
      localeFormats.forEach(locale => {
        const promotion = new Promotion({
          title: 'Locale Test',
          description: 'Testing locale format',
          start_date: new Date(),
          end_date: new Date(Date.now() + 86400000),
          priority: 1,
          locale: locale,
          is_active: true
        });
        
        const validation = promotion.validateForCreation();
        expect(validation.isValid).toBe(true, 
          `Locale ${locale} should be valid`);
      });
    });
  });
}); 