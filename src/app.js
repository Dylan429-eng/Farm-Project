// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const logger = require('./utils/logger');
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Import des routes
const routes = require('./routes');

// Import des middlewares d'erreur
const { 
  errorHandler, 
  notFoundHandler, 
  validationErrorHandler,
  jwtErrorHandler,
  databaseErrorHandler 
} = require('./middlewares/errorHandler');

// Créer l'application Express
const app = express();

// Configuration du moteur de template EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuration Helmet pour autoriser les scripts externes
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'unpkg.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
};

// Middlewares de sécurité
app.use(helmet(helmetConfig));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

// Middleware pour parser les cookies
app.use(cookieParser());

// Limiter les requêtes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use('/api', limiter);

// Middlewares de base
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging des requêtes
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
});

// Route racine - Redirection vers le dashboard (DOIT être AVANT les routes API)
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Routes API
app.use('/api', routes);

// Route favicon - Éviter les erreurs 404 dans les logs
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Route dashboard - Page d'accueil
app.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    title: 'Bienvenue'
  });
});

// Route lots - Liste des lots
app.get('/lots', (req, res) => {
  const user = req.query.user || req.session?.user || 'Utilisateur';
  const email = req.query.email || req.session?.email || '';
  const prenom = req.query.prenom || req.session?.prenom || '';
  const nom = req.query.nom || req.session?.nom || '';
  
  // Données de test (à remplacer par des données réelles depuis la DB)
  const lots = [
    { id: 1, nom_lot: 'Lot A1 - Poussins Printemps', batiment_nom: 'Bâtiment A', nombre_initial: 1000, nombre_actuel: 985, age_jours: 15, statut: 'actif', taux_mortalite: 1.5, cps: 2.45, pds: 3.20 },
    { id: 2, nom_lot: 'Lot B2 - Poussins Hiver', batiment_nom: 'Bâtiment B', nombre_initial: 800, nombre_actuel: 792, age_jours: 28, statut: 'actif', taux_mortalite: 1.0, cps: 2.80, pds: 3.50 },
    { id: 3, nom_lot: 'Lot C3 - Poussins Été', batiment_nom: 'Bâtiment C', nombre_initial: 1200, nombre_actuel: 1150, age_jours: 42, statut: 'termine', taux_mortalite: 4.2, cps: 2.95, pds: 3.80 }
  ];
  
  const stats = {
    totalLots: 2,
    totalPoussins: 1777,
    avgMortality: 2.2,
    avgCPS: 2.73
  };

  res.render('lots', {
    title: 'Gestion des Lots',
    currentPage: 'lots',
    user: user,
    email: email,
    prenom: prenom,
    nom: nom,
    lots: lots,
    stats: stats
  });
});

// Route lot detail - Détails d'un lot
app.get('/lots/:id', (req, res) => {
  const lotId = req.params.id;
  const user = req.query.user || req.session?.user || 'Utilisateur';
  const email = req.query.email || req.session?.email || '';
  
  // Données de test
  const lot = {
    id: lotId,
    nom_lot: 'Lot A1 - Poussins Printemps',
    batiment_nom: 'Bâtiment A',
    nombre_initial: 1000,
    nombre_actuel: 985,
    age_jours: 15,
    statut: 'actif',
    duree_prevue: 42,
    taux_mortalite: 1.5,
    cps: 2.45,
    pds: 3.20,
    cout_alimentation: 450,
    cout_sante: 120,
    autres_couts: 80
  };
  
  const mortalityHistory = [
    { date: '2026-02-10', nombre: 5, cause: 'Maladie', notes: 'Poussins affaiblis' },
    { date: '2026-02-12', nombre: 3, cause: 'Température', notes: 'Froid nocturne' },
    { date: '2026-02-14', nombre: 7, cause: 'Inconnu', notes: '' }
  ];

  res.render('lot-detail', {
    title: 'Détails du Lot',
    currentPage: 'lots',
    user: user,
    email: email,
    lot: lot,
    mortalityHistory: mortalityHistory
  });
});

