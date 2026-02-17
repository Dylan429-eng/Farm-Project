const { supabase } = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

class AuthModel {
  /**
   * Inscription d'un nouvel utilisateur
   */
  async signUp(userData) {
    try {
      // Validation des données
      if (!userData.email || !userData.password) {
        return { 
          success: false, 
          error: 'Email et mot de passe requis' 
        };
      }

      // Vérifier si l'utilisateur existe déjà
      const { data: existingUser, error: checkError } = await supabase
        .from('users') // Note: Tu dois créer cette table dans Supabase
        .select('id')
        .eq('email', userData.email)
        .single();

      if (existingUser) {
        return { 
          success: false, 
          error: 'Un utilisateur avec cet email existe déjà' 
        };
      }

      // Hasher le mot de passe
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Créer l'utilisateur
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          email: userData.email,
          password_hash: hashedPassword,
          nom: userData.nom || '',
          prenom: userData.prenom || '',
          role: userData.role || 'user',
          statut: 'active',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) throw createError;

      // Générer un token JWT
      const token = this.generateToken(newUser);

      logger.info(`Nouvel utilisateur inscrit: ${userData.email}`);
      return { 
        success: true, 
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            nom: newUser.nom,
            prenom: newUser.prenom,
            role: newUser.role
          },
          token
        }
      };
    } catch (error) {
      logger.error('Erreur dans signUp:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Connexion utilisateur
   */
  async login(email, password) {
    try {
      // Récupérer l'utilisateur
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError) {
        return { 
          success: false, 
          error: 'Email ou mot de passe incorrect' 
        };
      }

      // Vérifier le statut
      if (user.statut !== 'active') {
        return { 
          success: false, 
          error: 'Compte désactivé. Contactez l\'administrateur' 
        };
      }

      // Vérifier le mot de passe
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      
      if (!passwordMatch) {
        return { 
          success: false, 
          error: 'Email ou mot de passe incorrect' 
        };
      }

      // Mettre à jour la dernière connexion
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Générer un token JWT
      const token = this.generateToken(user);

      logger.info(`Utilisateur connecté: ${email}`);
      return { 
        success: true, 
        data: {
          user: {
            id: user.id,
            email: user.email,
            nom: user.nom,
            prenom: user.prenom,
            role: user.role,
            last_login: user.last_login
          },
          token
        }
      };
    } catch (error) {
      logger.error('Erreur dans login:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Générer un token JWT
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'votre-secret-jwt-par-defaut',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  /**
   * Vérifier un token JWT
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'votre-secret-jwt-par-defaut'
      );
      return { success: true, data: decoded };
    } catch (error) {
      return { success: false, error: 'Token invalide ou expiré' };
    }
  }

  /**
   * Déconnexion utilisateur
   */
  async logout(userId) {
    try {
      // Ici, tu pourrais invalider le token côté serveur
      // Pour un système simple, on se contente de logger l'action
      logger.info(`Utilisateur déconnecté: ${userId}`);
      return { success: true, message: 'Déconnexion réussie' };
    } catch (error) {
      logger.error('Erreur dans logout:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer le profil utilisateur
   */
  async getProfile(userId) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, nom, prenom, role, statut, created_at, last_login')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return { success: true, data: user };
    } catch (error) {
      logger.error(`Erreur dans getProfile pour utilisateur ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mettre à jour le profil utilisateur
   */
  async updateProfile(userId, updateData) {
    try {
      // Ne pas permettre la mise à jour de certains champs
      delete updateData.id;
      delete updateData.email;
      delete updateData.role;
      delete updateData.password_hash;

      // Hasher le mot de passe si fourni
      if (updateData.password) {
        const saltRounds = 10;
        updateData.password_hash = await bcrypt.hash(updateData.password, saltRounds);
        delete updateData.password;
      }

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id, email, nom, prenom, role, statut, updated_at')
        .single();

      if (error) throw error;

      logger.info(`Profil mis à jour pour utilisateur ${userId}`);
      return { success: true, data: updatedUser };
    } catch (error) {
      logger.error(`Erreur dans updateProfile pour utilisateur ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Changer le mot de passe
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Récupérer l'utilisateur
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Vérifier l'ancien mot de passe
      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
      
      if (!passwordMatch) {
        return { 
          success: false, 
          error: 'Mot de passe actuel incorrect' 
        };
      }

      // Hasher le nouveau mot de passe
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Mettre à jour
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          password_hash: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      logger.info(`Mot de passe changé pour utilisateur ${userId}`);
      return { success: true, message: 'Mot de passe changé avec succès' };
    } catch (error) {
      logger.error(`Erreur dans changePassword pour utilisateur ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Réinitialiser le mot de passe (demande)
   */
  async requestPasswordReset(email) {
    try {
      // Vérifier si l'utilisateur existe
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

      if (userError) {
        // Pour la sécurité, ne pas révéler si l'email existe ou non
        logger.info(`Demande de réinitialisation pour email inconnu: ${email}`);
        return { 
          success: true, 
          message: 'Si cet email existe, vous recevrez un lien de réinitialisation' 
        };
      }

      // Générer un token de réinitialisation
      const resetToken = jwt.sign(
        { userId: user.id, action: 'password_reset' },
        process.env.JWT_SECRET || 'votre-secret-jwt-par-defaut',
        { expiresIn: '1h' }
      );

      // Enregistrer le token (dans une table reset_tokens ou dans l'utilisateur)
      await supabase
        .from('users')
        .update({ 
          reset_token: resetToken,
          reset_token_expiry: new Date(Date.now() + 3600000).toISOString() // 1 heure
        })
        .eq('id', user.id);

      // Ici, tu enverrais normalement un email avec le lien
      // Pour l'instant, on retourne le token (en dev seulement!)
      if (process.env.NODE_ENV === 'development') {
        logger.info(`Token de réinitialisation pour ${email}: ${resetToken}`);
      }

      logger.info(`Demande de réinitialisation pour ${email}`);
      return { 
        success: true, 
        message: 'Lien de réinitialisation envoyé (simulé en dev)' 
      };
    } catch (error) {
      logger.error('Erreur dans requestPasswordReset:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Réinitialiser le mot de passe (confirmation)
   */
  async resetPassword(token, newPassword) {
    try {
      // Vérifier le token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'votre-secret-jwt-par-defaut'
      );

      if (decoded.action !== 'password_reset') {
        return { success: false, error: 'Token invalide' };
      }

      // Vérifier que le token est toujours valide dans la base
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, reset_token, reset_token_expiry')
        .eq('id', decoded.userId)
        .single();

      if (userError) throw userError;

      if (!user.reset_token || user.reset_token !== token) {
        return { success: false, error: 'Token invalide ou déjà utilisé' };
      }

      const expiryDate = new Date(user.reset_token_expiry);
      if (expiryDate < new Date()) {
        return { success: false, error: 'Token expiré' };
      }

      // Hasher le nouveau mot de passe
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Mettre à jour le mot de passe et invalider le token
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          password_hash: hashedPassword,
          reset_token: null,
          reset_token_expiry: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', decoded.userId);

      if (updateError) throw updateError;

      logger.info(`Mot de passe réinitialisé pour utilisateur ${decoded.userId}`);
      return { success: true, message: 'Mot de passe réinitialisé avec succès' };
    } catch (error) {
      logger.error('Erreur dans resetPassword:', error);
      return { success: false, error: 'Token invalide ou expiré' };
    }
  }

  /**
   * Vérifier les permissions utilisateur
   */
  async checkPermission(userId, requiredRole) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Rôles hiérarchiques (admin > manager > user)
      const roleHierarchy = {
        user: 1,
        manager: 2,
        admin: 3
      };

      const userLevel = roleHierarchy[user.role] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 0;

      return userLevel >= requiredLevel;
    } catch (error) {
      logger.error(`Erreur dans checkPermission pour utilisateur ${userId}:`, error);
      return false;
    }
  }

  /**
   * Lister tous les utilisateurs (admin seulement)
   */
  async getAllUsers(filters = {}) {
    try {
      let query = supabase
        .from('users')
        .select('id, email, nom, prenom, role, statut, created_at, last_login')
        .order('created_at', { ascending: false });

      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      
      if (filters.status) {
        query = query.eq('statut', filters.status);
      }
      
      if (filters.search) {
        query = query.or(`email.ilike.%${filters.search}%,nom.ilike.%${filters.search}%,prenom.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error('Erreur dans getAllUsers:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mettre à jour le rôle d'un utilisateur (admin seulement)
   */
  async updateUserRole(userId, newRole) {
    try {
      const validRoles = ['user', 'manager', 'admin'];
      
      if (!validRoles.includes(newRole)) {
        return { 
          success: false, 
          error: 'Rôle invalide. Rôles valides: user, manager, admin' 
        };
      }

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id, email, role')
        .single();

      if (error) throw error;

      logger.info(`Rôle mis à jour pour utilisateur ${userId}: ${newRole}`);
      return { success: true, data: updatedUser };
    } catch (error) {
      logger.error(`Erreur dans updateUserRole pour utilisateur ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Activer/désactiver un utilisateur (admin seulement)
   */
  async toggleUserStatus(userId, status) {
    try {
      const validStatuses = ['active', 'suspended', 'inactive'];
      
      if (!validStatuses.includes(status)) {
        return { 
          success: false, 
          error: 'Statut invalide. Statuts valides: active, suspended, inactive' 
        };
      }

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ 
          statut: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id, email, statut')
        .single();

      if (error) throw error;

      logger.info(`Statut mis à jour pour utilisateur ${userId}: ${status}`);
      return { success: true, data: updatedUser };
    } catch (error) {
      logger.error(`Erreur dans toggleUserStatus pour utilisateur ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AuthModel();