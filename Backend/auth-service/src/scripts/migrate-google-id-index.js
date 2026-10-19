const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const env = process.env.NODE_ENV || 'production';
dotenv.config({
  path: path.resolve(__dirname, '..', 'config', 'env', `${env}.env`)
});

const INDEX_NAME = 'googleId_1';
const dryRun = process.argv.includes('--dry-run');
const DESIRED_INDEX = {
  key: { googleId: 1 },
  unique: true,
  partialFilterExpression: { googleId: { $type: 'string' } }
};

const migrate = async () => {
  const mongoUri = process.env.AUTH_MONGO_URI;
  if (!mongoUri) {
    throw new Error('AUTH_MONGO_URI is required');
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000
  });

  const collection = mongoose.connection.db.collection('users');
  const indexes = await collection.indexes();
  const current = indexes.find(index => index.name === INDEX_NAME);

  if (
    current &&
    current.unique === true &&
    current.partialFilterExpression?.googleId?.$type === 'string'
  ) {
    console.log(`[GoogleIdMigration] ${INDEX_NAME} already has the desired definition.`);
    return;
  }

  const duplicates = await collection.aggregate([
    { $match: { googleId: { $type: 'string' } } },
    { $group: { _id: '$googleId', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 10 }
  ]).toArray();

  if (duplicates.length > 0) {
    throw new Error(
      `Cannot replace ${INDEX_NAME}: duplicate string googleId values exist. Resolve duplicates first.`
    );
  }

  if (current) {
    if (dryRun) {
      console.log(`[GoogleIdMigration] Would drop obsolete ${INDEX_NAME} index and create the desired partial index.`);
      return;
    }
    console.log(`[GoogleIdMigration] Dropping obsolete ${INDEX_NAME} index.`);
    await collection.dropIndex(INDEX_NAME);
  }

  if (dryRun) {
    console.log(`[GoogleIdMigration] Would create ${INDEX_NAME} as a unique partial index.`);
    return;
  }

  await collection.createIndex(DESIRED_INDEX.key, {
    name: INDEX_NAME,
    unique: DESIRED_INDEX.unique,
    partialFilterExpression: DESIRED_INDEX.partialFilterExpression
  });
  console.log(`[GoogleIdMigration] Created ${INDEX_NAME} as a unique partial index.`);
};

migrate()
  .catch(error => {
    console.error(`[GoogleIdMigration] Failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
