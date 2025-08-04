const express = require('express');
const router = express.Router();
const db = require('../config/database');
const NotificationService = require('../services/notificationService');
const { getPaginationParams, createPaginationResponse } = require('../utils/pagination');

// Middleware de autenticação
const authMiddleware = require('../middleware/auth');

// 📋 GET /api/notifications - Listar notificações do usuário
router.get('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      includeRead = 'true', 
      types, 
      priorities 
    } = req.query;
    
    const { page, limit } = getPaginationParams(req.query);
    
    // Processar filtros
    const options = {
      page,
      limit,
      includeRead: includeRead === 'true',
      types: types ? types.split(',') : [],
      priorities: priorities ? priorities.split(',') : []
    };
    
    const result = await NotificationService.getNotificationsForUser(userId, options);
    
    res.status(200).json({
      success: true,
      data: {
        notifications: result.notifications,
        pagination: result.pagination,
        unreadCount: result.unreadCount
      }
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// 📨 GET /api/notifications/unread-count - Contador de não lidas
router.get('/unread-count', authMiddleware.verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await NotificationService.getNotificationsForUser(userId, {
      page: 1,
      limit: 1,
      includeRead: false
    });
    
    res.status(200).json({
      success: true,
      data: {
        unreadCount: result.unreadCount
      }
    });
  } catch (error) {
    console.error('Erro ao contar notificações não lidas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// ✅ PUT /api/notifications/:id/read - Marcar como lida
router.put('/:id/read', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    await NotificationService.markAsRead(id, userId);
    
    res.status(200).json({
      success: true,
      message: 'Notificação marcada como lida'
    });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// ✅ PUT /api/notifications/read-multiple - Marcar várias como lidas
router.put('/read-multiple', authMiddleware.verifyToken, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user.id;
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de IDs de notificações é obrigatória'
      });
    }
    
    const result = await NotificationService.markMultipleAsRead(notificationIds, userId);
    
    res.status(200).json({
      success: true,
      message: `${result.marked} notificações marcadas como lidas`
    });
  } catch (error) {
    console.error('Erro ao marcar notificações como lidas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// 📝 POST /api/notifications - Criar notificação (apenas ADMINISTRADOR)
router.post('/', authMiddleware.verifyToken, authMiddleware.requireRole(['ADMINISTRADOR']), async (req, res) => {
  try {
    const {
      title,
      message,
      type = 'info',
      priority = 'normal',
      target_audience = 'all',
      target_company_id,
      target_user_id,
      target_roles,
      schedule_for,
      expires_at,
      metadata = {}
    } = req.body;
    
    const notificationData = {
      title,
      message,
      type,
      priority,
      target_audience,
      target_company_id,
      target_user_id,
      target_roles,
      schedule_for,
      expires_at,
      metadata,
      created_by: req.user.email
    };
    
    const notification = await NotificationService.createNotification(notificationData);
    
    res.status(201).json({
      success: true,
      message: 'Notificação criada com sucesso',
      data: {
        notification
      }
    });
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
});

// 🗑️ DELETE /api/notifications/:id - Desativar notificação (apenas ADMINISTRADOR)
router.delete('/:id', authMiddleware.verifyToken, authMiddleware.requireRole(['ADMINISTRADOR']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await NotificationService.deactivateNotification(id);
    
    res.status(200).json({
      success: true,
      message: 'Notificação desativada com sucesso',
      data: {
        notification
      }
    });
  } catch (error) {
    console.error('Erro ao desativar notificação:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
});

// 📊 GET /api/notifications/admin/stats - Estatísticas (apenas ADMINISTRADOR)
router.get('/admin/stats', authMiddleware.verifyToken, authMiddleware.requireRole(['ADMINISTRADOR']), async (req, res) => {
  try {
    const stats = await NotificationService.getNotificationStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// 🔗 POST /api/notifications/webhook - Receber notificações via webhook
router.post('/webhook', async (req, res) => {
  try {
    // Verificar se há um token de webhook (opcional - adicione sua lógica de segurança)
    const webhookToken = req.headers['x-webhook-token'];
    const expectedToken = process.env.NOTIFICATION_WEBHOOK_TOKEN;
    
    if (expectedToken && webhookToken !== expectedToken) {
      return res.status(401).json({
        success: false,
        message: 'Token de webhook inválido'
      });
    }
    
    const {
      title,
      message,
      type = 'info',
      priority = 'normal',
      target = 'all',
      metadata = {},
      schedule_for,
      expires_at
    } = req.body;
    
    // Validação básica
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Título e mensagem são obrigatórios'
      });
    }
    
    const webhookData = {
      title,
      message,
      type,
      priority,
      target,
      metadata: {
        ...metadata,
        webhook_source: req.headers['user-agent'] || 'unknown',
        webhook_ip: req.ip
      },
      schedule_for,
      expires_at
    };
    
    const notification = await NotificationService.processWebhookNotification(
      webhookData, 
      'external_webhook'
    );
    
    res.status(201).json({
      success: true,
      message: 'Notificação processada via webhook',
      data: {
        notification: {
          id: notification.id,
          title: notification.title,
          type: notification.type,
          created_at: notification.created_at
        }
      }
    });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erro ao processar webhook'
    });
  }
});

// 📋 GET /api/notifications/admin/list - Listar todas as notificações (apenas ADMINISTRADOR)
router.get('/admin/list', authMiddleware.verifyToken, authMiddleware.requireRole(['ADMINISTRADOR']), async (req, res) => {
  try {
    const { search = '', type = 'all', priority = 'all', active = 'all' } = req.query;
    const { page, limit, offset } = getPaginationParams(req.query);
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    let paramCount = 0;
    
    // Filtros
    if (search) {
      paramCount++;
      whereClause += ` AND (title ILIKE $${paramCount} OR message ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (type !== 'all') {
      paramCount++;
      whereClause += ` AND type = $${paramCount}`;
      params.push(type);
    }
    
    if (priority !== 'all') {
      paramCount++;
      whereClause += ` AND priority = $${paramCount}`;
      params.push(priority);
    }
    
    if (active !== 'all') {
      paramCount++;
      whereClause += ` AND is_active = $${paramCount}`;
      params.push(active === 'true');
    }
    
    // Buscar notificações
    const notificationsQuery = `
      SELECT 
        id, title, message, type, priority, target_audience,
        target_company_id, target_user_id, target_roles,
        is_active, schedule_for, expires_at, metadata,
        created_by, created_at, updated_at
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limit, offset);
    
    const notifications = await db.query(notificationsQuery, params);
    
    // Contar total
    const countQuery = `
      SELECT COUNT(*) 
      FROM notifications
      ${whereClause}
    `;
    const countParams = params.slice(0, paramCount);
    const totalResult = await db.query(countQuery, countParams);
    const total = parseInt(totalResult.rows[0].count);
    
    // Criar resposta com paginação
    const pagination = createPaginationResponse(total, page, limit, 'notifications');
    
    res.status(200).json({
      success: true,
      data: {
        notifications: notifications.rows.map(row => ({
          ...row,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
        })),
        pagination
      }
    });
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;
