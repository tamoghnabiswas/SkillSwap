# SkillSwap

🔗 Live demo: https://skillswap-backend-pgdg.onrender.com

College students swap skills: learn what you want, teach what you know.

## Screenshots
![Registration page](https://github.com/user-attachments/assets/a7071146-4173-4147-b9a1-2c612792cb60)

![Home page](https://github.com/user-attachments/assets/b2ce0b7b-ff1f-44f3-84ee-b2dfe754edca)

![Connections page](https://github.com/user-attachments/assets/ebd570de-e0cd-473c-988f-c4054afd03b0)

![Peer Find page](https://github.com/user-attachments/assets/0c44a621-2487-4e07-af24-4d1cb43b9cee)

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