// Route alerts - Liste des alertes
app.get('/alerts', (req, res) => {
  const user = req.query.user || req.session?.user || 'Utilisateur';
  const email = req.query.email || req.session?.email || '';
  const prenom = req.query.prenom || req.session?.prenom || '';
  const nom = req.query.nom || req.session?.nom || '';
  const filter = req.query.filter || 'active';
  
  // Données de test
  const alerts = [
    { id: 1, titre: 'Température élevée', description: 'La température dans le bâtiment A dépasse 35°C', niveau: 'critical', type_alerte: 'Environnement', cible_nom: 'Bâtiment A', date_detection: '2026-02-15T10:30:00Z', statut: 'active' },
    { id: 2, titre: 'Stock d\'alimentation faible', description: 'Le stock de nourriture pour le lot B2 est en baisse', niveau: 'warning', type_alerte: 'Stock', cible_nom: 'Lot B2', date_detection: '2026-02-15T08:00:00Z', statut: 'active' },
    { id: 3, titre: 'Mortalité anormale', description: 'Taux de mortalité de 3% détecté sur les dernières 24h', niveau: 'warning', type_alerte: 'Santé', cible_nom: 'Lot A1', date_detection: '2026-02-14T16:00:00Z', statut: 'resolue' },
    { id: 4, titre: 'Capteur humedad défectueux', description: 'Le capteur d\'humidité du bâtiment C ne répond plus', niveau: 'info', type_alerte: 'IoT', cible_nom: 'Bâtiment C', date_detection: '2026-02-13T12:00:00Z', statut: 'active' }
  ];
  
  // Filtrer les alertes selon le paramètre
  let filteredAlerts = alerts;
  if (filter === 'active') {
    filteredAlerts = alerts.filter(a => a.statut === 'active');
  } else if (filter === 'critical') {
    filteredAlerts = alerts.filter(a => a.niveau === 'critical' && a.statut === 'active');
  } else if (filter === 'resolved') {
    filteredAlerts = alerts.filter(a => a.statut === 'resolue');
  }

  const stats = {
    critiques: alerts.filter(a => a.niveau === 'critical' && a.statut === 'active').length,
    avertissements: alerts.filter(a => a.niveau === 'warning' && a.statut === 'active').length,
    informations: alerts.filter(a => a.niveau === 'info' && a.statut === 'active').length,
    resolues: alerts.filter(a => a.statut === 'resolue').length
  };

  res.render('alerts', {
    title: 'Alertes',
    currentPage: 'alerts',
    user: user,
    email: email,
    prenom: prenom,
    nom: nom,
    alerts: filteredAlerts,
    stats: stats,
    filter: filter
  });
});

// Route login - Page de connexion
app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Connexion',
    currentPage: 'login',
    error: null,
    success: null
  });
});

// Route register - Page d'inscription
app.get('/register', (req, res) => {
  res.render('register', {
    title: 'Inscription',
    currentPage: 'login'
  });
});

// Route inscription POST - Utilise le contrôleur puis redirige vers home avec les données utilisateur
app.post('/register', (req, res) => {
  // Appeler le contrôleur d'authentification
  const authController = require('./controllers/authController');
  
  // Créer une requête simulé pour le contrôleur
  const mockReq = { body: req.body };
  const mockRes = {
    redirect: (url) => {
      // Après inscription réussie, rediriger vers home avec les infos
      res.redirect('/home?user=' + encodeURIComponent(req.body.nom || 'Utilisateur'));
    },
    status: function() { return this; },
    json: function(data) {
      if (data.success) {
        res.redirect('/home?user=' + encodeURIComponent(req.body.nom || 'Utilisateur'));
      } else {
        res.redirect('/register?error=' + encodeURIComponent(data.message || 'Erreur'));
      }
    }
  };
  
  authController.signUp(mockReq, mockRes);
});

// Route connexion POST - Utilise le contrôleur puis redirige vers home avec les données utilisateur
app.post('/login', (req, res) => {
  const authController = require('./controllers/authController');
  const email = req.body.email || '';
  
  const mockReq = { body: req.body };
  const mockRes = {
    cookie: () => mockRes,
    status: function() { return this; },
    json: function(data) {
      if (data.success && data.user) {
        // Extraire les vraies données utilisateur
        const userPrenom = data.user.prenom || '';
        const userNom = data.user.nom || '';
        const userEmail = data.user.email || email;
        const userRole = data.user.role || 'user';
        const userName = userPrenom || userNom || email.split('@')[0] || 'Utilisateur';
        
        res.redirect('/home?user=' + encodeURIComponent(userName) + 
          '&email=' + encodeURIComponent(userEmail) + 
          '&prenom=' + encodeURIComponent(userPrenom || '') + 
          '&nom=' + encodeURIComponent(userNom || '') +
          '&role=' + encodeURIComponent(userRole));
      } else {
        res.redirect('/login?error=' + encodeURIComponent(data.error || 'Erreur de connexion'));
      }
    }
  };
  
  authController.login(mockReq, mockRes);
});

// Route home - Page d'accueil après connexion
app.get('/home', (req, res) => {
  const user = req.query.user || 'Utilisateur';
  const email = req.query.email || '';
  const prenom = req.query.prenom || '';
  const nom = req.query.nom || '';
  
  const stats = {
    lots: 3,
    poussins: 2450,
    alertes: 2,
    capteurs: 12
  };

  res.render('home', {
    title: 'Accueil',
    user: user,
    email: email,
    prenom: prenom,
    nom: nom,
    stats: stats
  });
});

// Route logout - Déconnexion
app.get('/logout', (req, res) => {
  // Simulation de déconnexion - À remplacer par vrai traitement
  res.redirect('/dashboard');
});

// Route forgot-password - Page mot de passe oublié
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password', {
    title: 'Mot de passe oublié',
    currentPage: 'login',
    success: false,
    email: null
  });
});

