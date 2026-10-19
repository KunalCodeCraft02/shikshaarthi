// Backend/auth-service/src/scripts/geocode-colleges.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables from the correct config file
require('../config/index.js'); // This will load your config and environment variables

// Configuration
const API_KEY = process.env.LOCATIONIQ_API_KEY;
const INPUT_FILE = path.join(__dirname, 'data', 'maharashtra-colleges.json'); // Fixed spelling
const OUTPUT_FILE = path.join(__dirname, 'data', 'maharashtra-colleges-geocoded.json');

// Rate limiting - LocationIQ free tier allows 10,000 requests/day, ~1 req/sec
const DELAY_MS = 1100; // 1.1 seconds between requests

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const geocodeColleges = async () => {
  // Validate API key
  if (!API_KEY) {
    console.error('❌ ERROR: LOCATIONIQ_API_KEY is not defined in environment variables.');
    console.error('Please check your .env file or config/env/development.env');
    process.exit(1);
  }

  // Check if input file exists
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ ERROR: Input file not found: ${INPUT_FILE}`);
    console.error('Please run the generate script first:');
    console.error('node src/scripts/generate-maharashtra-colleges.js');
    process.exit(1);
  }

  console.log('📖 Reading input file:', INPUT_FILE);
  
  let colleges;
  try {
    colleges = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  } catch (error) {
    console.error('❌ ERROR: Failed to parse JSON file:', error.message);
    process.exit(1);
  }

  const geocodedColleges = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  console.log(`🚀 Starting to geocode ${colleges.length} colleges...`);
  console.log(`⏱️  Estimated time: ~${Math.ceil(colleges.length * DELAY_MS / 1000 / 60)} minutes\n`);

  for (let i = 0; i < colleges.length; i++) {
    const college = colleges[i];
    
    // Skip if already geocoded
    if (college.location && college.location.coordinates) {
      geocodedColleges.push(college);
      skippedCount++;
      console.log(`[${i + 1}/${colleges.length}] ⏭️  SKIPPED: "${college.college}" (already geocoded)`);
      continue;
    }

    // Create search query - be more specific for better results
    const collegeNameClean = college.college.replace(/\(Id:.*\)/, '').trim();
    const addressQuery = `${collegeNameClean}, ${college.district}, Maharashtra, India`;

    try {
      console.log(`[${i + 1}/${colleges.length}] 🔍 Geocoding: "${collegeNameClean}"`);
      
      const response = await axios.get('https://us1.locationiq.com/v1/search.php', {
        params: {
          key: API_KEY,
          q: addressQuery,
          format: 'json',
          limit: 1,
          countrycodes: 'in', // Restrict to India
          addressdetails: 1    // Get detailed address info
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        const { lat, lon, display_name } = result;
        
        // Add location data in GeoJSON format
        college.location = {
          type: 'Point',
          coordinates: [parseFloat(lon), parseFloat(lat)]
        };
        
        // Store additional geocoding metadata
        college.geocoding = {
          display_name: display_name,
          geocoded_at: new Date().toISOString(),
          confidence: result.importance || 0
        };
        
        geocodedColleges.push(college);
        successCount++;
        console.log(`[${i + 1}/${colleges.length}] ✅ SUCCESS: [${lon}, ${lat}]`);
      } else {
        throw new Error('No geocoding results found');
      }
    } catch (error) {
      errorCount++;
      console.error(`[${i + 1}/${colleges.length}] ❌ ERROR: ${error.message}`);
      
      // Add college without location data
      geocodedColleges.push({
        ...college,
        geocoding_error: {
          message: error.message,
          attempted_at: new Date().toISOString()
        }
      });
    }

    // Rate limiting delay (except for last item)
    if (i < colleges.length - 1) {
      await delay(DELAY_MS);
    }
  }

  // Results summary
  console.log('\n📊 GEOCODING SUMMARY:');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`📝 Total processed: ${colleges.length}`);

  // Create output directory if it doesn't exist
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save results
  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(geocodedColleges, null, 2));
    console.log(`\n💾 Successfully saved geocoded data to: ${OUTPUT_FILE}`);
    
    // Show sample of geocoded data
    const successfullyGeocoded = geocodedColleges.filter(c => c.location && c.location.coordinates);
    if (successfullyGeocoded.length > 0) {
      console.log('\n📍 Sample geocoded entry:');
      console.log(JSON.stringify(successfullyGeocoded[0], null, 2));
    }
  } catch (error) {
    console.error('❌ ERROR: Failed to save output file:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Process interrupted. Exiting...');
  process.exit(0);
});

// Run the geocoding
geocodeColleges().catch(error => {
  console.error('💥 FATAL ERROR:', error.message);
  process.exit(1);
});