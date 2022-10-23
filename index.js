const PORT = 8000;
const express = require("express");
const { MongoClient } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcrypt");

const uri =
  "mongodb+srv://jraines:CodeImmersives2022@codeimmersivescluster.glmif.mongodb.net/CodeImmersivesCluster?retryWrites=true&w=majority";
const app = express();
// so cors doesnt block my shit
app.use(cors());
// so json can be read
app.use(express.json());

app.get("/", (req, res) => {
  res.json("Hello");
});

// Create Account Form Route
app.post("/signup", async (req, res) => {
  const client = new MongoClient(uri);
  const { email, password } = req.body;

  // a unique identifier will be generated
  const generatedUserId = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await client.connect();
    const database = client.db("Spark");
    const users = database.collection("users");

    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(409).send("User already exists, please login");
    }

    const sanitizedEmail = email.toLowerCase();
    const data = {
      user_id: generatedUserId,
      email: sanitizedEmail,
      hashed_password: hashedPassword,
    };
    const insertedUser = await users.insertOne(data);

    // to generate a token in order to track being logged into the app
    const token = jwt.sign(insertedUser, sanitizedEmail, {
      expiresIn: 60 * 24,
    });
    res
      .status(201)
      .json({ token, userId: generatedUserId, email: sanitizedEmail });
  } catch (err) {
    console.log(err);
  }
});

app.get("/users", async (req, res) => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const database = client.db("Spark");
    const users = database.collection("users");

    const returnedUsers = await users.find().toArray();
    res.send(returnedUsers);
  } finally {
    // client will close when finished, or if there is an error
    await client.close();
  }
});

app.listen(PORT, () => console.log("Server is running on PORT: " + PORT));
