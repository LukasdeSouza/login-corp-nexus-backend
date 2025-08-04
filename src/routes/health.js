const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Rota de health check
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API está funcionando!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Rota de status detalhado
router.get('/status', async (req, res) => {
  try {
    // Testar conexão com o banco
    let databaseStatus = 'disconnected';
    let databaseError = null;
    
    try {
      await db.query('SELECT 1');
      databaseStatus = 'connected';
    } catch (error) {
      databaseError = error.message;
    }
    
    res.status(200).json({
      success: true,
      data: {
        api: 'online',
        database: databaseStatus,
        databaseError: databaseError,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status',
      error: error.message
    });
  }
});

module.exports = router;
