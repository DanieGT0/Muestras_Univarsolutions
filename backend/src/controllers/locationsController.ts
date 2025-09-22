import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';

export const createLocationValidation = [
  body('cod').isLength({ min: 1, max: 10 }).withMessage('Code must be 1-10 characters'),
  body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
];

export const updateLocationValidation = [
  body('cod').optional().isLength({ min: 1, max: 10 }).withMessage('Code must be 1-10 characters'),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters')
];

export const getLocations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { country_ids } = req.query;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let query: string;
    let queryParams: any[] = [];

    if (userRole === UserRole.ADMIN || userRole === UserRole.COMMERCIAL) {
      // ADMIN and COMMERCIAL: Can see all locations, optionally filtered by country_ids
      let userCountryIds: number[] = [];

      if (country_ids) {
        if (Array.isArray(country_ids)) {
          userCountryIds = country_ids.map(id => parseInt(id as string));
        } else {
          userCountryIds = [parseInt(country_ids as string)];
        }
      }

      if (userCountryIds.length > 0) {
        query = `
          SELECT
            l.id,
            l.cod,
            l.name,
            COALESCE(
              JSON_AGG(
                CASE WHEN c.id IS NOT NULL
                THEN JSON_BUILD_OBJECT('id', c.id, 'cod', c.cod, 'name', c.name)
                ELSE NULL END
              ) FILTER (WHERE c.id IS NOT NULL),
              '[]'
            ) as countries
          FROM locations l
          LEFT JOIN location_countries lc ON l.id = lc.location_id
          LEFT JOIN countries c ON lc.country_id = c.id
          WHERE l.id IN (
            SELECT DISTINCT location_id
            FROM location_countries
            WHERE country_id = ANY($1)
          )
          GROUP BY l.id, l.cod, l.name
          ORDER BY l.id ASC
        `;
        queryParams = [userCountryIds];
      } else {
        query = `
          SELECT
            l.id,
            l.cod,
            l.name,
            COALESCE(
              JSON_AGG(
                CASE WHEN c.id IS NOT NULL
                THEN JSON_BUILD_OBJECT('id', c.id, 'cod', c.cod, 'name', c.name)
                ELSE NULL END
              ) FILTER (WHERE c.id IS NOT NULL),
              '[]'
            ) as countries
          FROM locations l
          LEFT JOIN location_countries lc ON l.id = lc.location_id
          LEFT JOIN countries c ON lc.country_id = c.id
          GROUP BY l.id, l.cod, l.name
          ORDER BY l.id ASC
        `;
      }
    } else {
      // USER role: Only see locations from their assigned countries
      query = `
        SELECT
          l.id,
          l.cod,
          l.name,
          COALESCE(
            JSON_AGG(
              CASE WHEN c.id IS NOT NULL
              THEN JSON_BUILD_OBJECT('id', c.id, 'cod', c.cod, 'name', c.name)
              ELSE NULL END
            ) FILTER (WHERE c.id IS NOT NULL),
            '[]'
          ) as countries
        FROM locations l
        LEFT JOIN location_countries lc ON l.id = lc.location_id
        LEFT JOIN countries c ON lc.country_id = c.id
        WHERE l.id IN (
          SELECT DISTINCT location_id
          FROM location_countries
          WHERE country_id IN (
            SELECT country_id FROM user_countries WHERE user_id = $1
          )
        )
        GROUP BY l.id, l.cod, l.name
        ORDER BY l.id ASC
      `;
      queryParams = [userId];
    }

    const result = await pool.query(query, queryParams);

    res.json({
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error getting locations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createLocation = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { cod, name, country_ids = [] } = req.body;

    await client.query('BEGIN');

    const existingQuery = 'SELECT id FROM locations WHERE cod = $1';
    const existing = await client.query(existingQuery, [cod]);

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ message: 'Location with this code already exists' });
      return;
    }

    const insertQuery = `
      INSERT INTO locations (cod, name)
      VALUES ($1, $2)
      RETURNING id, cod, name
    `;
    const result = await client.query(insertQuery, [cod, name]);
    const locationId = result.rows[0].id;

    // Insert country relationships
    if (country_ids && country_ids.length > 0) {
      for (const countryId of country_ids) {
        await client.query(
          'INSERT INTO location_countries (location_id, country_id) VALUES ($1, $2)',
          [locationId, countryId]
        );
      }
    }

    await client.query('COMMIT');

    // Get the created location with countries
    const locationWithCountries = await pool.query(`
      SELECT
        l.id,
        l.cod,
        l.name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', c.id, 'cod', c.cod, 'name', c.name)
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) as countries
      FROM locations l
      LEFT JOIN location_countries lc ON l.id = lc.location_id
      LEFT JOIN countries c ON lc.country_id = c.id
      WHERE l.id = $1
      GROUP BY l.id, l.cod, l.name
    `, [locationId]);

    res.status(201).json({
      message: 'Location created successfully',
      data: locationWithCountries.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating location:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const updateLocation = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { cod, name, country_ids } = req.body;

    await client.query('BEGIN');

    const existingQuery = 'SELECT * FROM locations WHERE id = $1';
    const existing = await client.query(existingQuery, [id]);

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ message: 'Location not found' });
      return;
    }

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (cod !== undefined) {
      const codeQuery = 'SELECT id FROM locations WHERE cod = $1 AND id != $2';
      const codeCheck = await client.query(codeQuery, [cod, id]);
      if (codeCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: 'Location with this code already exists' });
        return;
      }
      updateFields.push(`cod = $${paramIndex++}`);
      updateValues.push(cod);
    }
    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name);
    }

    if (updateFields.length > 0) {
      updateValues.push(id);
      const updateQuery = `
        UPDATE locations
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
      `;
      await client.query(updateQuery, updateValues);
    }

    // Update country relationships if provided
    if (country_ids !== undefined) {
      // Delete existing relationships
      await client.query('DELETE FROM location_countries WHERE location_id = $1', [id]);

      // Insert new relationships
      if (country_ids && country_ids.length > 0) {
        for (const countryId of country_ids) {
          await client.query(
            'INSERT INTO location_countries (location_id, country_id) VALUES ($1, $2)',
            [id, countryId]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Get the updated location with countries
    const locationWithCountries = await pool.query(`
      SELECT
        l.id,
        l.cod,
        l.name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', c.id, 'cod', c.cod, 'name', c.name)
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) as countries
      FROM locations l
      LEFT JOIN location_countries lc ON l.id = lc.location_id
      LEFT JOIN countries c ON lc.country_id = c.id
      WHERE l.id = $1
      GROUP BY l.id, l.cod, l.name
    `, [id]);

    res.json({
      message: 'Location updated successfully',
      data: locationWithCountries.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const deleteLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existingQuery = 'SELECT * FROM locations WHERE id = $1';
    const existing = await pool.query(existingQuery, [id]);

    if (existing.rows.length === 0) {
      res.status(404).json({ message: 'Location not found' });
      return;
    }

    const deleteQuery = 'DELETE FROM locations WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};