const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const electricianRoutes = require('./routes/electrician.routes');
const logger = require('./config/logger');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Connect to the database
mongoose.connect(config.MONGO_URI)
    .then(() => logger.info(`[${config.SERVICE_NAME}] MongoDB Connected.`))
    .catch(err => {
        logger.error(`[${config.SERVICE_NAME}] DB Connection Error:`, err);
        process.exit(1);
    });

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: config.SERVICE_NAME });
});

// Use electrician routes
app.use('/api/electrician', electricianRoutes);

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found in Electrician Service' });
});

const PORT = config.PORT || 3007;
app.listen(PORT, () => {
    logger.info(`💡 ${config.SERVICE_NAME} is running on port ${PORT}`);
});