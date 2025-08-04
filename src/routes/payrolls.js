const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { getPaginationParams, createPaginationResponse } = require('../utils/pagination');

// Middleware de autenticação
const authMiddleware = require('../middleware/auth');

// GET /api/payrolls - Listar folhas de pagamento da empresa
router.get('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { 
      month, 
      year, 
      employee_id, 
      status = 'all',
      department 
    } = req.query;
    
    const { page, limit, offset } = getPaginationParams(req.query);
    const companyId = req.user.company_id;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Usuário não está associado a uma empresa'
      });
    }

    let whereClause = 'WHERE p.company_id = $1';
    let params = [companyId];
    let paramCount = 1;

    // Filtros
    if (month) {
      paramCount++;
      whereClause += ` AND p.reference_month = $${paramCount}`;
      params.push(parseInt(month));
    }

    if (year) {
      paramCount++;
      whereClause += ` AND p.reference_year = $${paramCount}`;
      params.push(parseInt(year));
    }

    if (employee_id) {
      paramCount++;
      whereClause += ` AND p.employee_id = $${paramCount}`;
      params.push(parseInt(employee_id));
    }

    if (status !== 'all') {
      paramCount++;
      whereClause += ` AND p.status = $${paramCount}`;
      params.push(status);
    }

    if (department) {
      paramCount++;
      whereClause += ` AND e.department = $${paramCount}`;
      params.push(department);
    }

    // Buscar folhas de pagamento com dados do funcionário
    const payrollsQuery = `
      SELECT 
        p.id, p.employee_id, p.reference_month, p.reference_year,
        p.base_salary, p.benefits, p.deductions, p.net_salary, 
        p.status, p.payment_date, p.notes, p.created_at, p.updated_at,
        e.name as employee_name, e.department, e.position
      FROM payrolls p
      INNER JOIN employees e ON p.employee_id = e.id
      ${whereClause}
      ORDER BY p.reference_year DESC, p.reference_month DESC, e.name ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);

    const payrolls = await db.query(payrollsQuery, params);

    // Contar total
    const countQuery = `
      SELECT COUNT(*) 
      FROM payrolls p
      INNER JOIN employees e ON p.employee_id = e.id
      ${whereClause}
    `;
    const countParams = params.slice(0, paramCount);
    const totalResult = await db.query(countQuery, countParams);
    const total = parseInt(totalResult.rows[0].count);

    // Criar resposta com paginação padronizada
    const pagination = createPaginationResponse(total, page, limit, 'payrolls');

    res.status(200).json({
      success: true,
      data: {
        payrolls: payrolls.rows,
        pagination
      }
    });
  } catch (error) {
    console.error('Erro ao buscar folhas de pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/payrolls/:id - Buscar folha de pagamento específica
router.get('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const result = await db.query(`
      SELECT 
        p.*, 
        e.name as employee_name, e.email as employee_email,
        e.department, e.position
      FROM payrolls p
      INNER JOIN employees e ON p.employee_id = e.id
      WHERE p.id = $1 AND p.company_id = $2
    `, [id, companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Folha de pagamento não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        payroll: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao buscar folha de pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// POST /api/payrolls - Criar nova folha de pagamento
router.post('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const {
      employee_id, reference_month, reference_year,
      base_salary, benefits = 0, deductions = 0,
      status = 'pendente', payment_date, notes
    } = req.body;

    // Validações básicas
    if (!employee_id || !reference_month || !reference_year || !base_salary) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, mês de referência, ano de referência e salário base são obrigatórios'
      });
    }

    // Verificar se funcionário pertence à empresa
    const employeeCheck = await db.query(
      'SELECT id FROM employees WHERE id = $1 AND company_id = $2',
      [employee_id, companyId]
    );

    if (employeeCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Funcionário não encontrado ou não pertence à empresa'
      });
    }

    // Verificar se já existe folha para este funcionário no mesmo período
    const existingPayroll = await db.query(
      'SELECT id FROM payrolls WHERE employee_id = $1 AND reference_month = $2 AND reference_year = $3',
      [employee_id, reference_month, reference_year]
    );

    if (existingPayroll.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe folha de pagamento para este funcionário neste período'
      });
    }

    // Calcular salário líquido
    const netSalary = parseFloat(base_salary) + parseFloat(benefits) - parseFloat(deductions);

    const result = await db.query(`
      INSERT INTO payrolls (
        company_id, employee_id, reference_month, reference_year,
        base_salary, benefits, deductions, net_salary,
        status, payment_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      companyId, employee_id, reference_month, reference_year,
      base_salary, benefits, deductions, netSalary,
      status, payment_date, notes
    ]);

    res.status(201).json({
      success: true,
      message: 'Folha de pagamento criada com sucesso',
      data: {
        payroll: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao criar folha de pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// PUT /api/payrolls/:id - Atualizar folha de pagamento
router.put('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const {
      base_salary, benefits, deductions, status, payment_date, notes
    } = req.body;

    // Verificar se folha existe e pertence à empresa
    const existingPayroll = await db.query(
      'SELECT id, base_salary, benefits, deductions FROM payrolls WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (existingPayroll.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Folha de pagamento não encontrada'
      });
    }

    const current = existingPayroll.rows[0];

    // Calcular novo salário líquido se valores mudaram
    const newBaseSalary = base_salary !== undefined ? parseFloat(base_salary) : parseFloat(current.base_salary);
    const newBenefits = benefits !== undefined ? parseFloat(benefits) : parseFloat(current.benefits);
    const newDeductions = deductions !== undefined ? parseFloat(deductions) : parseFloat(current.deductions);
    const netSalary = newBaseSalary + newBenefits - newDeductions;

    const result = await db.query(`
      UPDATE payrolls SET
        base_salary = COALESCE($1, base_salary),
        benefits = COALESCE($2, benefits),
        deductions = COALESCE($3, deductions),
        net_salary = $4,
        status = COALESCE($5, status),
        payment_date = COALESCE($6, payment_date),
        notes = COALESCE($7, notes)
      WHERE id = $8 AND company_id = $9
      RETURNING *
    `, [
      base_salary, benefits, deductions, netSalary,
      status, payment_date, notes, id, companyId
    ]);

    res.status(200).json({
      success: true,
      message: 'Folha de pagamento atualizada com sucesso',
      data: {
        payroll: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar folha de pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// PUT /api/payrolls/:id/status - Alterar status da folha de pagamento
router.put('/:id/status', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_date } = req.body;
    const companyId = req.user.company_id;

    // Validar status
    if (!['pendente', 'feito', 'recusado'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido. Use: pendente, feito ou recusado'
      });
    }

    // Se marcando como "feito", definir data de pagamento se não fornecida
    const finalPaymentDate = status === 'feito' && !payment_date ? new Date().toISOString().split('T')[0] : payment_date;

    const result = await db.query(
      'UPDATE payrolls SET status = $1, payment_date = $2 WHERE id = $3 AND company_id = $4 RETURNING *',
      [status, finalPaymentDate, id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Folha de pagamento não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: `Status da folha alterado para: ${status}`,
      data: {
        payroll: result.rows[0]
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

// POST /api/payrolls/bulk - Gerar folhas em lote para um mês
router.post('/bulk', authMiddleware.verifyToken, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { reference_month, reference_year, employee_ids } = req.body;

    if (!reference_month || !reference_year) {
      return res.status(400).json({
        success: false,
        message: 'Mês e ano de referência são obrigatórios'
      });
    }

    // Se não especificou funcionários, pegar todos os ativos da empresa
    let employeesToProcess;
    if (employee_ids && employee_ids.length > 0) {
      const employeeCheck = await db.query(
        'SELECT id, salary FROM employees WHERE id = ANY($1) AND company_id = $2 AND status = $3',
        [employee_ids, companyId, 'active']
      );
      employeesToProcess = employeeCheck.rows;
    } else {
      const allEmployees = await db.query(
        'SELECT id, salary FROM employees WHERE company_id = $1 AND status = $2',
        [companyId, 'active']
      );
      employeesToProcess = allEmployees.rows;
    }

    if (employeesToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum funcionário ativo encontrado'
      });
    }

    const createdPayrolls = [];
    const errors = [];

    // Processar cada funcionário
    for (const employee of employeesToProcess) {
      try {
        // Verificar se já existe folha para este período
        const existing = await db.query(
          'SELECT id FROM payrolls WHERE employee_id = $1 AND reference_month = $2 AND reference_year = $3',
          [employee.id, reference_month, reference_year]
        );

        if (existing.rows.length === 0) {
          const baseSalary = parseFloat(employee.salary);
          const benefits = baseSalary * 0.1; // 10% de benefícios
          const deductions = baseSalary * 0.15; // 15% de descontos
          const netSalary = baseSalary + benefits - deductions;

          const result = await db.query(`
            INSERT INTO payrolls (
              company_id, employee_id, reference_month, reference_year,
              base_salary, benefits, deductions, net_salary, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
          `, [
            companyId, employee.id, reference_month, reference_year,
            baseSalary, benefits, deductions, netSalary, 'pendente'
          ]);

          createdPayrolls.push(result.rows[0]);
        }
      } catch (error) {
        errors.push({
          employee_id: employee.id,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdPayrolls.length} folhas de pagamento criadas com sucesso`,
      data: {
        created_payrolls: createdPayrolls,
        errors: errors
      }
    });
  } catch (error) {
    console.error('Erro ao criar folhas em lote:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// DELETE /api/payrolls/:id - Remover folha de pagamento
router.delete('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const result = await db.query(
      'DELETE FROM payrolls WHERE id = $1 AND company_id = $2 RETURNING *',
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Folha de pagamento não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Folha de pagamento removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover folha de pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/payrolls/stats/dashboard - Estatísticas para dashboard
router.get('/stats/dashboard', authMiddleware.verifyToken, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { year = new Date().getFullYear() } = req.query;

    // Total de folhas no ano
    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM payrolls WHERE company_id = $1 AND reference_year = $2',
      [companyId, year]
    );

    // Folhas por status
    const statusResult = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM payrolls 
      WHERE company_id = $1 AND reference_year = $2
      GROUP BY status
    `, [companyId, year]);

    // Total pago no ano
    const totalPaidResult = await db.query(
      'SELECT SUM(net_salary) as total_paid FROM payrolls WHERE company_id = $1 AND reference_year = $2 AND status = $3',
      [companyId, year, 'feito']
    );

    // Total pendente
    const totalPendingResult = await db.query(
      'SELECT SUM(net_salary) as total_pending FROM payrolls WHERE company_id = $1 AND reference_year = $2 AND status = $3',
      [companyId, year, 'pendente']
    );

    // Folhas por mês
    const monthlyResult = await db.query(`
      SELECT 
        reference_month,
        COUNT(*) as payrolls_count,
        SUM(net_salary) as total_amount,
        SUM(CASE WHEN status = 'feito' THEN net_salary ELSE 0 END) as paid_amount
      FROM payrolls 
      WHERE company_id = $1 AND reference_year = $2
      GROUP BY reference_month 
      ORDER BY reference_month ASC
    `, [companyId, year]);

    // Top 5 maiores salários
    const topSalariesResult = await db.query(`
      SELECT 
        e.name as employee_name,
        p.net_salary,
        p.reference_month,
        e.department
      FROM payrolls p
      INNER JOIN employees e ON p.employee_id = e.id
      WHERE p.company_id = $1 AND p.reference_year = $2
      ORDER BY p.net_salary DESC 
      LIMIT 5
    `, [companyId, year]);

    res.status(200).json({
      success: true,
      data: {
        total_payrolls: parseInt(totalResult.rows[0].total),
        by_status: statusResult.rows,
        total_paid: parseFloat(totalPaidResult.rows[0].total_paid || 0),
        total_pending: parseFloat(totalPendingResult.rows[0].total_pending || 0),
        monthly_breakdown: monthlyResult.rows,
        top_salaries: topSalariesResult.rows,
        year: parseInt(year)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de folha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;
