const logger = require('../utils/logger');

/**
 * Middleware de gestion des erreurs
 */
const errorHandler = (err, req, res, next) => {
  // Loguer l'erreur
  logger.error('Erreur non gérée:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?.id || 'anonymous'
  });

  // Déterminer le statut HTTP
  const statusCode = err.statusCode || err.status || 500;

  // Préparer la réponse d'erreur
  const errorResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Une erreur est survenue'
      : err.message,
    path: req.path,
    timestamp: new Date().toISOString()
  };

  // Ajouter la stack trace en développement
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Ajouter des informations supplémentaires si disponibles
  if (err.details) {
    errorResponse.details = err.details;
  }

  // Envoyer la réponse
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware pour les routes non trouvées
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route non trouvée: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Middleware de validation des requêtes
 */
const validationErrorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError' || err.name === 'SyntaxError') {
    return res.status(400).json({
      success: false,
      error: 'Erreur de validation des données',
      details: err.message
    });
  }
  next(err);
};

/**
 * Middleware pour les erreurs JWT
 */
const jwtErrorHandler = (err, req, res, next) => {
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token JWT invalide'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token JWT expiré'
    });
  }
  
  next(err);
};

/**
 * Middleware pour les erreurs de base de données
 */
const databaseErrorHandler = (err, req, res, next) => {
  if (err.code && err.code.startsWith('PGRST') || err.code === '23505') {
    // Erreurs PostgreSQL/Supabase
    let message = 'Erreur de base de données';
    
    if (err.code === '23505') {
      message = 'Violation de contrainte d\'unicité';
    } else if (err.code === '23503') {
      message = 'Violation de contrainte de clé étrangère';
    } else if (err.code === 'PGRST116') {
      message = 'Enregistrement non trouvé';
    }
    
    return res.status(400).json({
      success: false,
      error: message,
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
  
  next(err);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  validationErrorHandler,
  jwtErrorHandler,
  databaseErrorHandler
};