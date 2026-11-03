# SkillSwap

College students swap skills: learn what you want, teach what you know.

## How it fits together
Browser (HTML/CSS/JS in this folder) -> Express server (backend/server.js) -> MongoDB Atlas (database "SkillSwap")

Collections: users (login), profiles (details + skills), connections (requests: pending/accepted), messages (chat)

## Run it
1. Terminal 1:  cd backend  then  npm start   (wait for "Connected to MongoDB")
2. Open the folder in VS Code, right-click index.html -> Open with Live Server
3. Sign up two students with opposite skills (A wants Guitar / teaches Python, B wants Python / teaches Guitar), then Find a peer -> Connect (sends a request)
4. Log in as the other student -> Your connections -> Pending requests -> Accept -> Chat (text, photos, documents up to 5 MB)

First time on a new laptop: cd backend, npm install, and create backend/.env with
MONGO_URI=<your Atlas connection string ending in /SkillSwap>

## API routes
POST /api/signup, POST /api/login
POST /api/profile, GET /api/profile/:userId
GET /api/find-peers/:userId
POST /api/connect (send request), GET /api/sent-requests/:userId
GET /api/requests/:userId, POST /api/requests/:id/accept, POST /api/requests/:id/decline
GET /api/connections/:userId (accepted only)
POST /api/messages (text + optional file), GET /api/messages/:userId/:peerId (chat refreshes every 3 s)
