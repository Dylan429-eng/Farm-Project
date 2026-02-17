const { supabase } = require('../config/database');
const logger = require('../utils/logger');
const { calculateCPS, calculatePDS } = require('../utils/calculations');

class LotsModel {
  /**
   * Récupérer tous les lots
   */
  async getAllLots(filters = {}) {
    try {
      let query = supabase
        .from('lots')
        .select(`
          *,
          batiments (nom, type_batiment),
          fournisseurs (nom, type_fournisseur)
        `);

      // Appliquer les filtres
      if (filters.status) {
        query = query.eq('statut', filters.status);
      }
      
      if (filters.batiment_id) {
        query = query.eq('batiment_id', filters.batiment_id);
      }
      
      if (filters.start_date) {
        query = query.gte('date_arrivee', filters.start_date);
      }
      
      if (filters.end_date) {
        query = query.lte('date_arrivee', filters.end_date);
      }

      const { data, error } = await query.order('date_arrivee', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error('Erreur dans getAllLots:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer un lot par ID
   */
  async getLotById(lotId) {
    try {
      const { data, error } = await supabase
        .from('lots')
        .select(`
          *,
          batiments (*),
          fournisseurs (*),
          alimentation_lots (*),
          soins_sante (*),
          mortalite_journaliere (*)
        `)
        .eq('id', lotId)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error(`Erreur dans getLotById pour lot ${lotId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Créer un nouveau lot
   */
  async createLot(lotData) {
    try {
      // Calculer l'âge en jours si date d'arrivée fournie
      if (lotData.date_arrivee) {
        const arrivalDate = new Date(lotData.date_arrivee);
        const today = new Date();
        const diffTime = Math.abs(today - arrivalDate);
        lotData.age_jours = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Initialiser les quantités si non fournies
      if (!lotData.quantite_actuelle) {
        lotData.quantite_actuelle = lotData.quantite_initiale;
      }

      const { data, error } = await supabase
        .from('lots')
        .insert([lotData])
        .select()
        .single();

      if (error) throw error;

      logger.info(`Nouveau lot créé: ${data.reference}`);
      return { success: true, data };
    } catch (error) {
      logger.error('Erreur dans createLot:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mettre à jour un lot
   */
  async updateLot(lotId, updateData) {
    try {
      // Ne pas permettre la mise à jour manuelle des champs calculés
      delete updateData.cps;
      delete updateData.pds;
      delete updateData.taux_mortalite;

      const { data, error } = await supabase
        .from('lots')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', lotId)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Lot ${lotId} mis à jour`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Erreur dans updateLot pour lot ${lotId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Supprimer un lot (soft delete)
   */
  async deleteLot(lotId) {
    try {
      const { error } = await supabase
        .from('lots')
        .update({ 
          statut: 'abandonne',
          updated_at: new Date().toISOString()
        })
        .eq('id', lotId);

      if (error) throw error;

      logger.info(`Lot ${lotId} marqué comme abandonné`);
      return { success: true, message: 'Lot marqué comme abandonné' };
    } catch (error) {
      logger.error(`Erreur dans deleteLot pour lot ${lotId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ajouter de la mortalité à un lot
   */
  async addMortality(lotId, mortalityData) {
    try {
      // Vérifier que le lot existe
      const { data: lot, error: lotError } = await supabase
        .from('lots')
        .select('quantite_actuelle')
        .eq('id', lotId)
        .single();

      if (lotError) throw lotError;

      if (mortalityData.nombre_morts > lot.quantite_actuelle) {
        return { 
          success: false, 
          error: 'Nombre de morts supérieur à la quantité actuelle' 
        };
      }

      // Ajouter l'enregistrement de mortalité (le trigger mettra à jour la quantité)
      const { data, error } = await supabase
        .from('mortalite_journaliere')
        .insert([{
          lot_id: lotId,
          ...mortalityData,
          date_mortalite: mortalityData.date_mortalite || new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) throw error;

      logger.info(`Mortalité ajoutée pour lot ${lotId}: ${mortalityData.nombre_morts} morts`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Erreur dans addMortality pour lot ${lotId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ajouter des coûts d'alimentation
   */
  async addFeedingCost(lotId, feedingData) {
    try {
      const { data, error } = await supabase
        .from('alimentation_lots')
        .insert([{
          lot_id: lotId,
          ...feedingData,
          date_distribution: feedingData.date_distribution || new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) throw error;

      logger.info(`Coût alimentation ajouté pour lot ${lotId}: ${feedingData.cout_total}€`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Erreur dans addFeedingCost pour lot ${lotId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ajouter des coûts de santé
   */
  async addHealthCost(lotId, healthData) {
    try {
      const { data, error } = await supabase
        .from('soins_sante')
        .insert([{
          lot_id: lotId,
          ...healthData,
          date_soin: healthData.date_soin || new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) throw error;

      logger.info(`Coût santé ajouté pour lot ${lotId}: ${healthData.cout_total}€`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Erreur dans addHealthCost pour lot ${lotId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer les statistiques des lots
   */
  async getLotsStatistics() {
    try {
      const { data, error } = await supabase
        .from('vue_kpis_resume')
        .select('*')
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error('Erreur dans getLotsStatistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculer le CPS pour un lot
   */
  async calculateLotCPS(lotId) {
    try {
      const { data: lot, error } = await supabase
        .from('lots')
        .select('quantite_initiale, cout_alimentation_total, cout_sante_total, cout_main_oeuvre_total, cout_logistique_total')
        .eq('id', lotId)
        .single();

      if (error) throw error;

      const cps = calculateCPS(
        lot.cout_alimentation_total,
        lot.cout_sante_total,
        lot.cout_main_oeuvre_total,
        lot.cout_logistique_total,
        lot.quantite_initiale
      );

      return { success: true, cps };
    } catch (error) {
      logger.error(`Erreur dans calculateLotCPS pour lot ${lotId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer l'historique de mortalité d'un lot
   */
  async getMortalityHistory(lotId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('mortalite_journaliere')
        .select('*')
        .eq('lot_id', lotId)
        .gte('date_mortalite', startDate.toISOString().split('T')[0])
        .order('date_mortalite', { ascending: true });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error(`Erreur dans getMortalityHistory pour lot ${lotId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Générer un rapport détaillé pour un lot
   */
  async generateLotReport(lotId) {
    try {
      // Récupérer toutes les données du lot
      const lotPromise = this.getLotById(lotId);
      const mortalityPromise = this.getMortalityHistory(lotId);
      
      // Récupérer l'alimentation
      const { data: feeding, error: feedingError } = await supabase
        .from('alimentation_lots')
        .select('*')
        .eq('lot_id', lotId)
        .order('date_distribution', { ascending: false });

      if (feedingError) throw feedingError;

      // Récupérer les soins
      const { data: health, error: healthError } = await supabase
        .from('soins_sante')
        .select('*')
        .eq('lot_id', lotId)
        .order('date_soin', { ascending: false });

      if (healthError) throw healthError;

      const [lotResult, mortalityResult] = await Promise.all([lotPromise, mortalityPromise]);

      if (!lotResult.success) throw new Error(lotResult.error);
      if (!mortalityResult.success) throw new Error(mortalityResult.error);

      // Calculer les totaux
      const totalFeedingCost = feeding.reduce((sum, item) => sum + parseFloat(item.cout_total), 0);
      const totalHealthCost = health.reduce((sum, item) => sum + parseFloat(item.cout_total), 0);
      const totalMortality = mortalityResult.data.reduce((sum, item) => sum + item.nombre_morts, 0);

      const report = {
        lot: lotResult.data,
        summary: {
          total_feeding_cost: totalFeedingCost,
          total_health_cost: totalHealthCost,
          total_mortality: totalMortality,
          survival_rate: ((lotResult.data.quantite_initiale - totalMortality) / lotResult.data.quantite_initiale) * 100,
          average_daily_mortality: totalMortality / (lotResult.data.age_jours || 1)
        },
        feeding_history: feeding,
        health_history: health,
        mortality_history: mortalityResult.data
      };

      return { success: true, report };
    } catch (error) {
      logger.error(`Erreur dans generateLotReport pour lot ${lotId}:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new LotsModel();