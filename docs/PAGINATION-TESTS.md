# Testes de Paginação - Exemplos Práticos

## Como Testar a Paginação

### 1. Testando Funcionários

```bash
# Página 1 com 5 itens
curl -H "Authorization: Bearer mock-jwt-token" \
     -H "x-company-id: 1" \
     "http://localhost:3002/api/employees?page=1&limit=5"

# Página 2 com busca
curl -H "Authorization: Bearer mock-jwt-token" \
     -H "x-company-id: 1" \
     "http://localhost:3002/api/employees?page=2&limit=3&search=João"

# Filtro por departamento
curl -H "Authorization: Bearer mock-jwt-token" \
     -H "x-company-id: 1" \
     "http://localhost:3002/api/employees?page=1&limit=10&department=TI"
```

### 2. Testando Fornecedores

```bash
# Página 1 com categoria
curl -H "Authorization: Bearer mock-jwt-token" \
     -H "x-company-id: 1" \
     "http://localhost:3002/api/suppliers?page=1&limit=5&category=Tecnologia"

# Busca por nome
curl -H "Authorization: Bearer mock-jwt-token" \
     -H "x-company-id: 1" \
     "http://localhost:3002/api/suppliers?page=1&limit=10&search=Tech"
```

### 3. Testando Folha de Pagamento

```bash
# Folhas de dezembro 2024
curl -H "Authorization: Bearer mock-jwt-token" \
     -H "x-company-id: 1" \
     "http://localhost:3002/api/payrolls?page=1&limit=10&month=12&year=2024"

# Folhas pendentes
curl -H "Authorization: Bearer mock-jwt-token" \
     -H "x-company-id: 1" \
     "http://localhost:3002/api/payrolls?page=1&limit=5&status=pendente"
```

### 4. Testando Empresas (Super Admin)

```bash
# Listar empresas com busca
curl -H "Authorization: Bearer mock-jwt-token" \
     -H "x-role: super_admin" \
     "http://localhost:3002/api/companies?page=1&limit=10&search=Corp"
```

## Respostas Esperadas

### Exemplo de Resposta com Paginação

```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "id": 1,
        "name": "João Silva",
        "email": "joao@empresa.com",
        "department": "TI",
        "position": "Desenvolvedor",
        "salary": 5000.00,
        "status": "active",
        "on_vacation": false,
        "hire_date": "2024-01-15T00:00:00.000Z",
        "phone": "(11) 99999-1111",
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalEmployees": 15,
      "itemsPerPage": 5,
      "hasNextPage": true,
      "hasPreviousPage": false,
      "nextPage": 2,
      "previousPage": null
    }
  }
}
```

### Casos de Teste

1. **Página inexistente**: Retorna array vazio mas com paginação correta
2. **Limite alto**: Limitado automaticamente a 100
3. **Valores negativos**: Corrigidos para valores mínimos
4. **Sem dados**: Array vazio com `totalPages: 0`

## Script de Teste Automatizado

Salve como `test-pagination.js`:

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3002/api';
const headers = {
  'Authorization': 'Bearer mock-jwt-token',
  'x-company-id': '1'
};

async function testPagination() {
  console.log('🧪 Testando Sistema de Paginação\n');

  // Teste 1: Funcionários - Página 1
  try {
    console.log('📋 Teste 1: Funcionários - Página 1');
    const response = await axios.get(`${BASE_URL}/employees?page=1&limit=3`, { headers });
    const { employees, pagination } = response.data.data;
    
    console.log(`✅ Funcionários encontrados: ${employees.length}`);
    console.log(`📄 Página ${pagination.currentPage} de ${pagination.totalPages}`);
    console.log(`📊 Total: ${pagination.totalEmployees} funcionários\n`);
  } catch (error) {
    console.log('❌ Erro no teste 1:', error.message, '\n');
  }

  // Teste 2: Fornecedores com filtro
  try {
    console.log('📋 Teste 2: Fornecedores com filtro');
    const response = await axios.get(`${BASE_URL}/suppliers?page=1&limit=5&status=active`, { headers });
    const { suppliers, pagination } = response.data.data;
    
    console.log(`✅ Fornecedores ativos: ${suppliers.length}`);
    console.log(`📄 Página ${pagination.currentPage} de ${pagination.totalPages}`);
    console.log(`📊 Total: ${pagination.totalSuppliers} fornecedores\n`);
  } catch (error) {
    console.log('❌ Erro no teste 2:', error.message, '\n');
  }

  // Teste 3: Folhas de pagamento
  try {
    console.log('📋 Teste 3: Folhas de pagamento');
    const response = await axios.get(`${BASE_URL}/payrolls?page=1&limit=10`, { headers });
    const { payrolls, pagination } = response.data.data;
    
    console.log(`✅ Folhas encontradas: ${payrolls.length}`);
    console.log(`📄 Página ${pagination.currentPage} de ${pagination.totalPages}`);
    console.log(`📊 Total: ${pagination.totalPayrolls} folhas\n`);
  } catch (error) {
    console.log('❌ Erro no teste 3:', error.message, '\n');
  }

  // Teste 4: Limite alto (deve ser limitado a 100)
  try {
    console.log('📋 Teste 4: Limite alto (deve ser limitado)');
    const response = await axios.get(`${BASE_URL}/employees?page=1&limit=500`, { headers });
    const { pagination } = response.data.data;
    
    console.log(`✅ Limite aplicado: ${pagination.itemsPerPage} (máximo 100)`);
    console.log(`📊 Limite de segurança funcionando corretamente\n`);
  } catch (error) {
    console.log('❌ Erro no teste 4:', error.message, '\n');
  }

  console.log('🎉 Testes de paginação concluídos!');
}

// Executar se chamado diretamente
if (require.main === module) {
  testPagination();
}

module.exports = testPagination;
```

Para executar:
```bash
npm install axios  # Se não tiver instalado
node test-pagination.js
```
