const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { getPaginationParams, createPaginationResponse } = require('../utils/pagination');

// Middleware de autenticação
const authMiddleware = require('../middleware/auth');

// GET /api/companies - Listar empresas (apenas super admin)
router.get('/', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin']), async (req, res) => {
  try {
    const { search = '' } = req.query;
    const { page, limit, offset } = getPaginationParams(req.query);
    
    let whereClause = '';
    let params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause = `WHERE name ILIKE $${paramCount} OR email ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    const companiesQuery = `
      SELECT id, name, email, cnpj, phone, city, state, subscription_plan, is_active, created_at
      FROM companies 
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const companies = await db.query(companiesQuery, params);

    // Contar total
    const countQuery = `SELECT COUNT(*) FROM companies ${whereClause}`;
    const countParams = params.slice(0, paramCount);
    const totalResult = await db.query(countQuery, countParams);
    const total = parseInt(totalResult.rows[0].count);

    // Criar resposta com paginação padronizada
    const pagination = createPaginationResponse(total, page, limit, 'companies');

    res.status(200).json({
      success: true,
      data: {
        companies: companies.rows,
        pagination
      }
    });
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/companies/my - Dados da empresa do usuário logado
router.get('/my', authMiddleware.verifyToken, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Usuário não está associado a uma empresa'
      });
    }

    const result = await db.query(
      'SELECT * FROM companies WHERE id = $1',
      [companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        company: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// POST /api/companies - Criar nova empresa
router.post('/', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin']), async (req, res) => {
  try {
    const {
      name, email, cnpj, phone, address, city, state, zip_code,
      country = 'Brasil', subscription_plan = 'basic'
    } = req.body;

    // Validações básicas
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nome e email são obrigatórios'
      });
    }

    // Verificar se email já existe
    const existingCompany = await db.query(
      'SELECT id FROM companies WHERE email = $1',
      [email]
    );

    if (existingCompany.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma empresa com este email'
      });
    }

    // Verificar CNPJ se fornecido
    if (cnpj) {
      const existingCnpj = await db.query(
        'SELECT id FROM companies WHERE cnpj = $1',
        [cnpj]
      );

      if (existingCnpj.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe uma empresa com este CNPJ'
        });
      }
    }

    const result = await db.query(`
      INSERT INTO companies (
        name, email, cnpj, phone, address, city, state, zip_code, country, subscription_plan
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [name, email, cnpj, phone, address, city, state, zip_code, country, subscription_plan]);

    res.status(201).json({
      success: true,
      message: 'Empresa criada com sucesso',
      data: {
        company: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// PUT /api/companies/:id - Atualizar empresa
router.put('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, cnpj, phone, address, city, state, zip_code,
      country, subscription_plan
    } = req.body;

    // Verificar permissões
    const userCompanyId = req.user.company_id;
    const userRole = req.user.role;

    // Super admin pode editar qualquer empresa
    // Company admin só pode editar sua própria empresa
    if (userRole !== 'super_admin' && userCompanyId != id) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para editar esta empresa'
      });
    }

    // Verificar se empresa existe
    const existingCompany = await db.query(
      'SELECT id FROM companies WHERE id = $1',
      [id]
    );

    if (existingCompany.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    // Verificar email único (se fornecido)
    if (email) {
      const emailCheck = await db.query(
        'SELECT id FROM companies WHERE email = $1 AND id != $2',
        [email, id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe uma empresa com este email'
        });
      }
    }

    // Verificar CNPJ único (se fornecido)
    if (cnpj) {
      const cnpjCheck = await db.query(
        'SELECT id FROM companies WHERE cnpj = $1 AND id != $2',
        [cnpj, id]
      );

      if (cnpjCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe uma empresa com este CNPJ'
        });
      }
    }

    const result = await db.query(`
      UPDATE companies SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        cnpj = COALESCE($3, cnpj),
        phone = COALESCE($4, phone),
        address = COALESCE($5, address),
        city = COALESCE($6, city),
        state = COALESCE($7, state),
        zip_code = COALESCE($8, zip_code),
        country = COALESCE($9, country),
        subscription_plan = COALESCE($10, subscription_plan)
      WHERE id = $11
      RETURNING *
    `, [name, email, cnpj, phone, address, city, state, zip_code, country, subscription_plan, id]);

    res.status(200).json({
      success: true,
      message: 'Empresa atualizada com sucesso',
      data: {
        company: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/companies/:id/departments - Listar departamentos da empresa
router.get('/:id/departments', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userCompanyId = req.user.company_id;
    const userRole = req.user.role;

    // Verificar permissões
    if (userRole !== 'super_admin' && userCompanyId != id) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para acessar esta empresa'
      });
    }

    const result = await db.query(
      'SELECT * FROM departments WHERE company_id = $1 ORDER BY name ASC',
      [id]
    );

    res.status(200).json({
      success: true,
      data: {
        departments: result.rows
      }
    });
  } catch (error) {
    console.error('Erro ao buscar departamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/companies/stats/dashboard - Estatísticas gerais (super admin)
router.get('/stats/dashboard', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin']), async (req, res) => {
  try {
    // Total de empresas
    const totalResult = await db.query('SELECT COUNT(*) as total FROM companies');

    // Empresas ativas
    const activeResult = await db.query('SELECT COUNT(*) as active FROM companies WHERE is_active = true');

    // Por plano
    const planResult = await db.query(`
      SELECT subscription_plan, COUNT(*) as count 
      FROM companies 
      GROUP BY subscription_plan 
      ORDER BY count DESC
    `);

    // Por estado
    const stateResult = await db.query(`
      SELECT state, COUNT(*) as count 
      FROM companies 
      WHERE state IS NOT NULL 
      GROUP BY state 
      ORDER BY count DESC 
      LIMIT 10
    `);

    res.status(200).json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].total),
        active: parseInt(activeResult.rows[0].active),
        by_plan: planResult.rows,
        by_state: stateResult.rows
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;
