const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
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

// Middleware para verificar si el usuario es administrador
const isAdmin = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Falta el ID de usuario en las cabeceras' });
  }

  try {
    const query = `
      SELECT r.name AS role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (result.rows[0].role_name !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de administrador' });
    }

    next();
  } catch (err) {
    console.error('Error en middleware isAdmin:', err);
    res.status(500).json({ error: 'Error interno del servidor al verificar permisos' });
  }
};

// Endpoint para obtener el resumen de bancos
app.get('/banks-summary', async (req, res) => {
  try {
    const query = `
            SELECT DISTINCT ON (b.bank_name)
              b.bank_name AS banco,
              ROUND(bs.balance, 2) AS saldo,
              bs.snapshot_date AS fecha_registro,
              b.currency AS moneda
          FROM 
              bank_snapshots bs
          JOIN 
              banks b ON bs.bank_id = b.id
          ORDER BY 
              b.bank_name, 
              bs.snapshot_date DESC;
        `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener datos de bancos" });
  }
});

// Endpoint para obtener el histórico de bancos para el gráfico
app.get('/banks-history', async (req, res) => {
  try {
    const query = `
      SELECT 
        b.bank_name AS banco,
        ROUND(bs.balance, 2) AS saldo,
        bs.snapshot_date AS fecha_registro,
        b.currency AS moneda
      FROM 
        bank_snapshots bs
      JOIN 
        banks b ON bs.bank_id = b.id
      ORDER BY 
        bs.snapshot_date ASC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener historial de bancos" });
  }

});

