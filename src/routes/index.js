const express = require('express');
const router = express.Router();

// Import des contrôleurs
const lotsController = require('../controllers/lotsController');
const authController = require('../controllers/authController');
const iotController = require('../controllers/iotController');
const alertsController = require('../controllers/alertsController');

// Import des middlewares
const { authenticateToken, checkRole, rateLimitLogin, logAuthRequests } = require('../middlewares/auth');

// Routes publiques
router.use('/auth', logAuthRequests);

// Routes d'authentification
router.post('/auth/register', authController.signUp);
router.post('/auth/login', rateLimitLogin, authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/verify', authController.verifyToken);
router.post('/auth/password/reset-request', authController.requestPasswordReset);
router.post('/auth/password/reset', authController.resetPassword);

// Routes d'authentification nécessitant un token
router.post('/auth/logout', authenticateToken, authController.logout);
router.get('/auth/profile', authenticateToken, authController.getProfile);
router.put('/auth/profile', authenticateToken, authController.updateProfile);
router.put('/auth/password/change', authenticateToken, authController.changePassword);

// Routes admin (nécessitent le rôle admin)
router.get('/auth/users', authenticateToken, checkRole('admin'), authController.getAllUsers);
router.put('/auth/users/:userId/role', authenticateToken, checkRole('admin'), authController.updateUserRole);
router.put('/auth/users/:userId/status', authenticateToken, checkRole('admin'), authController.toggleUserStatus);
router.post('/auth/permissions/check', authenticateToken, authController.checkUserPermissions);

// Routes lots
router.get('/lots', authenticateToken, lotsController.getAllLots);
router.get('/lots/search', authenticateToken, lotsController.searchLots);
router.get('/lots/kpis', authenticateToken, lotsController.getPerformanceKPIs);
router.get('/lots/statistics', authenticateToken, lotsController.getLotsStatistics);
router.get('/lots/:id', authenticateToken, lotsController.getLotById);
router.post('/lots', authenticateToken, checkRole('manager', 'admin'), lotsController.createLot);
router.put('/lots/:id', authenticateToken, checkRole('manager', 'admin'), lotsController.updateLot);
router.delete('/lots/:id', authenticateToken, checkRole('manager', 'admin'), lotsController.deleteLot);

// Routes spécifiques aux lots
router.post('/lots/:id/mortality', authenticateToken, checkRole('manager', 'admin'), lotsController.addMortality);
router.post('/lots/:id/feeding', authenticateToken, checkRole('manager', 'admin'), lotsController.addFeedingCost);
router.post('/lots/:id/health', authenticateToken, checkRole('manager', 'admin'), lotsController.addHealthCost);
router.get('/lots/:id/cps', authenticateToken, lotsController.calculateLotCPS);
router.get('/lots/:id/mortality-history', authenticateToken, lotsController.getMortalityHistory);
router.get('/lots/:id/report', authenticateToken, lotsController.generateLotReport);

// Routes IoT
router.get('/iot', authenticateToken, iotController.getAllIotData);
router.post('/iot', authenticateToken, checkRole('manager', 'admin'), iotController.saveIotData);
router.post('/iot/batch', authenticateToken, checkRole('manager', 'admin'), iotController.sendIotDataBatch);
router.get('/iot/building/:buildingId', authenticateToken, iotController.getIotDataByBuilding);
router.get('/iot/building/:buildingId/realtime', authenticateToken, iotController.getRealTimeIotData);
router.get('/iot/building/:buildingId/trends', authenticateToken, iotController.getEnvironmentalTrends);
router.get('/iot/building/:buildingId/health', authenticateToken, iotController.checkIotHealth);
router.get('/iot/building/:buildingId/correlation', authenticateToken, checkRole('manager', 'admin'), iotController.analyzeEnvironmentalCorrelation);
router.post('/iot/building/:buildingId/simulate', authenticateToken, checkRole('admin'), iotController.simulateIotData);

// Routes alertes
router.get('/alerts', authenticateToken, alertsController.getAllAlerts);
router.get('/alerts/active', authenticateToken, alertsController.getActiveAlerts);
router.get('/alerts/recent', authenticateToken, alertsController.getRecentAlerts);
router.get('/alerts/search', authenticateToken, alertsController.searchAlerts);
router.get('/alerts/statistics', authenticateToken, alertsController.getAlertStatistics);
router.get('/alerts/type/:type', authenticateToken, alertsController.getAlertsByType);
router.post('/alerts', authenticateToken, checkRole('manager', 'admin'), alertsController.createAlert);
router.put('/alerts/:id/status', authenticateToken, checkRole('manager', 'admin'), alertsController.updateAlertStatus);
router.put('/alerts/:id/acknowledge', authenticateToken, alertsController.acknowledgeAlert);
router.put('/alerts/:id/resolve', authenticateToken, checkRole('manager', 'admin'), alertsController.resolveAlert);
router.put('/alerts/:id/ignore', authenticateToken, checkRole('manager', 'admin'), alertsController.ignoreAlert);
router.delete('/alerts/:id', authenticateToken, checkRole('admin'), alertsController.deleteAlert);

// Routes de vérification automatique des alertes
router.post('/alerts/check/stocks', authenticateToken, checkRole('manager', 'admin'), alertsController.checkLowStockAlerts);
router.post('/alerts/check/mortality', authenticateToken, checkRole('manager', 'admin'), alertsController.checkHighMortalityAlerts);
router.post('/alerts/check/environment', authenticateToken, checkRole('manager', 'admin'), alertsController.checkEnvironmentalAlerts);
router.post('/alerts/check/all', authenticateToken, checkRole('manager', 'admin'), alertsController.runAllAlertChecks);

// Routes de test (développement seulement)
if (process.env.NODE_ENV !== 'production') {
  router.post('/alerts/test', authenticateToken, checkRole('admin'), alertsController.createTestAlert);
}

// Route de santé
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Route 404 - Doit être la dernière route
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    path: req.originalUrl
  });
});

module.exports = router;