// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");
// const cors = require("cors");
// const path = require("path");

// const app = express();
// app.use(express.json());
// app.use(cors());

// // serve the website files (the folder above backend/) from this same server
// app.use("/backend", (req, res) => res.status(404).end()); // never expose server code or .env
// app.use(express.static(path.join(__dirname, "..")));

// // connect to MongoDB Atlas
// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => console.log("Connected to MongoDB"))
//   .catch((err) => console.log("Connection failed:", err.message));

// // shape of a document in the "users" collection
// const userSchema = new mongoose.Schema({
//   name: String,
//   email: { type: String, unique: true },
//   passwordHash: String,
// });
// const User = mongoose.model("User", userSchema);

// // SIGNUP: save a new student
// app.post("/api/signup", async (req, res) => {
//   const { name, email, password } = req.body;
//   if (!name || !email || !password || password.length < 6) {
//     return res.status(400).json({ error: "Fill all fields (password: 6+ characters)." });
//   }
//   const existing = await User.findOne({ email: email.toLowerCase() });
//   if (existing) {
//     return res.status(400).json({ error: "That email already has an account." });
//   }
//   const passwordHash = await bcrypt.hash(password, 10);
//   const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
//   res.json({ id: user._id, name: user.name, email: user.email });
// });

// // LOGIN: check email and password
// app.post("/api/login", async (req, res) => {
//   const { email, password } = req.body;
//   const user = await User.findOne({ email: (email || "").toLowerCase() });
//   if (!user) return res.status(400).json({ error: "Wrong email or password." });
//   const ok = await bcrypt.compare(password, user.passwordHash);
//   if (!ok) return res.status(400).json({ error: "Wrong email or password." });
//   res.json({ id: user._id, name: user.name, email: user.email });
// });
// // shape of a document in the "profiles" collection
// const profileSchema = new mongoose.Schema({
//   userId: { type: String, unique: true },
//   name: String,
//   semester: String,
//   branch: String,
//   learn: [String],
//   teach: [{ name: String, level: String }],
// });
// const Profile = mongoose.model("Profile", profileSchema);

// // SAVE PROFILE: create it, or update it if it already exists
// app.post("/api/profile", async (req, res) => {
//   const { userId, name, semester, branch, learn, teach } = req.body;
//   if (!userId) return res.status(400).json({ error: "userId is required." });
//   const profile = await Profile.findOneAndUpdate(
//     { userId },
//     { name, semester, branch, learn, teach },
//     { upsert: true, returnDocument: "after" }
//   );
//   res.json(profile);
// });

// // LOAD PROFILE: get one student's details
// app.get("/api/profile/:userId", async (req, res) => {
//   const profile = await Profile.findOne({ userId: req.params.userId });
//   if (!profile) return res.status(404).json({ error: "No profile yet." });
//   res.json(profile);
// });

// // helper: makes a skill name safe to use inside a search pattern
// function escapeRegex(text) {
//   return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// }

// // FIND PEERS: students who can teach what I want to learn
// app.get("/api/find-peers/:userId", async (req, res) => {
//   const me = await Profile.findOne({ userId: req.params.userId });
//   if (!me) return res.status(404).json({ error: "Save your profile first." });

//   // one pattern per skill I want, ignoring capital letters ("guitar" matches "Guitar")
//   const patterns = me.learn.map((s) => new RegExp("^" + escapeRegex(s.trim()) + "$", "i"));

//   const peers = await Profile.find({
//     userId: { $ne: me.userId },      // not me
//     "teach.name": { $in: patterns }, // teaches at least one skill I want
//   });
//   res.json(peers);
// });

// // shape of a document in the "connections" collection
// const connectionSchema = new mongoose.Schema({
//   userId: String,
//   peerId: String,
//   connectedAt: { type: Date, default: Date.now },
// });
// const Connection = mongoose.model("Connection", connectionSchema);

