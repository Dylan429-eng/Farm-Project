const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Configuration du transporteur email
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });

    // Vérifier la configuration
    this.verifyConnection();
  }

  /**
   * Vérifier la connexion SMTP
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('✅ Connexion SMTP établie avec succès');
      return true;
    } catch (error) {
      logger.error('❌ Erreur de connexion SMTP:', error.message);
      
      // En mode développement, on peut continuer sans email
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️  Mode développement: emails désactivés');
        this.isEnabled = false;
      } else {
        this.isEnabled = false;
        logger.error('Les emails sont désactivés en raison d\'une erreur de configuration');
      }
      return false;
    }
  }

  /**
   * Envoyer un email d'alerte
   */
  async sendAlertEmail(alertData, recipients) {
    if (!this.isEnabled) {
      logger.warn('Service email désactivé, email non envoyé');
      return { success: false, message: 'Service email désactivé' };
    }

    try {
      // Déterminer le sujet selon le niveau d'alerte
      let subject = '';
      let priority = 'normal';
      
      switch (alertData.niveau) {
        case 'critical':
          subject = `🚨 ALERTE CRITIQUE - ${alertData.titre}`;
          priority = 'high';
          break;
        case 'warning':
          subject = `⚠️  ALERTE - ${alertData.titre}`;
          priority = 'high';
          break;
        default:
          subject = `ℹ️  Notification - ${alertData.titre}`;
          priority = 'low';
      }

      // Formater les destinataires
      const to = Array.isArray(recipients) ? recipients.join(', ') : recipients;

      // Créer le contenu HTML de l'email
      const htmlContent = this.generateAlertEmailHTML(alertData);

      // Options de l'email
      const mailOptions = {
        from: `"Ferme du Vatican" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html: htmlContent,
        priority,
        headers: {
          'X-Priority': priority === 'high' ? '1' : '3',
          'X-MSMail-Priority': priority === 'high' ? 'High' : 'Normal',
          'Importance': priority === 'high' ? 'high' : 'normal'
        }
      };

      // Envoyer l'email
      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`📧 Email d'alerte envoyé à ${to}: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        recipients: to
      };
    } catch (error) {
      logger.error('❌ Erreur lors de l\'envoi de l\'email d\'alerte:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Générer le HTML pour un email d'alerte
   */
  generateAlertEmailHTML(alertData) {
    // Couleur selon le niveau d'alerte
    let color = '#007bff'; // info - bleu
    let icon = 'ℹ️';
    
    switch (alertData.niveau) {
      case 'critical':
        color = '#dc3545'; // rouge
        icon = '🚨';
        break;
      case 'warning':
        color = '#ffc107'; // orange
        icon = '⚠️';
        break;
    }

    // Formater la date
    const alertDate = new Date(alertData.date_detection);
    const formattedDate = alertDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Détails supplémentaires selon le type d'alerte
    let detailsHTML = '';
    
    if (alertData.donnees_json) {
      const data = typeof alertData.donnees_json === 'string' 
        ? JSON.parse(alertData.donnees_json) 
        : alertData.donnees_json;
      
      detailsHTML = '<h3 style="color: #495057; margin-top: 20px;">Détails techniques:</h3>';
      detailsHTML += '<ul style="color: #6c757d;">';
      
      for (const [key, value] of Object.entries(data)) {
        detailsHTML += `<li><strong>${key}:</strong> ${value}</li>`;
      }
      
      detailsHTML += '</ul>';
    }

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alerte Ferme du Vatican</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-left: 5px solid ${color};
        }
        .header {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e9ecef;
        }
        .icon {
            font-size: 32px;
            margin-right: 15px;
        }
        .title {
            color: ${color};
            margin: 0;
            font-size: 24px;
        }
        .alert-level {
            display: inline-block;
            background-color: ${color}20;
            color: ${color};
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            margin-top: 5px;
        }
        .content {
            margin: 20px 0;
        }
        .description {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border-left: 3px solid #dee2e6;
        }
        .metadata {
            color: #6c757d;
            font-size: 14px;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e9ecef;
        }
        .actions {
            margin-top: 25px;
            text-align: center;
        }
        .btn {
            display: inline-block;
            padding: 10px 25px;
            background-color: ${color};
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 0 10px;
        }
        .btn-secondary {
            background-color: #6c757d;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #6c757d;
            font-size: 12px;
            border-top: 1px solid #e9ecef;
            padding-top: 20px;
        }
        @media (max-width: 600px) {
            .container {
                padding: 20px;
            }
            .btn {
                display: block;
                margin: 10px 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">${icon}</div>
            <div>
                <h1 class="title">${alertData.titre}</h1>
                <div class="alert-level">${alertData.niveau.toUpperCase()}</div>
            </div>
        </div>
        
        <div class="content">
            <p><strong>Type d'alerte:</strong> ${this.getAlertTypeLabel(alertData.type_alerte)}</p>
            
            <div class="description">
                <strong>Description:</strong><br>
                ${alertData.description || 'Aucune description fournie'}
            </div>
            
            ${detailsHTML}
            
            <div class="metadata">
                <p><strong>Date de détection:</strong> ${formattedDate}</p>
                ${alertData.cible_nom ? `<p><strong>Cible:</strong> ${alertData.cible_nom}</p>` : ''}
                <p><strong>ID de l'alerte:</strong> ${alertData.id}</p>
            </div>
        </div>
        
        <div class="actions">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/alerts/${alertData.id}" class="btn">
                Voir les détails
            </a>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="btn btn-secondary">
                Accéder au tableau de bord
            </a>
        </div>
        
        <div class="footer">
            <p>Ferme du Vatican - Système de Monitoring Intelligent</p>
            <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
            <p>Si vous pensez avoir reçu cet email par erreur, contactez l'administrateur.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Traduire le type d'alerte
   */
  getAlertTypeLabel(type) {
    const labels = {
      'temperature': 'Température',
      'humidite': 'Humidité',
      'mortalite': 'Mortalité',
      'stock': 'Stock',
      'sante': 'Santé animale',
      'fournisseur': 'Fournisseur',
      'client': 'Client',
      'equipement': 'Équipement',
      'securite': 'Sécurité',
      'test': 'Test'
    };
    
    return labels[type] || type;
  }

  /**
   * Envoyer un rapport quotidien
   */
  async sendDailyReport(reportData, recipients) {
    if (!this.isEnabled) {
      logger.warn('Service email désactivé, rapport non envoyé');
      return { success: false, message: 'Service email désactivé' };
    }

    try {
      const to = Array.isArray(recipients) ? recipients.join(', ') : recipients;
      
      const mailOptions = {
        from: `"Ferme du Vatican" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: `📊 Rapport Quotidien - ${new Date().toLocaleDateString('fr-FR')}`,
        html: this.generateDailyReportHTML(reportData),
        attachments: this.generateReportAttachments(reportData)
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`📧 Rapport quotidien envoyé à ${to}`);
      
      return {
        success: true,
        messageId: info.messageId,
        recipients: to
      };
    } catch (error) {
      logger.error('❌ Erreur lors de l\'envoi du rapport quotidien:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Générer le HTML pour le rapport quotidien
   */
  generateDailyReportHTML(reportData) {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport Quotidien</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #007bff;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border-left: 4px solid #007bff;
        }
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #007bff;
            margin: 10px 0;
        }
        .stat-label {
            color: #6c757d;
            font-size: 14px;
        }
        .section {
            margin: 30px 0;
        }
        .section-title {
            color: #495057;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .alert-list {
            list-style: none;
            padding: 0;
        }
        .alert-item {
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid;
        }
        .alert-critical { border-color: #dc3545; background-color: #f8d7da; }
        .alert-warning { border-color: #ffc107; background-color: #fff3cd; }
        .alert-info { border-color: #17a2b8; background-color: #d1ecf1; }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #6c757d;
            font-size: 12px;
            border-top: 1px solid #e9ecef;
            padding-top: 20px;
        }
        .trend {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 10px;
        }
        .trend-up { background-color: #d4edda; color: #155724; }
        .trend-down { background-color: #f8d7da; color: #721c24; }
        .trend-neutral { background-color: #d1ecf1; color: #0c5460; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color: #007bff; margin-bottom: 10px;">📊 Rapport Quotidien</h1>
            <h2 style="color: #6c757d; font-weight: normal;">Ferme du Vatican</h2>
            <p style="color: #495057;">${formattedDate}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${reportData.total_lots || 0}</div>
                <div class="stat-label">Lots Actifs</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${reportData.total_poussins?.toLocaleString() || 0}</div>
                <div class="stat-label">Poussins</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${reportData.mortality_rate ? reportData.mortality_rate.toFixed(1) + '%' : '0%'}</div>
                <div class="stat-label">Taux de Mortalité</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${reportData.total_alerts || 0}</div>
                <div class="stat-label">Alertes Actives</div>
            </div>
        </div>
        
        ${this.generatePerformanceSection(reportData)}
        ${this.generateAlertsSection(reportData)}
        ${this.generateRecommendationsSection(reportData)}
        
        <div class="footer">
            <p>Ferme du Vatican - Système de Monitoring Intelligent</p>
            <p>Cet email a été généré automatiquement. Pour plus de détails, connectez-vous au tableau de bord.</p>
            <p>© ${today.getFullYear()} Ferme du Vatican. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Générer la section performance du rapport
   */
  generatePerformanceSection(reportData) {
    if (!reportData.performance) return '';
    
    return `
    <div class="section">
        <h3 class="section-title">📈 Performance de Production</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h4 style="color: #495057;">Coûts</h4>
                <ul style="color: #6c757d;">
                    <li>CPS Moyen: ${reportData.performance.average_cps?.toFixed(2) || '0'}€</li>
                    <li>PDS Moyen: ${reportData.performance.average_pds?.toFixed(2) || '0'}€</li>
                    <li>Coût Alimentation: ${reportData.performance.total_feed_cost?.toFixed(2) || '0'}€</li>
                </ul>
            </div>
            <div>
                <h4 style="color: #495057;">Efficacité</h4>
                <ul style="color: #6c757d;">
                    <li>Taux de Survie: ${reportData.performance.survival_rate?.toFixed(1) || '0'}%</li>
                    <li>Conversion Alimentaire: ${reportData.performance.feed_conversion_ratio?.toFixed(2) || '0'}</li>
                    <li>Chiffre d'Affaires: ${reportData.performance.total_sales?.toFixed(2) || '0'}€</li>
                </ul>
            </div>
        </div>
    </div>
    `;
  }

  /**
   * Générer la section alertes du rapport
   */
  generateAlertsSection(reportData) {
    if (!reportData.alerts || reportData.alerts.length === 0) {
      return `
      <div class="section">
          <h3 class="section-title">✅ Alertes</h3>
          <p style="color: #28a745;">Aucune alerte active aujourd'hui 🎉</p>
      </div>
      `;
    }

    let alertsHTML = '<div class="section"><h3 class="section-title">⚠️  Alertes Actives</h3><ul class="alert-list">';
    
    reportData.alerts.forEach(alert => {
      const alertClass = `alert-${alert.niveau}`;
      alertsHTML += `
      <li class="alert-item ${alertClass}">
          <strong>${alert.titre}</strong><br>
          <small>${alert.description || ''}</small><br>
          <small>Type: ${this.getAlertTypeLabel(alert.type_alerte)} | Détecté: ${new Date(alert.date_detection).toLocaleTimeString('fr-FR')}</small>
      </li>
      `;
    });
    
    alertsHTML += '</ul></div>';
    return alertsHTML;
  }

  /**
   * Générer la section recommandations
   */
  generateRecommendationsSection(reportData) {
    if (!reportData.recommendations || reportData.recommendations.length === 0) {
      return '';
    }

    let recommendationsHTML = '<div class="section"><h3 class="section-title">💡 Recommandations</h3><ul style="color: #495057;">';
    
    reportData.recommendations.forEach(rec => {
      recommendationsHTML += `<li style="margin-bottom: 10px;">${rec}</li>`;
    });
    
    recommendationsHTML += '</ul></div>';
    return recommendationsHTML;
  }

  /**
   * Générer les pièces jointes du rapport
   */
  generateReportAttachments(reportData) {
    const attachments = [];
    
    // Générer un CSV des données si nécessaire
    if (reportData.detailed_data) {
      const csvContent = this.generateCSV(reportData.detailed_data);
      attachments.push({
        filename: `rapport_${new Date().toISOString().split('T')[0]}.csv`,
        content: csvContent,
        contentType: 'text/csv'
      });
    }
    
    return attachments;
  }

  /**
   * Générer un CSV à partir des données
   */
  generateCSV(data) {
    // Implémentation simple - à adapter selon les besoins
    let csv = 'Date,Métrique,Valeur\n';
    
    if (data.metrics) {
      for (const [metric, value] of Object.entries(data.metrics)) {
        csv += `${new Date().toISOString().split('T')[0]},${metric},${value}\n`;
      }
    }
    
    return csv;
  }

  /**
   * Envoyer un email de bienvenue
   */
  async sendWelcomeEmail(userData) {
    if (!this.isEnabled) {
      logger.warn('Service email désactivé, email de bienvenue non envoyé');
      return { success: false, message: 'Service email désactivé' };
    }

    try {
      const mailOptions = {
        from: `"Ferme du Vatican" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: userData.email,
        subject: '👋 Bienvenue sur la plateforme Ferme du Vatican',
        html: this.generateWelcomeEmailHTML(userData)
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`📧 Email de bienvenue envoyé à ${userData.email}`);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('❌ Erreur lors de l\'envoi de l\'email de bienvenue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Générer le HTML pour l'email de bienvenue
   */
  generateWelcomeEmailHTML(userData) {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenue</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="color: #007bff;">🎉 Bienvenue ${userData.prenom || ''} !</h1>
        <p>Votre compte a été créé avec succès sur la plateforme de gestion de la Ferme du Vatican.</p>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
            <p><strong>Informations de votre compte:</strong></p>
            <ul>
                <li>Email: ${userData.email}</li>
                <li>Rôle: ${userData.role || 'Utilisateur'}</li>
                <li>Date d'inscription: ${new Date().toLocaleDateString('fr-FR')}</li>
            </ul>
        </div>
        
        <p>Vous pouvez maintenant vous connecter pour accéder à toutes les fonctionnalités:</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
           style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px;">
           Se connecter
        </a>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
            <p>Pour toute question, contactez l'administrateur du système.</p>
            <p>© ${new Date().getFullYear()} Ferme du Vatican. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Envoyer un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(userEmail, resetToken) {
    if (!this.isEnabled) {
      logger.warn('Service email désactivé, email de réinitialisation non envoyé');
      return { success: false, message: 'Service email désactivé' };
    }

    try {
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: `"Ferme du Vatican" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: userEmail,
        subject: '🔐 Réinitialisation de votre mot de passe',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">Réinitialisation de mot de passe</h2>
            <p>Vous avez demandé à réinitialiser votre mot de passe pour la plateforme Ferme du Vatican.</p>
            <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe:</p>
            <a href="${resetLink}" 
               style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
               Réinitialiser mon mot de passe
            </a>
            <p>Ce lien expirera dans 1 heure.</p>
            <p style="color: #6c757d; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
        </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`📧 Email de réinitialisation envoyé à ${userEmail}`);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('❌ Erreur lors de l\'envoi de l\'email de réinitialisation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Tester le service email
   */
  async testEmailService(testRecipient) {
    try {
      const testAlert = {
        id: 'test-' + Date.now(),
        type_alerte: 'test',
        niveau: 'info',
        titre: 'Test du service email',
        description: 'Cet email confirme que le service de notification est opérationnel.',
        date_detection: new Date().toISOString(),
        cible_nom: 'Système de test'
      };

      const result = await this.sendAlertEmail(testAlert, testRecipient);
      
      if (result.success) {
        logger.info('✅ Test du service email réussi');
        return {
          success: true,
          message: 'Test email envoyé avec succès',
          recipient: testRecipient
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      logger.error('❌ Erreur lors du test du service email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Récupérer la liste des destinataires pour un type d'alerte
   */
  async getAlertRecipients(alertType, alertLevel) {
    try {
      // Dans un vrai système, on récupérerait cette liste depuis la base de données
      // Pour l'instant, on utilise une configuration simple
      
      const { supabase } = require('../config/database');
      
      // Récupérer les utilisateurs avec notifications activées
      const { data: users, error } = await supabase
        .from('users')
        .select('email, notification_preferences')
        .eq('statut', 'active')
        .not('email', 'is', null);

      if (error) {
        logger.error('Erreur lors de la récupération des destinataires:', error);
        return [process.env.ADMIN_EMAIL || process.env.SMTP_USER].filter(Boolean);
      }

      // Filtrer les utilisateurs selon leurs préférences
      const recipients = [];
      
      users.forEach(user => {
        const prefs = user.notification_preferences || {};
        
        // Par défaut, tout le monde reçoit les alertes critiques
        if (alertLevel === 'critical') {
          recipients.push(user.email);
        }
        // Pour les autres niveaux, vérifier les préférences
        else if (prefs[alertType] !== false) {
          recipients.push(user.email);
        }
      });

      // Toujours inclure l'admin
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
      if (adminEmail && !recipients.includes(adminEmail)) {
        recipients.push(adminEmail);
      }

      return recipients;
    } catch (error) {
      logger.error('Erreur dans getAlertRecipients:', error);
      // Retourner au moins l'email admin en cas d'erreur
      return [process.env.ADMIN_EMAIL || process.env.SMTP_USER].filter(Boolean);
    }
  }

  /**
   * Planifier l'envoi du rapport quotidien
   */
  scheduleDailyReport() {
    // Cette méthode serait appelée par un scheduler (cron job)
    // Pour l'instant, c'est juste une structure
    logger.info('📅 Planification du rapport quotidien configurée');
    
    // Dans un vrai système, on utiliserait node-cron:
    // cron.schedule('0 8 * * *', () => this.sendDailyReportToAll());
  }

  /**
   * Envoyer le rapport quotidien à tous les destinataires
   */
  async sendDailyReportToAll() {
    try {
      // Récupérer les données du rapport
      const reportData = await this.generateDailyReportData();
      
      // Récupérer les destinataires
      const recipients = await this.getDailyReportRecipients();
      
      if (recipients.length === 0) {
        logger.warn('Aucun destinataire pour le rapport quotidien');
        return { success: false, message: 'Aucun destinataire' };
      }

      // Envoyer le rapport
      const result = await this.sendDailyReport(reportData, recipients);
      
      logger.info(`📊 Rapport quotidien envoyé à ${recipients.length} destinataires`);
      
      return result;
    } catch (error) {
      logger.error('❌ Erreur lors de l\'envoi du rapport quotidien:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Générer les données du rapport quotidien
   */
  async generateDailyReportData() {
    // Cette méthode récupère les données depuis la base de données
    // Pour l'instant, on retourne des données fictives
    
    const { supabase } = require('../config/database');
    
    try {
      // Récupérer les statistiques du jour
      const { data: stats } = await supabase
        .from('vue_kpis_resume')
        .select('*')
        .single();

      // Récupérer les alertes actives
      const { data: alerts } = await supabase
        .from('vue_alertes_actives')
        .select('*')
        .limit(10);

      return {
        date: new Date().toISOString().split('T')[0],
        ...stats,
        alerts: alerts || [],
        recommendations: [
          'Vérifier les niveaux de stock d\'alimentation',
          'Contrôler les températures dans les bâtiments B et C',
          'Planifier les prochaines vaccinations'
        ]
      };
    } catch (error) {
      logger.error('Erreur lors de la génération du rapport:', error);
      return {
        date: new Date().toISOString().split('T')[0],
        total_lots: 0,
        total_poussins: 0,
        mortality_rate: 0,
        total_alerts: 0,
        alerts: [],
        recommendations: []
      };
    }
  }

  /**
   * Récupérer les destinataires du rapport quotidien
   */
  async getDailyReportRecipients() {
    try {
      const { supabase } = require('../config/database');
      
      const { data: users, error } = await supabase
        .from('users')
        .select('email')
        .eq('statut', 'active')
        .eq('receive_daily_reports', true)
        .not('email', 'is', null);

      if (error) {
        logger.error('Erreur lors de la récupération des destinataires du rapport:', error);
        return [process.env.ADMIN_EMAIL || process.env.SMTP_USER].filter(Boolean);
      }

      const recipients = users.map(user => user.email);
      
      // Toujours inclure l'admin
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
      if (adminEmail && !recipients.includes(adminEmail)) {
        recipients.push(adminEmail);
      }

      return recipients;
    } catch (error) {
      logger.error('Erreur dans getDailyReportRecipients:', error);
      return [process.env.ADMIN_EMAIL || process.env.SMTP_USER].filter(Boolean);
    }
  }
}

// Exporter une instance singleton
module.exports = new EmailService();