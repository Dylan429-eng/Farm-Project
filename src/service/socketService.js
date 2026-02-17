const logger = require('../utils/logger');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
  }

  /**
   * Initialiser le service Socket.io
   */
  initialize(io) {
    this.io = io;
    
    io.on('connection', (socket) => {
      const clientId = socket.id;
      logger.info(`🔌 Client WebSocket connecté: ${clientId}`);
      
      // Stocker les informations du client
      this.connectedClients.set(clientId, {
        socket,
        connectedAt: new Date(),
        userId: socket.handshake.query.userId
      });

      // Gérer les événements personnalisés
      socket.on('subscribe_alerts', (data) => {
        this.handleSubscribeAlerts(socket, data);
      });

      socket.on('subscribe_iot', (data) => {
        this.handleSubscribeIoT(socket, data);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(clientId);
      });
    });

    logger.info('✅ Service WebSocket initialisé');
  }

  /**
   * Gérer la souscription aux alertes
   */
  handleSubscribeAlerts(socket, data) {
    const room = `alerts-${data.buildingId || 'all'}`;
    socket.join(room);
    logger.info(`📡 Client ${socket.id} abonné aux alertes: ${room}`);
  }

  /**
   * Gérer la souscription aux données IoT
   */
  handleSubscribeIoT(socket, data) {
    const room = `iot-${data.buildingId}`;
    socket.join(room);
    logger.info(`📡 Client ${socket.id} abonné aux données IoT: ${room}`);
  }

  /**
   * Gérer la déconnexion
   */
  handleDisconnect(clientId) {
    this.connectedClients.delete(clientId);
    logger.info(`🔌 Client WebSocket déconnecté: ${clientId}`);
  }

  /**
   * Diffuser une nouvelle alerte
   */
  broadcastAlert(alert) {
    if (!this.io) {
      logger.warn('Service WebSocket non initialisé');
      return;
    }

    // Diffuser à tous les clients abonnés aux alertes
    this.io.to('alerts-all').emit('new_alert', {
      type: 'alert',
      data: alert,
      timestamp: new Date().toISOString()
    });

    // Diffuser aux clients spécifiques au bâtiment
    if (alert.batiment_id) {
      this.io.to(`alerts-${alert.batiment_id}`).emit('new_alert', {
        type: 'alert',
        data: alert,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`📢 Alerte diffusée via WebSocket: ${alert.titre}`);
  }

  /**
   * Diffuser des données IoT mises à jour
   */
  broadcastIotData(buildingId, iotData) {
    if (!this.io) {
      logger.warn('Service WebSocket non initialisé');
      return;
    }

    this.io.to(`iot-${buildingId}`).emit('iot_update', {
      type: 'iot_data',
      buildingId,
      data: iotData,
      timestamp: new Date().toISOString()
    });

    logger.debug(`📡 Données IoT diffusées pour bâtiment ${buildingId}`);
  }

  /**
   * Diffuser une mise à jour en temps réel
   */
  broadcastRealtimeUpdate(updateType, data) {
    if (!this.io) {
      logger.warn('Service WebSocket non initialisé');
      return;
    }

    this.io.emit('realtime_update', {
      type: updateType,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Envoyer une notification à un utilisateur spécifique
   */
  sendToUser(userId, event, data) {
    if (!this.io) {
      logger.warn('Service WebSocket non initialisé');
      return;
    }

    // Trouver tous les sockets de cet utilisateur
    for (const [clientId, clientInfo] of this.connectedClients.entries()) {
      if (clientInfo.userId === userId) {
        clientInfo.socket.emit(event, {
          ...data,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Obtenir les statistiques des connexions
   */
  getConnectionStats() {
    return {
      total_connected: this.connectedClients.size,
      connected_clients: Array.from(this.connectedClients.values()).map(client => ({
        clientId: client.socket.id,
        userId: client.userId,
        connectedAt: client.connectedAt
      })),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new SocketService();