// // CONNECT: save a match
// app.post("/api/connect", async (req, res) => {
//   const { userId, peerId } = req.body;
//   if (!userId || !peerId) return res.status(400).json({ error: "userId and peerId are required." });
//   const existing = await Connection.findOne({ userId, peerId });
//   if (existing) return res.json(existing);
//   const connection = await Connection.create({ userId, peerId });
//   res.json(connection);
// });

// // MY CONNECTIONS: list past matches, with each peer's details
// app.get("/api/connections/:userId", async (req, res) => {
//   const connections = await Connection.find({ userId: req.params.userId }).sort({ connectedAt: -1 });
//   const peerIds = connections.map((c) => c.peerId);
//   const peers = await Profile.find({ userId: { $in: peerIds } });
//   res.json(
//     connections.map((c) => ({
//       connectedAt: c.connectedAt,
//       peer: peers.find((p) => p.userId === c.peerId),
//     }))
//   );
// });

// // shape of a document in the "messages" collection
// const messageSchema = new mongoose.Schema({
//   senderId: String,
//   receiverId: String,
//   text: String,
//   sentAt: { type: Date, default: Date.now },
// });
// const Message = mongoose.model("Message", messageSchema);

// // SEND MESSAGE
// app.post("/api/messages", async (req, res) => {
//   const { senderId, receiverId, text } = req.body;
//   if (!senderId || !receiverId || !text || !text.trim()) {
//     return res.status(400).json({ error: "senderId, receiverId and text are required." });
//   }
//   const message = await Message.create({ senderId, receiverId, text: text.trim() });
//   res.json(message);
// });

// // LOAD CHAT: all messages between me and one peer, oldest first
// // called like /api/messages/<peerId>?userId=<myId>
// app.get("/api/messages/:peerId", async (req, res) => {
//   const { userId } = req.query;
//   const { peerId } = req.params;
//   if (!userId) return res.status(400).json({ error: "userId is required." });
//   const messages = await Message.find({
//     $or: [
//       { senderId: userId, receiverId: peerId },
//       { senderId: peerId, receiverId: userId },
//     ],
//   }).sort({ sentAt: 1 });
//   res.json(messages);
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log("Server running on port " + PORT));










require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "10mb" })); // room for base64 attachments (5 MB file ~ 6.7 MB text)
app.use(cors());

// serve the website files (the folder above backend/) from this same server
app.use("/backend", (req, res) => res.status(404).end()); // never expose server code or .env
app.use(express.static(path.join(__dirname, "..")));

// connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("Connection failed:", err.message));

// wraps every route so a crash returns a clean 500 instead of hanging the request
const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Server error. Try again." });
  });

// ---------------------------------------------------------------- USERS
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    passwordHash: String,
  })
);

// SIGNUP: save a new student
app.post(
  "/api/signup",
  wrap(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({ error: "Fill all fields (password: 6+ characters)." });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: "That email already has an account." });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
    res.json({ id: user._id, name: user.name, email: user.email });
  })
);

// LOGIN: check email and password
app.post(
  "/api/login",
  wrap(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user) return res.status(400).json({ error: "Wrong email or password." });
    const ok = await bcrypt.compare(password || "", user.passwordHash);
    if (!ok) return res.status(400).json({ error: "Wrong email or password." });
    res.json({ id: user._id, name: user.name, email: user.email });
  })
);

// ------------------------------------------------------------- PROFILES
const Profile = mongoose.model(
  "Profile",
  new mongoose.Schema({
    userId: { type: String, unique: true },
    name: String,
    semester: String,
    branch: String,
    learn: [String],
    teach: [{ name: String, level: String }],
  })
);

// SAVE PROFILE: create it, or update it if it already exists
app.post(
  "/api/profile",
  wrap(async (req, res) => {
    const { userId, name, semester, branch, learn, teach } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required." });
    const profile = await Profile.findOneAndUpdate(
      { userId },
      { name, semester, branch, learn, teach },
      { upsert: true, returnDocument: "after" }
    );
    res.json(profile);
  })
);

