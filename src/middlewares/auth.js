const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Middleware d'authentification JWT
 */
const authenticateToken = (req, res, next) => {
  try {
    // Récupérer le token depuis les headers ou les cookies
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.split(' ')[1] 
      : req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token d\'authentification requis'
      });
    }

    // Vérifier le token
    jwt.verify(token, process.env.JWT_SECRET || 'votre-secret-jwt-par-defaut', (err, user) => {
      if (err) {
        logger.warn('Token JWT invalide:', err.message);
        return res.status(403).json({
          success: false,
          error: 'Token invalide ou expiré'
        });
      }

      // Ajouter les informations utilisateur à la requête
      req.user = user;
      next();
    });
  } catch (error) {
    logger.error('Erreur dans authenticateToken middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur d\'authentification'
    });
  }
};

/**
 * Middleware pour vérifier les rôles
 */
const checkRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Non authentifié'
        });
      }

      const { supabase } = require('../config/database');
      
      // Récupérer l'utilisateur depuis la base de données
      const { data: user, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error || !user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      // Vérifier le rôle
      if (!allowedRoles.includes(user.role)) {
        logger.warn(`Accès refusé pour l'utilisateur ${req.user.id} avec rôle ${user.role}`);
        return res.status(403).json({
          success: false,
          error: `Permission refusée. Rôles autorisés: ${allowedRoles.join(', ')}`
        });
      }

      // Ajouter le rôle complet à la requête
      req.user.role = user.role;
      next();
    } catch (error) {
      logger.error('Erreur dans checkRole middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur de vérification des permissions'
      });
    }
  };
};

/**
 * Middleware pour vérifier la propriété (user peut modifier ses propres données)
 */
const checkOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Non authentifié'
        });
      }

      const { id } = req.params;
      const { supabase } = require('../config/database');

      // Vérifier si l'utilisateur est admin (peut tout modifier)
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (user?.role === 'admin') {
        return next();
      }

      // Vérifier la propriété selon le type de ressource
      let isOwner = false;

      switch (resourceType) {
        case 'profile':
          // Un utilisateur peut modifier son propre profil
          isOwner = req.user.id === id || req.user.id === req.params.userId;
          break;

        case 'lot':
          // Vérifier si l'utilisateur est responsable du lot
          const { data: lot } = await supabase
            .from('lots')
            .select('responsable_id')
            .eq('id', id)
            .single();
          isOwner = lot?.responsable_id === req.user.id;
          break;

        case 'building':
          // Vérifier si l'utilisateur est responsable du bâtiment
          const { data: building } = await supabase
            .from('batiments')
            .select('responsable_id')
            .eq('id', id)
            .single();
          isOwner = building?.responsable_id === req.user.id;
          break;

        default:
          // Par défaut, seul l'admin peut modifier
          isOwner = false;
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Vous n\'êtes pas autorisé à modifier cette ressource'
        });
      }

      next();
    } catch (error) {
      logger.error(`Erreur dans checkOwnership middleware pour ${resourceType}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur de vérification de propriété'
      });
    }
  };
};

/**
 * Middleware pour limiter les tentatives de connexion
 */
const rateLimitLogin = (req, res, next) => {
  // Implémentation simple - dans un vrai projet, utiliser redis ou une base de données
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  // Ceci est une implémentation simplifiée
  // Dans un vrai projet, stocker ces données dans Redis
  req.loginAttempts = req.loginAttempts || {};

  if (!req.loginAttempts[ip]) {
    req.loginAttempts[ip] = {
      count: 0,
      firstAttempt: now
    };
  }

  const attempts = req.loginAttempts[ip];

  // Réinitialiser si la fenêtre de temps est écoulée
  if (now - attempts.firstAttempt > windowMs) {
    attempts.count = 0;
    attempts.firstAttempt = now;
  }

  // Vérifier si la limite est atteinte
  if (attempts.count >= maxAttempts) {
    const retryAfter = Math.ceil((windowMs - (now - attempts.firstAttempt)) / 1000);
    
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      success: false,
      error: `Trop de tentatives de connexion. Réessayez dans ${retryAfter} secondes`
    });
  }

  // Incrémenter le compteur
  attempts.count++;

  next();
};

/**
 * Middleware pour journaliser les requêtes d'authentification
 */
const logAuthRequests = (req, res, next) => {
  const startTime = Date.now();

  // Journaliser la réponse après son envoi
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.id || 'anonymous',
      ip: req.ip
    };

    if (req.path.includes('/auth/')) {
      if (res.statusCode >= 400) {
        logger.warn('Requête d\'authentification échouée:', logData);
      } else {
        logger.info('Requête d\'authentification:', logData);
      }
    }
  });

  next();
};

module.exports = {
  authenticateToken,
  checkRole,
  checkOwnership,
  rateLimitLogin,
  logAuthRequests
};