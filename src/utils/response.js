// Utilitários para resposta da API

const successResponse = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

const errorResponse = (res, message, statusCode = 500, error = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined,
    timestamp: new Date().toISOString()
  });
};

const validationErrorResponse = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: 'Erro de validação',
    errors,
    timestamp: new Date().toISOString()
  });
};

const unauthorizedResponse = (res, message = 'Não autorizado') => {
  return res.status(401).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

const forbiddenResponse = (res, message = 'Acesso negado') => {
  return res.status(403).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

const notFoundResponse = (res, message = 'Recurso não encontrado') => {
  return res.status(404).json({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse
};
