// This is a JSON Schema, not a Mongoose schema. It tells the driver how to encrypt data.
const schemaMap = {
    'rewards-service.central_submissions': {
      bsonType: 'object',
      encryptMetadata: {
        keyId: [
          {
            $uuid: '841af286-4d42-4927-9a67-886801a2c918' // This is a placeholder UUID for the key
          }
        ],
      },
      properties: {
        // Define fields to be encrypted
        adminNotes: {
          encrypt: {
            bsonType: 'string',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
          },
        },
        rejectionReason: {
          encrypt: {
            bsonType: 'string',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
          },
        },
        // ====================== THE FIX: ADD THE TIMING FIELD ======================
        // Although 'timing' isn't secret, the encryption policy on the collection
        // requires that all fields are accounted for. We add it here to satisfy the policy.
        timing: {
          encrypt: {
            bsonType: 'string',
            algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
          }
        }
        // ===========================================================================
      },
    },
  };
  
  module.exports = schemaMap;