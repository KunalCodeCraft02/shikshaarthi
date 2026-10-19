const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const medicalRoutes = require('./routes/medical.routes');
const logger = require('./config/logger'); // Ensure you have a logger.js file

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

mongoose.connect(config.MONGO_URI)
    .then(() => logger.info(`[${config.SERVICE_NAME}] MongoDB Connected.`))
    .catch(err => {
        logger.error(`[${config.SERVICE_NAME}] DB Connection Error:`, err);
        process.exit(1);
    });

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: config.SERVICE_NAME });
});

app.use('/api/medical', medicalRoutes);

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found in Medical Service' });
});

const PORT = config.PORT || 3005;
app.listen(PORT, () => {
    logger.info(`⚕️  ${config.SERVICE_NAME} is running on port ${PORT}`);
});