// Endpoint de LOGIN REAL
app.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscamos al usuario por su email y obtenemos su rol
    const query = `
      SELECT u.*, r.name AS role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      WHERE u.email = $1
    `;
    const result = await pool.query(query, [email]);
    const user = result.rows[0];

    // Comparamos el password_hash
    // NOTA: Para usuarios antiguos que no tienen bcrypt, esto fallará. Deberían resetearse las claves.
    // Asumimos que todos los nuevos usan bcrypt. Para compatibilidad, si arranca con $2a$ (bcrypt)
    // lo comprobamos, de lo contrario lo comparamos en texto plano (temporal hasta que todo se migre).
    let isMatch = false;
    if (user.password_hash.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } else {
      isMatch = user.password_hash === password;
    }

    if (user && isMatch) {
      res.json({
        success: true,
        message: 'Login correcto',
        user: { id: user.id, name: user.name, email: user.email, role: user.role_name }
      });
    } else {
      res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// --- ENDPOINTS ADMINISTRADOR (CRUD USUARIOS) ---

// Verificar contraseña de administrador (Capa de seguridad extra)
app.post('/admin/verify-password', isAdmin, async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, error: 'Falta la contraseña' });
  }

  try {
    const query = 'SELECT password_hash FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    let isMatch = false;

    // Soporte para bcrypt o texto plano antiguo
    if (user.password_hash.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } else {
      isMatch = user.password_hash === password;
    }

    if (isMatch) {
      res.json({ success: true, message: 'Contraseña verificada correctamente' });
    } else {
      res.status(401).json({ success: false, error: 'Contraseña incorrecta' });
    }
  } catch (err) {
    console.error('Error al verificar contraseña:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Obtener todos los usuarios
app.get('/admin/users', isAdmin, async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.name, u.email, r.name AS role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.id 
      ORDER BY u.name ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear un nuevo usuario
app.post('/admin/users', isAdmin, async (req, res) => {
  const { name, email, password, role_name } = req.body;
  if (!name || !email || !password || !role_name) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    // 1. Obtener el role_id del nombre del rol proporcionado
    const roleQuery = 'SELECT id FROM roles WHERE name = $1';
    const roleResult = await pool.query(roleQuery, [role_name]);
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ error: 'Rol no válido' });
    }
    const roleId = roleResult.rows[0].id;

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Insertar el usuario (usando gen_random_uuid() si el ID debe generarse en la base de datos)
    const insertQuery = `
      INSERT INTO users (id, role_id, name, email, password_hash) 
      VALUES (gen_random_uuid(), $1, $2, $3, $4) 
      RETURNING id, name, email
    `;
    const insertResult = await pool.query(insertQuery, [roleId, name, email, hashedPassword]);

    res.status(201).json({ message: 'Usuario creado exitosamente', user: insertResult.rows[0] });
  } catch (err) {
    console.error('Error al crear usuario:', err);
    if (err.code === '23505') { // Violación de unicidad en Postgres (ej. email duplicado)
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar un usuario
app.put('/admin/users/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role_name } = req.body;

  try {
    let updateQuery = 'UPDATE users SET ';
    const queryParams = [];
    let paramIndex = 1;

    if (name) {
      updateQuery += `name = $${paramIndex}, `;
      queryParams.push(name);
      paramIndex++;
    }
    if (email) {
      updateQuery += `email = $${paramIndex}, `;
      queryParams.push(email);
      paramIndex++;
    }
    if (password) {
      // Hashear la nueva contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateQuery += `password_hash = $${paramIndex}, `;
      queryParams.push(hashedPassword);
      paramIndex++;
    }
    if (role_name) {
      // Buscar el ID del nuevo rol
      const roleQuery = 'SELECT id FROM roles WHERE name = $1';
      const roleResult = await pool.query(roleQuery, [role_name]);
      if (roleResult.rows.length > 0) {
        updateQuery += `role_id = $${paramIndex}, `;
        queryParams.push(roleResult.rows[0].id);
        paramIndex++;
      } else {
        return res.status(400).json({ error: 'Rol no válido' });
      }
    }

    // Si no se envió nada para actualizar
    if (queryParams.length === 0) {
      return res.status(400).json({ error: 'No se enviaron datos para actualizar' });
    }

    // Quitar la última coma y espacio
    updateQuery = updateQuery.slice(0, -2);

    updateQuery += ` WHERE id = $${paramIndex} RETURNING id, name, email`;
    queryParams.push(id);

    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario actualizado exitosamente', user: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El email ya está registrado por otro usuario' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar un usuario
app.delete('/admin/users/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const requestUserId = req.headers['x-user-id']; // El ID del admin que hace la petición

  if (id === requestUserId) {
    return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  }

  try {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

//Endpoint para la automatización (lógica de los puntos de coincidencia)
app.post('/api/automatch', async (req, res) => {
  try {
    // 1. Buscar transacciones pendientes que sean cobros (> 0)
    const txResult = await pool.query("SELECT * FROM bank_transactions WHERE status = 'pending' AND amount > 0");
    const transactions = txResult.rows;

    // 2. Buscar facturas pendientes (ventas)
    const invResult = await pool.query(`
            SELECT i.*, e.name as client_name 
            FROM factusol_invoices i
            JOIN factusol_entities e ON i.entity_id = e.id
            WHERE i.pending_amount > 0 AND i.is_purchase = false
        `);
    const invoices = invResult.rows;

    let suggestionsCount = 0;

    // 3. Lógica de Puntos
    for (let tx of transactions) {
      let bestMatch = null;
      let highestConfidence = 0;
      const concept = (tx.concept || '').toLowerCase();

      for (let inv of invoices) {
        let confidence = 0;
        const clientName = (inv.client_name || '').toLowerCase();
        const invoiceNum = (inv.factusol_number || '').toLowerCase();

        // A. Mismo importe (Peso: 50%)
        if (Number(tx.amount) === Number(inv.pending_amount)) confidence += 50;
        // B. El concepto incluye el número de factura (Peso: 40%)
        if (concept.includes(invoiceNum.replace('fact-', ''))) confidence += 40;
        // C. El concepto incluye palabras del nombre del cliente (Peso: 15% por palabra)
        const nameWords = clientName.split(' ').filter(w => w.length > 3);
        for (let word of nameWords) {
          if (concept.includes(word)) confidence += 15;
        }

        if (confidence > 99) confidence = 99;

        // Si supera el 50%, es una sugerencia válida
        if (confidence >= 50 && confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = inv;
        }
      }

      // 4. Guardar sugerencia en la BD
      if (bestMatch) {
        await pool.query(`
                    INSERT INTO conciliations (id, transaction_id, invoice_id, amount_reconciled, match_confidence)
                    VALUES (gen_random_uuid(), $1, $2, $3, $4)
                `, [tx.id, bestMatch.id, tx.amount, highestConfidence]);

        await pool.query(`
                    UPDATE bank_transactions SET status = 'suggested' WHERE id = $1
                `, [tx.id]);

        suggestionsCount++;
      }
    }
    res.json({ success: true, suggestions_made: suggestionsCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en automatch' });
  }
});

//Endpoint para el frontend, dibujamos los cards de cobros pendientes
app.get('/api/transactions/pending', async (req, res) => {
  try {
    // Traemos cobros pendientes o sugeridos, y si están sugeridos, adjuntamos la info de la factura
    const query = `
            SELECT 
                t.id, t.amount, t.concept, t.value_date, t.status,
                c.match_confidence,
                i.id as invoice_id, i.factusol_number, i.pending_amount,
                e.name as client_name
            FROM bank_transactions t
            LEFT JOIN conciliations c ON t.id = c.transaction_id
            LEFT JOIN factusol_invoices i ON c.invoice_id = i.id
            LEFT JOIN factusol_entities e ON i.entity_id = e.id
            WHERE t.amount > 0 AND t.status IN ('pending', 'suggested')
            ORDER BY t.value_date DESC;
        `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo transacciones' });
  }
});

// Endpoint para obtener TODAS las facturas pendientes (para el buscador manual)
app.get('/api/invoices/pending', async (req, res) => {
  try {
    const query = `
      SELECT 
        i.id, i.factusol_number, i.pending_amount, i.total_amount, e.name as client
      FROM factusol_invoices i
      JOIN factusol_entities e ON i.entity_id = e.id
      WHERE i.pending_amount > 0 AND i.is_purchase = false;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo facturas pendientes' });
  }
});

// Endpoint para obtener TODAS las facturas de compra pendientes
app.get('/api/invoices/purchase-pending', async (req, res) => {
  try {
    const query = `
      SELECT 
        i.id, i.factusol_number, i.pending_amount, i.total_amount, e.name as client
      FROM factusol_invoices i
      JOIN factusol_entities e ON i.entity_id = e.id
      WHERE i.pending_amount > 0 AND i.is_purchase = true;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo facturas de compra pendientes' });
  }
});

// ENDPOINT PARA CONFIRMAR CONCILIACIÓN (El corazón del flujo)
app.post('/api/reconcile', async (req, res) => {
  const { transactionId, invoiceId, userId, amount, concept } = req.body;
  const client = await pool.connect(); // Usamos cliente para transacciones SQL

  try {
    await client.query('BEGIN'); // Iniciamos transacción

    // 1. Actualizar el estado de la transacción bancaria
    await client.query(
      "UPDATE bank_transactions SET status = 'conciliated' WHERE id = $1",
      [transactionId]
    );

    // 2. Restar el importe de la factura en Factusol (Local)
    const invRes = await client.query(
      "UPDATE factusol_invoices SET pending_amount = pending_amount - $1 WHERE id = $2 RETURNING entity_id",
      [amount, invoiceId]
    );
    const entityId = invRes.rows[0].entity_id;

    // 3. Crear el registro oficial de conciliación
    await client.query(
      `INSERT INTO conciliations (id, transaction_id, invoice_id, user_id, amount_reconciled, match_confidence) 
             VALUES (gen_random_uuid(), $1, $2, $3, $4, 100)`,
      [transactionId, invoiceId, userId, amount]
    );

    // 4. APRENDIZAJE: Guardar el patrón en learning_patterns
    // Limpiamos el concepto (quitamos números de factura) para guardar la "raíz"
    const patternValue = concept.replace(/[0-9]/g, '').trim().substring(0, 30);
    await client.query(
      `INSERT INTO learning_patterns (id, entity_id, pattern_type, pattern_value)
             VALUES (gen_random_uuid(), $1, 'concept_root', $2)
             ON CONFLICT DO NOTHING`,
      [entityId, patternValue]
    );

    await client.query('COMMIT'); // Guardamos todo
    res.json({ success: true, message: 'Conciliación completada y aprendizaje guardado' });

  } catch (err) {
    await client.query('ROLLBACK'); // Si algo falla, deshacemos todo
    console.error(err);
    res.status(500).json({ error: 'Fallo crítico en la conciliación' });
  } finally {
    client.release();
  }
});

// ENDPOINT PARA IGNORAR TRASACCIÓN
app.post('/api/transactions/ignore', async (req, res) => {
  const { id } = req.body;
  try {
    await pool.query("UPDATE bank_transactions SET status = 'ignored' WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al ignorar' });
  }
});


app.post('/api/reconcile-multi', async (req, res) => {
  const { transactionId, assignments, userId, totalAmount, concept } = req.body;
  // assignments es un array: [{ invoiceId: '...', amount: 100 }, ...]
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (let asig of assignments) {
      // 1. Restar el importe parcial a cada factura
      await client.query(
        "UPDATE factusol_invoices SET pending_amount = pending_amount - $1 WHERE id = $2",
        [asig.amount, asig.invoiceId]
      );

      // 2. Crear un registro en conciliaciones por cada factura vinculada
      await client.query(
        `INSERT INTO conciliations (id, transaction_id, invoice_id, user_id, amount_reconciled, match_confidence) 
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, 100)`,
        [transactionId, asig.invoiceId, userId, asig.amount]
      );
    }

    // 3. Marcar transacción como conciliada
    await client.query("UPDATE bank_transactions SET status = 'conciliated' WHERE id = $1", [transactionId]);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Endpoint para Clasificación Manual (Otros Ingresos)
// Endpoint para Clasificación Manual (Otros Ingresos) con Aprendizaje
app.post('/api/classify-manual', async (req, res) => {
  const { transactionId, category, notes, concept, userId } = req.body;

  try {
    // 1. Marcamos la transacción como conciliada y guardamos categoría/notas
    await pool.query(
      "UPDATE bank_transactions SET status = 'conciliated', category = $1, notes = $2 WHERE id = $3",
      [category, notes, transactionId]
    );

    // 2. APRENDIZAJE: Guardamos el patrón. 
    // El 'pattern_value' es el texto del banco y 'notes' guardará la CATEGORÍA para el futuro.
    const patternValue = concept.replace(/[0-9]/g, '').trim().substring(0, 30);

    await pool.query(
      `INSERT INTO learning_patterns (id, pattern_type, pattern_value, notes) 
             VALUES (gen_random_uuid(), 'manual_category', $1, $2) 
             ON CONFLICT DO NOTHING`,
      [patternValue, category]
    );

    res.json({ success: true, message: 'Ingreso clasificado correctamente' });
  } catch (err) {
    console.error(err);
    // Enviamos el error para que el frontend lo detecte y lo ponga en ROJO
    res.status(500).json({ error: 'Error en la base de datos: ' + err.message });
  }
});

// 1. Endpoints para Conciliación de Pagos (Igual que cobros pero con importes < 0)
app.get('/api/transactions/pending-payments', async (req, res) => {
  try {
    const query = `
            SELECT t.*, c.match_confidence, i.id as invoice_id, i.factusol_number, i.pending_amount, e.name as vendor_name
            FROM bank_transactions t
            LEFT JOIN conciliations c ON t.id = c.transaction_id
            LEFT JOIN factusol_invoices i ON c.invoice_id = i.id
            LEFT JOIN factusol_entities e ON i.entity_id = e.id
            WHERE t.amount < 0 AND t.status IN ('pending', 'suggested')
            ORDER BY t.value_date DESC;
        `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Previsión de Pagos (Para la tabla informativa agrupada por semanas)
app.get('/api/payments/forecast', async (req, res) => {
  const { maxDate, minDate } = req.query;
  try {
    let query = `
            SELECT 
                i.factusol_number as numero,
                i.created_at as fecha,
                e.name as proveedor,
                i.total_amount as importe_factura,
                i.due_date as fecha_vencimiento,
                i.pending_amount as falta_pagar,
                i.payment_method as forma_pago
            FROM factusol_invoices i
            JOIN factusol_entities e ON i.entity_id = e.id
            WHERE i.is_purchase = true
        `;
    let params = [];
    if (maxDate) {
      params.push(maxDate);
      query += ` AND i.due_date <= $${params.length}`;
    }
    if (minDate) {
      params.push(minDate);
      query += ` AND i.due_date >= $${params.length}`;
    }
    query += ` ORDER BY i.due_date ASC;`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend de Caixeta corriendo en el puerto ${PORT}`);
});