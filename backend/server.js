require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const multer = require("multer");
//const path = require("path");
//const fs = require("fs");

const app = express();
app.use(express.json());
app.use(cors());

// uploaded chat files (photos, documents) are saved in the "uploads" folder
// const uploadsDir = path.join(__dirname, "uploads");
// if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
// app.use(
//   "/uploads",
//   express.static(uploadsDir, {
//     // pictures open in the browser; every other file type downloads instead
//     setHeaders: (res, filePath) => {
//       if (!/\.(png|jpe?g|gif|webp)$/i.test(filePath)) res.set("Content-Disposition", "attachment");
//     },
//   })
// );

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
// userId = the student who SENT the request, peerId = the student who RECEIVES it
// status: "pending" (waiting for the receiver) or "accepted" (both are connected)
const connectionSchema = new mongoose.Schema({
  userId: String,
  peerId: String,
  status: { type: String, default: "pending" },
  connectedAt: { type: Date, default: Date.now },
});
const Connection = mongoose.model("Connection", connectionSchema);

// helper: are these two students connected (request accepted, in either direction)?
async function areConnected(a, b) {
  const found = await Connection.findOne({
    status: "accepted",
    $or: [
      { userId: a, peerId: b },
      { userId: b, peerId: a },
    ],
  });
  return !!found;
}

// SEND REQUEST: save it as "pending" until the other student accepts
app.post("/api/connect", async (req, res) => {
  const { userId, peerId } = req.body;
  if (!userId || !peerId) return res.status(400).json({ error: "userId and peerId are required." });
  if (userId === peerId) return res.status(400).json({ error: "You cannot connect with yourself." });

  // did I already send one?
  const mine = await Connection.findOne({ userId, peerId });
  if (mine) return res.json(mine);

  // did THEY already send me one? Then we both want it, so connect straight away
  const theirs = await Connection.findOne({ userId: peerId, peerId: userId });
  if (theirs) {
    theirs.status = "accepted";
    theirs.connectedAt = new Date();
    await theirs.save();
    return res.json(theirs);
  }

  const request = await Connection.create({ userId, peerId });
  res.json(request);
});

// REQUESTS I SENT that are still waiting (so the button can say "Request sent")
app.get("/api/sent-requests/:userId", async (req, res) => {
  const sent = await Connection.find({ userId: req.params.userId, status: "pending" });
  res.json(sent.map((c) => c.peerId));
});

// REQUESTS FOR ME: pending requests that other students sent to me
app.get("/api/requests/:userId", async (req, res) => {
  const requests = await Connection.find({ peerId: req.params.userId, status: "pending" }).sort({
    connectedAt: -1,
  });
  const senders = await Profile.find({ userId: { $in: requests.map((r) => r.userId) } });
  res.json(
    requests.map((r) => ({
      requestId: r._id,
      sentAt: r.connectedAt,
      from: senders.find((p) => p.userId === r.userId),
    }))
  );
});

// ACCEPT: only the student who RECEIVED the request can accept it
app.post("/api/requests/:id/accept", async (req, res) => {
  const { userId } = req.body;
  const request = await Connection.findById(req.params.id);
  if (!request || request.peerId !== userId) {
    return res.status(404).json({ error: "Request not found." });
  }
  request.status = "accepted";
  request.connectedAt = new Date();
  await request.save();
  res.json(request);
});

// DECLINE: delete the request (the sender may send a new one later)
app.post("/api/requests/:id/decline", async (req, res) => {
  const { userId } = req.body;
  const request = await Connection.findById(req.params.id);
  if (!request || request.peerId !== userId) {
    return res.status(404).json({ error: "Request not found." });
  }
  await request.deleteOne();
  res.json({ ok: true });
});

// MY CONNECTIONS: only accepted ones, whether I sent the request or received it
app.get("/api/connections/:userId", async (req, res) => {
  const me = req.params.userId;
  const connections = await Connection.find({
    status: "accepted",
    $or: [{ userId: me }, { peerId: me }],
  }).sort({ connectedAt: -1 });

  // the "other person" is whichever id is not mine
  const otherId = (c) => (c.userId === me ? c.peerId : c.userId);
  const peers = await Profile.find({ userId: { $in: connections.map(otherId) } });
  res.json(
    connections.map((c) => ({
      connectedAt: c.connectedAt,
      peer: peers.find((p) => p.userId === otherId(c)),
    }))
  );
});

// ---------------- CHAT ----------------

