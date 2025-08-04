# Comandos PostgreSQL - Sistema Multi-Tenant de Funcionários

## Estrutura das Tabelas Criadas

### 1. Tabela `companies` (Empresas/Tenants)
```sql
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'Brasil',
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Tabela `employees` (Funcionários)
```sql
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    salary DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'terminated')),
    on_vacation BOOLEAN DEFAULT false,
    hire_date DATE,
    termination_date DATE,
    birth_date DATE,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, email)
);
```

## Comandos Básicos para Funcionários

### 1. Inserir Novo Funcionário
```sql
INSERT INTO employees (
    company_id, name, email, department, position, salary, status, hire_date
) VALUES (
    1, -- ID da empresa
    'João Silva',
    'joao.silva@empresa.com',
    'Tecnologia',
    'Desenvolvedor Senior',
    8500.00,
    'active',
    '2024-01-15'
);
```

### 2. Listar Todos os Funcionários de uma Empresa
```sql
SELECT 
    id, name, email, department, position, salary, status, on_vacation, hire_date
FROM employees 
WHERE company_id = 1 
ORDER BY name ASC;
```

### 3. Buscar Funcionários por Departamento
```sql
SELECT * FROM employees 
WHERE company_id = 1 AND department = 'Tecnologia'
ORDER BY name ASC;
```

### 4. Funcionários de Férias
```sql
SELECT name, email, department, position 
FROM employees 
WHERE company_id = 1 AND on_vacation = true;
```

### 5. Atualizar Salário
```sql
UPDATE employees 
SET salary = 9000.00 
WHERE id = 1 AND company_id = 1;
```

### 6. Colocar Funcionário de Férias
```sql
UPDATE employees 
SET on_vacation = true 
WHERE id = 1 AND company_id = 1;
```

### 7. Alterar Status do Funcionário
```sql
UPDATE employees 
SET status = 'inactive', termination_date = CURRENT_DATE 
WHERE id = 1 AND company_id = 1;
```

### 8. Buscar por Nome ou Email
```sql
SELECT * FROM employees 
WHERE company_id = 1 
AND (name ILIKE '%joão%' OR email ILIKE '%joão%');
```

## Consultas Estatísticas

### 1. Total de Funcionários por Empresa
```sql
SELECT 
    c.name as empresa,
    COUNT(e.id) as total_funcionarios
FROM companies c
LEFT JOIN employees e ON c.id = e.company_id
GROUP BY c.id, c.name
ORDER BY total_funcionarios DESC;
```

### 2. Funcionários por Departamento
```sql
SELECT 
    department,
    COUNT(*) as quantidade,
    AVG(salary) as salario_medio
FROM employees 
WHERE company_id = 1
GROUP BY department 
ORDER BY quantidade DESC;
```

### 3. Funcionários Ativos vs Inativos
```sql
SELECT 
    status,
    COUNT(*) as quantidade
FROM employees 
WHERE company_id = 1
GROUP BY status;
```

### 4. Maiores Salários
```sql
SELECT name, position, salary 
FROM employees 
WHERE company_id = 1 
ORDER BY salary DESC 
LIMIT 10;
```

### 5. Funcionários Contratados por Mês
```sql
SELECT 
    DATE_TRUNC('month', hire_date) as mes,
    COUNT(*) as contratacoes
FROM employees 
WHERE company_id = 1 AND hire_date IS NOT NULL
GROUP BY DATE_TRUNC('month', hire_date)
ORDER BY mes DESC;
```

## Comandos para Departamentos

### 1. Listar Departamentos
```sql
SELECT * FROM departments 
WHERE company_id = 1 
ORDER BY name ASC;
```

### 2. Criar Departamento
```sql
INSERT INTO departments (company_id, name, description) 
VALUES (1, 'Marketing', 'Departamento de marketing e vendas');
```

## Comandos para Fornecedores

### 1. Inserir Novo Fornecedor
```sql
INSERT INTO suppliers (
    company_id, name, cnpj, contact_name, contact_email, contact_phone,
    category, last_order_date, total_value, status
) VALUES (
    1, -- ID da empresa
    'TechSolutions Ltda',
    '11.222.333/0001-44',
    'Roberto Silva',
    'roberto@techsolutions.com',
    '(11) 98888-1234',
    'Tecnologia',
    '2024-07-15',
    45000.00,
    true
);
```

### 2. Listar Todos os Fornecedores de uma Empresa
```sql
SELECT 
    id, name, cnpj, contact_name, contact_email, contact_phone,
    category, last_order_date, total_value, status
