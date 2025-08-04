const { Pool } = require('pg');
require('dotenv').config();

// Configuração da conexão com PostgreSQL (Neon)
const pool = new Pool({
  connectionString: process.env.POSTGRES_NEONDB_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Função para testar a conexão
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado ao banco PostgreSQL (Neon) com sucesso!');
    
    // Teste básico - verificar versão do PostgreSQL
    const result = await client.query('SELECT version()');
    console.log('📊 Versão do PostgreSQL:', result.rows[0].version.split(' ')[1]);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error.message);
    return false;
  }
};

// Função para executar queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Query executada:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro na query:', error.message);
    console.error('📝 Query:', text);
    throw error;
  }
};

// Função para executar transações
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Função para criar tabelas iniciais (arquitetura híbrida: users + employees)
const createTables = async () => {
  try {
    console.log('🔨 Criando tabelas...');
    
    // Tabela de empresas (tenants) - deve ser criada primeiro
    await query(`
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
      )
    `);

    // Tabela de funcionários (dados pessoais e profissionais)
    await query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255), 
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
        document_number VARCHAR(20),
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(20),
        manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, email),
        UNIQUE(company_id, document_number)
      )
    `);

    // Adicionar coluna user_id se não existir
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employees' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE employees ADD COLUMN user_id INTEGER;
        END IF;
      END $$;
    `);

    // Adicionar colunas que podem estar faltando na tabela employees
    await query(`
      DO $$ 
      BEGIN
        -- Adicionar document_number se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employees' AND column_name = 'document_number'
        ) THEN
          ALTER TABLE employees ADD COLUMN document_number VARCHAR(20);
        END IF;
        
        -- Adicionar birth_date se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employees' AND column_name = 'birth_date'
        ) THEN
          ALTER TABLE employees ADD COLUMN birth_date DATE;
        END IF;
        
        -- Adicionar termination_date se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employees' AND column_name = 'termination_date'
        ) THEN
          ALTER TABLE employees ADD COLUMN termination_date DATE;
        END IF;
        
        -- Adicionar address se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employees' AND column_name = 'address'
        ) THEN
          ALTER TABLE employees ADD COLUMN address TEXT;
        END IF;
        
        -- Adicionar city se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employees' AND column_name = 'city'
        ) THEN
          ALTER TABLE employees ADD COLUMN city VARCHAR(100);
        END IF;
        
        -- Adicionar state se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employees' AND column_name = 'state'
        ) THEN
          ALTER TABLE employees ADD COLUMN state VARCHAR(50);
        END IF;
        
        -- Adicionar zip_code se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employees' AND column_name = 'zip_code'
        ) THEN
          ALTER TABLE employees ADD COLUMN zip_code VARCHAR(10);
        END IF;
        
        -- Adicionar emergency_contact_name se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employees' AND column_name = 'emergency_contact_name'
        ) THEN
          ALTER TABLE employees ADD COLUMN emergency_contact_name VARCHAR(255);
        END IF;
        
        -- Adicionar emergency_contact_phone se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employees' AND column_name = 'emergency_contact_phone'
        ) THEN
          ALTER TABLE employees ADD COLUMN emergency_contact_phone VARCHAR(20);
        END IF;
        
        -- Adicionar manager_id se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employees' AND column_name = 'manager_id'
        ) THEN
          ALTER TABLE employees ADD COLUMN manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Adicionar constraints únicas se não existirem
    await query(`
      DO $$ 
      BEGIN
        -- Constraint única para company_id, document_number
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'employees_company_document_unique' 
          AND table_name = 'employees'
        ) THEN
          ALTER TABLE employees 
          ADD CONSTRAINT employees_company_document_unique 
          UNIQUE(company_id, document_number);
        END IF;
      END $$;
    `);

    // Tabela de usuários (autenticação e controle de acesso)
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'FUNCIONARIO' CHECK (role IN ('ADMINISTRADOR', 'GERENTE', 'FUNCIONARIO', 'RH', 'FINANCEIRO')),
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Adicionar colunas que podem estar faltando na tabela users
    await query(`
      DO $$ 
      BEGIN
        -- Remover constraint NOT NULL da coluna name se existir
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'name'
        ) THEN
          ALTER TABLE users ALTER COLUMN name DROP NOT NULL;
        END IF;
        
        -- Remover constraint CHECK antigo de role se existir
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'users_role_check' AND table_name = 'users'
        ) THEN
          ALTER TABLE users DROP CONSTRAINT users_role_check;
        END IF;
        
        -- Adicionar novo constraint CHECK para role
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'users_role_check_new' AND table_name = 'users'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_role_check_new 
          CHECK (role IN ('ADMINISTRADOR', 'GERENTE', 'FUNCIONARIO', 'RH', 'FINANCEIRO'));
        END IF;
        
        -- Adicionar employee_id se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'employee_id'
        ) THEN
          ALTER TABLE users ADD COLUMN employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL;
        END IF;
        
        -- Adicionar password_reset_token se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'password_reset_token'
        ) THEN
          ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255);
        END IF;
        
        -- Adicionar password_reset_expires se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'password_reset_expires'
        ) THEN
          ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP WITH TIME ZONE;
        END IF;
      END $$;
    `);

    // Adicionar foreign key constraint para user_id em employees
    await query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fk_employees_user' 
          AND table_name = 'employees'
        ) THEN
          ALTER TABLE employees 
          ADD CONSTRAINT fk_employees_user 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Tabela de departamentos
    await query(`
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
        UNIQUE(company_id, name)
      )
    `);

    // Tabela de fornecedores
    await query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        cnpj VARCHAR(18),
        contact_name VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(20),
        category VARCHAR(100) NOT NULL,
        last_order_date DATE,
        total_value DECIMAL(12,2) DEFAULT 0.00,
        status BOOLEAN DEFAULT true,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(10),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, cnpj)
      )
    `);

    // Tabela de folha de pagamento
    await query(`
      CREATE TABLE IF NOT EXISTS payrolls (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        reference_month INTEGER NOT NULL CHECK (reference_month >= 1 AND reference_month <= 12),
        reference_year INTEGER NOT NULL CHECK (reference_year >= 2020),
        base_salary DECIMAL(10,2) NOT NULL,
        benefits DECIMAL(10,2) DEFAULT 0.00,
        deductions DECIMAL(10,2) DEFAULT 0.00,
        net_salary DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'feito', 'recusado')),
        payment_date DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Garantir que não há duplicação de folha para o mesmo funcionário no mesmo mês/ano
        UNIQUE(employee_id, reference_month, reference_year)
      )
    `);

    // Tabela de refresh tokens
    await query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de reset de senha
    await query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de notificações globais (comunicações do serviço)
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'info',
        priority VARCHAR(20) NOT NULL DEFAULT 'normal',
        target_audience VARCHAR(50) NOT NULL DEFAULT 'all',
        target_company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        target_roles TEXT[],
        is_active BOOLEAN DEFAULT true,
        schedule_for TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB,
        created_by VARCHAR(100) DEFAULT 'system',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_notification_type CHECK (type IN ('info', 'warning', 'error', 'success', 'maintenance', 'feature', 'update')),
        CONSTRAINT chk_notification_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        CONSTRAINT chk_target_audience CHECK (target_audience IN ('all', 'company', 'user', 'role'))
      )
    `);

    // Tabela para rastrear notificações lidas por usuário
    await query(`
      CREATE TABLE IF NOT EXISTS notification_reads (
        id SERIAL PRIMARY KEY,
        notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(notification_id, user_id)
      )
    `);

    // Índices para performance
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_suppliers_cnpj ON suppliers(cnpj)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payrolls_company_id ON payrolls(company_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payrolls_employee_id ON payrolls(employee_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payrolls_reference ON payrolls(reference_year, reference_month)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payrolls_status ON payrolls(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_target_audience ON notifications(target_audience)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_target_company ON notifications(target_company_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(is_active)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_schedule ON notifications(schedule_for)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expires_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON notification_reads(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notification_reads_notification ON notification_reads(notification_id)`);

    // Trigger para atualizar updated_at automaticamente
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Triggers para todas as tabelas
    const tables = ['users', 'companies', 'employees', 'departments', 'suppliers', 'payrolls'];
    for (const table of tables) {
      await query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    console.log('✅ Tabelas criadas com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
    throw error;
  }
};

