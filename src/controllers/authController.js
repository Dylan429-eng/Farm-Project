const AuthModel = require('../models/authModel');
const logger = require('../utils/logger');

class AuthController {
  /**
   * Inscription d'un nouvel utilisateur
   */
  async signUp(req, res) {
    try {
      const userData = req.body;

      // Validation des données
      if (!userData.email || !userData.password) {
        return res.status(400).json({
          success: false,
          error: 'Email et mot de passe requis'
        });
      }

      // Validation de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        return res.status(400).json({
          success: false,
          error: 'Format d\'email invalide'
        });
      }

      // Validation du mot de passe
      if (userData.password.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Le mot de passe doit contenir au moins 8 caractères'
        });
      }

      const result = await AuthModel.signUp(userData);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        message: 'Utilisateur inscrit avec succès',
        ...result.data
      });
    } catch (error) {
      logger.error('Erreur dans signUp controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de l\'inscription'
      });
    }
  }

  /**
   * Connexion utilisateur
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email et mot de passe requis'
        });
      }

      const result = await AuthModel.login(email, password);
      
      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: result.error
        });
      }

      // Définir le cookie JWT (optionnel)
      res.cookie('token', result.data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
        sameSite: 'strict'
      });

      res.json({
        success: true,
        message: 'Connexion réussie',
        ...result.data
      });
    } catch (error) {
      logger.error('Erreur dans login controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la connexion'
      });
    }
  }

  /**
   * Déconnexion utilisateur
   */
  async logout(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Non autorisé'
        });
      }

      const result = await AuthModel.logout(userId);
      
      // Supprimer le cookie
      res.clearCookie('token');

      res.json({
        success: true,
        message: result.message || 'Déconnexion réussie'
      });
    } catch (error) {
      logger.error('Erreur dans logout controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la déconnexion'
      });
    }
  }

  /**
   * Récupérer le profil utilisateur
   */
  async getProfile(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Non autorisé'
        });
      }

      const result = await AuthModel.getProfile(userId);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Erreur dans getProfile controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération du profil'
      });
    }
  }

  /**
   * Mettre à jour le profil utilisateur
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user?.id;
      const updateData = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Non autorisé'
        });
      }

      const result = await AuthModel.updateProfile(userId, updateData);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: result.data
      });
    } catch (error) {
      logger.error('Erreur dans updateProfile controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la mise à jour du profil'
      });
    }
  }

  /**
   * Changer le mot de passe
   */
  async changePassword(req, res) {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Non autorisé'
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Ancien et nouveau mot de passe requis'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
        });
      }

      const result = await AuthModel.changePassword(userId, currentPassword, newPassword);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Erreur dans changePassword controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors du changement de mot de passe'
      });
    }
  }

  /**
   * Demander la réinitialisation du mot de passe
   */
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email requis'
        });
      }

      const result = await AuthModel.requestPasswordReset(email);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Erreur dans requestPasswordReset controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la demande de réinitialisation'
      });
    }
  }

  /**
   * Réinitialiser le mot de passe
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token et nouveau mot de passe requis'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
        });
      }

      const result = await AuthModel.resetPassword(token, newPassword);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Erreur dans resetPassword controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la réinitialisation du mot de passe'
      });
    }
  }

  /**
   * Vérifier le token JWT
   */
  async verifyToken(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Token manquant'
        });
      }

      const result = AuthModel.verifyToken(token);
      
      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Erreur dans verifyToken controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la vérification du token'
      });
    }
  }

  /**
   * Lister tous les utilisateurs (admin seulement)
   */
  async getAllUsers(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Non autorisé'
        });
      }

      // Vérifier les permissions admin
      const hasPermission = await AuthModel.checkPermission(userId, 'admin');
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Permission refusée. Admin requis'
        });
      }

      const filters = {
        role: req.query.role,
        status: req.query.status,
        search: req.query.search
      };

      const result = await AuthModel.getAllUsers(filters);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        count: result.data.length,
        data: result.data
      });
    } catch (error) {
      logger.error('Erreur dans getAllUsers controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des utilisateurs'
      });
    }
  }

  /**
   * Mettre à jour le rôle d'un utilisateur (admin seulement)
   */
  async updateUserRole(req, res) {
    try {
      const adminId = req.user?.id;
      const { userId } = req.params;
      const { role } = req.body;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Non autorisé'
        });
      }

      // Vérifier les permissions admin
      const hasPermission = await AuthModel.checkPermission(adminId, 'admin');
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Permission refusée. Admin requis'
        });
      }

      if (!userId || !role) {
        return res.status(400).json({
          success: false,
          error: 'ID utilisateur et rôle requis'
        });
      }

      const result = await AuthModel.updateUserRole(userId, role);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Rôle utilisateur mis à jour avec succès',
        data: result.data
      });
    } catch (error) {
      logger.error('Erreur dans updateUserRole controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la mise à jour du rôle'
      });
    }
  }

  /**
   * Activer/désactiver un utilisateur (admin seulement)
   */
  async toggleUserStatus(req, res) {
    try {
      const adminId = req.user?.id;
      const { userId } = req.params;
      const { status } = req.body;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Non autorisé'
        });
      }

      // Vérifier les permissions admin
      const hasPermission = await AuthModel.checkPermission(adminId, 'admin');
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Permission refusée. Admin requis'
        });
      }

      if (!userId || !status) {
        return res.status(400).json({
          success: false,
          error: 'ID utilisateur et statut requis'
        });
      }

      const result = await AuthModel.toggleUserStatus(userId, status);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Statut utilisateur mis à jour avec succès',
        data: result.data
      });
    } catch (error) {
      logger.error('Erreur dans toggleUserStatus controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la mise à jour du statut'
      });
    }
  }

  /**
   * Vérifier les permissions utilisateur
   */
  async checkUserPermissions(req, res) {
    try {
      const userId = req.user?.id;
      const { requiredRole } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Non autorisé'
        });
      }

      if (!requiredRole) {
        return res.status(400).json({
          success: false,
          error: 'Rôle requis manquant'
        });
      }

      const hasPermission = await AuthModel.checkPermission(userId, requiredRole);
      
      res.json({
        success: true,
        has_permission: hasPermission,
        user_id: userId,
        required_role: requiredRole
      });
    } catch (error) {
      logger.error('Erreur dans checkUserPermissions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la vérification des permissions'
      });
    }
  }

  /**
   * Rafraîchir le token
   */
  async refreshToken(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Token manquant'
        });
      }

      // Vérifier le token actuel
      const result = AuthModel.verifyToken(token);
      
      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: result.error
        });
      }

      // Récupérer l'utilisateur
      const { data: user } = await AuthModel.getProfile(result.data.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      // Générer un nouveau token
      const newToken = AuthModel.generateToken(user);

      // Mettre à jour le cookie
      res.cookie('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'strict'
      });

      res.json({
        success: true,
        message: 'Token rafraîchi avec succès',
        token: newToken
      });
    } catch (error) {
      logger.error('Erreur dans refreshToken controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors du rafraîchissement du token'
      });
    }
  }
}

module.exports = new AuthController();