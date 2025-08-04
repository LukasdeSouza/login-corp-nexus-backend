// Middleware de validação para rotas de autenticação

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // Mínimo 8 caracteres, pelo menos 1 letra maiúscula, 1 minúscula, 1 número
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

const login = (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Verificar se campos obrigatórios estão presentes
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }
    
    // Validar formato do email
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
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

const register = (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    
    // Verificar se campos obrigatórios estão presentes
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email, senha e confirmação de senha são obrigatórios'
      });
    }
    
    // Validar nome
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Nome deve ter entre 2 e 50 caracteres'
      });
    }
    
    // Validar formato do email
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
    }
    
    // Validar senha
    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula e número'
      });
    }
    
    // Verificar se senhas coincidem
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'As senhas não coincidem'
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

const changePassword = (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    
    // Verificar se campos obrigatórios estão presentes
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'Senha atual, nova senha e confirmação são obrigatórias'
      });
    }
    
    // Validar nova senha
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'A nova senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula e número'
      });
    }
    
    // Verificar se novas senhas coincidem
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'As novas senhas não coincidem'
      });
    }
    
    // Verificar se nova senha é diferente da atual
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'A nova senha deve ser diferente da senha atual'
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

const updateProfile = (req, res, next) => {
  try {
    const { name, email } = req.body;
    
    // Validar nome se fornecido
    if (name && (name.length < 2 || name.length > 50)) {
      return res.status(400).json({
        success: false,
        message: 'Nome deve ter entre 2 e 50 caracteres'
      });
    }
    
    // Validar email se fornecido
    if (email && !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
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
  login,
  register,
  changePassword,
  updateProfile
};