// Função para verificar se as tabelas existem
const checkTables = async () => {
  try {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tabelas existentes:', result.rows.map(row => row.table_name));
    return result.rows;
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error.message);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Fechando conexões do banco de dados...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Fechando conexões do banco de dados...');
  await pool.end();
  process.exit(0);
});

// Função para inserir dados de exemplo (arquitetura híbrida)
const insertSampleData = async () => {
  try {
    console.log('📝 Inserindo dados de exemplo...');
    
    // Inserir empresa de exemplo
    await query(`
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
      ) ON CONFLICT (email) DO NOTHING
    `);

    // Inserir departamentos de exemplo
    await query(`
      INSERT INTO departments (company_id, name, description) VALUES 
        (1, 'Tecnologia', 'Departamento de desenvolvimento e infraestrutura'),
        (1, 'Recursos Humanos', 'Gestão de pessoas e talentos'),
        (1, 'Financeiro', 'Controladoria e finanças'),
        (1, 'Vendas', 'Equipe comercial')
      ON CONFLICT (company_id, name) DO NOTHING
    `);

    // 1. Inserir funcionários (sem user_id ainda)
    await query(`
      INSERT INTO employees (company_id, name, email, department, position, salary, status, on_vacation, hire_date, document_number, phone) VALUES 
        (1, 'João Silva', 'joao.silva@techcorp.com.br', 'Tecnologia', 'Desenvolvedor Senior', 8500.00, 'active', false, '2023-01-15', '123.456.789-01', '(11) 98888-1111'),
        (1, 'Maria Santos', 'maria.santos@techcorp.com.br', 'Recursos Humanos', 'Analista de RH', 5500.00, 'active', false, '2023-03-10', '234.567.890-12', '(11) 98888-2222'),
        (1, 'Pedro Oliveira', 'pedro.oliveira@techcorp.com.br', 'Financeiro', 'Contador', 6200.00, 'active', true, '2023-02-20', '345.678.901-23', '(11) 98888-3333'),
        (1, 'Ana Costa', 'ana.costa@techcorp.com.br', 'Vendas', 'Vendedora', 4800.00, 'active', false, '2023-04-05', '456.789.012-34', '(11) 98888-4444'),
        (1, 'Carlos Ferreira', 'carlos.ferreira@techcorp.com.br', 'Tecnologia', 'DevOps Engineer', 9200.00, 'active', false, '2023-01-30', '567.890.123-45', '(11) 98888-5555'),
        (1, 'Lucia Mendes', 'lucia.mendes@techcorp.com.br', 'Recursos Humanos', 'Assistente RH', 3200.00, 'active', false, '2023-06-15', '678.901.234-56', '(11) 98888-6666')
      ON CONFLICT (company_id, email) DO NOTHING
    `);

    // 2. Inserir usuários (alguns funcionários terão acesso, outros não)
    // Verificar se existe a coluna 'name' na tabela users
    const hasNameColumn = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'name'
      ) as has_name
    `);
    
    if (hasNameColumn.rows[0].has_name) {
      // Se tem coluna name, incluir nomes
      await query(`
        INSERT INTO users (name, email, password_hash, role, company_id, employee_id, is_active) VALUES 
          ('João Silva', 'joao.silva@techcorp.com.br', '$2b$10$xamplehash1', 'ADMINISTRADOR', 1, 1, true),
          ('Maria Santos', 'maria.santos@techcorp.com.br', '$2b$10$xamplehash2', 'RH', 1, 2, true),
          ('Pedro Oliveira', 'pedro.oliveira@techcorp.com.br', '$2b$10$xamplehash3', 'FINANCEIRO', 1, 3, true),
          ('Carlos Ferreira', 'carlos.ferreira@techcorp.com.br', '$2b$10$xamplehash4', 'FUNCIONARIO', 1, 5, true),
          ('Administrador', 'admin@techcorp.com.br', '$2b$10$xamplehash5', 'ADMINISTRADOR', 1, NULL, true)
        ON CONFLICT (email) DO NOTHING
      `);
    } else {
      // Se não tem coluna name, não incluir
      await query(`
        INSERT INTO users (email, password_hash, role, company_id, employee_id, is_active) VALUES 
          ('joao.silva@techcorp.com.br', '$2b$10$xamplehash1', 'ADMINISTRADOR', 1, 1, true),
          ('maria.santos@techcorp.com.br', '$2b$10$xamplehash2', 'RH', 1, 2, true),
          ('pedro.oliveira@techcorp.com.br', '$2b$10$xamplehash3', 'FINANCEIRO', 1, 3, true),
          ('carlos.ferreira@techcorp.com.br', '$2b$10$xamplehash4', 'FUNCIONARIO', 1, 5, true),
          ('admin@techcorp.com.br', '$2b$10$xamplehash5', 'ADMINISTRADOR', 1, NULL, true)
        ON CONFLICT (email) DO NOTHING
      `);
    }

    // 3. Atualizar funcionários com user_id (relacionamento bidirecional)
    await query(`
      UPDATE employees SET user_id = (SELECT id FROM users WHERE employee_id = employees.id AND users.company_id = employees.company_id)
    `);

    // Inserir fornecedores de exemplo
    await query(`
      INSERT INTO suppliers (company_id, name, cnpj, contact_name, contact_email, contact_phone, category, last_order_date, total_value, status) VALUES 
        (1, 'TechSolutions Ltda', '11.222.333/0001-44', 'Roberto Silva', 'roberto@techsolutions.com', '(11) 98888-1234', 'Tecnologia', '2024-07-15', 45000.00, true),
        (1, 'Papelaria Central', '22.333.444/0001-55', 'Mariana Oliveira', 'mariana@papelaria.com', '(11) 97777-5678', 'Material de Escritório', '2024-07-20', 12500.00, true),
        (1, 'Móveis & Cia', '33.444.555/0001-66', 'Carlos Santos', 'carlos@moveisecia.com', '(11) 96666-9012', 'Móveis', '2024-06-10', 25000.00, true),
        (1, 'Limpeza Total', '44.555.666/0001-77', 'Ana Lima', 'ana@limpezatotal.com', '(11) 95555-3456', 'Limpeza', '2024-07-25', 8500.00, true),
        (1, 'Segurança Plus', '55.666.777/0001-88', 'José Ferreira', 'jose@segurancaplus.com', '(11) 94444-7890', 'Segurança', '2024-05-30', 18000.00, false)
      ON CONFLICT (company_id, cnpj) DO NOTHING
    `);

    // Inserir folhas de pagamento de exemplo (últimos 3 meses) - apenas para funcionários existentes
    // Primeiro verificar quais funcionários existem
    const existingEmployees = await query('SELECT id FROM employees WHERE company_id = 1 ORDER BY id');
    const employeeIds = existingEmployees.rows.map(row => row.id);
    
    console.log('📋 Funcionários existentes:', employeeIds);
    
    if (employeeIds.length > 0) {
      // Criar folhas apenas para os funcionários que existem
      let payrollInserts = [];
      
      // Julho 2024
      employeeIds.forEach(empId => {
        const baseData = [
          { id: 1, salary: 8500.00 },
          { id: 2, salary: 5500.00 },
          { id: 3, salary: 6200.00 },
          { id: 4, salary: 4800.00 },
          { id: 5, salary: 9200.00 },
          { id: 6, salary: 3200.00 }
        ];
        
        const empData = baseData.find(d => d.id === empId) || { id: empId, salary: 5000.00 };
        const benefits = empData.salary * 0.1;
        const deductions = empData.salary * 0.15;
        const netSalary = empData.salary + benefits - deductions;
        
        // Julho
        payrollInserts.push(`(1, ${empId}, 7, 2024, ${empData.salary}, ${benefits}, ${deductions}, ${netSalary}, 'feito', '2024-08-05')`);
        // Agosto
        payrollInserts.push(`(1, ${empId}, 8, 2024, ${empData.salary}, ${benefits}, ${deductions}, ${netSalary}, 'feito', '2024-09-05')`);
        // Setembro (alguns pendentes)
        const status = empId % 2 === 0 ? 'pendente' : 'feito';
        const paymentDate = status === 'feito' ? "'2024-10-05'" : 'NULL';
        payrollInserts.push(`(1, ${empId}, 9, 2024, ${empData.salary}, ${benefits}, ${deductions}, ${netSalary}, '${status}', ${paymentDate})`);
      });
      
      if (payrollInserts.length > 0) {
        await query(`
          INSERT INTO payrolls (company_id, employee_id, reference_month, reference_year, base_salary, benefits, deductions, net_salary, status, payment_date) VALUES 
          ${payrollInserts.join(',\n          ')}
          ON CONFLICT (employee_id, reference_month, reference_year) DO NOTHING
        `);
      }
    }

    // Inserir notificações de exemplo
    await query(`
      INSERT INTO notifications (title, message, type, priority, target_audience, metadata, created_by) VALUES
      ('🎉 Sistema de Notificações Ativo!', 
       'O novo sistema de notificações está funcionando perfeitamente. Agora você receberá comunicados importantes do nosso serviço.', 
       'success', 'normal', 'all', 
       '{"category": "system", "version": "1.0"}', 'system'),
       
      ('🔧 Manutenção Programada', 
       'Haverá uma breve manutenção no sistema no próximo domingo das 2h às 4h. O serviço pode ficar indisponível durante esse período.', 
       'maintenance', 'high', 'all', 
       '{"scheduled_date": "2024-08-10", "duration": "2 horas"}', 'admin'),
       
      ('🚀 Nova Funcionalidade: Arquitetura Híbrida', 
       'Implementamos uma nova arquitetura híbrida para usuários e funcionários, oferecendo maior flexibilidade na gestão de pessoas.', 
       'feature', 'normal', 'role', 
       '{"roles": ["ADMINISTRADOR", "RH"], "feature_version": "2.1"}', 'development'),
       
      ('⚠️ Importante: Backup de Dados', 
       'Lembre-se de fazer backup regular dos seus dados. Nosso sistema oferece backups automáticos, mas é sempre bom ter uma cópia local.', 
       'warning', 'normal', 'role', 
       '{"roles": ["ADMINISTRADOR"], "backup_frequency": "weekly"}', 'system'),
       
      ('📊 Relatório de Performance', 
       'O sistema está operando com 99.9% de disponibilidade. Confira os detalhes no painel de administração.', 
       'info', 'low', 'role', 
       '{"roles": ["ADMINISTRADOR", "GERENTE"], "uptime": "99.9%"}', 'monitoring')
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Dados de exemplo inseridos!');
    console.log('👥 Funcionários criados:');
    console.log('   - João Silva (Admin) - COM acesso ao sistema');
    console.log('   - Maria Santos (RH) - COM acesso ao sistema');
    console.log('   - Pedro Oliveira (Financeiro) - COM acesso ao sistema');
    console.log('   - Ana Costa (Vendas) - SEM acesso ao sistema');
    console.log('   - Carlos Ferreira (DevOps) - COM acesso ao sistema');
    console.log('   - Lucia Mendes (Assistente RH) - SEM acesso ao sistema');
    console.log('🔑 Usuário especial: admin@techcorp.com.br (Admin sem funcionário)');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inserir dados de exemplo:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  createTables,
  checkTables,
  insertSampleData
};
