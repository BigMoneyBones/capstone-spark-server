require("dotenv").config();
const port = process.env.PORT;
const express = require("express");
const { MongoClient } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcrypt");

const uri = process.env.URI;

const app = express();

// so cors doesnt block my shit
app.use(cors());

// so json can be read
app.use(express.json());

app.get("/api/", (req, res) => {
  res.json("Hello");
});

// Create Account Form Route
app.post("/api/signup", async (req, res) => {
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
    res.status(201).json({ token, userId: generatedUserId });
  } catch (error) {
    console.log(error);
  }
});

app.post("/api/login", async (req, res) => {
  const client = new MongoClient(uri);
  const { email, password } = req.body;

  // define database
  try {
    await client.connect();
    const database = client.db("Spark");
    const users = database.collection("users");
    // find user in database by email
    const user = await users.findOne({ email });

    const correctPassword = await bcrypt.compare(
      password,
      user.hashed_password
    );

    // check password entered with hashed password stored in DB
    if (user && correctPassword) {
      const token = jwt.sign(user, email, {
        expiresIn: 60 * 24,
      });
      res.status(201).json({ token, userId: user.user_id });
    }
    res.status(400).send("Invalid Credentials");
  } catch (error) {
    console.log(error);
  }
});

app.get("/api/user", async (req, res) => {
  const client = new MongoClient(uri);
  const userId = req.query.userId;

  try {
    await client.connect();
    const database = client.db("Spark");
    const users = database.collection("users");

    const query = { user_id: userId };
    const user = await users.findOne(query);
    res.send(user);
  } finally {
    await client.close();
  }
});

app.get("/api/users", async (req, res) => {
  const client = new MongoClient(uri);
  const userIds = JSON.parse(req.query.userIds);
  try {
    await client.connect();
    const database = client.db("Spark");
    const users = database.collection("users");

    // look in db for multiple userIds
    const pipeline = [
      {
        $match: {
          user_id: {
            $in: userIds,
          },
        },
      },
    ];

    const foundUsers = await users.aggregate(pipeline).toArray();
    res.send(foundUsers);
  } finally {
    await client.close();
  }
});

app.get("/api/gendered-users", async (req, res) => {
  const client = new MongoClient(uri);
  const gender = req.query.gender;

  try {
    await client.connect();
    const database = client.db("Spark");
    const users = database.collection("users");
    const query = { gender_identity: { $eq: gender } };
    const foundUsers = await users.find(query).toArray();

    res.send(foundUsers);
  } finally {
    // client will close when finished, or if there is an error
    await client.close();
  }
});

// put for updating a document
app.put("/api/user", async (req, res) => {
  const client = new MongoClient(uri);
  const formData = req.body.formData;

  try {
    await client.connect();
    const database = client.db("Spark");
    const users = database.collection("users");

    const query = { user_id: formData.user_id };
    const updateDocument = {
      $set: {
        first_name: formData.first_name,
        dob_day: formData.dob_day,
        dob_month: formData.dob_month,
        dob_year: formData.dob_year,
        show_gender: formData.show_gender,
        gender_identity: formData.gender_identity,
        gender_interest: formData.gender_interest,
        url: formData.url,
        about: formData.about,
        matches: formData.matches,
      },
    };
    // update the user 'query' with 'updateDocument' values.
    const insertedUser = await users.updateOne(query, updateDocument);
    res.send(insertedUser);
  } finally {
    await client.close();
  }
});

app.put("/api/addmatch", async (req, res) => {
  const client = new MongoClient(uri);
  const { userId, matchedUserId } = req.body;

  try {
    await client.connect();
    const database = client.db("Spark");
    const users = database.collection("users");

    const query = { user_id: userId };
    const updateDocument = {
      $push: { matches: { user_id: matchedUserId } },
    };
    const user = await users.updateOne(query, updateDocument);
    res.send(user);
  } finally {
    await client.close();
  }
});

app.get("/api/messages", async (req, res) => {
  const client = new MongoClient(uri);
  const { userId, correspondingUserId } = req.query;
  try {
    await client.connect();
    const database = client.db("Spark");
    const messages = database.collection("messages");

    // ping mongo, search for messages
    const query = {
      from_userId: userId,
      to_userId: correspondingUserId,
    };

    // return messages an an array
    const foundMessages = await messages.find(query).toArray();
    res.send(foundMessages);
  } finally {
    await client.close();
  }
});

app.post("/api/message", async (req, res) => {
  const client = new MongoClient(uri);
  const message = req.body.message;

  try {
    await client.connect();
    const database = client.db("Spark");
    const messages = database.collection("messages");
    const insertedMessage = await messages.insertOne(message);
    res.send(insertedMessage);
  } finally {
    await client.close();
  }
});

app.listen(port, () => console.log("Server is running on PORT: " + port));
