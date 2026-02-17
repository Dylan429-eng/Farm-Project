import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Plus, Search, Filter, Edit, Trash2, Eye,
  TrendingUp, TrendingDown, Calendar, Building,
  Users, DollarSign, AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Lots = () => {
  const [lots, setLots] = useState([]);
  const [filteredLots, setFilteredLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    statut: 'tous',
    batiment: 'tous'
  });
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [newLot, setNewLot] = useState({
    reference: '',
    quantite_initiale: '',
    batiment_id: '',
    fournisseur_id: '',
    date_arrivee: ''
  });

  useEffect(() => {
    loadLots();
    loadStats();
  }, []);

  useEffect(() => {
    filterLots();
  }, [searchTerm, filters, lots]);

  const loadLots = async () => {
    try {
      const { data, error } = await supabase
        .from('vue_lots_details')
        .select('*')
        .order('date_arrivee', { ascending: false });
      
      if (!error) {
        setLots(data);
        setFilteredLots(data);
      }
    } catch (error) {
      console.error('Erreur chargement lots:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('vue_stats_lots')
        .select('*')
        .single();
      
      if (!error) setStats(data);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const filterLots = () => {
    let filtered = [...lots];

    // Recherche
    if (searchTerm) {
      filtered = filtered.filter(lot =>
        lot.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.batiment_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.fournisseur_nom?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtres
    if (filters.statut !== 'tous') {
      filtered = filtered.filter(lot => lot.statut === filters.statut);
    }
    if (filters.batiment !== 'tous') {
      filtered = filtered.filter(lot => lot.batiment_id === filters.batiment);
    }

    setFilteredLots(filtered);
  };

  const handleCreateLot = async () => {
    try {
      const { error } = await supabase
        .from('lots')
        .insert([{
          ...newLot,
          quantite_actuelle: newLot.quantite_initiale,
          age_jours: 0,
          statut: 'actif'
        }]);

      if (!error) {
        setShowForm(false);
        setNewLot({
          reference: '',
          quantite_initiale: '',
          batiment_id: '',
          fournisseur_id: '',
          date_arrivee: ''
        });
        loadLots();
      }
    } catch (error) {
      console.error('Erreur création lot:', error);
    }
  };

  const handleUpdateStatus = async (lotId, newStatus) => {
    try {
      const { error } = await supabase
        .from('lots')
        .update({ statut: newStatus })
        .eq('id', lotId);

      if (!error) {
        loadLots();
      }
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
    }
  };

  const getStatusColor = (statut) => {
    switch (statut) {
      case 'actif': return 'bg-green-100 text-green-800';
      case 'termine': return 'bg-blue-100 text-blue-800';
      case 'abandonne': return 'bg-red-100 text-red-800';
      case 'quarantaine': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (statut) => {
    switch (statut) {
      case 'actif': return 'Actif';
      case 'termine': return 'Terminé';
      case 'abandonne': return 'Abandonné';
      case 'quarantaine': return 'Quarantaine';
      default: return statut;
    }
  };

  // Données pour graphique performance
  const performanceData = lots.slice(0, 10).map(lot => ({
    name: lot.reference,
    cps: lot.cps,
    pds: lot.pds,
    mortalite: lot.taux_mortalite
  }));

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
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Lots</h1>
          <p className="text-gray-600">Suivi complet des lots de poussins</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouveau Lot
        </button>
      </div>

      {/* Statistiques rapides */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Lots</p>
                <p className="text-2xl font-bold mt-2">{stats.total_lots}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">CPS Moyen</p>
                <p className="text-2xl font-bold mt-2">{stats.cps_moyen.toFixed(2)}€</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Mortalité Moy.</p>
                <p className="text-2xl font-bold mt-2">{stats.mortalite_moyenne.toFixed(1)}%</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Profit Total</p>
                <p className="text-2xl font-bold mt-2">{stats.profit_total.toFixed(2)}€</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Graphique performance */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Performance des 10 Derniers Lots</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="cps" fill="#3b82f6" name="CPS (€)" />
              <Bar yAxisId="left" dataKey="pds" fill="#10b981" name="PDS (€)" />
              <Line yAxisId="right" type="monotone" dataKey="mortalite" stroke="#ef4444" name="Mortalité (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un lot, bâtiment, fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-4">
            <select
              value={filters.statut}
              onChange={(e) => setFilters({...filters, statut: e.target.value})}
              className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="tous">Tous les statuts</option>
              <option value="actif">Actif</option>
              <option value="termine">Terminé</option>
              <option value="abandonne">Abandonné</option>
              <option value="quarantaine">Quarantaine</option>
            </select>
            
            <select
              value={filters.batiment}
              onChange={(e) => setFilters({...filters, batiment: e.target.value})}
              className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="tous">Tous les bâtiments</option>
              {[...new Set(lots.map(lot => lot.batiment_id))].map(batId => {
                const bat = lots.find(l => l.batiment_id === batId);
                return bat ? (
                  <option key={batId} value={batId}>{bat.batiment_nom}</option>
                ) : null;
              })}
            </select>
            
            <button className="flex items-center border rounded-lg px-4 py-2 hover:bg-gray-50">
              <Filter className="w-5 h-5 mr-2" />
              Plus de filtres
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des lots */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bâtiment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPS/PDS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mortalité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Âge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLots.map((lot) => (
                <tr key={lot.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{lot.reference}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(lot.date_arrivee).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building className="w-4 h-4 text-gray-400 mr-2" />
                      <span>{lot.batiment_nom || '--'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">{lot.quantite_actuelle}</div>
                    <div className="text-sm text-gray-500">
                      Initial: {lot.quantite_initiale}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-2">CPS:</span>
                        <span className={`font-medium ${lot.cps > 16 ? 'text-red-600' : 'text-green-600'}`}>
                          {lot.cps.toFixed(2)}€
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-2">PDS:</span>
                        <span className={`font-medium ${lot.pds < 8 ? 'text-red-600' : 'text-green-600'}`}>
                          {lot.pds.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`font-medium ${lot.taux_mortalite > 5 ? 'text-red-600' : 'text-green-600'}`}>
                      {lot.taux_mortalite.toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span>{lot.age_jours} jours</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lot.statut)}`}>
                      {getStatusLabel(lot.statut)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-5 h-5" />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <Edit className="w-5 h-5" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal création lot */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Créer un Nouveau Lot</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Référence *
                    </label>
                    <input
                      type="text"
                      value={newLot.reference}
                      onChange={(e) => setNewLot({...newLot, reference: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="LOT-2024-001"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date d'arrivée *
                    </label>
                    <input
                      type="date"
                      value={newLot.date_arrivee}
                      onChange={(e) => setNewLot({...newLot, date_arrivee: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantité Initiale *
                  </label>
                  <input
                    type="number"
                    value={newLot.quantite_initiale}
                    onChange={(e) => setNewLot({...newLot, quantite_initiale: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1000"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bâtiment
                    </label>
                    <select
                      value={newLot.batiment_id}
                      onChange={(e) => setNewLot({...newLot, batiment_id: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Sélectionner un bâtiment</option>
                      {/* Options chargées depuis Supabase */}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fournisseur
                    </label>
                    <select
                      value={newLot.fournisseur_id}
                      onChange={(e) => setNewLot({...newLot, fournisseur_id: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Sélectionner un fournisseur</option>
                      {/* Options chargées depuis Supabase */}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateLot}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Créer le lot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lots;