FROM suppliers 
WHERE company_id = 1 
ORDER BY name ASC;
```

### 3. Buscar Fornecedores por Categoria
```sql
SELECT * FROM suppliers 
WHERE company_id = 1 AND category = 'Tecnologia'
ORDER BY name ASC;
```

### 4. Fornecedores Ativos
```sql
SELECT name, contact_name, contact_phone, category, total_value 
FROM suppliers 
WHERE company_id = 1 AND status = true
ORDER BY total_value DESC;
```

### 5. Atualizar Valor Total do Fornecedor
```sql
UPDATE suppliers 
SET total_value = 50000.00, last_order_date = CURRENT_DATE 
WHERE id = 1 AND company_id = 1;
```

### 6. Desativar Fornecedor
```sql
UPDATE suppliers 
SET status = false 
WHERE id = 1 AND company_id = 1;
```

### 7. Buscar por Nome, CNPJ ou Contato
```sql
SELECT * FROM suppliers 
WHERE company_id = 1 
AND (name ILIKE '%tech%' OR cnpj ILIKE '%tech%' OR contact_name ILIKE '%roberto%');
```

### 8. Fornecedores com Pedidos Recentes (últimos 30 dias)
```sql
SELECT name, contact_name, last_order_date, total_value 
FROM suppliers 
WHERE company_id = 1 
AND last_order_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY last_order_date DESC;
```

## Consultas Estatísticas de Fornecedores

### 1. Fornecedores por Categoria
```sql
SELECT 
    category,
    COUNT(*) as quantidade,
    SUM(total_value) as valor_total,
    AVG(total_value) as valor_medio
FROM suppliers 
WHERE company_id = 1
GROUP BY category 
ORDER BY valor_total DESC;
```

### 2. Top 10 Fornecedores por Valor
```sql
SELECT name, category, total_value, last_order_date
FROM suppliers 
WHERE company_id = 1 AND status = true
ORDER BY total_value DESC 
LIMIT 10;
```

### 3. Fornecedores Ativos vs Inativos
```sql
SELECT 
    CASE WHEN status THEN 'Ativo' ELSE 'Inativo' END as status,
    COUNT(*) as quantidade,
    SUM(total_value) as valor_total
FROM suppliers 
WHERE company_id = 1
GROUP BY status;
```

### 4. Fornecedores sem Pedidos Recentes (mais de 90 dias)
```sql
SELECT name, contact_name, contact_phone, last_order_date
FROM suppliers 
WHERE company_id = 1 
AND status = true
AND (last_order_date IS NULL OR last_order_date < CURRENT_DATE - INTERVAL '90 days')
ORDER BY last_order_date ASC NULLS FIRST;
```

### 5. Análise Mensal de Pedidos
```sql
SELECT 
    DATE_TRUNC('month', last_order_date) as mes,
    COUNT(*) as total_pedidos,
    COUNT(DISTINCT id) as fornecedores_ativos,
    SUM(total_value) as valor_total
