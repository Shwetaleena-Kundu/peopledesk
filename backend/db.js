const { Pool } = require("pg");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

// Pool manages connections between our backend and PostgreSQL.
// It reads the PG settings from .env.
const pool = new Pool({
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  console.error("Database connection error:", error.message);
});

module.exports = pool;