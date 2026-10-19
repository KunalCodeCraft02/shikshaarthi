// Backend/rewards-service/src/services/kafka.producer.js
const { Kafka } = require('kafkajs');
const config = require('../config');
const logger = require('../config/logger');

const kafka = new Kafka({
  clientId: config.KAFKA_CLIENT_ID,
  brokers: config.KAFKA_BROKERS,
});

const producer = kafka.producer();
let isConnected = false;

const connectProducer = async () => {
  try {
    await producer.connect();
    isConnected = true;
    logger.info('[KafkaProducer] Connected to Kafka brokers successfully.');
  } catch (error) {
    logger.error('[KafkaProducer] Failed to connect to Kafka:', error);
    // Implement retry logic if needed
    setTimeout(connectProducer, 5000); // Retry connection after 5s
  }
};

producer.on('producer.disconnect', () => {
  isConnected = false;
  logger.warn('[KafkaProducer] Disconnected from Kafka. Attempting to reconnect...');
  connectProducer();
});

const sendMessage = async (topic, message) => {
  if (!isConnected) {
    logger.error('[KafkaProducer] Producer not connected. Cannot send message.', { topic });
    // Optional: Could queue messages here for later sending
    throw new Error('Kafka producer is not connected.');
  }

  try {
    const payloads = {
      topic: topic,
      messages: [{ value: JSON.stringify(message) }],
    };
    await producer.send(payloads);
    logger.info(`[KafkaProducer] Message sent to topic "${topic}"`, { message: message.type });
  } catch (error) {
    logger.error(`[KafkaProducer] Error sending message to topic "${topic}":`, error);
    throw error;
  }
};

// Immediately try to connect
connectProducer();

module.exports = {
  sendMessage,
};