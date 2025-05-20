const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const pg = require("pg");

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: "abc",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 },
  })
);

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Warehouse_Db",
  password: "mohan",
  port: 5432,
});

db.connect();


// Get Routes ----------------------------------------------

// Signup Route
app.get("/", (req, res) => {
  const sameEmail = req.session.sameEmail || false;
  req.session.sameEmail = null;
  res.render("signup", { sameEmail });
});





// Signin Route
app.get("/signin", (req, res) => {
  const incorrectPass = req.session.incorrectPass || false;
  const userNotFound = req.session.userNotFound || false;
  req.session.incorrectPass = null;
  req.session.userNotFound = null;
  res.render("signin", { incorrectPass,userNotFound });
});


// Make Inventory Route
app.get("/makeInv", (req, res) => {
  res.render("makeInv");
});


// Manage Inventory
app.get("/manageInv", (req, res) => {
  const { warehouseName } = req.query;
  const binName = req.session.binnid;
  const rackName = req.session.rackkid;
  if (warehouseName) {
    req.session.warehouseName = warehouseName;
  }
  console.log("Selected warehouse name:", req.session.warehouseName);
  res.render("managingInv", { warehouseName: req.session.warehouseName, binName , rackName });
  

});


// Home Route
app.get("/home", (req, res) => {
  const addedProduct = req.session.addedProduct || false;
  const warehouseMsg = req.session.warehouseMsg || false;
  req.session.warehouseMsg = null;
  req.session.addedProduct = null;
  const name = req.session.name;
  const email = req.session.email;
  const cname = req.session.companyName;
  const rack = req.session.rackId;
  const bin = req.session.BinId;
 
  res.render("home",{addedProduct,warehouseMsg,name,email,cname,rack,bin});

  console.log("warehouseMsg:", req.session.warehouseMsg, "addedProduct:", req.session.addedProduct);


});


// Warehouse Route
app.get("/warehouse", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT warehouse_id, name, usable_space FROM warehouse WHERE company_name = $1",
      [req.session.companyName]
    );

    // From each Row We are Creating a new Object. Easy to Work in Frontend and Returns JSON value
    const warehouses = result.rows.map((row, index) => ({
      sno: index + 1,
      name: row.name,
      usable_space: row.usable_space,
      id: row.warehouse_id,
    }));
    res.render("warehousese", { warehouses });
  } catch (err) {
    console.error("Error fetching warehouses:", err);
    res.status(500).send("Internal Server Error");
  }
});



// Product page

app.get("/product", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM products WHERE warehouse = $1",
      [req.session.warehouseName]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("No products found for this warehouse.");
    }

    res.render("productList", {
      products: result.rows,
      warehouse: req.session.warehouseName
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Internal Server Error");
  }
});


// Post Routes ---------------------------------------------

// Signup Section

