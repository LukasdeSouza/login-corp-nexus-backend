# 🏗️ Arquitetura Proposta: Sistema de Usuários e Funcionários

## 📋 **Estrutura de Tabelas Recomendada**

### 1. **Tabela USERS** (Autenticação e Controle de Acesso)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'FUNCIONARIO', -- ADMINISTRADOR, FUNCIONARIO, GERENTE
    company_id INTEGER REFERENCES companies(id),
    employee_id INTEGER REFERENCES employees(id), -- Pode ser NULL
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. **Tabela EMPLOYEES** (Dados Pessoais e Profissionais)
```sql
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    user_id INTEGER REFERENCES users(id), -- Pode ser NULL
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255), -- Pode ser diferente do email de login
    phone VARCHAR(20),
    department VARCHAR(100),
    position VARCHAR(100),
    salary DECIMAL(10,2),
    hire_date DATE,
    manager_id INTEGER REFERENCES employees(id),
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, terminated
    on_vacation BOOLEAN DEFAULT false,
    address TEXT,
    birth_date DATE,
    document_number VARCHAR(20), -- CPF
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔗 **Relacionamentos e Regras**

### **Cenários Possíveis:**

1. **👤 Funcionário COM acesso ao sistema:**
   - Registro na tabela `employees`
   - Registro na tabela `users` com `employee_id` preenchido
   - `employees.user_id` aponta para o usuário

2. **👥 Funcionário SEM acesso ao sistema:**
   - Apenas registro na tabela `employees`
   - `employees.user_id` = NULL
   - Usado apenas para controle de RH

3. **🔧 Usuário administrativo sem ser funcionário:**
   - Registro na tabela `users` com `employee_id` = NULL
   - Para casos especiais (consultores externos, etc.)

### **Tipos de Usuário por Empresa:**

```javascript
const USER_ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR', // Acesso total à empresa
  GERENTE: 'GERENTE',             // Gerencia departamentos/equipes
  FUNCIONARIO: 'FUNCIONARIO',     // Acesso básico
  RH: 'RH',                       // Acesso aos dados de funcionários
  FINANCEIRO: 'FINANCEIRO'        // Acesso aos dados financeiros
};
```

## 🎯 **Vantagens desta Arquitetura**

### ✅ **Flexibilidade:**
- Funcionários podem existir sem acesso ao sistema
- Usuários especiais podem existir sem ser funcionários
- Fácil controle de permissões

### ✅ **Integridade:**
- Dados pessoais ficam na tabela correta
- Dados de autenticação separados
- Relacionamento claro e opcional

### ✅ **Escalabilidade:**
- Fácil adicionar novos tipos de usuário
- Auditoria separada por contexto
- Flexível para diferentes necessidades

## 🔄 **Fluxos de Uso**

### **1. Criar Funcionário + Usuário:**
```javascript
// 1. Criar funcionário
const employee = await createEmployee({
  name: "João Silva",
  email: "joao.silva@empresa.com",
  department: "TI",
  position: "Desenvolvedor"
});

// 2. Criar usuário com acesso
const user = await createUser({
  email: "joao.silva@empresa.com", // Mesmo email ou diferente
  password: "senha123",
  role: "FUNCIONARIO",
  employee_id: employee.id
});

// 3. Atualizar referência no funcionário
await updateEmployee(employee.id, { user_id: user.id });
```

### **2. Funcionário apenas para RH:**
```javascript
// Criar apenas funcionário sem acesso ao sistema
const employee = await createEmployee({
  name: "Maria Santos",
  email: "maria.santos@empresa.com",
  department: "Vendas",
  position: "Vendedora"
  // user_id permanece NULL
});
```

## 📊 **Consultas Comuns**

### **Dados do usuário logado:**
```sql
SELECT 
  u.id as user_id, u.email as login_email, u.role,
  e.name, e.email as contact_email, e.phone, e.department, e.position
FROM users u
LEFT JOIN employees e ON u.employee_id = e.id
WHERE u.id = $1;
```

### **Funcionários com acesso ao sistema:**
```sql
SELECT 
  e.*, u.email as login_email, u.role, u.is_active
FROM employees e
INNER JOIN users u ON e.user_id = u.id
WHERE e.company_id = $1;
```

### **Funcionários sem acesso ao sistema:**
```sql
SELECT e.*
FROM employees e
WHERE e.company_id = $1 AND e.user_id IS NULL;
```

## 🛡️ **Considerações de Segurança**

1. **Emails diferentes:** Login pode ser diferente do email corporativo
2. **Desativação:** Usuário pode ser desativado mantendo dados do funcionário
3. **Auditoria:** Logs separados para ações de usuário vs. mudanças de RH
4. **Permissões:** Role-based access control por empresa

---

## 🤝 **Decisão Final**

Esta arquitetura oferece:
- ✅ **Máxima flexibilidade**
- ✅ **Separação clara de responsabilidades**
- ✅ **Facilidade de manutenção**
- ✅ **Escalabilidade para diferentes cenários**

**Você aprova esta estrutura ou prefere alguma modificação?**
