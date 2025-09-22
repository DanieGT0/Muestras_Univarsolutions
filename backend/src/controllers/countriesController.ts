import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';

export const createCountryValidation = [
  body('cod').isLength({ min: 1, max: 5 }).withMessage('Code must be 1-5 characters'),
  body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
];

export const updateCountryValidation = [
  body('cod').optional().isLength({ min: 1, max: 5 }).withMessage('Code must be 1-5 characters'),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
];

export const getCountries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let query: string;
    let queryParams: any[] = [];

    // Si es admin, devolver todos los países
    if (req.user?.role === UserRole.ADMIN) {
      query = 'SELECT id, cod, name FROM countries ORDER BY name ASC';
    } else {
      // Si es usuario regular, devolver solo los países asignados
      query = `
        SELECT DISTINCT c.id, c.cod, c.name
        FROM countries c
        INNER JOIN user_countries uc ON c.id = uc.country_id
        WHERE uc.user_id = $1
        ORDER BY c.name ASC
      `;
      queryParams = [req.user?.id];
    }

    const result = await pool.query(query, queryParams);

    res.json({
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error getting countries:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all countries for transfer destinations - any user can send to any country
export const getAllCountriesForTransfers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = 'SELECT id, cod, name FROM countries ORDER BY name ASC';
    const result = await pool.query(query);

    res.json({
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error getting all countries for transfers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createCountry = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { cod, name } = req.body;

    // Check if country with same code already exists
    const existingQuery = 'SELECT id FROM countries WHERE cod = $1';
    const existing = await pool.query(existingQuery, [cod]);

    if (existing.rows.length > 0) {
      res.status(400).json({ message: 'Country with this code already exists' });
      return;
    }

    // Create country
    const insertQuery = `
      INSERT INTO countries (cod, name)
      VALUES ($1, $2)
      RETURNING id, cod, name
    `;
    const result = await pool.query(insertQuery, [cod, name]);

    res.status(201).json({
      message: 'Country created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating country:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateCountry = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { cod, name } = req.body;

    // Check if country exists
    const existingQuery = 'SELECT * FROM countries WHERE id = $1';
    const existing = await pool.query(existingQuery, [id]);

    if (existing.rows.length === 0) {
      res.status(404).json({ message: 'Country not found' });
      return;
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (cod !== undefined) {
      // Check if code is unique (excluding current record)
      const codeQuery = 'SELECT id FROM countries WHERE cod = $1 AND id != $2';
      const codeCheck = await pool.query(codeQuery, [cod, id]);
      if (codeCheck.rows.length > 0) {
        res.status(400).json({ message: 'Country with this code already exists' });
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
      UPDATE countries
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, cod, name
    `;

    const result = await pool.query(updateQuery, updateValues);

    res.json({
      message: 'Country updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating country:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteCountry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if country exists
    const existingQuery = 'SELECT * FROM countries WHERE id = $1';
    const existing = await pool.query(existingQuery, [id]);

    if (existing.rows.length === 0) {
      res.status(404).json({ message: 'Country not found' });
      return;
    }

    // TODO: Check if country is being used by samples before deleting
    // For now, we'll allow deletion

    const deleteQuery = 'DELETE FROM countries WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    res.json({ message: 'Country deleted successfully' });
  } catch (error) {
    console.error('Error deleting country:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};