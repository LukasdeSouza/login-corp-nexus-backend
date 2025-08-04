/**
 * Utilitários para paginação
 */

/**
 * Cria os parâmetros de paginação padronizados
 * @param {Object} query - Query parameters da requisição
 * @returns {Object} Parâmetros de paginação
 */
function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10)); // Max 100 items por página
  const offset = (page - 1) * limit;
  
  return {
    page,
    limit,
    offset
  };
}

/**
 * Cria o objeto de resposta de paginação
 * @param {number} total - Total de registros
 * @param {number} page - Página atual
 * @param {number} limit - Limite por página
 * @param {string} itemName - Nome do item (ex: 'employees', 'suppliers')
 * @returns {Object} Objeto de paginação
 */
function createPaginationResponse(total, page, limit, itemName = 'items') {
  const totalPages = Math.ceil(total / limit);
  
  return {
    currentPage: page,
    totalPages,
    [`total${itemName.charAt(0).toUpperCase() + itemName.slice(1)}`]: total,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    previousPage: page > 1 ? page - 1 : null
  };
}

/**
 * Adiciona LIMIT e OFFSET à query SQL
 * @param {string} baseQuery - Query SQL base
 * @param {number} limit - Limite de registros
 * @param {number} offset - Offset para paginação
 * @param {string} orderBy - Cláusula ORDER BY (opcional)
 * @returns {string} Query SQL com paginação
 */
function addPaginationToQuery(baseQuery, limit, offset, orderBy = '') {
  let query = baseQuery;
  
  if (orderBy && !baseQuery.toLowerCase().includes('order by')) {
    query += ` ORDER BY ${orderBy}`;
  }
  
  query += ` LIMIT ${limit} OFFSET ${offset}`;
  
  return query;
}

/**
 * Cria uma query de contagem baseada na query principal
 * @param {string} selectQuery - Query SELECT principal
 * @returns {string} Query COUNT correspondente
 */
function createCountQuery(selectQuery) {
  // Remove SELECT fields e substitui por COUNT(*)
  const fromIndex = selectQuery.toLowerCase().indexOf('from');
  if (fromIndex === -1) {
    throw new Error('Query inválida: não contém cláusula FROM');
  }
  
  const fromClause = selectQuery.substring(fromIndex);
  
  // Remove ORDER BY, LIMIT, OFFSET da query de contagem
  const cleanFromClause = fromClause
    .replace(/\s+order\s+by\s+[^;]*$/i, '')
    .replace(/\s+limit\s+\d+/i, '')
    .replace(/\s+offset\s+\d+/i, '');
  
  return `SELECT COUNT(*) ${cleanFromClause}`;
}

module.exports = {
  getPaginationParams,
  createPaginationResponse,
  addPaginationToQuery,
  createCountQuery
};
