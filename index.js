const PORT = 8000;
const express = require("express");
const { MongoClient } = require("mongodb");
const uri =
  "mongodb+srv://jraines:CodeImmersives2022@codeimmersivescluster.glmif.mongodb.net/Spark?retryWrites=true&w=majority";
const app = express();

app.get("/", (req, res) => {
  res.json("Hello");
});

// Create Account Form Route
app.get("/signup", (req, res) => {
  res.json("Hello");
});

app.listen(PORT, () => console.log("Server is running on PORT: " + PORT));
