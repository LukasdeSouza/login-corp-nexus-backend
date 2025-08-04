const db = require('../config/database');

class NotificationService {
  
  // 🔍 Buscar notificações para um usuário específico
  static async getNotificationsForUser(userId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        includeRead = true, 
        types = [], 
        priorities = [] 
      } = options;
      
      const offset = (page - 1) * limit;
      
      // Buscar dados do usuário para filtros
      const userResult = await db.query(`
        SELECT company_id, role FROM users WHERE id = $1
      `, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('Usuário não encontrado');
      }
      
      const { company_id, role } = userResult.rows[0];
      
      // Construir query dinamicamente
      let whereConditions = [
        `n.is_active = true`,
        `(n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)`,
        `(n.schedule_for IS NULL OR n.schedule_for <= CURRENT_TIMESTAMP)`,
        `(
          n.target_audience = 'all' 
          OR (n.target_audience = 'company' AND n.target_company_id = $2)
          OR (n.target_audience = 'user' AND n.target_user_id = $1)
          OR (n.target_audience = 'role' AND $3 = ANY(n.target_roles))
        )`
      ];
      
      let params = [userId, company_id, role];
      let paramCount = 3;
      
      // Filtro por tipos
      if (types.length > 0) {
        paramCount++;
        whereConditions.push(`n.type = ANY($${paramCount})`);
        params.push(types);
      }
      
      // Filtro por prioridades
      if (priorities.length > 0) {
        paramCount++;
        whereConditions.push(`n.priority = ANY($${paramCount})`);
        params.push(priorities);
      }
      
      // Filtro para incluir/excluir lidas
      if (!includeRead) {
        whereConditions.push(`nr.id IS NULL`);
      }
      