// LOAD PROFILE: get one student's details
app.get(
  "/api/profile/:userId",
  wrap(async (req, res) => {
    const profile = await Profile.findOne({ userId: req.params.userId });
    if (!profile) return res.status(404).json({ error: "No profile yet." });
    res.json(profile);
  })
);

// helper: makes a skill name safe to use inside a search pattern
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// FIND PEERS: students who can teach what I want to learn
app.get(
  "/api/find-peers/:userId",
  wrap(async (req, res) => {
    const me = await Profile.findOne({ userId: req.params.userId });
    if (!me) return res.status(404).json({ error: "Save your profile first." });
    const patterns = me.learn.map((s) => new RegExp("^" + escapeRegex(s.trim()) + "$", "i"));
    const peers = await Profile.find({
      userId: { $ne: me.userId },
      "teach.name": { $in: patterns },
    });
    res.json(peers);
  })
);

// ---------------------------------------------------------- CONNECTIONS
// userId = person who sent the request, peerId = person who must accept it
const Connection = mongoose.model(
  "Connection",
  new mongoose.Schema({
    userId: String,
    peerId: String,
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
    connectedAt: { type: Date, default: Date.now }, // when it was sent, then when accepted
  })
);

// helper: are these two students connected (request accepted)?
async function areConnected(a, b) {
  const c = await Connection.findOne({
    status: "accepted",
    $or: [
      { userId: a, peerId: b },
      { userId: b, peerId: a },
    ],
  });
  return !!c;
}

// CONNECT: send a request (stays "pending" until the other student accepts)
app.post(
  "/api/connect",
  wrap(async (req, res) => {
    const { userId, peerId } = req.body;
    if (!userId || !peerId) return res.status(400).json({ error: "userId and peerId are required." });
    if (userId === peerId) return res.status(400).json({ error: "You cannot connect with yourself." });

    // already something between these two?
    const existing = await Connection.findOne({
      $or: [
        { userId, peerId },
        { userId: peerId, peerId: userId },
      ],
    });
    if (existing) {
      if (existing.status === "declined" && existing.userId === userId) {
        // I was declined earlier: let me ask again
        existing.status = "pending";
        existing.connectedAt = new Date();
        await existing.save();
      } else if (existing.status === "pending" && existing.userId === peerId) {
        return res.status(400).json({ error: "They already sent you a request. Accept it in Connections." });
      }
      return res.json(existing);
    }
    const connection = await Connection.create({ userId, peerId, status: "pending" });
    res.json(connection);
  })
);

// SENT REQUESTS: requests I sent (with their status), so Find a peer can show "Request sent"
app.get(
  "/api/sent-requests/:userId",
  wrap(async (req, res) => {
    const sent = await Connection.find({ userId: req.params.userId }).sort({ connectedAt: -1 });
    const profiles = await Profile.find({ userId: { $in: sent.map((c) => c.peerId) } });
    res.json(
      sent.map((c) => ({
        _id: c._id,
        peerId: c.peerId,
        status: c.status,
        connectedAt: c.connectedAt,
        peer: profiles.find((p) => p.userId === c.peerId),
      }))
    );
  })
);

// REQUESTS: pending requests other students sent to me
app.get(
  "/api/requests/:userId",
  wrap(async (req, res) => {
    const incoming = await Connection.find({ peerId: req.params.userId, status: "pending" }).sort({
      connectedAt: -1,
    });
    const profiles = await Profile.find({ userId: { $in: incoming.map((c) => c.userId) } });
    res.json(
      incoming.map((c) => {
        const from = profiles.find((p) => p.userId === c.userId);
        return { _id: c._id, fromId: c.userId, connectedAt: c.connectedAt, from, peer: from };
      })
    );
  })
);

// ACCEPT a request (only the student it was sent to may accept)
app.post(
  "/api/requests/:id/accept",
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Bad request id." });
    const conn = await Connection.findById(req.params.id);
    if (!conn) return res.status(404).json({ error: "Request not found." });
    if (req.body.userId && req.body.userId !== conn.peerId) {
      return res.status(403).json({ error: "Only the person who received the request can accept it." });
    }
    conn.status = "accepted";
    conn.connectedAt = new Date();
    await conn.save();
    res.json(conn);
  })
);

