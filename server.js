// server.js
require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const logger = require('./src/utils/logger');
const { initializeDatabase } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

// Créer le serveur HTTP
const server = http.createServer(app);

// Fonction de démarrage
async function startServer() {
  try {
    // Initialiser la base de données (optionnel)
    try {
      logger.info('Initialisation de la base de données...');
      await initializeDatabase();
      logger.info('✅ Base de données initialisée');
    } catch (dbError) {
      logger.warn('⚠️  Impossible de se connecter à la base de données');
      logger.warn('Le serveur démarrera quand même, mais les routes API ne fonctionneront pas correctement');
    }

    // Démarrer le serveur
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`✅ Serveur démarré sur le port ${PORT}`);
      logger.info(`🌐 API disponible sur: http://localhost:${PORT}/api`);
      logger.info(`📊 Dashboard disponible sur: http://localhost:${PORT}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });

    // Gestion des erreurs serveur
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Le port ${PORT} est déjà utilisé`);
        process.exit(1);
      } else {
        logger.error('❌ Erreur serveur:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('❌ Erreur lors du démarrage:', error);
    process.exit(1);
  }
}

// Gestion de l'arrêt propre
process.on('SIGTERM', () => {
  logger.info('🛑 Signal SIGTERM reçu, arrêt du serveur...');
  server.close(() => {
    logger.info('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('🛑 Signal SIGINT reçu, arrêt du serveur...');
  server.close(() => {
    logger.info('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

// Démarrer le serveur
startServer();