app.post("/signup", async (req, res) => {
  const { name, email, password, companyName } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];

    if (user) {
      req.session.sameEmail = true;
      return res.redirect("/");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (name, email, password, company_name) VALUES ($1, $2, $3, $4)",
      [name, email, hashedPassword, companyName]
    );

    res.redirect("/signin");
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

// Signin Section

app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    const user = result.rows[0];
    if (!user) {
      // console.log("User not Found");
      req.session.userNotFound = true;
      return res.redirect("/signin");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // console.log("Wrong Password");
      req.session.incorrectPass = true;
      return res.redirect("/signin");
    }

    req.session.name = user.name;
    req.session.email = user.email;
    req.session.companyName = user.company_name;

    res.redirect("/home");
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

// Creating a Warehouse

app.post("/warehouse", async (req, res) => {
  const {
    warehouseName,
    WidthWarehouse,
    lengthWarehouse,
    HeightWarehouse,
    numberOfRacks,
    WidthOfRacks,
    LengthOfRacks,
    HeightOfRacks,
    LengthOfBins,
    WidthOfBins,
    HeightOfBins,
  } = req.body;

  try {
    const usable = lengthWarehouse * WidthWarehouse * HeightWarehouse;

    const rackVolume = LengthOfRacks * WidthOfRacks * HeightOfRacks;
    const binVolume = LengthOfBins * WidthOfBins * HeightOfBins;

    const maxRacks = Math.floor(usable / rackVolume);
    const maxBins = Math.floor(usable / binVolume);

    if (numberOfRacks > maxRacks) {
      return res.status(400).send(`You can only add a maximum of ${maxRacks} racks based on the available space.`);     }

    const maxBinsForInputRacks = numberOfRacks * (Math.floor(maxBins / numberOfRacks)); // Calculate number of bins per rack
    if (maxBinsForInputRacks < maxBins) {
      return res.status(400).send(`You can only add a maximum of ${maxBinsForInputRacks} bins across all racks.`);
    }

    // Step 1: Insert Warehouse Details and get warehouse_id
    const warehouseRes = await db.query(
      "INSERT INTO warehouse(name, company_name, length, width, height, usable_space) VALUES ($1, $2, $3, $4, $5, $6) RETURNING warehouse_id",
      [warehouseName, req.session.companyName, lengthWarehouse, WidthWarehouse, HeightWarehouse, usable]
    );

    const warehouse_id = warehouseRes.rows[0].warehouse_id;

    // Step 2: Calculate the bin capacity and how many bins we can fit in the warehouse
    const binCapacity = LengthOfBins * WidthOfBins * HeightOfBins;
    const numberOfBins = Math.floor(usable / binCapacity);

    // Insert multiple bins into the database
    const binInsertPromises = [];
    let binCounter = 0;
    for (let i = 0; i < numberOfBins; i++) {
      const rackId = Math.floor(i / Math.floor(numberOfBins / numberOfRacks)) + 1;

      binInsertPromises.push(
        db.query(
          "INSERT INTO bins(warehouse_id, length, width, height, capacity, current_load, rack_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [warehouse_id, LengthOfBins, WidthOfBins, HeightOfBins, binCapacity, 0, rackId] 
        )
      );
      binCounter++;
    }
    
    // Wait karega Jab tak pure Insert nhi ho jate
    await Promise.all(binInsertPromises);

    // Step 3: Get the total number of bins and distribute them across the racks
    const binRes = await db.query("SELECT bin_id FROM bins WHERE warehouse_id = $1", [warehouse_id]);
    
    const binIDs = binRes.rows.map((bin) => bin.bin_id);

    // Distribute the bins across racks
    const binsPerRack = Math.floor(numberOfBins / numberOfRacks);
    const remainingBins = numberOfBins % numberOfRacks;

    const rackInsert = [];
    for (let i = 0; i < numberOfRacks; i++) {
      let binsInRack = binsPerRack;
      if (i < remainingBins) {
        binsInRack++; // Distribute remaining bins to the first few racks
      }

      // Assign bins to the current rack
      const rackName = `Rack ${i + 1}`;
      const rackPromise = db.query(
        "INSERT INTO racks(warehouse_id, name, length, width, height, number_of_bins) VALUES ($1, $2, $3, $4, $5, $6)",
        [warehouse_id, rackName, LengthOfRacks, WidthOfRacks, HeightOfRacks, binsInRack]
      );

      rackInsert.push(rackPromise);
    }

    
    await Promise.all(rackInsert);
    req.session.warehouseMsg = "Warehouse created successfully with optimized bins and racks!";
    res.redirect("/home");
  } catch (err) {
    console.error("Error creating warehouse:", err);
    res.status(500).send("An error occurred while creating the warehouse.");
  }
});


  



function knapsack01(items, capacity) {
  const n = items.length;
  const dp = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0));
  const weights = items.map(item => item.size * item.quant);

  const values = items.map(item => {
    if (item.priority === 'High') return 2;
    if (item.priority === 'Medium') return 1;
    return 0;
  });

  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      if (weights[i - 1] <= w) {
        dp[i][w] = Math.max(
          values[i - 1] + dp[i - 1][w - weights[i - 1]],
          dp[i - 1][w]
        );
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  const selected = [];
  let w = capacity;
  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selected.push(items[i - 1]);
      w -= weights[i - 1];
    }
  }

  return selected;
}

