const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client'); // Підключаємо Prisma

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json()); // Щоб приймати JSON у POST запитах

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// 1. Реєстрація нового гравця
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const newUser = await prisma.user.create({
      data: { name, email, password, rang: 1000 }
    });
    res.json({ success: true, user: newUser });
  } catch (error) {
    res.status(400).json({ success: false, error: "Email вже зайнятий або дані невірні" });
  }
});

// 2. Логіка Socket.io для матчмейкінгу
let waitingPlayers = [];

io.on('connection', (socket) => {
  console.log('Гравець підключився:', socket.id);

  socket.on('join_queue', (userData) => {
    // Додаємо в чергу
    waitingPlayers.push({ id: socket.id, rang: userData.rang, name: userData.name });
    
    if (waitingPlayers.length >= 2) {
      const p1 = waitingPlayers.shift();
      const p2 = waitingPlayers.shift();
      
      const roomId = `room_${p1.id}_${p2.id}`;
      io.to(p1.id).emit('match_found', { roomId, opponent: p2.name, side: 'X' });
      io.to(p2.id).emit('match_found', { roomId, opponent: p1.name, side: 'O' });
    }
  });

  socket.on('disconnect', () => {
    waitingPlayers = waitingPlayers.filter(p => p.id !== socket.id);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});