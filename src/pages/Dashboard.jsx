
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, AlertTriangle, 
  Thermometer, Droplets, Package, DollarSign 
} from 'lucide-react';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [productionData, setProductionData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadProductionChartData();
    loadAlerts();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data, error } = await supabase
        .from('vue_dashboard_principal')
        .select('*')
        .single();
      
      if (!error) setDashboardData(data);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    }
  };

  const loadProductionChartData = async () => {
    try {
      const { data, error } = await supabase
        .from('vue_analytics_production')
        .select('*')
        .order('date_jour', { ascending: true })
        .limit(30);
      
      if (!error) setProductionData(data);
    } catch (error) {
      console.error('Erreur chargement production:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('vue_alertes_actives')
        .select('*')
        .order('date_detection', { ascending: false })
        .limit(5);
      
      if (!error) setAlerts(data);
    } catch (error) {
      console.error('Erreur chargement alertes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Données pour graphique CPS/PDS
  const performanceData = productionData.map(item => ({
    date: new Date(item.date_jour).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    cps: item.cps_moyen,
    pds: item.pds_moyen
  }));

  // Données pour camembert mortalité
  const mortalityData = [
    { name: 'Normale', value: 85, color: '#10b981' },
    { name: 'Élevée', value: 10, color: '#f59e0b' },
    { name: 'Critique', value: 5, color: '#ef4444' }
  ];

  // Cartes de métriques
  const metricCards = [
    {
      title: 'Lots Actifs',
      value: dashboardData?.total_lots_actifs || 0,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-blue-500',
      trend: dashboardData?.evolution_lots_7j || 0
    },
    {
      title: 'Poussins',
      value: dashboardData?.total_poussins?.toLocaleString() || 0,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-green-500',
      trend: dashboardData?.evolution_poussins_7j || 0
    },
    {
      title: 'CPS Moyen',
      value: `${dashboardData?.cps_moyen?.toFixed(2) || '0.00'}€`,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-purple-500',
      subtext: 'Coût Production'
    },
    {
      title: 'PDS Moyen',
      value: `${dashboardData?.pds_moyen?.toFixed(2) || '0.00'}€`,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-indigo-500',
      subtext: 'Profit Direct'
    },
    {
      title: 'Température',
      value: `${dashboardData?.temperature_moyenne_24h || '--'}°C`,
      icon: <Thermometer className="w-6 h-6" />,
      color: 'bg-red-500'
    },
    {
      title: 'Humidité',
      value: `${dashboardData?.humidite_moyenne_24h || '--'}%`,
      icon: <Droplets className="w-6 h-6" />,
      color: 'bg-cyan-500'
    },
    {
      title: 'Alertes Actives',
      value: dashboardData?.alertes_actives || 0,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: dashboardData?.alertes_critiques > 0 ? 'bg-red-500' : 'bg-yellow-500',
      subtext: `${dashboardData?.alertes_critiques || 0} critiques`
    },
    {
      title: 'Stocks Critiques',
      value: dashboardData?.stocks_critiques || 0,
      icon: <Package className="w-6 h-6" />,
      color: 'bg-orange-500'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
          <p className="text-gray-600">Vue d'ensemble de la production</p>
        </div>
        <div className="text-sm text-gray-500">
          Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
        </div>
      </div>

      {/* Grille de métriques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md p-6 border-l-4" style={{ borderLeftColor: card.color }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold mt-2">{card.value}</p>
                {card.subtext && (
                  <p className="text-xs text-gray-400 mt-1">{card.subtext}</p>
                )}
                {card.trend !== undefined && (
                  <div className="flex items-center mt-2">
                    {card.trend >= 0 ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-green-500 text-sm ml-1">+{card.trend}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className="text-red-500 text-sm ml-1">{card.trend}%</span>
                      </>
                    )}
                    <span className="text-gray-400 text-xs ml-2">sur 7j</span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-full ${card.color.replace('bg-', 'bg-')} bg-opacity-10`}>
                <div className={card.color}>{card.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique CPS/PDS */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Évolution CPS & PDS (30 jours)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}€`, '']} />
                <Legend />
                <Line type="monotone" dataKey="cps" stroke="#3b82f6" name="CPS" strokeWidth={2} />
                <Line type="monotone" dataKey="pds" stroke="#10b981" name="PDS" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique mortalité */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Répartition Mortalité</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mortalityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mortalityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alertes récentes */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Alertes Récentes</h2>
          <button className="text-blue-500 text-sm font-medium">
            Voir toutes les alertes →
          </button>
        </div>
        
        {alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                alert.niveau === 'critical' ? 'border-red-500 bg-red-50' :
                alert.niveau === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <AlertTriangle className={`w-5 h-5 mr-2 ${
                        alert.niveau === 'critical' ? 'text-red-500' :
                        alert.niveau === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                      }`} />
                      <h3 className="font-medium">{alert.titre}</h3>
                      <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                        alert.niveau === 'critical' ? 'bg-red-100 text-red-800' :
                        alert.niveau === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.niveau === 'critical' ? 'CRITIQUE' : 
                         alert.niveau === 'warning' ? 'ALERTE' : 'INFO'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-2">{alert.description}</p>
                    <div className="flex items-center mt-3 text-xs text-gray-500">
                      <span>{new Date(alert.date_detection).toLocaleString('fr-FR')}</span>
                      <span className="mx-2">•</span>
                      <span>{alert.type_alerte}</span>
                      {alert.cible_nom && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{alert.cible_nom}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button className="text-sm text-blue-500 hover:text-blue-700 font-medium">
                    Résoudre
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-500">Aucune alerte active</p>
            <p className="text-sm text-gray-400">Tout fonctionne normalement</p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center">
            <Users className="w-8 h-8 text-gray-400 mb-2" />
            <span className="font-medium">Nouveau Lot</span>
            <span className="text-sm text-gray-500">Ajouter des poussins</span>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors flex flex-col items-center justify-center">
            <DollarSign className="w-8 h-8 text-gray-400 mb-2" />
            <span className="font-medium">Nouvelle Commande</span>
            <span className="text-sm text-gray-500">Vendre des produits</span>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors flex flex-col items-center justify-center">
            <Package className="w-8 h-8 text-gray-400 mb-2" />
            <span className="font-medium">Gérer Stocks</span>
            <span className="text-sm text-gray-500">Approvisionnement</span>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors flex flex-col items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-gray-400 mb-2" />
            <span className="font-medium">Déclarer Problème</span>
            <span className="text-sm text-gray-500">Créer une alerte</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;