// Route rapports - Page des statistiques
app.get('/rapports', (req, res) => {
  const user = req.query.user || req.session?.user || 'Utilisateur';
  const email = req.query.email || req.session?.email || '';
  const prenom = req.query.prenom || req.session?.prenom || '';
  const nom = req.query.nom || req.session?.nom || '';
  
  res.render('rapports', {
    title: 'Rapports',
    user: user,
    email: email,
    prenom: prenom,
    nom: nom
  });
});

// Route iot - Page des capteurs
app.get('/iot', (req, res) => {
  const user = req.query.user || req.session?.user || 'Utilisateur';
  const email = req.query.email || req.session?.email || '';
  const prenom = req.query.prenom || req.session?.prenom || '';
  const nom = req.query.nom || req.session?.nom || '';
  
  res.render('iot', {
    title: 'IoT',
    user: user,
    email: email,
    prenom: prenom,
    nom: nom
  });
});

// Route profile - Page de profil utilisateur
app.get('/profile', (req, res) => {
  // Récupérer les données utilisateur depuis la session ou les query params
  const user = req.query.user || req.session?.user || 'Utilisateur';
  const email = req.query.email || req.session?.email || 'email@exemple.com';
  const nom = req.query.nom || req.session?.nom || 'Dupont';
  const prenom = req.query.prenom || req.session?.prenom || 'Jean';
  const telephone = req.query.telephone || req.session?.telephone || '+33 6 12 34 56 78';
  const role = req.query.role || req.session?.role || 'user';
  
  res.render('profile', {
    title: 'Profil',
    user: user,
    email: email,
    nom: nom,
    prenom: prenom,
    telephone: telephone,
    role: role
  });
});

// Route users - Liste des utilisateurs (réservée aux managers)
app.get('/users', async (req, res) => {
  const user = req.query.user || req.session?.user || 'Utilisateur';
  const email = req.query.email || req.session?.email || '';
  const role = req.query.role || req.session?.role || 'user';
  
  // Vérifier si l'utilisateur est manager
  if (role !== 'manager' && role !== 'admin') {
    return res.redirect('/profile?error=Accès refusé&user=' + encodeURIComponent(user) + '&email=' + encodeURIComponent(email) + '&role=' + encodeURIComponent(role));
  }
  
  try {
    // Récupérer la liste des utilisateurs depuis Supabase
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, nom, prenom, role, statut, last_login')
      .order('created_at', { ascending: false });
    
    res.render('users', {
      title: 'Utilisateurs',
      user: user,
      email: email,
      role: role,
      users: users || []
    });
  } catch (error) {
    logger.error('Erreur récupération utilisateurs:', error);
    res.render('users', {
      title: 'Utilisateurs',
      user: user,
      email: email,
      role: role,
      users: []
    });
  }
});

// Route profile update POST - Mise à jour du profil
app.post('/profile/update', (req, res) => {
  const { prenom, nom, email, telephone } = req.body;
  // Ici vous pouvez ajouter la logique pour sauvegarder dans la base de données
  // Pour l'instant, on redirige vers le profil avec les nouvelles données
  const userName = prenom || 'Utilisateur';
  res.redirect('/profile?user=' + encodeURIComponent(userName) + '&email=' + encodeURIComponent(email || '') + '&prenom=' + encodeURIComponent(prenom || '') + '&nom=' + encodeURIComponent(nom || '') + '&telephone=' + encodeURIComponent(telephone || ''));
});

// Route profile edit - Édition du profil
app.get('/profile/edit', (req, res) => {
  const user = req.query.user || req.session?.user || 'Utilisateur';
  const email = req.query.email || req.session?.email || '';
  const nom = req.query.nom || req.session?.nom || 'Dupont';
  const prenom = req.query.prenom || req.session?.prenom || 'Jean';
  const telephone = req.query.telephone || req.session?.telephone || '+33 6 12 34 56 78';
  
  res.render('profile-edit', {
    title: 'Modifier le profil',
    user: user,
    email: email,
    nom: nom,
    prenom: prenom,
    telephone: telephone
  });
});

// Route alert detail - Détails d'une alerte
app.get('/alerts/:id', (req, res) => {
  const alertId = req.params.id;
  const user = req.query.user || req.session?.user || 'Utilisateur';
  const email = req.query.email || req.session?.email || '';
  // Reuse les données d'alerts pour l'instant
  const alert = {
    id: alertId,
    titre: 'Température élevée',
    description: 'La température dans le bâtiment A dépasse 35°C',
    niveau: 'critical',
    type_alerte: 'Environnement',
    cible_nom: 'Bâtiment A',
    date_detection: '2026-02-15T10:30:00Z',
    statut: 'active'
  };
  res.render('alert-detail', {
    title: 'Détails de l\'alerte',
    user: user,
    email: email,
    alert: alert
  });
});

// Route de santé simple pour tester
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Gestion des erreurs (dans l'ordre)
app.use(notFoundHandler);
app.use(validationErrorHandler);
app.use(jwtErrorHandler);
app.use(databaseErrorHandler);
app.use(errorHandler);

// ======== ENLEVER TOUTE LA PARTIE DE DÉMARRAGE ========
// NE PAS METRE app.listen() ICI

module.exports = app;
