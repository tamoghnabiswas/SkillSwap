require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

// serve the website files (the folder above backend/) from this same server
app.use("/backend", (req, res) => res.status(404).end()); // never expose server code or .env
app.use(express.static(path.join(__dirname, "..")));

// connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("Connection failed:", err.message));

// shape of a document in the "users" collection
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
});
const User = mongoose.model("User", userSchema);

// SIGNUP: save a new student
app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: "Fill all fields (password: 6+ characters)." });
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(400).json({ error: "That email already has an account." });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
  res.json({ id: user._id, name: user.name, email: user.email });
});

// LOGIN: check email and password
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || "").toLowerCase() });
  if (!user) return res.status(400).json({ error: "Wrong email or password." });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: "Wrong email or password." });
  res.json({ id: user._id, name: user.name, email: user.email });
});
// shape of a document in the "profiles" collection
const profileSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  name: String,
  semester: String,
  branch: String,
  learn: [String],
  teach: [{ name: String, level: String }],
});
const Profile = mongoose.model("Profile", profileSchema);

// SAVE PROFILE: create it, or update it if it already exists
app.post("/api/profile", async (req, res) => {
  const { userId, name, semester, branch, learn, teach } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required." });
  const profile = await Profile.findOneAndUpdate(
    { userId },
    { name, semester, branch, learn, teach },
    { upsert: true, returnDocument: "after" }
  );
  res.json(profile);
});

// LOAD PROFILE: get one student's details
app.get("/api/profile/:userId", async (req, res) => {
  const profile = await Profile.findOne({ userId: req.params.userId });
  if (!profile) return res.status(404).json({ error: "No profile yet." });
  res.json(profile);
});

// helper: makes a skill name safe to use inside a search pattern
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// FIND PEERS: students who can teach what I want to learn
app.get("/api/find-peers/:userId", async (req, res) => {
  const me = await Profile.findOne({ userId: req.params.userId });
  if (!me) return res.status(404).json({ error: "Save your profile first." });

  // one pattern per skill I want, ignoring capital letters ("guitar" matches "Guitar")
  const patterns = me.learn.map((s) => new RegExp("^" + escapeRegex(s.trim()) + "$", "i"));

  const peers = await Profile.find({
    userId: { $ne: me.userId },      // not me
    "teach.name": { $in: patterns }, // teaches at least one skill I want
  });
  res.json(peers);
});

// shape of a document in the "connections" collection
const connectionSchema = new mongoose.Schema({
  userId: String,
  peerId: String,
  connectedAt: { type: Date, default: Date.now },
});
const Connection = mongoose.model("Connection", connectionSchema);

// CONNECT: save a match
app.post("/api/connect", async (req, res) => {
  const { userId, peerId } = req.body;
  if (!userId || !peerId) return res.status(400).json({ error: "userId and peerId are required." });
  const existing = await Connection.findOne({ userId, peerId });
  if (existing) return res.json(existing);
  const connection = await Connection.create({ userId, peerId });
  res.json(connection);
});

// MY CONNECTIONS: list past matches, with each peer's details
app.get("/api/connections/:userId", async (req, res) => {
  const connections = await Connection.find({ userId: req.params.userId }).sort({ connectedAt: -1 });
  const peerIds = connections.map((c) => c.peerId);
  const peers = await Profile.find({ userId: { $in: peerIds } });
  res.json(
    connections.map((c) => ({
      connectedAt: c.connectedAt,
      peer: peers.find((p) => p.userId === c.peerId),
    }))
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));