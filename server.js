const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Створюємо сервер
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Потім замінимо на URL твого Vercel
    methods: ["GET", "POST"]
  }
});

// Базовий маршрут для Koyeb Health Check
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Логіка Socket.io (майбутній матчмейкінг)
io.on('connection', (socket) => {
  console.log('Гравець підключився:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Гравець відключився');
  });
});

// Використовуємо ПОРТ 8000, як ми вказали в Koyeb
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});