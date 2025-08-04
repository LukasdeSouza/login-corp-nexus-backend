// Middleware de autenticação JWT (arquitetura híbrida)
// TODO: Implementar com biblioteca JWT real

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      });
    }
    
    // TODO: Verificar token JWT real
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded;
    
    // Mock para desenvolvimento - simular diferentes usuários
    const mockUsers = {
      'mock-jwt-token': {
        id: 1,
        email: 'joao.silva@techcorp.com.br',
        role: 'ADMINISTRADOR',
        company_id: 1,
        employee_id: 1
      },
      'mock-rh-token': {
        id: 2,
        email: 'maria.santos@techcorp.com.br',
        role: 'RH',
        company_id: 1,
        employee_id: 2
      },
      'mock-funcionario-token': {
        id: 4,
        email: 'carlos.ferreira@techcorp.com.br',
        role: 'FUNCIONARIO',
        company_id: 1,
        employee_id: 5
      },
      'mock-admin-token': {
        id: 5,
        email: 'admin@techcorp.com.br',
        role: 'ADMINISTRADOR',
        company_id: 1,
        employee_id: null // Usuário sem funcionário associado
      }
    };
    
    // Usar token específico ou padrão
    req.user = mockUsers[token] || mockUsers['mock-jwt-token'];
    
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

const requireAdmin = (req, res, next) => {
  try {
    if (req.user.role !== 'ADMINISTRADOR') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Permissões de administrador requeridas.'
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Acesso negado. Roles permitidos: ${roles.join(', ')}`
        });
      }
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

const requireCompanyAccess = (req, res, next) => {
  try {
    const userCompanyId = req.user.company_id;
    
    // Todos os usuários devem ter company_id na nova arquitetura
    if (!userCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'Usuário não está associado a uma empresa'
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Middleware para verificar se usuário pode gerenciar outros usuários
const requireUserManagement = (req, res, next) => {
  try {
    const allowedRoles = ['ADMINISTRADOR', 'RH'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores e RH podem gerenciar usuários.'
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Middleware para verificar se usuário pode acessar dados financeiros
const requireFinancialAccess = (req, res, next) => {
  try {
    const allowedRoles = ['ADMINISTRADOR', 'FINANCEIRO'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores e financeiro podem acessar dados financeiros.'
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireRole,
  requireCompanyAccess,
  requireUserManagement,
  requireFinancialAccess
};