// shape of a document in the "messages" collection
const messageSchema = new mongoose.Schema({
  from: String,
  to: String,
  text: String,
  fileUrl: String, // e.g. /uploads/1700000000-123.png
  fileName: String, // the name the sender's file had
  fileType: String, // e.g. image/png
  createdAt: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

// // multer saves an uploaded file into the "uploads" folder (max 5 MB)
// const upload = multer({
//   limits: { fileSize: 5 * 1024 * 1024 },
//   storage: multer.diskStorage({
//     destination: uploadsDir,
//     filename: (req, file, cb) => {
//       const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
//       cb(null, unique + path.extname(file.originalname));
//     },
//   }),
// });

// // SEND MESSAGE: text, a file, or both (only between connected students)
// app.post("/api/messages", (req, res) => {
//   upload.single("file")(req, res, async (err) => {
//     if (err) {
//       const tooBig = err.code === "LIMIT_FILE_SIZE";
//       return res.status(400).json({ error: tooBig ? "File is too big (max 5 MB)." : "Upload failed." });
//     }
//     const { from, to } = req.body;
//     const text = (req.body.text || "").trim();
//     if (!from || !to || (!text && !req.file)) {
//       return res.status(400).json({ error: "Write a message or attach a file." });
//     }
//     if (!(await areConnected(from, to))) {
//       return res.status(403).json({ error: "You can chat only after the request is accepted." });
//     }
//     const message = await Message.create({
//       from,
//       to,
//       text,
//       fileUrl: req.file ? "/uploads/" + req.file.filename : undefined,
//       // multer reads file names as latin1, this puts non-English names back right
//       fileName: req.file ? Buffer.from(req.file.originalname, "latin1").toString("utf8") : undefined,
//       fileType: req.file ? req.file.mimetype : undefined,
//     });
//     res.json(message);
//   });
// });

// multer keeps the uploaded file in memory (max 5 MB), then we save it into MongoDB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// shape of a document in the "files" collection (the file itself is stored here)
const fileSchema = new mongoose.Schema({
  name: String, // the name the sender's file had
  type: String, // e.g. image/png
  data: Buffer, // the file's actual bytes
});
const StoredFile = mongoose.model("StoredFile", fileSchema, "files");

// SEND MESSAGE: text, a file, or both (only between connected students)
app.post("/api/messages", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      const tooBig = err.code === "LIMIT_FILE_SIZE";
      return res.status(400).json({ error: tooBig ? "File is too big (max 5 MB)." : "Upload failed." });
    }
    const { from, to } = req.body;
    const text = (req.body.text || "").trim();
    if (!from || !to || (!text && !req.file)) {
      return res.status(400).json({ error: "Write a message or attach a file." });
    }
    if (!(await areConnected(from, to))) {
      return res.status(403).json({ error: "You can chat only after the request is accepted." });
    }

    // save the file into MongoDB, and remember its id inside the message
    let stored = null;
    if (req.file) {
      stored = await StoredFile.create({
        // multer reads file names as latin1, this puts non-English names back right
        name: Buffer.from(req.file.originalname, "latin1").toString("utf8"),
        type: req.file.mimetype,
        data: req.file.buffer,
      });
    }

    const message = await Message.create({
      from,
      to,
      text,
      fileUrl: stored ? "/api/files/" + stored._id : undefined,
      fileName: stored ? stored.name : undefined,
      fileType: stored ? stored.type : undefined,
    });
    res.json(message);
  });
});

// OPEN A FILE: send a saved file back to the browser
app.get("/api/files/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).send("File not found.");
  const file = await StoredFile.findById(req.params.id);
  if (!file) return res.status(404).send("File not found.");

  res.set("Content-Type", file.type);
  // pictures open in the browser; every other file type downloads instead
  if (!file.type.startsWith("image/")) {
    res.set("Content-Disposition", "attachment; filename*=UTF-8''" + encodeURIComponent(file.name));
  }
  res.send(file.data);
});

// LOAD CHAT: every message between two connected students, oldest first
app.get("/api/messages/:userId/:peerId", async (req, res) => {
  const { userId, peerId } = req.params;
  if (!(await areConnected(userId, peerId))) {
    return res.status(403).json({ error: "You are not connected with this student." });
  }
  const messages = await Message.find({
    $or: [
      { from: userId, to: peerId },
      { from: peerId, to: userId },
    ],
  }).sort({ createdAt: 1 });
  res.json(messages);
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
