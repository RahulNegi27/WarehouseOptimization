const { Client } = require("pg");

const db = new Client({
  user: "postgres",
  host: "localhost",
  database: "warehouse",
  password: "#Rahul123",
  port: 5432,
});

db.connect();

module.exports = db;
