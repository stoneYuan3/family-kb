// handles the database connection
const { Pool } = require('pg');
require('dotenv').config();

console.log('DATABASE_URL:', process.env.DATABASE_URL); // add this

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
})

module.exports = pool;
