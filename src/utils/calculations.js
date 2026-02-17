/**
 * Utilitaires de calcul pour la Ferme du Vatican
 */

/**
 * Calculer le Coût de Production par Sujet (CPS)
 * @param {number} feedCost - Coût alimentation
 * @param {number} healthCost - Coût santé
 * @param {number} laborCost - Coût main d'œuvre
 * @param {number} logisticsCost - Coût logistique
 * @param {number} quantity - Quantité initiale
 * @returns {number} CPS
 */
function calculateCPS(feedCost, healthCost, laborCost, logisticsCost, quantity) {
  if (!quantity || quantity <= 0) return 0;
  
  const totalCost = (feedCost || 0) + 
                    (healthCost || 0) + 
                    (laborCost || 0) + 
                    (logisticsCost || 0);
  
  return totalCost / quantity;
}

/**
 * Calculer le Profit Direct par Sujet (PDS)
 * @param {number} salesRevenue - Chiffre d'affaires
 * @param {number} feedCost - Coût alimentation
 * @param {number} healthCost - Coût santé
 * @param {number} logisticsCost - Coût logistique
 * @param {number} quantity - Quantité vendue
 * @returns {number} PDS
 */
function calculatePDS(salesRevenue, feedCost, healthCost, logisticsCost, quantity) {
  if (!quantity || quantity <= 0) return 0;
  
  const totalCost = (feedCost || 0) + 
                    (healthCost || 0) + 
                    (logisticsCost || 0);
  
  const profit = (salesRevenue || 0) - totalCost;
  return profit / quantity;
}

/**
 * Calculer le taux de mortalité
 * @param {number} initialQuantity - Quantité initiale
 * @param {number} currentQuantity - Quantité actuelle
 * @returns {number} Taux de mortalité en pourcentage
 */
function calculateMortalityRate(initialQuantity, currentQuantity) {
  if (!initialQuantity || initialQuantity <= 0) return 0;
  
  const deaths = initialQuantity - currentQuantity;
  return (deaths / initialQuantity) * 100;
}

/**
 * Calculer l'Indice de Conversion Alimentaire (ICA)
 * @param {number} feedConsumed - Quantité nourriture consommée (kg)
 * @param {number} liveWeight - Poids vif produit (kg)
 * @returns {number} ICA
 */
function calculateFeedConversionRatio(feedConsumed, liveWeight) {
  if (!liveWeight || liveWeight <= 0) return 0;
  return (feedConsumed || 0) / liveWeight;
}

/**
 * Calculer le Gain Moyen Quotidien (GMQ)
 * @param {number} initialWeight - Poids initial (kg)
 * @param {number} finalWeight - Poids final (kg)
 * @param {number} days - Nombre de jours
 * @returns {number} GMQ en grammes/jour
 */
function calculateAverageDailyGain(initialWeight, finalWeight, days) {
  if (!days || days <= 0) return 0;
  const weightGain = (finalWeight || 0) - (initialWeight || 0);
  return (weightGain / days) * 1000; // Convertir en grammes
}

/**
 * Calculer l'efficacité énergétique
 * @param {number} electricityConsumption - Consommation électrique (kWh)
 * @param {number} buildingArea - Surface bâtiment (m²)
 * @param {number} days - Nombre de jours
 * @returns {number} kWh/m²/jour
 */
function calculateEnergyEfficiency(electricityConsumption, buildingArea, days) {
  if (!buildingArea || buildingArea <= 0 || !days || days <= 0) return 0;
  return (electricityConsumption || 0) / (buildingArea * days);
}

/**
 * Prévoir le CPS basé sur les tendances
 * @param {Array} historicalCPS - Historique des CPS
 * @param {number} forecastDays - Jours à prévoir
 * @returns {Object} Prévisions
 */
