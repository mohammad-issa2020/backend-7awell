import { describe, it, expect, beforeEach } from 'vitest';
import Promotion from '../../models/Promotion.js';

describe('Promotion Model', () => {
  let testPromotion;

  beforeEach(async () => {
    // Create a test promotion
    testPromotion = new Promotion({
      title: 'Summer Sale',
      description: 'Get 50% off on all items',
      priority: 1,
      start_date: new Date('2024-06-01'),
      end_date: new Date('2024-08-31'),
      locale: 'en',
      is_active: true
    });
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
  });

  describe('Update', () => {
    it('should update promotion successfully', () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
        priority: 3
      };

      testPromotion.update(updateData);
      
      expect(testPromotion.title).toBe('Updated Title');
      expect(testPromotion.description).toBe('Updated description');
      expect(testPromotion.priority).toBe(3);
      expect(testPromotion.updated_at).toBeDefined();
    });

    it('should validate updates correctly', () => {
      const updateData = {
        title: '', // Invalid empty title
        priority: -1 // Invalid negative priority
      };

      const validation = testPromotion.validateForUpdate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Title cannot be empty');
      expect(validation.errors).toContain('Priority must be a positive number');
    });
  });

  describe('Data Transformation', () => {
    it('should transform to create data correctly', () => {
      const createData = testPromotion.toCreateData();
      
      expect(createData.title).toBe(testPromotion.title.trim());
      expect(createData.description).toBe(testPromotion.description.trim());
      expect(createData.priority).toBe(testPromotion.priority);
      expect(createData.locale).toBe(testPromotion.locale);
      expect(createData.is_active).toBe(testPromotion.is_active);
      expect(createData.created_at).toBeDefined();
      expect(createData.updated_at).toBeDefined();
    });

    it('should transform to update data correctly', () => {
      const updateData = testPromotion.toUpdateData();
      
      expect(updateData.title).toBe(testPromotion.title.trim());
      expect(updateData.description).toBe(testPromotion.description.trim());
      expect(updateData.priority).toBe(testPromotion.priority);
      expect(updateData.locale).toBe(testPromotion.locale);
      expect(updateData.is_active).toBe(testPromotion.is_active);
      expect(updateData.updated_at).toBeDefined();
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
  });
}); 