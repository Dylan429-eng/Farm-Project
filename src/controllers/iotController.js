const IotModel = require('../models/iotModel');
const logger = require('../utils/logger');

class IotController {
  /**
   * Enregistrer des données IoT
   */
  async saveIotData(req, res) {
    try {
      const iotData = req.body;

      // Validation des données requises
      if (!iotData.batiment_id || !iotData.temperature_moyenne || !iotData.humidite_moyenne) {
        return res.status(400).json({
          success: false,
          error: 'Données IoT incomplètes. Requis: batiment_id, temperature_moyenne, humidite_moyenne'
        });
      }

      // Validation des valeurs
      if (iotData.temperature_moyenne < 0 || iotData.temperature_moyenne > 50) {
        return res.status(400).json({
          success: false,
          error: 'Température invalide (0-50°C)'
        });
      }

      if (iotData.humidite_moyenne < 0 || iotData.humidite_moyenne > 100) {
        return res.status(400).json({
          success: false,
          error: 'Humidité invalide (0-100%)'
        });
      }

      const result = await IotModel.saveIotData(iotData);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        message: 'Données IoT enregistrées avec succès',
        data: result.data
      });
    } catch (error) {
      logger.error('Erreur dans saveIotData controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de l\'enregistrement des données IoT'
      });
    }
  }

  /**
   * Récupérer les données IoT par bâtiment
   */
  async getIotDataByBuilding(req, res) {
    try {
      const { buildingId } = req.params;
      const filters = {
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined
      };

      if (!buildingId) {
        return res.status(400).json({
          success: false,
          error: 'ID du bâtiment requis'
        });
      }

      const result = await IotModel.getIotDataByBuilding(buildingId, filters);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        count: result.data.length,
        building_id: buildingId,
        data: result.data
      });
    } catch (error) {
      logger.error(`Erreur dans getIotDataByBuilding controller pour bâtiment ${req.params.buildingId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des données IoT'
      });
    }
  }

  /**
   * Récupérer les données IoT en temps réel
   */
  async getRealTimeIotData(req, res) {
    try {
      const { buildingId } = req.params;

      if (!buildingId) {
        return res.status(400).json({
          success: false,
          error: 'ID du bâtiment requis'
        });
      }

      const result = await IotModel.getRealTimeIotData(buildingId);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        building_id: buildingId,
        last_24_hours: result.data.length,
        data: result.data,
        summary: result.summary
      });
    } catch (error) {
      logger.error(`Erreur dans getRealTimeIotData controller pour bâtiment ${req.params.buildingId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des données temps réel'
      });
    }
  }

  /**
   * Simuler des données IoT (pour développement/test)
   */
  async simulateIotData(req, res) {
    try {
      const { buildingId } = req.params;
      const { lotId } = req.body;

      if (!buildingId) {
        return res.status(400).json({
          success: false,
          error: 'ID du bâtiment requis'
        });
      }

      // Vérifier que c'est un environnement de développement
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'Simulation non autorisée en production'
        });
      }

      const result = await IotModel.simulateIotData(buildingId, lotId);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Données IoT simulées avec succès',
        data: result.data
      });
    } catch (error) {
      logger.error(`Erreur dans simulateIotData controller pour bâtiment ${req.params.buildingId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la simulation des données IoT'
      });
    }
  }

  /**
   * Récupérer les tendances environnementales
   */
  async getEnvironmentalTrends(req, res) {
    try {
      const { buildingId } = req.params;
      const { days = 7 } = req.query;

      if (!buildingId) {
        return res.status(400).json({
          success: false,
          error: 'ID du bâtiment requis'
        });
      }

      const result = await IotModel.getEnvironmentalTrends(buildingId, parseInt(days));
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        building_id: buildingId,
        period_days: days,
        data_points: result.raw_data.length,
        daily_averages: result.daily_averages,
        trend_summary: result.summary
      });
    } catch (error) {
      logger.error(`Erreur dans getEnvironmentalTrends controller pour bâtiment ${req.params.buildingId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des tendances'
      });
    }
  }

  /**
   * Vérifier la santé des capteurs IoT
   */
  async checkIotHealth(req, res) {
    try {
      const { buildingId } = req.params;

      if (!buildingId) {
        return res.status(400).json({
          success: false,
          error: 'ID du bâtiment requis'
        });
      }

      const result = await IotModel.checkIotHealth(buildingId);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        building_id: buildingId,
        health_status: result.health
      });
    } catch (error) {
      logger.error(`Erreur dans checkIotHealth controller pour bâtiment ${req.params.buildingId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la vérification de la santé des capteurs'
      });
    }
  }

  /**
   * Récupérer toutes les données IoT (avec filtres)
   */
  async getAllIotData(req, res) {
    try {
      const filters = {
        building_id: req.query.building_id,
        lot_id: req.query.lot_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        limit: req.query.limit ? parseInt(req.query.limit) : 100
      };

      const { supabase } = require('../config/database');
      
      let query = supabase
        .from('donnees_iot')
        .select(`
          *,
          batiments (nom, type_batiment),
          lots (reference)
        `)
        .order('date_mesure', { ascending: false })
        .order('heure_mesure', { ascending: false })
        .limit(filters.limit);

      if (filters.building_id) {
        query = query.eq('batiment_id', filters.building_id);
      }
      
      if (filters.lot_id) {
        query = query.eq('lot_id', filters.lot_id);
      }
      
      if (filters.start_date) {
        query = query.gte('date_mesure', filters.start_date);
      }
      
      if (filters.end_date) {
        query = query.lte('date_mesure', filters.end_date);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erreur dans getAllIotData:', error);
        return res.status(400).json({
          success: false,
          error: 'Erreur lors de la récupération des données IoT'
        });
      }

      // Calculer les statistiques globales
      const stats = {
        total_readings: data.length,
        buildings_monitored: [...new Set(data.map(d => d.batiment_id))].length,
        date_range: data.length > 0 ? {
          earliest: data[data.length - 1]?.date_mesure,
          latest: data[0]?.date_mesure
        } : null
      };

      res.json({
        success: true,
        ...stats,
        data: data
      });
    } catch (error) {
      logger.error('Erreur dans getAllIotData controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des données IoT'
      });
    }
  }

  /**
   * Analyser la corrélation entre environnement et performance
   */
  async analyzeEnvironmentalCorrelation(req, res) {
    try {
      const { buildingId } = req.params;
      const { days = 30 } = req.query;

      if (!buildingId) {
        return res.status(400).json({
          success: false,
          error: 'ID du bâtiment requis'
        });
      }

      const { supabase } = require('../config/database');

      // Récupérer les données IoT
      const { data: iotData, error: iotError } = await supabase
        .from('donnees_iot')
        .select('date_mesure, temperature_moyenne, humidite_moyenne')
        .eq('batiment_id', buildingId)
        .gte('date_mesure', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date_mesure', { ascending: true });

      if (iotError) throw iotError;

      // Récupérer les données de mortalité pour les lots dans ce bâtiment
      const { data: mortalityData, error: mortalityError } = await supabase
        .from('lots')
        .select('id, taux_mortalite, date_arrivee')
        .eq('batiment_id', buildingId)
        .gte('date_arrivee', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (mortalityError) throw mortalityError;

      // Analyser les corrélations
      const analysis = {
        building_id: buildingId,
        period_days: days,
        iot_readings: iotData.length,
        lots_analyzed: mortalityData.length,
        correlations: this.calculateCorrelations(iotData, mortalityData),
        recommendations: this.generateRecommendations(iotData)
      };

      res.json({
        success: true,
        analysis: analysis
      });
    } catch (error) {
      logger.error(`Erreur dans analyzeEnvironmentalCorrelation controller pour bâtiment ${req.params.buildingId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de l\'analyse des corrélations'
      });
    }
  }

  /**
   * Calculer les corrélations entre environnement et mortalité
   */
  calculateCorrelations(iotData, mortalityData) {
    if (iotData.length === 0 || mortalityData.length === 0) {
      return {
        temperature_mortality_correlation: null,
        humidity_mortality_correlation: null,
        insights: 'Données insuffisantes pour l\'analyse'
      };
    }

    // Moyennes par jour
    const dailyAverages = {};
    iotData.forEach(reading => {
      const date = reading.date_mesure;
      if (!dailyAverages[date]) {
        dailyAverages[date] = {
          temperatures: [],
          humidities: [],
          count: 0
        };
      }
      dailyAverages[date].temperatures.push(reading.temperature_moyenne);
      dailyAverages[date].humidities.push(reading.humidite_moyenne);
      dailyAverages[date].count++;
    });

    // Calculer les corrélations
    const correlations = {
      temperature_mortality_correlation: this.calculatePearsonCorrelation(
        Object.values(dailyAverages).map(d => d.temperatures.reduce((a, b) => a + b, 0) / d.temperatures.length),
        mortalityData.map(lot => lot.taux_mortalite)
      ),
      humidity_mortality_correlation: this.calculatePearsonCorrelation(
        Object.values(dailyAverages).map(d => d.humidities.reduce((a, b) => a + b, 0) / d.humidities.length),
        mortalityData.map(lot => lot.taux_mortalite)
      )
    };

    return {
      ...correlations,
      insights: this.generateCorrelationInsights(correlations)
    };
  }

  /**
   * Calculer le coefficient de corrélation de Pearson
   */
  calculatePearsonCorrelation(x, y) {
    if (x.length !== y.length || x.length < 2) return null;
    
    const n = x.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator !== 0 ? numerator / denominator : null;
  }

  /**
   * Générer des insights à partir des corrélations
   */
  generateCorrelationInsights(correlations) {
    const insights = [];
    
    if (correlations.temperature_mortality_correlation > 0.5) {
      insights.push('Corrélation positive forte entre température et mortalité');
    } else if (correlations.temperature_mortality_correlation < -0.5) {
      insights.push('Corrélation négative forte entre température et mortalité');
    }
    
    if (correlations.humidity_mortality_correlation > 0.5) {
      insights.push('Corrélation positive forte entre humidité et mortalité');
    } else if (correlations.humidity_mortality_correlation < -0.5) {
      insights.push('Corrélation négative forte entre humidité et mortalité');
    }
    
    return insights.length > 0 ? insights : ['Aucune corrélation significative détectée'];
  }

  /**
   * Générer des recommandations basées sur les données IoT
   */
  generateRecommendations(iotData) {
    const recommendations = [];
    
    if (iotData.length === 0) {
      return ['Données insuffisantes pour générer des recommandations'];
    }

    // Analyser les températures
    const temperatures = iotData.map(d => d.temperature_moyenne);
    const avgTemp = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
    
    if (avgTemp > 33) {
      recommendations.push(`Température moyenne élevée (${avgTemp.toFixed(1)}°C). Penser à améliorer la ventilation.`);
    } else if (avgTemp < 30) {
      recommendations.push(`Température moyenne basse (${avgTemp.toFixed(1)}°C). Vérifier le système de chauffage.`);
    }

    // Analyser l'humidité
    const humidities = iotData.map(d => d.humidite_moyenne);
    const avgHumidity = humidities.reduce((a, b) => a + b, 0) / humidities.length;
    
    if (avgHumidity > 75) {
      recommendations.push(`Humidité moyenne élevée (${avgHumidity.toFixed(1)}%). Penser à améliorer la ventilation.`);
    } else if (avgHumidity < 50) {
      recommendations.push(`Humidité moyenne basse (${avgHumidity.toFixed(1)}%). Considérer l'utilisation d'humidificateurs.`);
    }

    // Vérifier la variabilité
    const tempStdDev = this.calculateStandardDeviation(temperatures);
    if (tempStdDev > 2) {
      recommendations.push(`Variabilité de température élevée (écart-type: ${tempStdDev.toFixed(1)}°C). Stabiliser les conditions.`);
    }

    return recommendations.length > 0 ? recommendations : ['Conditions environnementales optimales'];
  }

  /**
   * Calculer l'écart-type
   */
  calculateStandardDeviation(numbers) {
    if (numbers.length < 2) return 0;
    
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (numbers.length - 1);
    return Math.sqrt(variance);
  }

  /**
   * Envoyer des données IoT en batch
   */
  async sendIotDataBatch(req, res) {
    try {
      const batchData = req.body;

      if (!Array.isArray(batchData) || batchData.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Tableau de données IoT requis'
        });
      }

      if (batchData.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Batch trop grand (max 100 enregistrements)'
        });
      }

      const results = [];
      const errors = [];

      // Traiter chaque enregistrement
      for (const iotData of batchData) {
        try {
          const result = await IotModel.saveIotData(iotData);
          if (result.success) {
            results.push(result.data);
          } else {
            errors.push({
              data: iotData,
              error: result.error
            });
          }
        } catch (error) {
          errors.push({
            data: iotData,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: 'Batch IoT traité',
        summary: {
          total: batchData.length,
          success: results.length,
          failed: errors.length
        },
        results: results,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      logger.error('Erreur dans sendIotDataBatch controller:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors du traitement du batch IoT'
      });
    }
  }
}

module.exports = new IotController();