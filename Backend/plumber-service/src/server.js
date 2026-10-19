// plumber-service/src/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const plumberRoutes = require('./routes/plumber.routes');
const logger = require('./config/logger');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Connect to the same database as rewards-service to access plumber data
mongoose.connect(config.MONGO_URI)
    .then(() => logger.info(`[${config.SERVICE_NAME}] MongoDB Connected.`))
    .catch(err => {
        logger.error(`[${config.SERVICE_NAME}] DB Connection Error:`, err);
        process.exit(1);
    });

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: config.SERVICE_NAME });
});

// Use plumber routes
app.use('/api/plumber', plumberRoutes);

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found in Plumber Service' });
});

const PORT = config.PORT || 3006;
app.listen(PORT, () => {
    logger.info(`🛠️  ${config.SERVICE_NAME} is running on port ${PORT}`);
});