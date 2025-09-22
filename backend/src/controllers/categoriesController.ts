import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';

export const createCategoryValidation = [
  body('cod').isLength({ min: 1, max: 10 }).withMessage('Code must be 1-10 characters'),
  body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
];

export const updateCategoryValidation = [
  body('cod').optional().isLength({ min: 1, max: 10 }).withMessage('Code must be 1-10 characters'),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
];

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = 'SELECT id, cod, name FROM categories ORDER BY id ASC';
    const result = await pool.query(query);

    res.json({
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { cod, name } = req.body;

    // Check if category with same code already exists
    const existingQuery = 'SELECT id FROM categories WHERE cod = $1';
    const existing = await pool.query(existingQuery, [cod]);

    if (existing.rows.length > 0) {
      res.status(400).json({ message: 'Category with this code already exists' });
      return;
    }

    // Create category
    const insertQuery = `
      INSERT INTO categories (cod, name)
      VALUES ($1, $2)
      RETURNING id, cod, name
    `;
    const result = await pool.query(insertQuery, [cod, name]);

    res.status(201).json({
      message: 'Category created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { cod, name } = req.body;

    // Check if category exists
    const existingQuery = 'SELECT * FROM categories WHERE id = $1';
    const existing = await pool.query(existingQuery, [id]);

    if (existing.rows.length === 0) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (cod !== undefined) {
      // Check if code is unique (excluding current record)
      const codeQuery = 'SELECT id FROM categories WHERE cod = $1 AND id != $2';
      const codeCheck = await pool.query(codeQuery, [cod, id]);
      if (codeCheck.rows.length > 0) {
        res.status(400).json({ message: 'Category with this code already exists' });
        return;
      }
      updateFields.push(`cod = $${paramIndex++}`);
      updateValues.push(cod);
    }
    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name);
    }

    if (updateFields.length === 0) {
      res.status(400).json({ message: 'No fields to update' });
      return;
    }

    updateValues.push(id);

    const updateQuery = `
      UPDATE categories
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, cod, name
    `;

    const result = await pool.query(updateQuery, updateValues);

    res.json({
      message: 'Category updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existingQuery = 'SELECT * FROM categories WHERE id = $1';
    const existing = await pool.query(existingQuery, [id]);

    if (existing.rows.length === 0) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    const deleteQuery = 'DELETE FROM categories WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};