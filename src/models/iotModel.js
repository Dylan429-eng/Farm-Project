const { supabase } = require('../config/database');
const logger = require('../utils/logger');
const AlertsModel = require('./alertsModel');

class IotModel {
  /**
   * Enregistrer des données IoT
   */
  async saveIotData(iotData) {
    try {
      // Valider les données requises
      if (!iotData.batiment_id || !iotData.temperature_moyenne || !iotData.humidite_moyenne) {
        return { 
          success: false, 
          error: 'Données IoT incomplètes. Requis: batiment_id, temperature_moyenne, humidite_moyenne' 
        };
      }

      // Ajouter timestamp si non fourni
      if (!iotData.date_mesure) {
        const now = new Date();
        iotData.date_mesure = now.toISOString().split('T')[0];
        iotData.heure_mesure = now.toTimeString().split(' ')[0];
      }

      const { data, error } = await supabase
        .from('donnees_iot')
        .insert([iotData])
        .select()
        .single();

      if (error) throw error;

      // Vérifier les alertes automatiquement (via triggers SQL)
      // Les triggers définis dans la base créeront automatiquement les alertes

      logger.info(`Données IoT enregistrées pour bâtiment ${iotData.batiment_id}`);
      return { success: true, data };
    } catch (error) {
      logger.error('Erreur dans saveIotData:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer les données IoT par bâtiment
   */
  async getIotDataByBuilding(buildingId, filters = {}) {
    try {
      let query = supabase
        .from('donnees_iot')
        .select('*')
        .eq('batiment_id', buildingId)
        .order('date_mesure', { ascending: false })
        .order('heure_mesure', { ascending: false });

      // Appliquer les filtres
      if (filters.start_date) {
        query = query.gte('date_mesure', filters.start_date);
      }
      
      if (filters.end_date) {
        query = query.lte('date_mesure', filters.end_date);
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error(`Erreur dans getIotDataByBuilding pour bâtiment ${buildingId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer les données IoT en temps réel (dernières 24h)
   */
  async getRealTimeIotData(buildingId) {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data, error } = await supabase
        .from('donnees_iot')
        .select('*')
        .eq('batiment_id', buildingId)
        .gte('date_mesure', yesterday.toISOString().split('T')[0])
        .order('date_mesure', { ascending: true })
        .order('heure_mesure', { ascending: true });

      if (error) throw error;

      // Calculer les moyennes et extrêmes
      const summary = this.calculateIotSummary(data);

      return { 
        success: true, 
        data, 
        summary 
      };
    } catch (error) {
      logger.error(`Erreur dans getRealTimeIotData pour bâtiment ${buildingId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculer le résumé des données IoT
   */
  calculateIotSummary(iotData) {
    if (!iotData || iotData.length === 0) {
      return {
        temperature_avg: null,
        temperature_min: null,
        temperature_max: null,
        humidity_avg: null,
        humidity_min: null,
        humidity_max: null,
        data_points: 0
      };
    }

    const temperatures = iotData.map(d => d.temperature_moyenne).filter(t => t != null);
    const humidities = iotData.map(d => d.humidite_moyenne).filter(h => h != null);

    return {
      temperature_avg: temperatures.length > 0 ? 
        temperatures.reduce((a, b) => a + b, 0) / temperatures.length : null,
      temperature_min: temperatures.length > 0 ? Math.min(...temperatures) : null,
      temperature_max: temperatures.length > 0 ? Math.max(...temperatures) : null,
      humidity_avg: humidities.length > 0 ? 
        humidities.reduce((a, b) => a + b, 0) / humidities.length : null,
      humidity_min: humidities.length > 0 ? Math.min(...humidities) : null,
      humidity_max: humidities.length > 0 ? Math.max(...humidities) : null,
      data_points: iotData.length,
      last_update: iotData[iotData.length - 1]?.date_mesure || null
    };
  }

  /**
   * Simuler des données IoT (pour développement/test)
   */
  async simulateIotData(buildingId, lotId = null) {
    try {
      const now = new Date();
      
      // Générer des données réalistes
      const simulatedData = {
        batiment_id: buildingId,
        lot_id: lotId,
        temperature_moyenne: 32 + (Math.random() * 2 - 1), // 31-33°C
        temperature_min: 31 + Math.random() * 0.5,
        temperature_max: 33 + Math.random() * 0.5,
        humidite_moyenne: 65 + (Math.random() * 10 - 5), // 60-70%
        humidite_min: 60 + Math.random() * 5,
        humidite_max: 70 + Math.random() * 5,
        niveau_co2: 800 + Math.random() * 400, // 800-1200 ppm
        niveau_nh3: 10 + Math.random() * 5, // 10-15 ppm
        consommation_eau: 1000 + Math.random() * 500, // 1000-1500 litres
        consommation_electricite: 50 + Math.random() * 20, // 50-70 kWh
        date_mesure: now.toISOString().split('T')[0],
        heure_mesure: now.toTimeString().split(' ')[0]
      };

      // Enregistrer les données simulées
      const result = await this.saveIotData(simulatedData);

      if (result.success) {
        logger.info(`Données IoT simulées enregistrées pour bâtiment ${buildingId}`);
      }

      return result;
    } catch (error) {
      logger.error(`Erreur dans simulateIotData pour bâtiment ${buildingId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer les tendances environnementales
   */
  async getEnvironmentalTrends(buildingId, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('donnees_iot')
        .select('date_mesure, temperature_moyenne, humidite_moyenne, niveau_co2, niveau_nh3')
        .eq('batiment_id', buildingId)
        .gte('date_mesure', startDate.toISOString().split('T')[0])
        .order('date_mesure', { ascending: true });

      if (error) throw error;

      // Grouper par jour et calculer les moyennes
      const dailyAverages = this.calculateDailyAverages(data);

      return { 
        success: true, 
        raw_data: data,
        daily_averages: dailyAverages,
        summary: this.calculateTrendSummary(dailyAverages)
      };
    } catch (error) {
      logger.error(`Erreur dans getEnvironmentalTrends pour bâtiment ${buildingId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculer les moyennes quotidiennes
   */
  calculateDailyAverages(data) {
    const dailyGroups = {};

    data.forEach(record => {
      const date = record.date_mesure;
      if (!dailyGroups[date]) {
        dailyGroups[date] = {
          date,
          temperatures: [],
          humidities: [],
          co2_levels: [],
          nh3_levels: [],
          count: 0
        };
      }

      dailyGroups[date].temperatures.push(record.temperature_moyenne);
      dailyGroups[date].humidities.push(record.humidite_moyenne);
      if (record.niveau_co2) dailyGroups[date].co2_levels.push(record.niveau_co2);
      if (record.niveau_nh3) dailyGroups[date].nh3_levels.push(record.niveau_nh3);
      dailyGroups[date].count++;
    });

    // Calculer les moyennes
    return Object.values(dailyGroups).map(day => ({
      date: day.date,
      temperature_avg: day.temperatures.reduce((a, b) => a + b, 0) / day.temperatures.length,
      humidity_avg: day.humidities.reduce((a, b) => a + b, 0) / day.humidities.length,
      co2_avg: day.co2_levels.length > 0 ? 
        day.co2_levels.reduce((a, b) => a + b, 0) / day.co2_levels.length : null,
      nh3_avg: day.nh3_levels.length > 0 ? 
        day.nh3_levels.reduce((a, b) => a + b, 0) / day.nh3_levels.length : null,
      readings_count: day.count
    }));
  }

  /**
   * Calculer le résumé des tendances
   */
  calculateTrendSummary(dailyAverages) {
    if (dailyAverages.length === 0) {
      return {
        temperature_trend: 'stable',
        humidity_trend: 'stable',
        has_anomalies: false
      };
    }

    // Analyser la tendance des températures
    const temps = dailyAverages.map(d => d.temperature_avg);
    const tempSlope = this.calculateSlope(temps);
    
    // Analyser la tendance de l'humidité
    const hums = dailyAverages.map(d => d.humidity_avg);
    const humSlope = this.calculateSlope(hums);

    // Vérifier les anomalies
    const anomalies = dailyAverages.filter(day => 
      day.temperature_avg > 35 || day.temperature_avg < 28 ||
      day.humidity_avg > 80 || day.humidity_avg < 40
    );

    return {
      temperature_trend: tempSlope > 0.1 ? 'increasing' : 
                        tempSlope < -0.1 ? 'decreasing' : 'stable',
      humidity_trend: humSlope > 0.5 ? 'increasing' : 
                     humSlope < -0.5 ? 'decreasing' : 'stable',
      has_anomalies: anomalies.length > 0,
      anomaly_count: anomalies.length,
      last_temperature: temps[temps.length - 1],
      last_humidity: hums[hums.length - 1]
    };
  }

  /**
   * Calculer la pente d'une série de données
   */
  calculateSlope(data) {
    if (data.length < 2) return 0;
    
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Vérifier la santé des capteurs IoT
   */
  async checkIotHealth(buildingId) {
    try {
      // Vérifier la dernière lecture
      const { data: lastReading, error: readingError } = await supabase
        .from('donnees_iot')
        .select('date_mesure, heure_mesure')
        .eq('batiment_id', buildingId)
        .order('date_mesure', { ascending: false })
        .order('heure_mesure', { ascending: false })
        .limit(1)
        .single();

      if (readingError && readingError.code !== 'PGRST116') {
        throw readingError;
      }

      const now = new Date();
      const lastUpdate = lastReading ? 
        new Date(`${lastReading.date_mesure}T${lastReading.heure_mesure}`) : null;
      
      const hoursSinceLastUpdate = lastUpdate ? 
        (now - lastUpdate) / (1000 * 60 * 60) : Infinity;

      // Vérifier la cohérence des données récentes
      const { data: recentData, error: recentError } = await supabase
        .from('donnees_iot')
        .select('temperature_moyenne, humidite_moyenne')
        .eq('batiment_id', buildingId)
        .gte('date_mesure', new Date(now.setDate(now.getDate() - 1)).toISOString().split('T')[0])
        .limit(10);

      if (recentError) throw recentError;

      let dataConsistency = 'good';
      if (recentData.length > 0) {
        const temps = recentData.map(d => d.temperature_moyenne);
        const hums = recentData.map(d => d.humidite_moyenne);
        
        const tempStdDev = this.calculateStdDev(temps);
        const humStdDev = this.calculateStdDev(hums);
        
        if (tempStdDev > 5 || humStdDev > 15) {
          dataConsistency = 'unstable';
        }
      }

      const healthStatus = {
        last_update: lastUpdate?.toISOString() || null,
        hours_since_last_update: hoursSinceLastUpdate,
        data_consistency: dataConsistency,
        status: hoursSinceLastUpdate > 24 ? 'offline' : 
                hoursSinceLastUpdate > 4 ? 'warning' : 'online',
        recent_readings_count: recentData.length
      };

      return { success: true, health: healthStatus };
    } catch (error) {
      logger.error(`Erreur dans checkIotHealth pour bâtiment ${buildingId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculer l'écart-type
   */
  calculateStdDev(numbers) {
    if (numbers.length < 2) return 0;
    
    const mean = numbers.reduce((a, b) => a + b) / numbers.length;
    const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (numbers.length - 1);
    return Math.sqrt(variance);
  }
}

module.exports = new IotModel();