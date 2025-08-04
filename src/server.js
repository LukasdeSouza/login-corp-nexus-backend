const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar configuração do banco
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Importar rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const healthRoutes = require('./routes/health');
const employeeRoutes = require('./routes/employees');
const companyRoutes = require('./routes/companies');
const supplierRoutes = require('./routes/suppliers');
const payrollRoutes = require('./routes/payrolls');
const notificationRoutes = require('./routes/notifications');

// Middleware de segurança
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP por janela de tempo
  message: 'Muitas tentativas. Tente novamente em 15 minutos.'
});
app.use(limiter);

// Middleware de CORS
app.use(cors({
  origin: [
    'http://localhost:3000',   // Create React App default
    'http://localhost:5173',   // Vite default
    'http://localhost:8080',   // Vite configurado no projeto
    'http://localhost:4173',   // Vite preview
    'http://localhost:3001',   // Alternativa comum
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    process.env.FRONTEND_URL
  ].filter(Boolean), // Remove valores undefined/null
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware de logging
app.use(morgan('combined'));

// Middleware para parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rotas
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/payrolls', payrollRoutes);
app.use('/api/notifications', notificationRoutes);

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// Iniciar servidor
const startServer = async () => {
  try {
    // Testar conexão com o banco antes de iniciar o servidor
    console.log('🔌 Testando conexão com o banco de dados...');
    const dbConnected = await db.testConnection();
    
    if (!dbConnected) {
      console.error('❌ Falha na conexão com o banco. Servidor não iniciado.');
      process.exit(1);
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📱 API disponível em: http://localhost:${PORT}`);
      console.log(`💾 Banco de dados: PostgreSQL (Neon) conectado`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
