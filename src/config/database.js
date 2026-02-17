// Configuration de la connexion Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Vérification des variables d'environnement (optionnel)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

// Valider que l'URL est correcte
function isValidUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Créer le client Supabase seulement si les variables sont définies et valides
if (supabaseUrl && supabaseKey && isValidUrl(supabaseUrl)) {
  try {
    supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    console.log('✅ Client Supabase initialisé');
  } catch (error) {
    console.warn('⚠️  Erreur lors de l\'initialisation de Supabase:', error.message);
    console.warn('   Les routes API ne fonctionneront pas correctement');
  }
} else {
  console.warn('⚠️  Supabase non configuré - Les routes API ne fonctionneront pas');
  if (supabaseUrl && !isValidUrl(supabaseUrl)) {
    console.warn('   SUPABASE_URL n\'est pas une URL valide (doit commencer par http:// ou https://)');
  } else {
    console.warn('   Ajoutez SUPABASE_URL et SUPABASE_ANON_KEY dans votre fichier .env');
  }
}

// Vérifier la connexion à la base de données
async function testConnection() {
  if (!supabase) {
    console.warn('⚠️  Supabase non configuré - Impossible de tester la connexion');
    return false;
  }
  
  try {
    const { data, error } = await supabase
      .from('lots')
      .select('count')
      .limit(1);

    if (error) throw error;

    console.log('✅ Connexion à Supabase établie avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à Supabase:', error.message);
    return false;
  }
}

// Initialiser la base de données
async function initializeDatabase() {
  if (!supabase) {
    return false;
  }
  return await testConnection();
}

// Exporter le client et les fonctions
module.exports = {
  supabase,
  testConnection,
  initializeDatabase
};