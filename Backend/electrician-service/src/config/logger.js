const winston = require('winston');
const config = require('./index');

const { format, transports } = winston;
const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, timestamp: ts, ...metadata }) => {
    let log = `${ts} [${config.SERVICE_NAME}] ${level}: ${message}`;
    if (Object.keys(metadata).length) {
        log += ` ${JSON.stringify(metadata)}`;
    }
    return log;
});

const logger = winston.createLogger({
    level: config.NODE_ENV === 'development' ? 'debug' : 'info',
    format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        errors({ stack: true }),
        logFormat
    ),
    transports: [new transports.Console()],
});

module.exports = logger;