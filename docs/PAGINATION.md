# Sistema de Paginação Padronizada

Este documento descreve o sistema de paginação implementado no backend do Login Corp Nexus.

## Estrutura da Paginação

### Parâmetros de Query

Todas as rotas que retornam listas de dados aceitam os seguintes parâmetros de query:

- `page` (opcional): Número da página atual (padrão: 1)
- `limit` (opcional): Número de itens por página (padrão: 10, máximo: 100)

### Exemplo de Requisição

```bash
GET /api/employees?page=2&limit=20&search=João&department=TI
```

### Estrutura de Resposta

Todas as respostas seguem o padrão:

```json
{
  "success": true,
  "data": {
    "employees": [...], // Array de dados
    "pagination": {
      "currentPage": 2,
      "totalPages": 5,
      "totalEmployees": 87,
      "itemsPerPage": 20,
      "hasNextPage": true,
      "hasPreviousPage": true,
      "nextPage": 3,
      "previousPage": 1
    }
  }
}
```

## Campos da Paginação

### Campos Principais
- `currentPage`: Página atual sendo exibida
- `totalPages`: Total de páginas disponíveis
- `total[ItemName]`: Total de registros encontrados (ex: `totalEmployees`, `totalSuppliers`)
- `itemsPerPage`: Número de itens por página

### Campos de Navegação
- `hasNextPage`: Boolean indicando se há próxima página
- `hasPreviousPage`: Boolean indicando se há página anterior
- `nextPage`: Número da próxima página (null se não houver)
- `previousPage`: Número da página anterior (null se não houver)

## Rotas com Paginação

### 1. Funcionários - `/api/employees`

**Parâmetros adicionais:**
- `search`: Busca por nome ou email
- `department`: Filtro por departamento
- `status`: Filtro por status (active, inactive, all)

**Exemplo:**
```bash
GET /api/employees?page=1&limit=15&search=Maria&department=RH&status=active
```

### 2. Fornecedores - `/api/suppliers`

**Parâmetros adicionais:**
- `search`: Busca por nome, CNPJ ou nome do contato
- `category`: Filtro por categoria
- `status`: Filtro por status (active, inactive, all)

**Exemplo:**
```bash
GET /api/suppliers?page=1&limit=10&category=Tecnologia&status=active
```

### 3. Folha de Pagamento - `/api/payrolls`

**Parâmetros adicionais:**
- `month`: Filtro por mês de referência
- `year`: Filtro por ano de referência
- `employee_id`: Filtro por funcionário específico
- `status`: Filtro por status (pendente, feito, recusado, all)
- `department`: Filtro por departamento

**Exemplo:**
```bash
GET /api/payrolls?page=1&limit=25&month=12&year=2024&status=pendente
```

### 4. Empresas - `/api/companies` (Super Admin)

**Parâmetros adicionais:**
- `search`: Busca por nome ou email da empresa

**Exemplo:**
```bash
GET /api/companies?page=1&limit=50&search=Tech
```

## Implementação Técnica

### Utilitário de Paginação

O sistema utiliza o arquivo `src/utils/pagination.js` que fornece:

1. **`getPaginationParams(query)`**: Processa os parâmetros de query
2. **`createPaginationResponse(total, page, limit, itemName)`**: Cria a resposta padronizada

### Exemplo de Uso no Código

```javascript
const { getPaginationParams, createPaginationResponse } = require('../utils/pagination');

router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    
    // Sua query com LIMIT e OFFSET
    const items = await db.query(`
      SELECT * FROM table 
      WHERE conditions 
      ORDER BY name 
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    // Query de contagem
    const totalResult = await db.query('SELECT COUNT(*) FROM table WHERE conditions');
    const total = parseInt(totalResult.rows[0].count);
    
    // Resposta padronizada
    const pagination = createPaginationResponse(total, page, limit, 'items');
    
    res.json({
      success: true,
      data: {
        items: items.rows,
        pagination
      }
    });
  } catch (error) {
    // Tratamento de erro
  }
});
```

## Validações e Limites

### Limites de Segurança
- Página mínima: 1
- Limite mínimo por página: 1
- Limite máximo por página: 100
- Limite padrão: 10

### Tratamento de Erros
- Valores inválidos são automaticamente corrigidos para os valores padrão
- Páginas inexistentes retornam array vazio com paginação correta

## Benefícios

1. **Consistência**: Todas as rotas seguem o mesmo padrão
2. **Performance**: Limita a quantidade de dados transferidos
3. **Usabilidade**: Fornece informações completas para navegação
4. **Segurança**: Previne consultas muito grandes
5. **Flexibilidade**: Permite ajuste do tamanho da página conforme necessário

## Frontend Integration

Para integração com frontend, utilize:

```javascript
// Exemplo de função para buscar dados paginados
async function fetchEmployees(page = 1, limit = 10, filters = {}) {
  const params = new URLSearchParams({
    page,
    limit,
    ...filters
  });
  
  const response = await fetch(`/api/employees?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-company-id': companyId
    }
  });
  
  const data = await response.json();
  
  if (data.success) {
    return {
      items: data.data.employees,
      pagination: data.data.pagination
    };
  }
  
  throw new Error(data.message);
}
```
