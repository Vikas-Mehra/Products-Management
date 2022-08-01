const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");

const route = require("./routes/route");

const app = express();

app.use(express.json());

app.use(multer().any());

mongoose
  .connect(
    "mongodb+srv://Vikas:pAeAi3B.8Rhcfa2@cluster0.tnyfk.mongodb.net/group-37-Database",
    {
      useNewUrlParser: true,
    }
  )
  .then(() => console.log("MongoDB connected."))
  .catch((err) => console.log(err));

app.use("/", route);

app.listen(process.env.PORT || 3000, function () {
  console.log("Express app running on PORT " + (process.env.PORT || 3000));
});