function forecastCPS(historicalCPS, forecastDays = 7) {
  if (!historicalCPS || historicalCPS.length < 2) {
    return {
      forecast: null,
      trend: 'stable',
      confidence: 0
    };
  }

  // Régression linéaire simple
  const n = historicalCPS.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += historicalCPS[i];
    sumXY += i * historicalCPS[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Prévoir les prochains jours
  const forecast = [];
  for (let i = 0; i < forecastDays; i++) {
    forecast.push(intercept + slope * (n + i));
  }
  
  // Déterminer la tendance
  let trend = 'stable';
  if (slope > 0.05) trend = 'increasing';
  else if (slope < -0.05) trend = 'decreasing';
  
  // Calculer la confiance (R² simplifié)
  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  
  for (let i = 0; i < n; i++) {
    const yPred = intercept + slope * i;
    ssTot += Math.pow(historicalCPS[i] - meanY, 2);
    ssRes += Math.pow(historicalCPS[i] - yPred, 2);
  }
  
  const rSquared = 1 - (ssRes / ssTot);
  const confidence = Math.max(0, Math.min(100, rSquared * 100));

  return {
    forecast,
    trend,
    confidence,
    current: historicalCPS[historicalCPS.length - 1],
    slope
  };
}

/**
 * Détecter les anomalies dans une série temporelle
 * @param {Array} data - Données temporelles
 * @param {number} threshold - Seuil d'anomalie (écart-type)
 * @returns {Array} Indices des anomalies détectées
 */
function detectAnomalies(data, threshold = 2) {
  if (!data || data.length < 3) return [];
  
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  const anomalies = [];
  for (let i = 0; i < data.length; i++) {
    const zScore = Math.abs((data[i] - mean) / stdDev);
    if (zScore > threshold) {
      anomalies.push({
        index: i,
        value: data[i],
        zScore,
        deviation: ((data[i] - mean) / mean) * 100
      });
    }
  }
  
  return anomalies;
}

/**
 * Calculer les économies potentielles
 * @param {Object} currentMetrics - Métriques actuelles
 * @param {Object} targetMetrics - Métriques cibles
 * @param {number} productionVolume - Volume de production
 * @returns {Object} Analyse d'économies
 */
function calculatePotentialSavings(currentMetrics, targetMetrics, productionVolume) {
  const savings = {};
  
  // CPS
  if (currentMetrics.cps && targetMetrics.cps) {
    const cpsReduction = currentMetrics.cps - targetMetrics.cps;
    savings.cps = {
      reduction_per_unit: cpsReduction,
      total_savings: cpsReduction * productionVolume,
      percentage: (cpsReduction / currentMetrics.cps) * 100
    };
  }
  
  // Mortalité
  if (currentMetrics.mortality && targetMetrics.mortality) {
    const mortalityReduction = currentMetrics.mortality - targetMetrics.mortality;
    const valuePerUnit = currentMetrics.cps || 15; // Valeur moyenne par sujet
    savings.mortality = {
      reduction_percentage: mortalityReduction,
      saved_units: (mortalityReduction / 100) * productionVolume,
      total_savings: ((mortalityReduction / 100) * productionVolume) * valuePerUnit
    };
  }
  
  // Conversion alimentaire
  if (currentMetrics.fcr && targetMetrics.fcr && currentMetrics.feedPrice) {
    const fcrReduction = currentMetrics.fcr - targetMetrics.fcr;
    savings.fcr = {
      reduction: fcrReduction,
      feed_saved_per_unit: fcrReduction * currentMetrics.averageWeight,
      total_feed_savings: fcrReduction * currentMetrics.averageWeight * productionVolume,
      monetary_savings: fcrReduction * currentMetrics.averageWeight * productionVolume * currentMetrics.feedPrice
    };
  }
  
  // Total
  savings.total = {
    estimated_savings: Object.values(savings).reduce((sum, item) => 
      sum + (item.total_savings || item.monetary_savings || 0), 0
    ),
    metrics_improved: Object.keys(savings).length
  };
  
  return savings;
}

module.exports = {
  calculateCPS,
  calculatePDS,
  calculateMortalityRate,
  calculateFeedConversionRatio,
  calculateAverageDailyGain,
  calculateEnergyEfficiency,
  forecastCPS,
  detectAnomalies,
  calculatePotentialSavings
};