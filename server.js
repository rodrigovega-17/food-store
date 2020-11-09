if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublicKey = process.env.STRIPE_PUBLIC_KEY;
const url = process.env.MONGODBURL;

console.log(stripeSecretKey, stripePublicKey);

const express = require("express");
const app = express();
const fs = require("fs");
const stripe = require("stripe")(stripeSecretKey);
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

app.set("view engine", "ejs");
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

var MongoClient = require("mongodb").MongoClient;

MongoClient.connect(url, function (err, db) {
  if (err) {
    throw err;
  }
  var dbo = db.db("foodstore");

  app.get("/", async function (req, res) {
    res.sendFile("/public/login.html", { root: __dirname });
  });

  app.get("/store", auth, async function (req, res) {
    let datos = {
      food: "",
      drinks: "",
    };
    datos["food"] = await getDatos("food");
    datos["drinks"] = await getDatos("beverage");
    console.log(datos);
    res.render("store.ejs", {
      stripePublicKey: stripePublicKey,
      items: datos,
    });
  });

  function saveDB(data, collection) {
    dbo.collection(collection).insertOne(data);
  }

  function getDatos(collection) {
    return new Promise((resolve, reject) =>
      dbo
        .collection(collection)
        .find()
        .toArray(function (err, result) {
          if (err) {
            reject(err);
          }
          resolve(result);
        })
    );
  }

  function findDatos(data) {
    return new Promise((resolve, reject) =>
      dbo
        .collection(data.collection)
        .find({ email: data.email })
        .toArray(function (err, result) {
          if (err) {
            reject(err);
          } else {
            console.log("result: ", result);
            resolve(result);
          }
        })
    );
  }

  app.post("/login", async function (req, res) {
    let query = {
      collection: "users",
      email: req.body.email,
      password: req.body.password,
    };
    console.log(query);
    const user = await findDatos(query);
    //console.log("found: ", emailExist);
    if (user.length == 0) {
      return res.status(400).send("Email no existe");
    }
    const validPass = await bcrypt.compare(req.body.password, user[0].password);
    if (!validPass) {
      return res.status(400).send("Contraseña incorrecta");
    }
    const token = jwt.sign({ email: user.email }, process.env.TOKEN_SECRET);
    console.log("token = ", token);
    res.header("auth-token", token).send(token).render("pedidos", {
      token,
    });
  });

  function auth(req, res, next) {
    const token = req.header("auth-token");
    //const token = req.query.token;
    console.log("token function = ", token);
    console.log(req.header);
    if (!token) {
      return res.status(401).send("Access Denied");
    }
    try {
      const verified = jwt.verify(token, process.env.TOKEN_SECRET);
      req.user = verified;
      next();
    } catch (err) {
      res.status(400);
    }
  }

  app.post("/register", async function (req, res) {
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(req.body.password, salt);
    let user = {
      email: req.body.email,
      password: hashPassword,
      address: req.body.address,
    };
    saveDB(user, "users");
    res.send("CREADO");
  });

  app.get("/pedidos", async function (req, res) {
    datos2 = await getDatos("pedidos");
    console.log(datos2);
    res.render("pedidos.ejs", {
      pedidos: datos2,
    });
  });

  app.post("/purchase", function (req, res) {
    fs.readFile("items.json", function (error, data) {
      if (error) {
        res.status(500).end();
      } else {
        const itemsJson = JSON.parse(data);
        const itemsArray = itemsJson.food.concat(itemsJson.drinks);
        let total = 0;
        console.log(req.body.items);
        req.body.items.forEach(function (item) {
          const itemJson = itemsArray.find(function (i) {
            return i.id == item.id;
          });
          total = total + itemJson.price * item.quantity;
        });

        stripe.charges
          .create({
            amount: total,
            source: req.body.stripeTokenId,
            currency: "usd",
          })
          .then(function () {
            console.log("Charge Successful");
            res.json({ message: "Successfully purchased items" });
            dataPedido = {
              items: req.body.items,
              total: total,
              usuario: "testing",
            };
            saveDB(dataPedido, "pedidos");
          })
          .catch(function () {
            console.log("Charge Fail");
            res.status(500).end();
          });
      }
    });
  });
});
app.listen(3000);
