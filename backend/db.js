const { Pool } = require("pg");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const pool = new Pool({
  ...(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {}),
  connectionTimeoutMillis: 15000,
});

pool.on("error", (error) => {
  console.error("Database connection error:", error.message);
});

module.exports = pool;