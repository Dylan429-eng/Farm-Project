const { supabase } = require('../config/database');
const logger = require('../utils/logger');
const EmailService = require('../service/emailService');

class AlertsModel {
  /**
   * Récupérer toutes les alertes
   */
  async getAllAlerts(filters = {}) {
    try {
      let query = supabase
        .from('alertes')
        .select(`
          *,
          lots (reference),
          batiments (nom),
          stocks (nom_produit)
        `)
        .order('date_detection', { ascending: false });

      // Appliquer les filtres
      if (filters.status) {
        query = query.eq('statut', filters.status);
      }
      
      if (filters.type) {
        query = query.eq('type_alerte', filters.type);
      }
      
      if (filters.niveau) {
        query = query.eq('niveau', filters.niveau);
      }
      
      if (filters.start_date) {
        query = query.gte('date_detection', filters.start_date);
      }
      
      if (filters.end_date) {
        query = query.lte('date_detection', filters.end_date);
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error('Erreur dans getAllAlerts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer les alertes actives
   */
  async getActiveAlerts() {
    try {
      const { data, error } = await supabase
        .from('vue_alertes_actives')
        .select('*')
        .order('date_detection', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error('Erreur dans getActiveAlerts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Créer une alerte manuelle
   */
  async createAlert(alertData) {
    try {
      // Validation des données requises
      if (!alertData.type_alerte || !alertData.niveau || !alertData.titre) {
        return { 
          success: false, 
          error: 'Données d\'alerte incomplètes. Requis: type_alerte, niveau, titre' 
        };
      }

      // S'assurer que l'alerte est créée comme active
      alertData.statut = 'active';
      
      if (!alertData.date_detection) {
        alertData.date_detection = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('alertes')
        .insert([alertData])
        .select()
        .single();

      if (error) throw error;

      logger.info(`Nouvelle alerte créée: ${alertData.titre} (${alertData.niveau})`);
        // 🔥 NOUVEAU: Envoyer l'email d'alerte
    if (alertData.niveau !== 'info') {
      try {
        const recipients = await EmailService.getAlertRecipients(
          alertData.type_alerte, 
          alertData.niveau
        );
        
        if (recipients.length > 0) {
          await EmailService.sendAlertEmail(data, recipients);
        }
      } catch (emailError) {
        logger.error('Erreur lors de l\'envoi de l\'email d\'alerte:', emailError);
      }
    }
      return { success: true, data };
    } catch (error) {
      logger.error('Erreur dans createAlert:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mettre à jour le statut d'une alerte
   */
  async updateAlertStatus(alertId, newStatus, resolvedBy = null) {
    try {
      const updateData = {
        statut: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'resolved' && resolvedBy) {
        updateData.date_resolution = new Date().toISOString();
        updateData.resolved_by = resolvedBy;
      }

      const { data, error } = await supabase
        .from('alertes')
        .update(updateData)
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;

      logger.info(`Alerte ${alertId} mise à jour avec statut: ${newStatus}`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Erreur dans updateAlertStatus pour alerte ${alertId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Marquer une alerte comme lue/acknowledged
   */
  async acknowledgeAlert(alertId, userId) {
    return this.updateAlertStatus(alertId, 'acknowledged', userId);
  }

  /**
   * Résoudre une alerte
   */
  async resolveAlert(alertId, userId) {
    return this.updateAlertStatus(alertId, 'resolved', userId);
  }

  /**
   * Ignorer une alerte
   */
  async ignoreAlert(alertId, userId) {
    return this.updateAlertStatus(alertId, 'ignored', userId);
  }

  /**
   * Supprimer une alerte (hard delete - à utiliser avec prudence)
   */
  async deleteAlert(alertId) {
    try {
      const { error } = await supabase
        .from('alertes')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      logger.info(`Alerte ${alertId} supprimée`);
      return { success: true, message: 'Alerte supprimée' };
    } catch (error) {
      logger.error(`Erreur dans deleteAlert pour alerte ${alertId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Vérifier les alertes de stock bas
   */
  async checkLowStockAlerts() {
    try {
      // Cette fonction utilise la vue ou déclenche une vérification manuelle
      const { data: lowStocks, error } = await supabase
        .from('stocks')
        .select('id, nom_produit, quantite_stock, quantite_min, unite_mesure')
        .lt('quantite_stock', supabase.raw('quantite_min * 1.1')) // 10% en dessous du minimum
        .eq('type_produit', 'alimentation'); // Seulement pour l'alimentation pour l'instant

      if (error) throw error;

      const alertsCreated = [];

      for (const stock of lowStocks) {
        // Vérifier si une alerte active existe déjà pour ce stock
        const { data: existingAlerts } = await supabase
          .from('alertes')
          .select('id')
          .eq('stock_id', stock.id)
          .eq('statut', 'active')
          .eq('type_alerte', 'stock')
          .limit(1);

        if (!existingAlerts || existingAlerts.length === 0) {
          // Créer une nouvelle alerte
          const alertResult = await this.createAlert({
            type_alerte: 'stock',
            stock_id: stock.id,
            niveau: stock.quantite_stock <= stock.quantite_min ? 'critical' : 'warning',
            titre: `Stock bas : ${stock.nom_produit}`,
            description: `Le stock de ${stock.nom_produit} est à ${stock.quantite_stock} ${stock.unite_mesure}. Minimum recommandé: ${stock.quantite_min} ${stock.unite_mesure}`,
            donnees_json: {
              stock_id: stock.id,
              current_stock: stock.quantite_stock,
              minimum_stock: stock.quantite_min,
              unit: stock.unite_mesure
            }
          });

          if (alertResult.success) {
            alertsCreated.push(alertResult.data);
          }
        }
      }

      return { 
        success: true, 
        alerts_created: alertsCreated.length,
        low_stocks_found: lowStocks.length 
      };
    } catch (error) {
      logger.error('Erreur dans checkLowStockAlerts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Vérifier les alertes de mortalité élevée
   */
  async checkHighMortalityAlerts() {
    try {
      // Récupérer les lots avec mortalité élevée (>5% sur 24h)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: highMortality, error } = await supabase
        .from('lots')
        .select('id, reference, taux_mortalite, quantite_initiale')
        .gt('taux_mortalite', 5) // Plus de 5% de mortalité
        .eq('statut', 'actif');

      if (error) throw error;

      const alertsCreated = [];

      for (const lot of highMortality) {
        // Vérifier si une alerte active existe déjà pour ce lot
        const { data: existingAlerts } = await supabase
          .from('alertes')
          .select('id')
          .eq('lot_id', lot.id)
          .eq('statut', 'active')
          .eq('type_alerte', 'mortalite')
          .limit(1);

        if (!existingAlerts || existingAlerts.length === 0) {
          // Créer une nouvelle alerte
          const alertResult = await this.createAlert({
            type_alerte: 'mortalite',
            lot_id: lot.id,
            niveau: lot.taux_mortalite > 10 ? 'critical' : 'warning',
            titre: `Mortalité élevée : Lot ${lot.reference}`,
            description: `Le lot ${lot.reference} a un taux de mortalité de ${lot.taux_mortalite}%`,
            donnees_json: {
              lot_id: lot.id,
              mortality_rate: lot.taux_mortalite,
              initial_quantity: lot.quantite_initiale
            }
          });

          if (alertResult.success) {
            alertsCreated.push(alertResult.data);
          }
        }
      }

      return { 
        success: true, 
        alerts_created: alertsCreated.length,
        high_mortality_lots: highMortality.length 
      };
    } catch (error) {
      logger.error('Erreur dans checkHighMortalityAlerts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Vérifier les alertes de conditions environnementales
   */
  async checkEnvironmentalAlerts() {
    try {
      // Récupérer les dernières données IoT de chaque bâtiment
      const { data: buildings, error: buildingsError } = await supabase
        .from('batiments')
        .select('id, nom')
        .eq('statut', 'actif');

      if (buildingsError) throw buildingsError;

      const alertsCreated = [];

      for (const building of buildings) {
        // Récupérer la dernière lecture IoT
        const { data: lastReading, error: readingError } = await supabase
          .from('donnees_iot')
          .select('temperature_moyenne, humidite_moyenne')
          .eq('batiment_id', building.id)
          .order('date_mesure', { ascending: false })
          .order('heure_mesure', { ascending: false })
          .limit(1)
          .single();

        if (readingError && readingError.code !== 'PGRST116') {
          throw readingError;
        }

        if (lastReading) {
          // Vérifier les conditions critiques
          const alertsToCreate = [];

          if (lastReading.temperature_moyenne > 35) {
            alertsToCreate.push({
              type: 'temperature',
              level: 'critical',
              title: `Température critique : ${building.nom}`,
              description: `Température trop élevée: ${lastReading.temperature_moyenne}°C`
            });
          } else if (lastReading.temperature_moyenne < 28) {
            alertsToCreate.push({
              type: 'temperature',
              level: 'warning',
              title: `Température basse : ${building.nom}`,
              description: `Température trop basse: ${lastReading.temperature_moyenne}°C`
            });
          }

          if (lastReading.humidite_moyenne > 80) {
            alertsToCreate.push({
              type: 'humidite',
              level: 'warning',
              title: `Humidité élevée : ${building.nom}`,
              description: `Humidité trop élevée: ${lastReading.humidite_moyenne}%`
            });
          } else if (lastReading.humidite_moyenne < 40) {
            alertsToCreate.push({
              type: 'humidite',
              level: 'warning',
              title: `Humidité basse : ${building.nom}`,
              description: `Humidité trop basse: ${lastReading.humidite_moyenne}%`
            });
          }

          // Créer les alertes si nécessaire
          for (const alertData of alertsToCreate) {
            // Vérifier si une alerte similaire existe déjà
            const { data: existingAlerts } = await supabase
              .from('alertes')
              .select('id')
              .eq('batiment_id', building.id)
              .eq('statut', 'active')
              .eq('type_alerte', alertData.type)
              .limit(1);

            if (!existingAlerts || existingAlerts.length === 0) {
              const alertResult = await this.createAlert({
                type_alerte: alertData.type,
                batiment_id: building.id,
                niveau: alertData.level,
                titre: alertData.title,
                description: alertData.description,
                donnees_json: {
                  building_id: building.id,
                  temperature: lastReading.temperature_moyenne,
                  humidity: lastReading.humidite_moyenne
                }
              });

              if (alertResult.success) {
                alertsCreated.push(alertResult.data);
              }
            }
          }
        }
      }

      return { 
        success: true, 
        alerts_created: alertsCreated.length,
        buildings_checked: buildings.length 
      };
    } catch (error) {
      logger.error('Erreur dans checkEnvironmentalAlerts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Exécuter toutes les vérifications d'alertes
   */
  async runAllAlertChecks() {
    try {
      const results = {
        stock_alerts: await this.checkLowStockAlerts(),
        mortality_alerts: await this.checkHighMortalityAlerts(),
        environmental_alerts: await this.checkEnvironmentalAlerts(),
        timestamp: new Date().toISOString()
      };

      logger.info('Vérifications d\'alertes exécutées', results);
      return { success: true, results };
    } catch (error) {
      logger.error('Erreur dans runAllAlertChecks:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer les statistiques des alertes
   */
  async getAlertStatistics(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Alertes par type
      const { data: byType, error: typeError } = await supabase
        .from('alertes')
        .select('type_alerte, niveau, statut')
        .gte('date_detection', startDate.toISOString());

      if (typeError) throw typeError;

      // Alertes par jour
      const { data: byDay, error: dayError } = await supabase
        .rpc('get_alerts_by_day', { 
          start_date: startDate.toISOString().split('T')[0] 
        });

      if (dayError) {
        // Si la fonction RPC n'existe pas, calculer manuellement
        const { data: allAlerts } = await supabase
          .from('alertes')
          .select('date_detection')
          .gte('date_detection', startDate.toISOString());

        const dailyCounts = {};
        allAlerts?.forEach(alert => {
          const date = new Date(alert.date_detection).toISOString().split('T')[0];
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        });

        const byDay = Object.entries(dailyCounts).map(([date, count]) => ({
          date,
          count
        })).sort((a, b) => a.date.localeCompare(b.date));
      }

      // Calculer les statistiques
      const totalAlerts = byType.length;
      const activeAlerts = byType.filter(a => a.statut === 'active').length;
      const resolvedAlerts = byType.filter(a => a.statut === 'resolved').length;

      const byTypeStats = {};
      byType.forEach(alert => {
        if (!byTypeStats[alert.type_alerte]) {
          byTypeStats[alert.type_alerte] = {
            total: 0,
            critical: 0,
            warning: 0,
            info: 0
          };
        }
        byTypeStats[alert.type_alerte].total++;
        byTypeStats[alert.type_alerte][alert.niveau]++;
      });

      const responseTime = await this.calculateAverageResponseTime(startDate);

      return {
        success: true,
        statistics: {
          total_alerts: totalAlerts,
          active_alerts: activeAlerts,
          resolved_alerts: resolvedAlerts,
          resolution_rate: totalAlerts > 0 ? (resolvedAlerts / totalAlerts) * 100 : 0,
          by_type: byTypeStats,
          by_day: byDay,
          average_response_time_hours: responseTime
        }
      };
    } catch (error) {
      logger.error('Erreur dans getAlertStatistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculer le temps de réponse moyen
   */
  async calculateAverageResponseTime(startDate) {
    try {
      const { data: resolvedAlerts, error } = await supabase
        .from('alertes')
        .select('date_detection, date_resolution')
        .eq('statut', 'resolved')
        .gte('date_detection', startDate.toISOString())
        .not('date_resolution', 'is', null);

      if (error) throw error;

      if (resolvedAlerts.length === 0) return null;

      const totalResponseTime = resolvedAlerts.reduce((total, alert) => {
        const detectionTime = new Date(alert.date_detection);
        const resolutionTime = new Date(alert.date_resolution);
        return total + (resolutionTime - detectionTime);
      }, 0);

      return (totalResponseTime / resolvedAlerts.length) / (1000 * 60 * 60); // Convertir en heures
    } catch (error) {
      logger.error('Erreur dans calculateAverageResponseTime:', error);
      return null;
    }
  }
}

module.exports = new AlertsModel();