FROM suppliers 
WHERE company_id = 1 
AND last_order_date IS NOT NULL 
AND last_order_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', last_order_date)
ORDER BY mes DESC;
```

## Comandos para Folha de Pagamento

### 1. Inserir Nova Folha de Pagamento
```sql
INSERT INTO payrolls (
    company_id, employee_id, reference_month, reference_year,
    base_salary, benefits, deductions, net_salary, status
) VALUES (
    1, -- ID da empresa
    1, -- ID do funcionário
    8, -- Mês (agosto)
    2024, -- Ano
    8500.00, -- Salário base
    850.00, -- Benefícios
    1275.00, -- Descontos
    8075.00, -- Salário líquido
    'pendente'
);
```

### 2. Listar Folhas de Pagamento de uma Empresa
```sql
SELECT 
    p.id, p.reference_month, p.reference_year,
    p.base_salary, p.benefits, p.deductions, p.net_salary, 
    p.status, p.payment_date,
    e.name as funcionario, e.department
FROM payrolls p
INNER JOIN employees e ON p.employee_id = e.id
WHERE p.company_id = 1 
ORDER BY p.reference_year DESC, p.reference_month DESC;
```

### 3. Folhas por Período Específico
```sql
SELECT 
    e.name as funcionario,
    e.department,
    p.base_salary,
    p.benefits,
    p.deductions,
    p.net_salary,
    p.status
FROM payrolls p
INNER JOIN employees e ON p.employee_id = e.id
WHERE p.company_id = 1 
AND p.reference_month = 8 
AND p.reference_year = 2024;
```

### 4. Folhas Pendentes
```sql
SELECT 
    e.name as funcionario,
    e.department,
    p.reference_month,
    p.reference_year,
    p.net_salary
FROM payrolls p
INNER JOIN employees e ON p.employee_id = e.id
WHERE p.company_id = 1 
AND p.status = 'pendente'
ORDER BY p.reference_year DESC, p.reference_month DESC;
```

### 5. Atualizar Status para Pago
```sql
UPDATE payrolls 
SET status = 'feito', payment_date = CURRENT_DATE 
WHERE id = 1 AND company_id = 1;
```

### 6. Histórico de um Funcionário
```sql
SELECT 
    reference_month,
    reference_year,
    base_salary,
    benefits,
    deductions,
    net_salary,
    status,
    payment_date
FROM payrolls 
WHERE employee_id = 1 
AND company_id = 1
ORDER BY reference_year DESC, reference_month DESC;
```

### 7. Calcular Total Pago por Departamento
```sql
SELECT 
    e.department,
    COUNT(*) as total_folhas,
    SUM(p.net_salary) as total_pago,
    AVG(p.net_salary) as media_salarial
FROM payrolls p
INNER JOIN employees e ON p.employee_id = e.id
WHERE p.company_id = 1 
AND p.status = 'feito'
AND p.reference_year = 2024
GROUP BY e.department
ORDER BY total_pago DESC;
```

## Consultas Estatísticas de Folha de Pagamento

### 1. Resumo Mensal de Pagamentos
```sql
SELECT 
    reference_month,
    reference_year,
    COUNT(*) as total_folhas,
    SUM(CASE WHEN status = 'feito' THEN net_salary ELSE 0 END) as total_pago,
    SUM(CASE WHEN status = 'pendente' THEN net_salary ELSE 0 END) as total_pendente,
    SUM(net_salary) as total_geral
FROM payrolls 
WHERE company_id = 1
GROUP BY reference_year, reference_month
ORDER BY reference_year DESC, reference_month DESC;
```

### 2. Top 10 Maiores Salários
```sql
SELECT 
    e.name as funcionario,
    e.department,
    p.net_salary,
    p.reference_month,
    p.reference_year
FROM payrolls p
INNER JOIN employees e ON p.employee_id = e.id
WHERE p.company_id = 1 
AND p.reference_year = 2024
ORDER BY p.net_salary DESC 
LIMIT 10;
```

### 3. Análise de Status das Folhas
```sql
SELECT 
    status,
    COUNT(*) as quantidade,
    SUM(net_salary) as valor_total,
    AVG(net_salary) as valor_medio
FROM payrolls 
WHERE company_id = 1 
AND reference_year = 2024
GROUP BY status;
```

### 4. Comparação Anual
```sql
SELECT 
    reference_year,
    COUNT(*) as total_folhas,
    SUM(net_salary) as total_pago,
    AVG(net_salary) as salario_medio
