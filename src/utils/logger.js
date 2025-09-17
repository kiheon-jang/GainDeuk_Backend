const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'gaindeuk-backend',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
          format: 'HH:mm:ss'
        }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let log = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
          }
          return log;
        })
      )
    }),
    
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Remove console transport in production
if (process.env.NODE_ENV === 'production') {
  logger.remove(winston.transports.Console);
}

// Add custom methods for different log levels
logger.success = (message, meta = {}) => {
  logger.log('info', `✅ ${message}`, meta);
};

logger.warning = (message, meta = {}) => {
  logger.log('warn', `⚠️ ${message}`, meta);
};

logger.error = (message, meta = {}) => {
  logger.log('error', `❌ ${message}`, meta);
};

logger.info = (message, meta = {}) => {
  logger.log('info', `ℹ️ ${message}`, meta);
};

// API request logger
logger.apiRequest = (req, res, duration) => {
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id || 'anonymous'
  });
};

// Database operation logger
logger.dbOperation = (operation, collection, duration, success = true) => {
  const level = success ? 'info' : 'error';
  const emoji = success ? '✅' : '❌';
  
  logger[level](`${emoji} DB ${operation}`, {
    collection,
    duration: `${duration}ms`,
    success
  });
};

// External API call logger
logger.apiCall = (service, endpoint, duration, success = true, statusCode = null) => {
  const level = success ? 'info' : 'error';
  const emoji = success ? '🌐' : '❌';
  
  logger[level](`${emoji} External API Call`, {
    service,
    endpoint,
    duration: `${duration}ms`,
    success,
    statusCode
  });
};

// Scheduler logger
logger.scheduler = (task, status, duration = null, meta = {}) => {
  const emoji = status === 'started' ? '🚀' : 
                status === 'completed' ? '✅' : 
                status === 'failed' ? '❌' : '⏰';
  
  logger.info(`${emoji} Scheduler ${task} ${status}`, {
    task,
    status,
    duration: duration ? `${duration}ms` : undefined,
    ...meta
  });
};

module.exports = logger;