// DECLINE a request
app.post(
  "/api/requests/:id/decline",
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Bad request id." });
    const conn = await Connection.findById(req.params.id);
    if (!conn) return res.status(404).json({ error: "Request not found." });
    if (req.body.userId && req.body.userId !== conn.peerId) {
      return res.status(403).json({ error: "Only the person who received the request can decline it." });
    }
    conn.status = "declined";
    await conn.save();
    res.json(conn);
  })
);

// MY CONNECTIONS: accepted only, with the other student's details
app.get(
  "/api/connections/:userId",
  wrap(async (req, res) => {
    const me = req.params.userId;
    const accepted = await Connection.find({
      status: "accepted",
      $or: [{ userId: me }, { peerId: me }],
    }).sort({ connectedAt: -1 });
    const otherIds = accepted.map((c) => (c.userId === me ? c.peerId : c.userId));
    const profiles = await Profile.find({ userId: { $in: otherIds } });
    res.json(
      accepted.map((c) => {
        const otherId = c.userId === me ? c.peerId : c.userId;
        return {
          _id: c._id,
          peerId: otherId,
          connectedAt: c.connectedAt,
          peer: profiles.find((p) => p.userId === otherId),
        };
      })
    );
  })
);

// ------------------------------------------------------------- MESSAGES
const MAX_FILE = 5 * 1024 * 1024; // 5 MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE } });

const Message = mongoose.model(
  "Message",
  new mongoose.Schema({
    senderId: String,
    receiverId: String,
    text: { type: String, default: "" },
    callRoom: String, // Jitsi room name when this message is a video call invite
    fileName: String,
    fileType: String,
    fileSize: Number,
    fileData: Buffer, // attachment stored in the database (Render's disk is wiped on restart)
    sentAt: { type: Date, default: Date.now },
  })
);

// what the browser receives for one message (never includes the raw file bytes)
function publicMessage(m) {
  const hasFile = !!m.fileName;
  return {
    _id: m._id,
    senderId: m.senderId,
    receiverId: m.receiverId,
    text: m.text,
    callRoom: m.callRoom || null,
    sentAt: m.sentAt,
    fileName: hasFile ? m.fileName : null,
    fileType: hasFile ? m.fileType : null,
    fileSize: hasFile ? m.fileSize : null,
    fileUrl: hasFile ? "/api/files/" + m._id : null,
  };
}

// SEND MESSAGE: text and/or one file (multipart form with a "file" field, or JSON with base64)
app.post("/api/messages", (req, res) => {
  upload.single("file")(req, res, (uploadErr) => {
    if (uploadErr) {
      const tooBig = uploadErr.code === "LIMIT_FILE_SIZE";
      return res.status(400).json({ error: tooBig ? "File is too large (max 5 MB)." : "Upload failed." });
    }
    wrap(async (req, res) => {
      const b = req.body || {};
      const senderId = b.senderId || b.from || b.userId;
      const receiverId = b.receiverId || b.to || b.peerId;
      const text = (b.text || b.message || b.content || "").toString().trim();

      let fileName, fileType, fileData;
      if (req.file) {
        fileName = req.file.originalname;
        fileType = req.file.mimetype;
        fileData = req.file.buffer;
      } else if (b.file && b.file.data) {
        // JSON style: { file: { name, type, data: "<base64 or data URL>" } }
        fileName = b.file.name || "attachment";
        fileType = b.file.type || "application/octet-stream";
        fileData = Buffer.from(String(b.file.data).replace(/^data:.*?;base64,/, ""), "base64");
      } else if (b.fileData) {
        fileName = b.fileName || "attachment";
        fileType = b.fileType || "application/octet-stream";
        fileData = Buffer.from(String(b.fileData).replace(/^data:.*?;base64,/, ""), "base64");
      }

      if (!senderId || !receiverId) {
        return res.status(400).json({ error: "senderId and receiverId are required." });
      }
      if (!text && !fileData) return res.status(400).json({ error: "Write a message or attach a file." });
      if (fileData && fileData.length > MAX_FILE) {
        return res.status(400).json({ error: "File is too large (max 5 MB)." });
      }
      if (!(await areConnected(senderId, receiverId))) {
        return res.status(403).json({ error: "You can only chat with accepted connections." });
      }

      const message = await Message.create({
        senderId,
        receiverId,
        text,
        fileName,
        fileType,
        fileSize: fileData ? fileData.length : undefined,
        fileData,
      });
      res.json(publicMessage(message));
    })(req, res);
  });
});