FROM payrolls 
WHERE company_id = 1
GROUP BY reference_year 
ORDER BY reference_year DESC;
```

### 5. Funcionários com Atraso no Pagamento
```sql
SELECT 
    e.name as funcionario,
    e.department,
    p.reference_month,
    p.reference_year,
    p.net_salary,
    p.created_at
FROM payrolls p
INNER JOIN employees e ON p.employee_id = e.id
WHERE p.company_id = 1 
AND p.status = 'pendente'
AND p.created_at < CURRENT_DATE - INTERVAL '30 days'
ORDER BY p.created_at ASC;
```

## Multi-Tenant: Segurança por Empresa

**IMPORTANTE**: Sempre incluir `company_id` nas consultas para garantir isolamento entre empresas:

```sql
-- ✅ CORRETO - Filtra por empresa
SELECT * FROM employees WHERE company_id = 1 AND id = 5;

-- ❌ ERRADO - Pode acessar dados de outras empresas
SELECT * FROM employees WHERE id = 5;
```

## Endpoints da API Criados

### Funcionários
- `GET /api/employees` - Listar funcionários da empresa
- `POST /api/employees` - Criar funcionário
- `GET /api/employees/:id` - Buscar funcionário específico
- `PUT /api/employees/:id` - Atualizar funcionário
- `PUT /api/employees/:id/vacation` - Definir status de férias
- `DELETE /api/employees/:id` - Remover funcionário
- `GET /api/employees/stats/dashboard` - Estatísticas

### Fornecedores
- `GET /api/suppliers` - Listar fornecedores da empresa
- `POST /api/suppliers` - Criar fornecedor
- `GET /api/suppliers/:id` - Buscar fornecedor específico
- `PUT /api/suppliers/:id` - Atualizar fornecedor
- `PUT /api/suppliers/:id/status` - Alterar status (ativo/inativo)
- `PUT /api/suppliers/:id/order` - Registrar novo pedido
- `DELETE /api/suppliers/:id` - Remover fornecedor
- `GET /api/suppliers/categories/list` - Listar categorias
- `GET /api/suppliers/stats/dashboard` - Estatísticas

### Folha de Pagamento
- `GET /api/payrolls` - Listar folhas de pagamento da empresa
- `POST /api/payrolls` - Criar folha de pagamento
- `GET /api/payrolls/:id` - Buscar folha específica
- `PUT /api/payrolls/:id` - Atualizar folha de pagamento
- `PUT /api/payrolls/:id/status` - Alterar status (pendente/feito/recusado)
- `POST /api/payrolls/bulk` - Gerar folhas em lote para um mês
- `DELETE /api/payrolls/:id` - Remover folha de pagamento
- `GET /api/payrolls/stats/dashboard` - Estatísticas

## Como Testar

1. **Servidor rodando**: `npm start`
2. **Health check**: `GET http://localhost:3000/api/health/status`
3. **Listar funcionários**: `GET http://localhost:3000/api/employees`
   - Requer header: `Authorization: Bearer seu-token`

## Dados de Exemplo Inseridos

- **Empresa**: TechCorp Ltda (ID: 1)
- **Departamentos**: Tecnologia, RH, Financeiro, Vendas
- **Funcionários**: 5 funcionários de exemplo
- **Fornecedores**: 5 fornecedores de exemplo com diferentes categorias:
  - TechSolutions Ltda (Tecnologia) - R$ 45.000,00
  - Papelaria Central (Material de Escritório) - R$ 12.500,00
  - Móveis & Cia (Móveis) - R$ 25.000,00
  - Limpeza Total (Limpeza) - R$ 8.500,00
  - Segurança Plus (Segurança) - R$ 18.000,00 (Inativo)
- **Folhas de Pagamento**: 15 folhas de exemplo (3 meses):
  - Julho 2024: 5 folhas pagas
  - Agosto 2024: 5 folhas pagas  
  - Setembro 2024: 3 pagas, 2 pendentes

Use estes dados para testar as funcionalidades!
