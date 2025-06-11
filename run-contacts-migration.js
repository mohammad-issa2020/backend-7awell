const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runContactsMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running contacts migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '008_create_contacts_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Contacts migration completed successfully!');
    console.log('📱 Contact API endpoints should now be available');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runContactsMigration(); 