// LOAD CHAT: every message between me and one peer, oldest first
app.get(
  "/api/messages/:userId/:peerId",
  wrap(async (req, res) => {
    const { userId, peerId } = req.params;
    if (!(await areConnected(userId, peerId))) {
      return res.status(403).json({ error: "You can only chat with accepted connections." });
    }
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: peerId },
        { senderId: peerId, receiverId: userId },
      ],
    })
      .select("-fileData")
      .sort({ sentAt: 1 });
    res.json(messages.map(publicMessage));
  })
);

// ---------------------------------------------------------- VIDEO CALLS (Jitsi)
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || "meet.jit.si";

// START CALL: makes a private room and posts an invite into the chat
app.post(
  "/api/calls/start",
  wrap(async (req, res) => {
    const { userId, peerId } = req.body;
    if (!userId || !peerId) return res.status(400).json({ error: "userId and peerId are required." });
    if (!(await areConnected(userId, peerId))) {
      return res.status(403).json({ error: "You can only call accepted connections." });
    }
    const room = "SkillSwap-" + crypto.randomBytes(12).toString("hex");
    const message = await Message.create({
      senderId: userId,
      receiverId: peerId,
      text: "📹 Started a video call",
      callRoom: room,
    });
    res.json({ room, domain: JITSI_DOMAIN, message: publicMessage(message) });
  })
);

// JOIN CALL: only the two students in that chat can get the room
app.get(
  "/api/calls/:messageId/join",
  wrap(async (req, res) => {
    const { userId } = req.query;
    if (!mongoose.isValidObjectId(req.params.messageId)) return res.status(400).json({ error: "Bad call id." });
    const m = await Message.findById(req.params.messageId).select("-fileData");
    if (!m || !m.callRoom) return res.status(404).json({ error: "Call not found." });
    if (userId !== m.senderId && userId !== m.receiverId) {
      return res.status(403).json({ error: "This call is not for you." });
    }
    const user = await User.findById(userId);
    res.json({ room: m.callRoom, domain: JITSI_DOMAIN, displayName: user ? user.name : "Student" });
  })
);

// DOWNLOAD / VIEW an attachment
app.get(
  "/api/files/:messageId",
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.messageId)) return res.status(400).end();
    const m = await Message.findById(req.params.messageId);
    if (!m || !m.fileData) return res.status(404).json({ error: "File not found." });
    res.set("Content-Type", m.fileType || "application/octet-stream");
    res.set("Content-Disposition", 'inline; filename="' + encodeURIComponent(m.fileName || "file") + '"');
    res.send(m.fileData);
  })
);

// DELETE ACCOUNT: needs the password; removes the user and everything linked to them
app.delete(
  "/api/account/:userId",
  wrap(async (req, res) => {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: "Bad user id." });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Account not found." });
    const ok = await bcrypt.compare((req.body && req.body.password) || "", user.passwordHash);
    if (!ok) return res.status(403).json({ error: "Wrong password." });

    await Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] });
    await Connection.deleteMany({ $or: [{ userId }, { peerId: userId }] });
    await Profile.deleteOne({ userId });
    await User.findByIdAndDelete(userId);
    res.json({ deleted: true });
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));