const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { getPaginationParams, createPaginationResponse } = require('../utils/pagination');

// Middleware de autenticação
const authMiddleware = require('../middleware/auth');

// GET /api/suppliers - Listar fornecedores da empresa
router.get('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { search = '', category = '', status = 'all' } = req.query;
    const { page, limit, offset } = getPaginationParams(req.query);
    const companyId = req.user.company_id;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Usuário não está associado a uma empresa'
      });
    }

    let whereClause = 'WHERE company_id = $1';
    let params = [companyId];
    let paramCount = 1;

    // Filtros
    if (search) {
      paramCount++;
      whereClause += ` AND (name ILIKE $${paramCount} OR cnpj ILIKE $${paramCount} OR contact_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (status !== 'all') {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status === 'active');
    }

    // Buscar fornecedores
    const suppliersQuery = `
      SELECT id, name, cnpj, contact_name, contact_email, contact_phone,
             category, last_order_date, total_value, status, created_at, updated_at
      FROM suppliers 
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const suppliers = await db.query(suppliersQuery, params);

    // Contar total
    const countQuery = `SELECT COUNT(*) FROM suppliers ${whereClause}`;
    const countParams = params.slice(0, paramCount);
    const totalResult = await db.query(countQuery, countParams);
    const total = parseInt(totalResult.rows[0].count);

    // Criar resposta com paginação padronizada
    const pagination = createPaginationResponse(total, page, limit, 'suppliers');

    res.status(200).json({
      success: true,
      data: {
        suppliers: suppliers.rows,
        pagination
      }
    });
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/suppliers/:id - Buscar fornecedor específico
router.get('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const result = await db.query(
      'SELECT * FROM suppliers WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        supplier: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao buscar fornecedor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// POST /api/suppliers - Criar novo fornecedor
router.post('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const {
      name, cnpj, contact_name, contact_email, contact_phone,
      category, last_order_date, total_value = 0.00, status = true,
      address, city, state, zip_code, notes
    } = req.body;

    // Validações básicas
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Nome e categoria são obrigatórios'
      });
    }

    // Verificar se CNPJ já existe na empresa (se fornecido)
    if (cnpj) {
      const existingSupplier = await db.query(
        'SELECT id FROM suppliers WHERE cnpj = $1 AND company_id = $2',
        [cnpj, companyId]
      );

      if (existingSupplier.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe um fornecedor com este CNPJ na empresa'
        });
      }
    }

    const result = await db.query(`
      INSERT INTO suppliers (
        company_id, name, cnpj, contact_name, contact_email, contact_phone,
        category, last_order_date, total_value, status,
        address, city, state, zip_code, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      companyId, name, cnpj, contact_name, contact_email, contact_phone,
      category, last_order_date, total_value, status,
      address, city, state, zip_code, notes
    ]);

    res.status(201).json({
      success: true,
      message: 'Fornecedor criado com sucesso',
      data: {
        supplier: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao criar fornecedor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// PUT /api/suppliers/:id - Atualizar fornecedor
router.put('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const {
      name, cnpj, contact_name, contact_email, contact_phone,
      category, last_order_date, total_value, status,
      address, city, state, zip_code, notes
    } = req.body;

    // Verificar se fornecedor existe e pertence à empresa
    const existingSupplier = await db.query(
      'SELECT id FROM suppliers WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (existingSupplier.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado'
      });
    }

    // Verificar se novo CNPJ já existe (se fornecido)
    if (cnpj) {
      const cnpjCheck = await db.query(
        'SELECT id FROM suppliers WHERE cnpj = $1 AND company_id = $2 AND id != $3',
        [cnpj, companyId, id]
      );

      if (cnpjCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe um fornecedor com este CNPJ na empresa'
        });
      }
    }

    const result = await db.query(`
      UPDATE suppliers SET
        name = COALESCE($1, name),
        cnpj = COALESCE($2, cnpj),
        contact_name = COALESCE($3, contact_name),
        contact_email = COALESCE($4, contact_email),
        contact_phone = COALESCE($5, contact_phone),
        category = COALESCE($6, category),
        last_order_date = COALESCE($7, last_order_date),
        total_value = COALESCE($8, total_value),
        status = COALESCE($9, status),
        address = COALESCE($10, address),
        city = COALESCE($11, city),
        state = COALESCE($12, state),
        zip_code = COALESCE($13, zip_code),
        notes = COALESCE($14, notes)
      WHERE id = $15 AND company_id = $16
      RETURNING *
    `, [
      name, cnpj, contact_name, contact_email, contact_phone,
      category, last_order_date, total_value, status,
      address, city, state, zip_code, notes, id, companyId
    ]);

    res.status(200).json({
      success: true,
      message: 'Fornecedor atualizado com sucesso',
      data: {
        supplier: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// PUT /api/suppliers/:id/status - Alterar status do fornecedor
router.put('/:id/status', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const companyId = req.user.company_id;

    const result = await db.query(
      'UPDATE suppliers SET status = $1 WHERE id = $2 AND company_id = $3 RETURNING *',
      [status, id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: `Fornecedor ${status ? 'ativado' : 'desativado'} com sucesso`,
      data: {
        supplier: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// PUT /api/suppliers/:id/order - Atualizar último pedido e valor total
router.put('/:id/order', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { last_order_date, order_value } = req.body;
    const companyId = req.user.company_id;

    // Buscar fornecedor atual para somar ao valor total
    const currentSupplier = await db.query(
      'SELECT total_value FROM suppliers WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (currentSupplier.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado'
      });
    }

    const currentTotal = parseFloat(currentSupplier.rows[0].total_value) || 0;
    const newTotal = currentTotal + (parseFloat(order_value) || 0);

    const result = await db.query(`
      UPDATE suppliers SET
        last_order_date = COALESCE($1, last_order_date),
        total_value = $2
      WHERE id = $3 AND company_id = $4
      RETURNING *
    `, [last_order_date, newTotal, id, companyId]);

    res.status(200).json({
      success: true,
      message: 'Pedido registrado com sucesso',
      data: {
        supplier: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao registrar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// DELETE /api/suppliers/:id - Remover fornecedor
router.delete('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const result = await db.query(
      'DELETE FROM suppliers WHERE id = $1 AND company_id = $2 RETURNING *',
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Fornecedor removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover fornecedor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/suppliers/categories/list - Listar categorias únicas
router.get('/categories/list', authMiddleware.verifyToken, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const result = await db.query(
      'SELECT DISTINCT category FROM suppliers WHERE company_id = $1 ORDER BY category ASC',
      [companyId]
    );

    res.status(200).json({
      success: true,
      data: {
        categories: result.rows.map(row => row.category)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/suppliers/stats/dashboard - Estatísticas para dashboard
router.get('/stats/dashboard', authMiddleware.verifyToken, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    // Total de fornecedores
    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM suppliers WHERE company_id = $1',
      [companyId]
    );

    // Fornecedores ativos
    const activeResult = await db.query(
      'SELECT COUNT(*) as active FROM suppliers WHERE company_id = $1 AND status = true',
      [companyId]
    );

    // Fornecedores inativos
    const inactiveResult = await db.query(
      'SELECT COUNT(*) as inactive FROM suppliers WHERE company_id = $1 AND status = false',
      [companyId]
    );

    // Fornecedores por categoria
    const categoryResult = await db.query(
      'SELECT category, COUNT(*) as count FROM suppliers WHERE company_id = $1 GROUP BY category ORDER BY count DESC',
      [companyId]
    );

    // Valor total de negócios
    const totalValueResult = await db.query(
      'SELECT SUM(total_value) as total_business FROM suppliers WHERE company_id = $1 AND status = true',
      [companyId]
    );

    // Últimos pedidos (últimos 30 dias)
    const recentOrdersResult = await db.query(
      'SELECT COUNT(*) as recent_orders FROM suppliers WHERE company_id = $1 AND last_order_date >= CURRENT_DATE - INTERVAL \'30 days\'',
      [companyId]
    );

    // Top 5 fornecedores por valor
    const topSuppliersResult = await db.query(
      'SELECT name, total_value FROM suppliers WHERE company_id = $1 AND status = true ORDER BY total_value DESC LIMIT 5',
      [companyId]
    );

    res.status(200).json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].total),
        active: parseInt(activeResult.rows[0].active),
        inactive: parseInt(inactiveResult.rows[0].inactive),
        by_category: categoryResult.rows,
        total_business_value: parseFloat(totalValueResult.rows[0].total_business || 0),
        recent_orders: parseInt(recentOrdersResult.rows[0].recent_orders),
        top_suppliers: topSuppliersResult.rows
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de fornecedores:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;
