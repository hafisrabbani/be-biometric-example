import express from 'express';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
const app = express();
app.use(morgan('dev'));
app.use(express.json());

// Secret keys untuk JWT
const ACCESS_TOKEN_SECRET = 'S3cr3tK3y';
const REFRESH_TOKEN_SECRET = 'R3f53rSh3rK3y';

// Dummy users database
const users = {
    'user1@example.com': {
        id: 1,
        email: 'user1@example.com',
        password: 'password123',
        name: 'John Doe'
    },
    'user2@example.com': {
        id: 2,
        email: 'user2@example.com',
        password: 'password456',
        name: 'Jane Smith'
    }
};

let refreshTokens = [];

// Middleware untuk verifikasi access token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Access token diperlukan' });
    }

    jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token tidak valid atau sudah expired' });
        }
        req.user = user;
        next();
    });
};
const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' }
    );
};

// Generate refresh token
const generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email },
        REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    );
};

// Route: Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email dan password diperlukan' });
    }

    const user = users[email];

    if (!user) {
        return res.status(401).json({ message: 'Email atau password salah' });
    }

    if (user.password !== password) {
        return res.status(401).json({ message: 'Email atau password salah' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    refreshTokens.push(refreshToken);

    res.json({
        message: 'Login berhasil',
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            name: user.name
        }
    });
});

// Route: Refresh Token
app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token diperlukan' });
    }

    if (!refreshTokens.includes(refreshToken)) {
        return res.status(403).json({ message: 'Refresh token tidak valid' });
    }

    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Refresh token tidak valid atau sudah expired' });
        }

        const accessToken = generateAccessToken({
            id: user.id,
            email: user.email
        });

        res.json({
            accessToken
        });
    });
});

// Route: Logout
app.post('/api/auth/logout', (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token diperlukan' });
    }

    // Hapus refresh token dari storage
    refreshTokens = refreshTokens.filter(token => token !== refreshToken);

    res.json({ message: 'Logout berhasil' });
});

// Route: Protected - Contoh endpoint yang memerlukan autentikasi
app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({
        message: 'Ini adalah data protected',
        user: req.user
    });
});

// Route: Get user profile
app.get('/api/auth/profile', authenticateToken, (req, res) => {
    const user = users[req.user.email];

    if (!user) {
        return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.json({
        id: user.id,
        email: user.email,
        name: user.name
    });
});

// Route: Health check
app.get('/', (req, res) => {
    res.json({ message: 'API is running' });
});

const PORT = 3050;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
    console.log('\nDummy users:');
    console.log('1. Email: user1@example.com, Password: password123');
    console.log('2. Email: user2@example.com, Password: password456');
});