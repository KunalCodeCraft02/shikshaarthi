// //rental-service/src/server.js
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const helmet = require('helmet');
// const morgan = require('morgan');
// const config = require('./config');
// const rentalRoutes = require('./routes/rental.routes');

// const app = express();

// app.use(helmet());
// app.use(cors());
// app.use(morgan('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// mongoose.connect(config.MONGO_URI)
//     .then(() => console.log(`[${config.SERVICE_NAME}] MongoDB Connected.`))
//     .catch(err => {
//         console.error(`[${config.SERVICE_NAME}] DB Connection Error:`, err);
//         process.exit(1);
//     });

// app.get('/health', (req, res) => {
//     res.status(200).json({ status: 'UP', service: config.SERVICE_NAME });
// });

// // In rental-service/server.js
// app.use('/api/rentals', rentalRoutes); // <-- This is correct

// app.use((req, res) => {
//     res.status(404).json({ message: 'Route not found in Rental Service' });
// });

// app.listen(config.PORT, () => {
//     console.log(`🏠 ${config.SERVICE_NAME} is running on port ${config.PORT}`);
// });



// backend/rental-service/src/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const rentalRoutes = require('./routes/rental.routes');
const logger = require('./config/logger'); // Make sure logger is imported

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev')); // Keep morgan for logging incoming requests

// =========================================================================
// THE FIX: Remove these lines as they are causing the crash on empty POST bodies.
// None of the rental routes currently need to parse a JSON body.
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// =========================================================================

// Mongoose connection (keep as is)
mongoose.connect(config.MONGO_URI)
    .then(() => logger.info(`[${config.SERVICE_NAME}] MongoDB Connected.`))
    .catch(err => {
        logger.error(`[${config.SERVICE_NAME}] DB Connection Error:`, err);
        process.exit(1);
    });

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: config.SERVICE_NAME });
});

app.use('/api/rentals', rentalRoutes);

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found in Rental Service' });
});

const PORT = config.PORT || 3003;
app.listen(PORT, () => {
    logger.info(`🏠 ${config.SERVICE_NAME} is running on port ${PORT}`);
});