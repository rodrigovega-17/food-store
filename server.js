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

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.static("public"));

var MongoClient = require("mongodb").MongoClient;

MongoClient.connect(url, function (err, db) {
  if (err) {
    throw err;
  }
  var dbo = db.db("foodstore");

  app.get("/store", function (req, res) {
    fs.readFile("items.json", function (error, data) {
      if (error) {
        res.status(500).end();
      } else {
        res.render("store.ejs", {
          stripePublicKey: stripePublicKey,
          items: JSON.parse(data),
        });
      }
    });
  });

  function saveDB(data) {
    dbo.collection("pedidos").insertOne(data);
  }

  app.get("/pedidos", async function (req, res) {
    dbo
      .collection("pedidos")
      .find()
      .toArray(function (err, result) {
        console.log(result);
        console.log("tipo: ", typeof result);
        res.render("pedidos.ejs", {
          pedidos: result,
        });
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
            saveDB(dataPedido);
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
