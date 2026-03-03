require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// --- Налаштування Google Auth ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Шукаємо користувача або створюємо нового (Upsert)
      let user = await prisma.user.upsert({
        where: { googleId: profile.id },
        update: { name: profile.displayName, avatarUrl: profile.photos[0]?.value },
        create: {
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          avatarUrl: profile.photos[0]?.value,
          rang: 1000
        }
      });
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// --- Ендпоінти (Endpoints) ---

// 1. Початок авторизації
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2. Обробка відповіді від Google
app.get('/auth/google/callback', 
  passport.authenticate('google', { session: false }), 
  (req, res) => {
    // Створюємо токен
    const token = jwt.sign({ userId: req.user.id }, JWT_SECRET, { expiresIn: '7d' });

    // Відправляємо на фронтенд (параметр у посиланні)
    res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}`);
  }
);

// 3. Перевірка статусу (Healthcheck)
app.get('/api/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });

    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        res.json(user);
    } catch (e) {
        res.status(401).json({ error: "Invalid token" });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Сервер реєстрації запущено на порту ${PORT}`));