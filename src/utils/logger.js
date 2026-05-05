// Configuration du logger Winston
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Créer le dossier logs s'il n'existe pas
const fs = require('fs');
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configuration des transports
const transports = [
  // Transport pour la console
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        // Convertir 'warning' en 'warn' pour l'affichage
        const displayLevel = level === 'warning' ? 'warn' : level;
        return `${timestamp} [${displayLevel}]: ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
        }`;
      })
    )
  }),
  
  // Transport pour les fichiers (rotation quotidienne)
  new DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // Transport pour les erreurs seulement
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  })
];

// Créer le logger avec niveaux syslog
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels: winston.config.syslog.levels,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'exceptions.log') 
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'rejections.log') 
    })
  ]
});

// Ajouter la méthode warn (alias vers warning)
logger.warn = logger.warning;

// Exporter le logger
module.exports = logger;