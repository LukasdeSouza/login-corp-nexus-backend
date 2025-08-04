-- Script SQL para sistema multi-tenant
-- Criação das tabelas para empresas e funcionários

-- 1. Tabela de empresas (tenants)
CREATE TABLE IF NOT EXISTS companies (
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
    subscription_plan VARCHAR(50) DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'premium', 'enterprise')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Atualizar tabela de usuários para incluir company_id
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- 3. Tabela de funcionários
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL, -- Cargo
    salary DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'terminated')),
    on_vacation BOOLEAN DEFAULT false, -- Férias
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
    
    -- Garantir que email seja único por empresa
    UNIQUE(company_id, email)
);

-- 4. Tabela de departamentos (opcional - para normalizar)
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    budget DECIMAL(12,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Garantir que departamento seja único por empresa
    UNIQUE(company_id, name)
);

-- 5. Tabela de cargos (opcional - para normalizar)
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    min_salary DECIMAL(10,2),
    max_salary DECIMAL(10,2),
    requirements TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Garantir que cargo seja único por empresa/departamento
    UNIQUE(company_id, department_id, title)
);

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);

CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

CREATE INDEX IF NOT EXISTS idx_positions_company_id ON positions(company_id);
CREATE INDEX IF NOT EXISTS idx_positions_department_id ON positions(department_id);

-- 7. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para as novas tabelas
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_positions_updated_at ON positions;
CREATE TRIGGER update_positions_updated_at
    BEFORE UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Dados de exemplo (opcional)
-- Inserir uma empresa de exemplo
INSERT INTO companies (name, email, cnpj, phone, address, city, state, subscription_plan) 
VALUES (
    'TechCorp Ltda',
    'contato@techcorp.com.br',
    '12.345.678/0001-90',
    '(11) 99999-9999',
    'Rua das Empresas, 123',
    'São Paulo',
    'SP',
    'premium'
) ON CONFLICT (email) DO NOTHING;

-- Inserir alguns departamentos de exemplo
INSERT INTO departments (company_id, name, description) VALUES 
    (1, 'Tecnologia', 'Departamento de desenvolvimento e infraestrutura'),
    (1, 'Recursos Humanos', 'Gestão de pessoas e talentos'),
    (1, 'Financeiro', 'Controladoria e finanças'),
    (1, 'Vendas', 'Equipe comercial')
ON CONFLICT (company_id, name) DO NOTHING;

-- Inserir alguns funcionários de exemplo
INSERT INTO employees (company_id, name, email, department, position, salary, status, on_vacation, hire_date) VALUES 
    (1, 'João Silva', 'joao.silva@techcorp.com.br', 'Tecnologia', 'Desenvolvedor Senior', 8500.00, 'active', false, '2023-01-15'),
    (1, 'Maria Santos', 'maria.santos@techcorp.com.br', 'Recursos Humanos', 'Analista de RH', 5500.00, 'active', false, '2023-03-10'),
    (1, 'Pedro Oliveira', 'pedro.oliveira@techcorp.com.br', 'Financeiro', 'Contador', 6200.00, 'active', true, '2023-02-20'),
    (1, 'Ana Costa', 'ana.costa@techcorp.com.br', 'Vendas', 'Vendedora', 4800.00, 'active', false, '2023-04-05'),
    (1, 'Carlos Ferreira', 'carlos.ferreira@techcorp.com.br', 'Tecnologia', 'DevOps Engineer', 9200.00, 'active', false, '2023-01-30')
ON CONFLICT (company_id, email) DO NOTHING;
