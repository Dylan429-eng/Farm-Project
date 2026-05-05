const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Configuration du transporteur email
    this.isEnabled = true; // Initialiser isEnabled
    
    try {
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

      // Vérifier la connexion (asynchrone)
      this.verifyConnection();
    } catch (error) {
      this.logMessage('error', '❌ Erreur création transporteur SMTP:', error.message);
      this.isEnabled = false;
    }
  }

  /**
   * Méthode utilitaire pour logger sans crash
   */
  logMessage(level, message, ...args) {
    // Essayer d'utiliser les méthodes du logger
    if (logger && typeof logger[level] === 'function') {
      logger[level](message, ...args);
    } 
    // Fallback sur console
    else if (level === 'error') {
      console.error(message, ...args);
    } else if (level === 'warn') {
      console.warn(message, ...args);
    } else {
      console.log(message, ...args);
    }
  }

  /**
   * Vérifier la connexion SMTP
   */
  async verifyConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Transporteur non initialisé');
      }
      await this.transporter.verify();
      this.logMessage('info', '✅ Connexion SMTP établie avec succès');
      return true;
    } catch (error) {
      this.logMessage('error', '❌ Erreur de connexion SMTP:', error.message);
      
      // En mode développement, on peut continuer sans email
      if (process.env.NODE_ENV === 'development') {
        this.logMessage('warn', '⚠️ Mode développement: emails désactivés');
        this.isEnabled = false;
      } else {
        this.isEnabled = false;
        this.logMessage('error', 'Les emails sont désactivés en raison d\'une erreur de configuration');
      }
      return false;
    }
  }

  /**
   * Envoyer un email d'alerte
   */
  async sendAlertEmail(alertData, recipients) {
    if (!this.isEnabled || !this.transporter) {
      this.logMessage('warn', 'Service email désactivé, email non envoyé');
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
          subject = `⚠️ ALERTE - ${alertData.titre}`;
          priority = 'high';
          break;
        default:
          subject = `ℹ️ Notification - ${alertData.titre}`;
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
      
      this.logMessage('info', `📧 Email d'alerte envoyé à ${to}: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        recipients: to
      };
    } catch (error) {
      this.logMessage('error', '❌ Erreur lors de l\'envoi de l\'email d\'alerte:', error.message);
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
    let color = '#007bff';
    let icon = 'ℹ️';
    
    switch (alertData.niveau) {
      case 'critical':
        color = '#dc3545';
        icon = '🚨';
        break;
      case 'warning':
        color = '#ffc107';
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
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #6c757d;
            font-size: 12px;
            border-top: 1px solid #e9ecef;
            padding-top: 20px;
        }
        @media (max-width: 600px) {
            .container { padding: 20px; }
            .btn { display: block; margin: 10px 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">${icon}</div>
            <div>
                <h1 class="title">${this.escapeHtml(alertData.titre)}</h1>
            </div>
        </div>
        
        <div class="content">
            <p><strong>Type d'alerte:</strong> ${this.getAlertTypeLabel(alertData.type_alerte)}</p>
            
            <div class="description">
                <strong>Description:</strong><br>
                ${this.escapeHtml(alertData.description || 'Aucune description fournie')}
            </div>
            
            ${detailsHTML}
            
            <div class="metadata">
                <p><strong>Date de détection:</strong> ${formattedDate}</p>
                ${alertData.cible_nom ? `<p><strong>Cible:</strong> ${this.escapeHtml(alertData.cible_nom)}</p>` : ''}
                <p><strong>ID de l'alerte:</strong> ${alertData.id || 'N/A'}</p>
            </div>
        </div>
        
        <div class="actions">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/alerts/${alertData.id}" class="btn">
                Voir les détails
            </a>
        </div>
        
        <div class="footer">
            <p>Ferme du Vatican - Système de Monitoring Intelligent</p>
            <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Échapper les caractères HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Traduire le type d'alerte
   */
  getAlertTypeLabel(type) {
    const labels = {
      'temperature': '🌡️ Température',
      'humidite': '💧 Humidité',
      'mortalite': '⚠️ Mortalité',
      'stock': '📦 Stock',
      'sante': '🏥 Santé animale',
      'fournisseur': '🚚 Fournisseur',
      'client': '👤 Client',
      'equipement': '🔧 Équipement',
      'securite': '🔒 Sécurité',
      'test': '🧪 Test'
    };
    return labels[type] || type;
  }

  /**
   * Récupérer les destinataires pour un type d'alerte
   */
  async getAlertRecipients(alertType, alertLevel) {
    // Version simplifiée qui retourne l'email admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    
    if (!adminEmail) {
      this.logMessage('warn', '⚠️ Aucun email administrateur configuré');
      return [];
    }
    
    return [adminEmail];
  }
}

// Exporter une instance singleton
module.exports = new EmailService();