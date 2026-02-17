const LotsModel = require('../models/lotsModel');
const logger = require('../utils/logger');

class LotsController {
  /**
   * Récupérer tous les lots
   */
  async getAllLots(req, res) {
    try {
      const filters = {
        status: req.query.status,
        batiment_id: req.query.batiment_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const result = await LotsModel.getAllLots(filters);
      
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
      logger.error('Erreur dans getAllLots controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des lots'
      });
    }
  }

  /**
   * Récupérer un lot par ID
   */
  async getLotById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID du lot requis'
        });
      }

      const result = await LotsModel.getLotById(id);
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error || 'Lot non trouvé'
        });
      }

      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error(`Erreur dans getLotById controller pour lot ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération du lot'
      });
    }
  }

  /**
   * Créer un nouveau lot
   */
  async createLot(req, res) {
    try {
      const lotData = req.body;

      // Validation des données requises
      if (!lotData.reference || !lotData.quantite_initiale || !lotData.date_arrivee) {
        return res.status(400).json({
          success: false,
          error: 'Données incomplètes. Requis: reference, quantite_initiale, date_arrivee'
        });
      }

      const result = await LotsModel.createLot(lotData);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        message: 'Lot créé avec succès',
        data: result.data
      });
    } catch (error) {
      logger.error('Erreur dans createLot controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la création du lot'
      });
    }
  }

  /**
   * Mettre à jour un lot
   */
  async updateLot(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID du lot requis'
        });
      }

      const result = await LotsModel.updateLot(id, updateData);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Lot mis à jour avec succès',
        data: result.data
      });
    } catch (error) {
      logger.error(`Erreur dans updateLot controller pour lot ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la mise à jour du lot'
      });
    }
  }

  /**
   * Supprimer un lot (soft delete)
   */
  async deleteLot(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID du lot requis'
        });
      }

      const result = await LotsModel.deleteLot(id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: result.message || 'Lot supprimé avec succès'
      });
    } catch (error) {
      logger.error(`Erreur dans deleteLot controller pour lot ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la suppression du lot'
      });
    }
  }

  /**
   * Ajouter de la mortalité à un lot
   */
  async addMortality(req, res) {
    try {
      const { id } = req.params;
      const mortalityData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID du lot requis'
        });
      }

      if (!mortalityData.nombre_morts || mortalityData.nombre_morts <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Nombre de morts requis et doit être positif'
        });
      }

      const result = await LotsModel.addMortality(id, mortalityData);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        message: 'Mortalité enregistrée avec succès',
        data: result.data
      });
    } catch (error) {
      logger.error(`Erreur dans addMortality controller pour lot ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de l\'enregistrement de la mortalité'
      });
    }
  }

  /**
   * Ajouter des coûts d'alimentation
   */
  async addFeedingCost(req, res) {
    try {
      const { id } = req.params;
      const feedingData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID du lot requis'
        });
      }

      if (!feedingData.cout_total || feedingData.cout_total <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Coût total requis et doit être positif'
        });
      }

      const result = await LotsModel.addFeedingCost(id, feedingData);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        message: 'Coût d\'alimentation enregistré avec succès',
        data: result.data
      });
    } catch (error) {
      logger.error(`Erreur dans addFeedingCost controller pour lot ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de l\'enregistrement du coût d\'alimentation'
      });
    }
  }

  /**
   * Ajouter des coûts de santé
   */
  async addHealthCost(req, res) {
    try {
      const { id } = req.params;
      const healthData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID du lot requis'
        });
      }

      if (!healthData.cout_total || healthData.cout_total <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Coût total requis et doit être positif'
        });
      }

      const result = await LotsModel.addHealthCost(id, healthData);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        message: 'Coût de santé enregistré avec succès',
        data: result.data
      });
    } catch (error) {
      logger.error(`Erreur dans addHealthCost controller pour lot ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de l\'enregistrement du coût de santé'
      });
    }
  }

  /**
   * Récupérer les statistiques des lots
   */
  async getLotsStatistics(req, res) {
    try {
      const result = await LotsModel.getLotsStatistics();
      
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
      logger.error('Erreur dans getLotsStatistics controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des statistiques'
      });
    }
  }

  /**
   * Calculer le CPS pour un lot
   */
  async calculateLotCPS(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID du lot requis'
        });
      }

      const result = await LotsModel.calculateLotCPS(id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: {
          lot_id: id,
          cps: result.cps
        }
      });
    } catch (error) {
      logger.error(`Erreur dans calculateLotCPS controller pour lot ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors du calcul du CPS'
      });
    }
  }

  /**
   * Récupérer l'historique de mortalité d'un lot
   */
  async getMortalityHistory(req, res) {
    try {
      const { id } = req.params;
      const { days = 30 } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID du lot requis'
        });
      }

      const result = await LotsModel.getMortalityHistory(id, parseInt(days));
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        count: result.data.length,
        days: days,
        data: result.data
      });
    } catch (error) {
      logger.error(`Erreur dans getMortalityHistory controller pour lot ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération de l\'historique de mortalité'
      });
    }
  }

  /**
   * Générer un rapport détaillé pour un lot
   */
  async generateLotReport(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID du lot requis'
        });
      }

      const result = await LotsModel.generateLotReport(id);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.report
      });
    } catch (error) {
      logger.error(`Erreur dans generateLotReport controller pour lot ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la génération du rapport'
      });
    }
  }

  /**
   * Rechercher des lots
   */
  async searchLots(req, res) {
    try {
      const { search } = req.query;

      if (!search) {
        return res.status(400).json({
          success: false,
          error: 'Terme de recherche requis'
        });
      }

      // Utiliser la fonction de recherche de Supabase
      const { supabase } = require('../config/database');
      
      const { data, error } = await supabase
        .from('lots')
        .select(`
          *,
          batiments (nom),
          fournisseurs (nom)
        `)
        .or(`reference.ilike.%${search}%,batiments.nom.ilike.%${search}%,fournisseurs.nom.ilike.%${search}%`)
        .limit(20);

      if (error) {
        logger.error('Erreur dans searchLots:', error);
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
      logger.error('Erreur dans searchLots controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la recherche'
      });
    }
  }

  /**
   * Récupérer les indicateurs de performance (KPIs)
   */
  async getPerformanceKPIs(req, res) {
    try {
      const { days = 30 } = req.query;
      
      const { supabase } = require('../config/database');
      const { calculateCPS, calculatePDS } = require('../utils/calculations');

      // Récupérer les lots des derniers jours
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const { data: lots, error } = await supabase
        .from('lots')
        .select('*')
        .gte('date_arrivee', startDate.toISOString().split('T')[0]);

      if (error) throw error;

      // Calculer les KPIs
      const totalLots = lots.length;
      const activeLots = lots.filter(lot => lot.statut === 'actif').length;
      
      const totalInitialQuantity = lots.reduce((sum, lot) => sum + (lot.quantite_initiale || 0), 0);
      const totalCurrentQuantity = lots.reduce((sum, lot) => sum + (lot.quantite_actuelle || 0), 0);
      
      const totalDeaths = totalInitialQuantity - totalCurrentQuantity;
      const averageMortalityRate = totalInitialQuantity > 0 ? (totalDeaths / totalInitialQuantity) * 100 : 0;

      const totalFeedCost = lots.reduce((sum, lot) => sum + (lot.cout_alimentation_total || 0), 0);
      const totalHealthCost = lots.reduce((sum, lot) => sum + (lot.cout_sante_total || 0), 0);
      const totalLaborCost = lots.reduce((sum, lot) => sum + (lot.cout_main_oeuvre_total || 0), 0);
      const totalLogisticsCost = lots.reduce((sum, lot) => sum + (lot.cout_logistique_total || 0), 0);

      const averageCPS = calculateCPS(
        totalFeedCost,
        totalHealthCost,
        totalLaborCost,
        totalLogisticsCost,
        totalInitialQuantity
      );

      const totalSales = lots.reduce((sum, lot) => sum + (lot.prix_vente_total || 0), 0);
      const averagePDS = calculatePDS(
        totalSales,
        totalFeedCost,
        totalHealthCost,
        totalLogisticsCost,
        totalInitialQuantity
      );

      res.json({
        success: true,
        data: {
          summary: {
            period_days: days,
            total_lots: totalLots,
            active_lots: activeLots,
            total_initial_quantity: totalInitialQuantity,
            total_current_quantity: totalCurrentQuantity,
            total_deaths: totalDeaths,
            average_mortality_rate: parseFloat(averageMortalityRate.toFixed(2))
          },
          costs: {
            total_feed_cost: totalFeedCost,
            total_health_cost: totalHealthCost,
            total_labor_cost: totalLaborCost,
            total_logistics_cost: totalLogisticsCost,
            total_cost: totalFeedCost + totalHealthCost + totalLaborCost + totalLogisticsCost
          },
          performance: {
            average_cps: parseFloat(averageCPS.toFixed(2)),
            average_pds: parseFloat(averagePDS.toFixed(2)),
            total_sales: totalSales,
            estimated_profit: totalSales - (totalFeedCost + totalHealthCost + totalLogisticsCost)
          },
          efficiency: {
            feed_cost_per_unit: totalInitialQuantity > 0 ? totalFeedCost / totalInitialQuantity : 0,
            health_cost_per_unit: totalInitialQuantity > 0 ? totalHealthCost / totalInitialQuantity : 0,
            survival_rate: parseFloat((100 - averageMortalityRate).toFixed(2))
          }
        }
      });
    } catch (error) {
      logger.error('Erreur dans getPerformanceKPIs controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des KPIs'
      });
    }
  }
}

module.exports = new LotsController();