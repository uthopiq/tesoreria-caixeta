const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.use(helmet()); // Seguridad de cabeceras HTTP
app.use(cors()); // Permite que tu frontend hable con este backend
app.use(express.json());

// Conexión a la base de datos de producción en Dokploy
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Prueba de conexión rápida
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'Base de datos conectada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Fallo al conectar con Postgres', details: err.message });
  }
});

// Configuración del Rate Limiter para el Login
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // Límite de 5 peticiones por IP en la ventana de tiempo
  message: { success: false, error: 'Demasiados intentos de inicio de sesión. Por favor, inténtalo de nuevo después de 15 minutos.' },
  standardHeaders: true, // Retorna los headers de RateLimit en la respuesta
  legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
});

// Endpoint de LOGIN REAL
app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscamos al usuario por su email
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    const user = result.rows[0];

    // Comparamos el password_hash (que es 'admin123' en nuestra prueba)
    if (user && user.password_hash === password) {
      res.json({
        success: true,
        message: 'Login correcto',
        user: { id: user.id, name: user.name, email: user.email }
      });
    } else {
      res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend de Caixeta corriendo en el puerto ${PORT}`);
});