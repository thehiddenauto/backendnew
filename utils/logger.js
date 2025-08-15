const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist (safe for production)
const createLogsDirectory = () => {
  try {
    const logsDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    return logsDir;
  } catch (error) {
    // If we can't create logs directory, just use console logging
    console.warn('Could not create logs directory, using console only:', error.message);
    return null;
  }
};

const logsDir = createLogsDirectory();

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    let message = `${info.timestamp} ${info.level}: ${info.message}`;
    if (info.stack) {
      message += `\n${info.stack}`;
    }
    return message;
  })
);

// Start with console transport
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      format
    )
  })
];

// Add file transports only if logs directory exists
if (logsDir) {
  try {
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: winston.format.combine(
          winston.format.uncolorize(),
          winston.format.json()
        ),
        handleExceptions: true
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'all.log'),
        format: winston.format.combine(
          winston.format.uncolorize(),
          winston.format.json()
        ),
        handleExceptions: true
      })
    );
  } catch (error) {
    console.warn('Could not initialize file loggers:', error.message);
  }
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true
});

// Handle uncaught exceptions and rejections
if (process.env.NODE_ENV === 'production') {
  logger.exceptions.handle(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

module.exports = logger;
