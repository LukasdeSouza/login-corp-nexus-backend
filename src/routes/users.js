const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { getPaginationParams, createPaginationResponse } = require('../utils/pagination');

// Middleware de autenticação
const authMiddleware = require('../middleware/auth');

// GET /api/users - Listar usuários da empresa (apenas ADMINISTRADOR ou RH)
router.get('/', authMiddleware.verifyToken, authMiddleware.requireRole(['ADMINISTRADOR', 'RH']), async (req, res) => {
  try {
    const { search = '', role = 'all', status = 'all' } = req.query;
    const { page, limit, offset } = getPaginationParams(req.query);
    const companyId = req.user.company_id;
    
    let whereClause = 'WHERE u.company_id = $1';
    let params = [companyId];
    let paramCount = 1;

    // Filtros
    if (search) {
      paramCount++;
      whereClause += ` AND (u.email ILIKE $${paramCount} OR e.name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (role !== 'all') {
      paramCount++;
      whereClause += ` AND u.role = $${paramCount}`;
      params.push(role);
    }

    if (status !== 'all') {
      paramCount++;
      whereClause += ` AND u.is_active = $${paramCount}`;
      params.push(status === 'active');
    }

    // Buscar usuários com dados do funcionário (se houver)
    const usersQuery = `
      SELECT 
        u.id, u.email, u.role, u.is_active, u.email_verified, 
        u.last_login, u.created_at, u.updated_at,
        e.id as employee_id, e.name as employee_name, 
        e.department, e.position, e.phone
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const users = await db.query(usersQuery, params);

    // Contar total
    const countQuery = `
      SELECT COUNT(*) 
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      ${whereClause}
    `;
    const countParams = params.slice(0, paramCount);
    const totalResult = await db.query(countQuery, countParams);
    const total = parseInt(totalResult.rows[0].count);

    // Criar resposta com paginação padronizada
    const pagination = createPaginationResponse(total, page, limit, 'users');

    res.status(200).json({
      success: true,
      data: {
        users: users.rows,
        pagination
      }
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/users/profile - Perfil do usuário logado
router.get('/profile', authMiddleware.verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.query(`
      SELECT 
        u.id, u.email, u.role, u.is_active, u.email_verified, 
        u.last_login, u.created_at,
        e.id as employee_id, e.name, e.email as employee_email,
        e.department, e.position, e.phone, e.hire_date,
        c.name as company_name
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = result.rows[0];

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          email_verified: user.email_verified,
          last_login: user.last_login,
          created_at: user.created_at,
          company_name: user.company_name,
          employee: user.employee_id ? {
            id: user.employee_id,
            name: user.name,
            email: user.employee_email,
            department: user.department,
            position: user.position,
            phone: user.phone,
            hire_date: user.hire_date
          } : null
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// POST /api/users - Criar novo usuário (apenas ADMINISTRADOR)
router.post('/', authMiddleware.verifyToken, authMiddleware.requireRole(['ADMINISTRADOR']), async (req, res) => {
  try {
    const { email, password, role, employee_id } = req.body;
    const companyId = req.user.company_id;

    // Validações
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, senha e role são obrigatórios'
      });
    }

    if (!['ADMINISTRADOR', 'GERENTE', 'FUNCIONARIO', 'RH', 'FINANCEIRO'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role inválido'
      });
    }

    // Verificar se email já existe
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email já está em uso'
      });
    }

    // Se employee_id foi fornecido, verificar se existe e pertence à empresa
    if (employee_id) {
      const employee = await db.query(
        'SELECT id, name, user_id FROM employees WHERE id = $1 AND company_id = $2',
        [employee_id, companyId]
      );

      if (employee.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Funcionário não encontrado'
        });
      }

      if (employee.rows[0].user_id) {
        return res.status(400).json({
          success: false,
          message: 'Funcionário já possui usuário associado'
        });
      }
    }

    // Hash da senha
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Criar usuário
    const userResult = await db.query(`
      INSERT INTO users (email, password_hash, role, company_id, employee_id, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, email, role, is_active, created_at
    `, [email, passwordHash, role, companyId, employee_id || null]);

    const newUser = userResult.rows[0];

    // Se foi associado a um funcionário, atualizar a referência bidirecional
    if (employee_id) {
      await db.query(
        'UPDATE employees SET user_id = $1 WHERE id = $2',
        [newUser.id, employee_id]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          is_active: newUser.is_active,
          created_at: newUser.created_at,
          employee_id: employee_id || null
        }
      }
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// PUT /api/users/:id - Atualizar usuário (apenas ADMINISTRADOR)
router.put('/:id', authMiddleware.verifyToken, authMiddleware.requireRole(['ADMINISTRADOR']), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, is_active, employee_id } = req.body;
    const companyId = req.user.company_id;

    // Verificar se usuário existe e pertence à empresa
    const user = await db.query(
      'SELECT id, email, employee_id FROM users WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const currentUser = user.rows[0];
    const updates = [];
    const values = [];
    let paramCount = 0;

    // Email
    if (email && email !== currentUser.email) {
      const existingEmail = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (existingEmail.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email já está em uso'
        });
      }
      paramCount++;
      updates.push(`email = $${paramCount}`);
      values.push(email);
    }

    // Role
    if (role && ['ADMINISTRADOR', 'GERENTE', 'FUNCIONARIO', 'RH', 'FINANCEIRO'].includes(role)) {
      paramCount++;
      updates.push(`role = $${paramCount}`);
      values.push(role);
    }

    // Status
    if (typeof is_active === 'boolean') {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
    }

    // Employee ID
    if (employee_id !== undefined) {
      if (employee_id && employee_id !== currentUser.employee_id) {
        // Verificar se funcionário existe
        const employee = await db.query(
          'SELECT id, user_id FROM employees WHERE id = $1 AND company_id = $2',
          [employee_id, companyId]
        );

        if (employee.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Funcionário não encontrado'
          });
        }

        if (employee.rows[0].user_id && employee.rows[0].user_id !== parseInt(id)) {
          return res.status(400).json({
            success: false,
            message: 'Funcionário já possui outro usuário associado'
          });
        }
      }

      paramCount++;
      updates.push(`employee_id = $${paramCount}`);
      values.push(employee_id || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma alteração fornecida'
      });
    }

    // Atualizar usuário
    paramCount++;
    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, email, role, is_active, employee_id, updated_at
    `;
    values.push(id);

    const result = await db.query(updateQuery, values);

    // Atualizar referências bidirecionais
    if (employee_id !== undefined) {
      // Remover referência do funcionário anterior
      if (currentUser.employee_id) {
        await db.query('UPDATE employees SET user_id = NULL WHERE id = $1', [currentUser.employee_id]);
      }
      
      // Adicionar referência do novo funcionário
      if (employee_id) {
        await db.query('UPDATE employees SET user_id = $1 WHERE id = $2', [id, employee_id]);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: {
        user: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// PUT /api/users/change-password - Alterar própria senha
router.put('/change-password', authMiddleware.verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Nova senha deve ter pelo menos 6 caracteres'
      });
    }

    // Buscar usuário com senha atual
    const user = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    
    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar senha atual
    const validPassword = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
    if (!validPassword) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    // Hash da nova senha
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Atualizar senha
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.status(200).json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// DELETE /api/users/:id - Desativar usuário (apenas ADMINISTRADOR)
router.delete('/:id', authMiddleware.verifyToken, authMiddleware.requireRole(['ADMINISTRADOR']), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    // Verificar se usuário existe
    const user = await db.query(
      'SELECT id, employee_id FROM users WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Desativar usuário (soft delete)
    await db.query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Remover referência do funcionário
    if (user.rows[0].employee_id) {
      await db.query('UPDATE employees SET user_id = NULL WHERE id = $1', [user.rows[0].employee_id]);
    }

    res.status(200).json({
      success: true,
      message: 'Usuário desativado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;
