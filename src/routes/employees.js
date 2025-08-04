const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { getPaginationParams, createPaginationResponse } = require('../utils/pagination');

// Middleware de autenticação (será implementado depois)
const authMiddleware = require('../middleware/auth');

// GET /api/employees - Listar funcionários da empresa
router.get('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { search = '', department = '', status = 'active' } = req.query;
    const { page, limit, offset } = getPaginationParams(req.query);
    const companyId = req.user.company_id; // Vem do middleware de auth
    
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
      whereClause += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (department) {
      paramCount++;
      whereClause += ` AND department = $${paramCount}`;
      params.push(department);
    }

    if (status && status !== 'all') {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
    }

    // Buscar funcionários
    const employeesQuery = `
      SELECT id, name, email, department, position, salary, status, on_vacation,
             hire_date, phone, created_at, updated_at
      FROM employees 
      ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const employees = await db.query(employeesQuery, params);

    // Contar total
    const countQuery = `SELECT COUNT(*) FROM employees ${whereClause}`;
    const countParams = params.slice(0, paramCount);
    const totalResult = await db.query(countQuery, countParams);
    const total = parseInt(totalResult.rows[0].count);

    // Criar resposta com paginação padronizada
    const pagination = createPaginationResponse(total, page, limit, 'employees');

    res.status(200).json({
      success: true,
      data: {
        employees: employees.rows,
        pagination
      }
    });
  } catch (error) {
    console.error('Erro ao buscar funcionários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/employees/:id - Buscar funcionário específico
router.get('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const result = await db.query(
      'SELECT * FROM employees WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        employee: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao buscar funcionário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// POST /api/employees - Criar novo funcionário
router.post('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const {
      name, email, department, position, salary, status = 'active',
      hire_date, birth_date, phone, address, city, state, zip_code,
      emergency_contact_name, emergency_contact_phone
    } = req.body;

    // Validações básicas
    if (!name || !email || !department || !position || !salary) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email, departamento, cargo e salário são obrigatórios'
      });
    }

    // Verificar se email já existe na empresa
    const existingEmployee = await db.query(
      'SELECT id FROM employees WHERE email = $1 AND company_id = $2',
      [email, companyId]
    );

    if (existingEmployee.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um funcionário com este email na empresa'
      });
    }

    const result = await db.query(`
      INSERT INTO employees (
        company_id, name, email, department, position, salary, status,
        hire_date, birth_date, phone, address, city, state, zip_code,
        emergency_contact_name, emergency_contact_phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      companyId, name, email, department, position, salary, status,
      hire_date, birth_date, phone, address, city, state, zip_code,
      emergency_contact_name, emergency_contact_phone
    ]);

    res.status(201).json({
      success: true,
      message: 'Funcionário criado com sucesso',
      data: {
        employee: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao criar funcionário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// PUT /api/employees/:id - Atualizar funcionário
router.put('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const {
      name, email, department, position, salary, status,
      hire_date, termination_date, birth_date, phone, address, city, state, zip_code,
      emergency_contact_name, emergency_contact_phone
    } = req.body;

    // Verificar se funcionário existe e pertence à empresa
    const existingEmployee = await db.query(
      'SELECT id FROM employees WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (existingEmployee.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado'
      });
    }

    // Verificar se novo email já existe (se fornecido)
    if (email) {
      const emailCheck = await db.query(
        'SELECT id FROM employees WHERE email = $1 AND company_id = $2 AND id != $3',
        [email, companyId, id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Já existe um funcionário com este email na empresa'
        });
      }
    }

    const result = await db.query(`
      UPDATE employees SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        department = COALESCE($3, department),
        position = COALESCE($4, position),
        salary = COALESCE($5, salary),
        status = COALESCE($6, status),
        hire_date = COALESCE($7, hire_date),
        termination_date = COALESCE($8, termination_date),
        birth_date = COALESCE($9, birth_date),
        phone = COALESCE($10, phone),
        address = COALESCE($11, address),
        city = COALESCE($12, city),
        state = COALESCE($13, state),
        zip_code = COALESCE($14, zip_code),
        emergency_contact_name = COALESCE($15, emergency_contact_name),
        emergency_contact_phone = COALESCE($16, emergency_contact_phone)
      WHERE id = $17 AND company_id = $18
      RETURNING *
    `, [
      name, email, department, position, salary, status,
      hire_date, termination_date, birth_date, phone, address, city, state, zip_code,
      emergency_contact_name, emergency_contact_phone, id, companyId
    ]);

    res.status(200).json({
      success: true,
      message: 'Funcionário atualizado com sucesso',
      data: {
        employee: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar funcionário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// PUT /api/employees/:id/vacation - Definir status de férias
router.put('/:id/vacation', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { on_vacation } = req.body;
    const companyId = req.user.company_id;

    const result = await db.query(
      'UPDATE employees SET on_vacation = $1 WHERE id = $2 AND company_id = $3 RETURNING *',
      [on_vacation, id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: `Status de férias ${on_vacation ? 'ativado' : 'desativado'} com sucesso`,
      data: {
        employee: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar férias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// DELETE /api/employees/:id - Remover funcionário
router.delete('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const result = await db.query(
      'DELETE FROM employees WHERE id = $1 AND company_id = $2 RETURNING *',
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Funcionário removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover funcionário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/employees/stats/dashboard - Estatísticas para dashboard
router.get('/stats/dashboard', authMiddleware.verifyToken, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    // Total de funcionários
    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM employees WHERE company_id = $1',
      [companyId]
    );

    // Funcionários ativos
    const activeResult = await db.query(
      'SELECT COUNT(*) as active FROM employees WHERE company_id = $1 AND status = $2',
      [companyId, 'active']
    );

    // Funcionários de férias
    const vacationResult = await db.query(
      'SELECT COUNT(*) as on_vacation FROM employees WHERE company_id = $1 AND on_vacation = true',
      [companyId]
    );

    // Funcionários por departamento
    const departmentResult = await db.query(
      'SELECT department, COUNT(*) as count FROM employees WHERE company_id = $1 GROUP BY department ORDER BY count DESC',
      [companyId]
    );

    // Média salarial
    const salaryResult = await db.query(
      'SELECT AVG(salary) as avg_salary FROM employees WHERE company_id = $1 AND status = $2',
      [companyId, 'active']
    );

    res.status(200).json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].total),
        active: parseInt(activeResult.rows[0].active),
        on_vacation: parseInt(vacationResult.rows[0].on_vacation),
        by_department: departmentResult.rows,
        average_salary: parseFloat(salaryResult.rows[0].avg_salary || 0)
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
