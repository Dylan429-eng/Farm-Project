const AlertsModel = require('../models/alertsModel');
const logger = require('../utils/logger');

class AlertsController {
  /**
   * Récupérer toutes les alertes
   */
  async getAllAlerts(req, res) {
    try {
      const filters = {
        status: req.query.status,
        type: req.query.type,
        niveau: req.query.niveau,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined
      };

      const result = await AlertsModel.getAllAlerts(filters);
      
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
      logger.error('Erreur dans getAllAlerts controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des alertes'
      });
    }
  }

  /**
   * Récupérer les alertes actives
   */
  async getActiveAlerts(req, res) {
    try {
      const result = await AlertsModel.getActiveAlerts();
      
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
      logger.error('Erreur dans getActiveAlerts controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des alertes actives'
      });
    }
  }

  /**
   * Créer une alerte manuelle
   */
  async createAlert(req, res) {
    try {
      const alertData = req.body;

      // Validation des données requises
      if (!alertData.type_alerte || !alertData.niveau || !alertData.titre) {
        return res.status(400).json({
          success: false,
          error: 'Données incomplètes. Requis: type_alerte, niveau, titre'
        });
      }

      // Valider le niveau
      const validLevels = ['info', 'warning', 'critical'];
      if (!validLevels.includes(alertData.niveau)) {
        return res.status(400).json({
          success: false,
          error: `Niveau invalide. Valeurs autorisées: ${validLevels.join(', ')}`
        });
      }

      const result = await AlertsModel.createAlert(alertData);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        message: 'Alerte créée avec succès',
        data: result.data
      });
    } catch (error) {
      logger.error('Erreur dans createAlert controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la création de l\'alerte'
      });
    }
  }

  /**
   * Mettre à jour le statut d'une alerte
   */
  async updateAlertStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, resolved_by } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID de l\'alerte requis'
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Nouveau statut requis'
        });
      }

      // Valider le statut
      const validStatuses = ['active', 'acknowledged', 'resolved', 'ignored'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}`
        });
      }

      const result = await AlertsModel.updateAlertStatus(id, status, resolved_by);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: `Alerte marquée comme ${status}`,
        data: result.data
      });
    } catch (error) {
      logger.error(`Erreur dans updateAlertStatus controller pour alerte ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la mise à jour du statut'
      });
    }
  }

  /**
   * Marquer une alerte comme lue
   */
  async acknowledgeAlert(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID de l\'alerte requis'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Non autorisé. ID utilisateur requis'
        });
      }

      const result = await AlertsModel.acknowledgeAlert(id, userId);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Alerte marquée comme lue',
        data: result.data
      });
    } catch (error) {
      logger.error(`Erreur dans acknowledgeAlert controller pour alerte ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la reconnaissance de l\'alerte'
      });
    }
  }

  /**
   * Résoudre une alerte
   */
  async resolveAlert(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID de l\'alerte requis'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Non autorisé. ID utilisateur requis'
        });
      }

      const result = await AlertsModel.resolveAlert(id, userId);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Alerte résolue',
        data: result.data
      });
    } catch (error) {
      logger.error(`Erreur dans resolveAlert controller pour alerte ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la résolution de l\'alerte'
      });
    }
  }

  /**
   * Ignorer une alerte
   */
  async ignoreAlert(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID de l\'alerte requis'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Non autorisé. ID utilisateur requis'
        });
      }

      const result = await AlertsModel.ignoreAlert(id, userId);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Alerte ignorée',
        data: result.data
      });
    } catch (error) {
      logger.error(`Erreur dans ignoreAlert controller pour alerte ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de l\'ignorance de l\'alerte'
      });
    }
  }

  /**
   * Supprimer une alerte
   */
  async deleteAlert(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID de l\'alerte requis'
        });
      }

      const result = await AlertsModel.deleteAlert(id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: result.message || 'Alerte supprimée'
      });
    } catch (error) {
      logger.error(`Erreur dans deleteAlert controller pour alerte ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la suppression de l\'alerte'
      });
    }
  }

  /**
   * Vérifier les alertes de stock bas
   */
  async checkLowStockAlerts(req, res) {
    try {
      const result = await AlertsModel.checkLowStockAlerts();
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Vérification des stocks bas terminée',
        ...result
      });
    } catch (error) {
      logger.error('Erreur dans checkLowStockAlerts controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la vérification des stocks bas'
      });
    }
  }

  /**
   * Vérifier les alertes de mortalité élevée
   */
  async checkHighMortalityAlerts(req, res) {
    try {
      const result = await AlertsModel.checkHighMortalityAlerts();
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Vérification de la mortalité élevée terminée',
        ...result
      });
    } catch (error) {
      logger.error('Erreur dans checkHighMortalityAlerts controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la vérification de la mortalité élevée'
      });
    }
  }

  /**
   * Vérifier les alertes environnementales
   */
  async checkEnvironmentalAlerts(req, res) {
    try {
      const result = await AlertsModel.checkEnvironmentalAlerts();
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Vérification environnementale terminée',
        ...result
      });
    } catch (error) {
      logger.error('Erreur dans checkEnvironmentalAlerts controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la vérification environnementale'
      });
    }
  }

  /**
   * Exécuter toutes les vérifications d'alertes
   */
  async runAllAlertChecks(req, res) {
    try {
      const result = await AlertsModel.runAllAlertChecks();
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Toutes les vérifications d\'alertes exécutées',
        ...result
      });
    } catch (error) {
      logger.error('Erreur dans runAllAlertChecks controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de l\'exécution des vérifications'
      });
    }
  }

  /**
   * Récupérer les statistiques des alertes
   */
  async getAlertStatistics(req, res) {
    try {
      const { days = 30 } = req.query;

      const result = await AlertsModel.getAlertStatistics(parseInt(days));
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        period_days: days,
        ...result.statistics
      });
    } catch (error) {
      logger.error('Erreur dans getAlertStatistics controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des statistiques'
      });
    }
  }

  /**
   * Rechercher des alertes
   */
  async searchAlerts(req, res) {
    try {
      const { query } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Terme de recherche requis'
        });
      }

      const { supabase } = require('../config/database');
      
      const { data, error } = await supabase
        .from('alertes')
        .select(`
          *,
          lots (reference),
          batiments (nom),
          stocks (nom_produit)
        `)
        .or(`titre.ilike.%${query}%,description.ilike.%${query}%,lots.reference.ilike.%${query}%,batiments.nom.ilike.%${query}%,stocks.nom_produit.ilike.%${query}%`)
        .order('date_detection', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('Erreur dans searchAlerts:', error);
        return res.status(400).json({
          success: false,
          error: 'Erreur lors de la recherche'
        });
      }

      res.json({
        success: true,
        count: data.length,
        data: data
      });
    } catch (error) {
      logger.error('Erreur dans searchAlerts controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la recherche'
      });
    }
  }

  /**
   * Récupérer les alertes par type
   */
  async getAlertsByType(req, res) {
    try {
      const { type } = req.params;
      const { limit = 50 } = req.query;

      if (!type) {
        return res.status(400).json({
          success: false,
          error: 'Type d\'alerte requis'
        });
      }

      const { supabase } = require('../config/database');
      
      const { data, error } = await supabase
        .from('alertes')
        .select(`
          *,
          lots (reference),
          batiments (nom),
          stocks (nom_produit)
        `)
        .eq('type_alerte', type)
        .order('date_detection', { ascending: false })
        .limit(parseInt(limit));

      if (error) {
        logger.error(`Erreur dans getAlertsByType pour type ${type}:`, error);
        return res.status(400).json({
          success: false,
          error: 'Erreur lors de la récupération des alertes'
        });
      }

      // Calculer les statistiques par niveau
      const stats = {
        total: data.length,
        critical: data.filter(a => a.niveau === 'critical').length,
        warning: data.filter(a => a.niveau === 'warning').length,
        info: data.filter(a => a.niveau === 'info').length,
        active: data.filter(a => a.statut === 'active').length,
        resolved: data.filter(a => a.statut === 'resolved').length
      };

      res.json({
        success: true,
        type: type,
        statistics: stats,
        data: data
      });
    } catch (error) {
      logger.error(`Erreur dans getAlertsByType controller pour type ${req.params.type}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des alertes par type'
      });
    }
  }

  /**
   * Récupérer les alertes récentes (dernières 24h)
   */
  async getRecentAlerts(req, res) {
    try {
      const { hours = 24 } = req.query;

      const startDate = new Date();
      startDate.setHours(startDate.getHours() - parseInt(hours));

      const { supabase } = require('../config/database');
      
      const { data, error } = await supabase
        .from('alertes')
        .select(`
          *,
          lots (reference),
          batiments (nom),
          stocks (nom_produit)
        `)
        .gte('date_detection', startDate.toISOString())
        .order('date_detection', { ascending: false });

      if (error) {
        logger.error('Erreur dans getRecentAlerts:', error);
        return res.status(400).json({
          success: false,
          error: 'Erreur lors de la récupération des alertes récentes'
        });
      }

      // Grouper par type et niveau
      const groupedAlerts = {};
      data.forEach(alert => {
        if (!groupedAlerts[alert.type_alerte]) {
          groupedAlerts[alert.type_alerte] = {
            total: 0,
            critical: 0,
            warning: 0,
            info: 0,
            alerts: []
          };
        }
        groupedAlerts[alert.type_alerte].total++;
        groupedAlerts[alert.type_alerte][alert.niveau]++;
        groupedAlerts[alert.type_alerte].alerts.push(alert);
      });

      res.json({
        success: true,
        period_hours: hours,
        total_alerts: data.length,
        grouped_alerts: groupedAlerts,
        latest_alerts: data.slice(0, 10)
      });
    } catch (error) {
      logger.error('Erreur dans getRecentAlerts controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des alertes récentes'
      });
    }
  }

  /**
   * Créer une alerte de test
   */
  async createTestAlert(req, res) {
    try {
      // Vérifier que c'est un environnement de développement
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'Création d\'alerte de test non autorisée en production'
        });
      }

      const testAlert = {
        type_alerte: req.body.type || 'test',
        niveau: req.body.niveau || 'info',
        titre: req.body.titre || 'Alerte de test',
        description: req.body.description || 'Ceci est une alerte de test générée automatiquement',
        donnees_json: req.body.data || { test: true, timestamp: new Date().toISOString() }
      };

      const result = await AlertsModel.createAlert(testAlert);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Alerte de test créée avec succès',
        data: result.data
      });
    } catch (error) {
      logger.error('Erreur dans createTestAlert controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la création de l\'alerte de test'
      });
    }
  }
}

module.exports = new AlertsController();