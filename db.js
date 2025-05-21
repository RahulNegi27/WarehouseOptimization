const { Client } = require("pg");

const db = new Client({
  user: "postgres",
  host: "localhost",
  database: "warehouse",
  password: "rahul",
  port: 5432,
});

db.connect();

module.exports = db;