app.post("/submit-batch", async (req, res) => {
  const warehouse = req.session.warehouseName;
  const company = req.session.companyName;

  try {
    const allProducts = JSON.parse(req.body.products);
    if (!Array.isArray(allProducts) || allProducts.length === 0) {
      return res.send("No products received.");
    }

    await db.query("BEGIN");

    const binsRes = await db.query(
      `SELECT bin_id, capacity, current_load, rack_id
       FROM bins
       WHERE warehouse_id = (
         SELECT warehouse_id FROM warehouse WHERE name = $1 AND company_name = $2
       )
       ORDER BY bin_id`,
      [warehouse, company]
    );

    const bins = binsRes.rows;
    const totalCapacity = bins.reduce((sum, bin) => sum + (bin.capacity - bin.current_load), 0);


    // reduce()-> A method that combines all elements of an array into a single value, by applying a function one item at a time.

    const selectedProducts = knapsack01(allProducts, totalCapacity);
    // Set of Unique Name Product
    const selectedNames = new Set(selectedProducts.map(p => p.name));

    // Those Name Who are not Selected in selectedNames
    const remainingProducts = allProducts.filter(p => !selectedNames.has(p.name));


    for (const product of selectedProducts) {
      let remainingQty = product.quant;
      const unitVolume = product.size;

      for (const bin of bins) {
        const binStatus = await db.query(
          "SELECT capacity, current_load FROM bins WHERE bin_id = $1 FOR UPDATE",
          [bin.bin_id]
        );

        const { capacity, current_load } = binStatus.rows[0];
        const available = capacity - current_load;
        const maxUnitsFit = Math.floor(available / unitVolume);

        if (maxUnitsFit > 0) {
          const unitsToPlace = Math.min(maxUnitsFit, remainingQty);
          const volumeToAdd = unitsToPlace * unitVolume;

          await db.query(
            `INSERT INTO products (name, size, weight, quantity, priority, warehouse, company_name, bin_id, rack_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              product.name, product.size, product.weight, unitsToPlace,
              product.priority === 'High' ? 2 : (product.priority === 'Medium' ? 1 : 0),
              warehouse, company, bin.bin_id, bin.rack_id
            ]
          );

          await db.query(
            "UPDATE bins SET current_load = current_load + $1 WHERE bin_id = $2",
            [volumeToAdd, bin.bin_id]
          );

          remainingQty -= unitsToPlace;
          if (remainingQty === 0) break;
        }
      }

      if (remainingQty > 0) {
        await db.query("ROLLBACK");
        return res.send(`Not enough space for product "${product.name}".`);
      }
    }

    for (const product of remainingProducts) {
      let remainingQty = product.quant;
      const unitVolume = product.size;

      for (let i = bins.length - 1; i >= 0 && remainingQty > 0; i--) {
        const bin = bins[i];
        const binStatus = await db.query(
          "SELECT capacity, current_load FROM bins WHERE bin_id = $1 FOR UPDATE",
          [bin.bin_id]
        );

        const { capacity, current_load } = binStatus.rows[0];
        const available = capacity - current_load;
        const maxUnitsFit = Math.floor(available / unitVolume);

        if (maxUnitsFit > 0) {
          const unitsToPlace = Math.min(maxUnitsFit, remainingQty);
          const volumeToAdd = unitsToPlace * unitVolume;

          await db.query(
            `INSERT INTO products (name, size, weight, quantity, priority, warehouse, company_name, bin_id, rack_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              product.name, product.size, product.weight, unitsToPlace,
              product.priority === 'High' ? 2 : (product.priority === 'Medium' ? 1 : 0),
              warehouse, company, bin.bin_id, bin.rack_id
            ]
          );

          await db.query(
            "UPDATE bins SET current_load = current_load + $1 WHERE bin_id = $2",
            [volumeToAdd, bin.bin_id]
          );

          remainingQty -= unitsToPlace;
        }
      }

      if (remainingQty > 0) {
        await db.query("ROLLBACK");
        return res.send(`❌ Not enough space for product "${product.name}" (even across all bins).`);
      }
    }

    await db.query("COMMIT");
    res.redirect("/home");

  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Error in /submit-batch:", error);
    res.status(500).send("Internal Server Error");
  }
});







// Hashing 


app.post("/retrieve-product", async (req, res) => {
  const productName = req.body.productName;
  const q = parseInt(req.body.quannn);
  console.log(q);
  if (isNaN(q) || q <= 0) {
    return res.status(400).send("Invalid quantity entered.");
  }

  try {
    const result = await db.query(
      `SELECT bin_id, rack_id, quantity FROM products
       WHERE name = $1 AND warehouse = $2 AND company_name = $3 LIMIT 1`,
      [productName, req.session.warehouseName, req.session.companyName]
    );

    if (result.rows.length > 0) {
      const { bin_id, rack_id, quantity } = result.rows[0];

      if (quantity >= q) {
        const newQuantity = quantity - q;
        if(newQuantity>0){
        await db.query(
          `UPDATE products
           SET quantity = $1
           WHERE name = $2 AND warehouse = $3 AND company_name = $4`,
          [newQuantity, productName, req.session.warehouseName, req.session.companyName]
        );
      }
      else{
         await db.query(
      `DELETE FROM products
       WHERE name = $1 AND warehouse = $2 AND company_name = $3`,
      [productName, req.session.warehouseName, req.session.companyName]
    );
      }

        res.render("managingInv", {
          rackName: rack_id,
          binName: bin_id,
          warehouseName: req.session.warehouseName
        });
      } else {
        res.send(`Not enough stock. Available: ${quantity}, Requested: ${q}`);
      }

    } else {
      res.send(`❌ Product "${productName}" not found.`);
    }
  } catch (err) {
    console.error("Error retrieving or updating product:", err);
    res.status(500).send("Internal Server Error");
  }
});







const {} = app.listen(3000, () => {
  console.log("Server is Running at Port 3000");
});