      const query = `
        SELECT 
          n.id, n.title, n.message, n.type, n.priority, 
          n.target_audience, n.metadata, n.created_by,
          n.created_at, n.schedule_for, n.expires_at,
          nr.read_at,
          CASE WHEN nr.id IS NOT NULL THEN true ELSE false END as is_read
        FROM notifications n
        LEFT JOIN notification_reads nr ON (n.id = nr.notification_id AND nr.user_id = $1)
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY 
          CASE WHEN nr.id IS NULL THEN 0 ELSE 1 END,
          n.priority DESC,
          n.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      params.push(limit, offset);
      
      const result = await db.query(query, params);
      
      // Contar total
      const countQuery = `
        SELECT COUNT(*)
        FROM notifications n
        LEFT JOIN notification_reads nr ON (n.id = nr.notification_id AND nr.user_id = $1)
        WHERE ${whereConditions.join(' AND ')}
      `;
      
      const countParams = params.slice(0, paramCount);
      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);
      
      // Contar não lidas
      const unreadQuery = `
        SELECT COUNT(*)
        FROM notifications n
        LEFT JOIN notification_reads nr ON (n.id = nr.notification_id AND nr.user_id = $1)
        WHERE ${whereConditions.join(' AND ')} AND nr.id IS NULL
      `;
      
      const unreadResult = await db.query(unreadQuery, countParams);
      const unreadCount = parseInt(unreadResult.rows[0].count);
      
      return {
        notifications: result.rows.map(row => ({
          ...row,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        unreadCount
      };
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      throw error;
    }
  }
  
  // ✅ Marcar notificação como lida
  static async markAsRead(notificationId, userId) {
    try {
      await db.query(`
        INSERT INTO notification_reads (notification_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (notification_id, user_id) DO NOTHING
      `, [notificationId, userId]);
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  }
  
  // ✅ Marcar várias notificações como lidas
  static async markMultipleAsRead(notificationIds, userId) {
    try {
      const values = notificationIds.map((id, index) => 
        `($${index * 2 + 1}, $${index * 2 + 2})`
      ).join(', ');
      
      const params = notificationIds.flatMap(id => [id, userId]);
      
      await db.query(`
        INSERT INTO notification_reads (notification_id, user_id)
        VALUES ${values}
        ON CONFLICT (notification_id, user_id) DO NOTHING
      `, params);
      
      return { success: true, marked: notificationIds.length };
    } catch (error) {
      console.error('Erro ao marcar notificações como lidas:', error);
      throw error;
    }
  }
  
  // 📝 Criar nova notificação (para admins/sistema)
  static async createNotification(notificationData) {
    try {
      const {
        title,
        message,
        type = 'info',
        priority = 'normal',
        target_audience = 'all',
        target_company_id = null,
        target_user_id = null,
        target_roles = null,
        schedule_for = null,
        expires_at = null,
        metadata = {},
        created_by = 'system'
      } = notificationData;
      
      // Validações
      if (!title || !message) {
        throw new Error('Título e mensagem são obrigatórios');
      }
      
      const validTypes = ['info', 'warning', 'error', 'success', 'maintenance', 'feature', 'update'];
      if (!validTypes.includes(type)) {
        throw new Error('Tipo de notificação inválido');
      }
      
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        throw new Error('Prioridade inválida');
      }
      
      const validAudiences = ['all', 'company', 'user', 'role'];
      if (!validAudiences.includes(target_audience)) {
        throw new Error('Audiência alvo inválida');
      }
      
      // Validações específicas por audiência
      if (target_audience === 'company' && !target_company_id) {
        throw new Error('ID da empresa é obrigatório para audiência "company"');
      }
      
      if (target_audience === 'user' && !target_user_id) {
        throw new Error('ID do usuário é obrigatório para audiência "user"');
      }
      
      if (target_audience === 'role' && (!target_roles || target_roles.length === 0)) {
        throw new Error('Roles são obrigatórias para audiência "role"');
      }
      
      const result = await db.query(`
        INSERT INTO notifications (
          title, message, type, priority, target_audience,
          target_company_id, target_user_id, target_roles,
          schedule_for, expires_at, metadata, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        title, message, type, priority, target_audience,
        target_company_id, target_user_id, target_roles,
        schedule_for, expires_at, JSON.stringify(metadata), created_by
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
  }
  
  // 🗑️ Desativar notificação
  static async deactivateNotification(notificationId) {
    try {
      const result = await db.query(`
        UPDATE notifications 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [notificationId]);
      
      if (result.rows.length === 0) {
        throw new Error('Notificação não encontrada');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Erro ao desativar notificação:', error);
      throw error;
    }
  }
  
  // 📊 Estatísticas de notificações para admin
  static async getNotificationStats() {
    try {
      const stats = await db.query(`
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_notifications,
          COUNT(CASE WHEN type = 'urgent' THEN 1 END) as urgent_notifications,
          COUNT(CASE WHEN expires_at < CURRENT_TIMESTAMP THEN 1 END) as expired_notifications,
          COUNT(CASE WHEN schedule_for > CURRENT_TIMESTAMP THEN 1 END) as scheduled_notifications
        FROM notifications
      `);
      
      const readStats = await db.query(`
        SELECT 
          n.type,
          COUNT(*) as sent,
          COUNT(nr.id) as read,
          ROUND(COUNT(nr.id) * 100.0 / COUNT(*), 2) as read_percentage
        FROM notifications n
        LEFT JOIN notification_reads nr ON n.id = nr.notification_id
        WHERE n.is_active = true
        GROUP BY n.type
        ORDER BY sent DESC
      `);
      
      return {
        overview: stats.rows[0],
        byType: readStats.rows
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }
  
  // 🔄 Webhook para receber notificações externas
  static async processWebhookNotification(webhookData, source = 'webhook') {
    try {
      const {
        title,
        message,
        type = 'info',
        priority = 'normal',
        target = 'all',
        metadata = {},
        schedule_for = null,
        expires_at = null
      } = webhookData;
      
      // Processar dados do webhook
      const notificationData = {
        title,
        message,
        type,
        priority,
        target_audience: target,
        metadata: { ...metadata, source, webhook_received_at: new Date() },
        created_by: source,
        schedule_for,
        expires_at
      };
      
      return await this.createNotification(notificationData);
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
