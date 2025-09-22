import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { UserRole } from '../types';

export const getUsersValidation = [];

export const createUserValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('full_name').isLength({ min: 1 }),
  body('role').isIn(Object.values(UserRole))
];

export const updateUserValidation = [
  body('email').optional().isEmail().normalizeEmail(),
  body('full_name').optional().isLength({ min: 1 }),
  body('role').optional().isIn(Object.values(UserRole)),
  body('is_active').optional().isBoolean()
];

export const changePasswordValidation = [
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/(?=.*[a-z])/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/(?=.*[A-Z])/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/(?=.*\d)/)
    .withMessage('Password must contain at least one number')
];

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM users';
    const countResult = await pool.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get users with their assigned countries
    const usersQuery = `
      SELECT
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.is_active,
        u.created_at,
        u.updated_at,
        COALESCE(
          JSON_AGG(
            CASE
              WHEN c.id IS NOT NULL THEN JSON_BUILD_OBJECT('id', c.id, 'cod', c.cod, 'name', c.name)
              ELSE NULL
            END
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) AS countries
      FROM users u
      LEFT JOIN user_countries uc ON u.id = uc.user_id
      LEFT JOIN countries c ON uc.country_id = c.id
      GROUP BY u.id, u.email, u.full_name, u.role, u.is_active, u.created_at, u.updated_at
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const usersResult = await pool.query(usersQuery, [limit, offset]);

    // Parse countries JSON for each user
    const users = usersResult.rows.map(user => ({
      ...user,
      countries: user.countries || [],
      has_transactions: false, // TODO: implement when you have transaction tables
      last_login: null // TODO: implement when you have login tracking
    }));

    res.json({
      data: users,
      count: totalCount,
      page,
      pages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, full_name, role, country_ids = [], is_active = true } = req.body;

    // Check if user already exists
    const existingUserQuery = 'SELECT id FROM users WHERE email = $1';
    const existingUser = await client.query(existingUserQuery, [email]);

    if (existingUser.rows.length > 0) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    // For non-ADMIN users, validate that countries are provided
    if (role !== UserRole.ADMIN && (!country_ids || country_ids.length === 0)) {
      res.status(400).json({ message: 'Non-admin users must have at least one country assigned' });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const insertQuery = `
      INSERT INTO users (email, full_name, hashed_password, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, full_name, role, is_active
    `;
    const newUser = await client.query(insertQuery, [
      email,
      full_name,
      hashedPassword,
      role,
      is_active
    ]);

    const userId = newUser.rows[0].id;

    // Assign countries (only for non-ADMIN users)
    if (role !== UserRole.ADMIN && country_ids && country_ids.length > 0) {
      for (const countryId of country_ids) {
        await client.query(
          'INSERT INTO user_countries (user_id, country_id) VALUES ($1, $2)',
          [userId, countryId]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'User created successfully',
      user: {
        ...newUser.rows[0],
        countries: role === UserRole.ADMIN ? [] : country_ids.map((id: number) => ({ id }))
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { email, full_name, role, is_active, password, country_ids } = req.body;

    // Check if user exists
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await client.query(userQuery, [id]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const currentUser = userResult.rows[0];

    // For non-ADMIN users, validate that countries are provided
    const newRole = role !== undefined ? role : currentUser.role;
    if (newRole !== UserRole.ADMIN && country_ids !== undefined && (!country_ids || country_ids.length === 0)) {
      res.status(400).json({ message: 'Non-admin users must have at least one country assigned' });
      return;
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(email);
    }
    if (full_name !== undefined) {
      updateFields.push(`full_name = $${paramIndex++}`);
      updateValues.push(full_name);
    }
    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`);
      updateValues.push(role);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(is_active);
    }
    if (password !== undefined) {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateFields.push(`hashed_password = $${paramIndex++}`);
      updateValues.push(hashedPassword);
    }

    updateValues.push(id);

    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, full_name, role, is_active
    `;

    const updatedUser = await client.query(updateQuery, updateValues);

    // Update country assignments if provided
    if (country_ids !== undefined) {
      // Remove existing country assignments
      await client.query('DELETE FROM user_countries WHERE user_id = $1', [id]);

      // Add new country assignments (only for non-ADMIN users)
      if (newRole !== UserRole.ADMIN && country_ids.length > 0) {
        for (const countryId of country_ids) {
          await client.query(
            'INSERT INTO user_countries (user_id, country_id) VALUES ($1, $2)',
            [id, countryId]
          );
        }
      }
    }

    await client.query('COMMIT');

    res.json({
      message: 'User updated successfully',
      user: {
        ...updatedUser.rows[0],
        countries: newRole === UserRole.ADMIN ? [] : (country_ids || []).map((id: number) => ({ id }))
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [id]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Delete user
    const deleteQuery = 'DELETE FROM users WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_users,
        COUNT(*) FILTER (WHERE role = '${UserRole.ADMIN}') as admin_users,
        COUNT(*) FILTER (WHERE role = '${UserRole.USER}') as regular_users,
        COUNT(*) FILTER (WHERE role = '${UserRole.COMMERCIAL}') as commercial_users
      FROM users
    `;

    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];

    res.json({
      total_users: parseInt(stats.total_users),
      active_users: parseInt(stats.active_users),
      inactive_users: parseInt(stats.inactive_users),
      users_by_role: {
        [UserRole.ADMIN]: parseInt(stats.admin_users),
        [UserRole.USER]: parseInt(stats.regular_users),
        [UserRole.COMMERCIAL]: parseInt(stats.commercial_users),
      }
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const changeUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        message: 'Validation error',
        errors: errors.array()
      });
      return;
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    // Check if user exists
    const userQuery = 'SELECT id, email, full_name FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [id]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const user = userResult.rows[0];

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    const updateQuery = `
      UPDATE users
      SET hashed_password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await pool.query(updateQuery, [hashedPassword, id]);

    // Log the password change for security audit
    console.log(`Password changed for user: ${user.email} (ID: ${user.id}) at ${new Date().toISOString()}`);

    res.json({
      message: 'Password changed successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      }
    });
  } catch (error) {
    console.error('Error changing user password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};