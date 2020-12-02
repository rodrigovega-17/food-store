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
const multer = require("multer");

//define storage for the images

const storage = multer.diskStorage({
  //destination for files
  destination: function (request, file, callback) {
    callback(null, "./public/images");
  },

  //add back the extension
  filename: function (request, file, callback) {
    callback(null, file.originalname);
  },
});

//upload parameters for multer
const upload = multer({
  storage: storage,
  limits: {
    fieldSize: 1024 * 1024 * 3,
  },
});

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

  app.get("/store", async function (req, res) {
    let datos = {
      food: "",
      drinks: "",
    };
    datos["food"] = await getDatos("food");
    datos["drinks"] = await getDatos("beverage");
    //console.log(datos);
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

  async function findDatos(data) {
    return new Promise((resolve, reject) =>
      dbo
        .collection(data.collection)
        .find({ email: data.email })
        .toArray(function (err, result) {
          if (err) {
            reject(err);
          } else {
            //console.log("result: ", result);
            resolve(result);
          }
        })
    );
  }

  app.post("/additem", upload.single("image"), async function (req, res) {
    console.log(req.body);
    collection = req.body.collection;
    // const items = await getDatos(collection);
    const itemsJsonDB = await getDatos("food");
    const itemsJson2DB = await getDatos("beverage");
    //const itemsJson = JSON.parse(data);
    const itemsArray = itemsJsonDB.concat(itemsJson2DB);
    const nextID = itemsArray.length + 1;
    let data = {
      id: nextID,
      name: req.body.name,
      price: req.body.price * 100,
      imgName: req.file.filename,
    };
    console.log(data, collection);
    saveDB(data, collection);
  });

  app.post("/login", async function (req, res) {
    let query = {
      collection: "users",
      email: req.body.data.email,
      password: req.body.data.password,
    };
    //console.log(query);
    const user = await findDatos(query);
    //console.log("found: ", user);
    if (user.length == 0) {
      return res.status(400).send("Email no existe");
    }
    const validPass = await bcrypt.compare(
      req.body.data.password,
      user[0].password
    );
    if (!validPass) {
      return res.status(400).send("Contraseña incorrecta");
    }
    const token = jwt.sign({ email: user[0].email }, process.env.TOKEN_SECRET);
    //console.log("token = ", token);
    res.send(token);
    // res.header("auth-token", token).send(token).render("pedidos", {
    //   token,
    // });
  });

  // function auth(req, res, next) {
  //   //const token = req.query.token;
  //   console.log("auth", req.headers.token);
  //   const token = req.headers.token;

  //   if (!token) {
  //     return res.status(401).send("Access Denied");
  //   }
  //   try {
  //     const verified = jwt.verify(token, process.env.TOKEN_SECRET);
  //     req.user = verified;
  //     next();
  //   } catch (err) {
  //     res.status(400);
  //   }
  // }

  app.post("/register", async function (req, res) {
    console.log("Hola?");
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(req.body.password, salt);
    let user = {
      email: req.body.email,
      password: hashPassword,
      address: req.body.address,
    };
    saveDB(user, "users");
  });

  app.get("/pedidos", async function (req, res) {
    datos2 = await getDatos("pedidos");
    res.render("pedidos.ejs", {
      pedidos: datos2,
    });
  });

  app.get("/autorizacion", async (req, res) => {
    console.log("auth", req.headers.token);
    const token = req.headers.token;
    if (!token) {
      res.status(400).send("FALSE");
    }
    try {
      const verified = jwt.verify(token, process.env.TOKEN_SECRET);
      req.user = verified;
      res.send(verified);
    } catch (err) {
      res.status(400).send("FALSE");
    }
  });

  app.get("/autorizacionAdmin", async (req, res) => {
    console.log("auth", req.headers.token);
    const token = req.headers.token;
    if (!token) {
      res.status(400).send("FALSE");
    }
    try {
      const verified = jwt.verify(token, process.env.TOKEN_SECRET);
      req.user = verified;
      if (verified.email == "admin@admin.com") {
        res.send(verified);
      } else {
        res.status(400).send("FALSE");
      }
    } catch (err) {
      res.status(400).send("FALSE");
    }
  });
  async function getEmailConToken(token) {
    const user = jwt.verify(token, process.env.TOKEN_SECRET);
    return user;
  }

  async function getUsuarioConEmail(data) {
    return new Promise((resolve, reject) =>
      dbo
        .collection("users")
        .find({ email: data })
        .toArray(function (err, result) {
          if (err) {
            reject(err);
          } else {
            //console.log("result: ", result);
            resolve(result);
          }
        })
    );
  }

  app.post("/purchase", async function (req, res) {
    const itemsJsonDB = await getDatos("food");
    const itemsJson2DB = await getDatos("beverage");
    //const itemsJson = JSON.parse(data);
    const itemsArray = itemsJsonDB.concat(itemsJson2DB);
    let total = 0;
    //console.log(req.body.items);
    req.body.items.forEach(function (item) {
      const itemJson = itemsArray.find(function (i) {
        return i.id == item.id;
      });
      total = total + itemJson.price * item.quantity;
    });
    req.body.items.forEach(function (item) {
      const itemJson = itemsArray.find(function (i) {
        return i.id == item.id;
      });
      item.description = itemJson.name;
    });

    console.log("HOLA", req.body.items);
    const user = await getEmailConToken(req.body.userToken);
    console.log("user", user);
    const dataUsuario = await getUsuarioConEmail(user.email);
    console.log("data user", dataUsuario);
    console.log(dataUsuario);
    stripe.charges
      .create({
        amount: total,
        source: req.body.stripeTokenId,
        currency: "usd",
      })
      .then(function () {
        //console.log("Charge Successful");
        res.json({ message: "Successfully purchased items" });
        dataPedido = {
          items: req.body.items,
          total: total,
          usuario: {
            email: dataUsuario[0].email,
            direccion: dataUsuario[0].address,
          },
        };
        saveDB(dataPedido, "pedidos");
      })
      .catch(function () {
        //console.log("Charge Fail");
        res.status(500).end();
      });
  });
});
app.listen(3000);
