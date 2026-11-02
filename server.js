'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Conexão com o banco PostgreSQL do Supabase
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não foi definida no arquivo .env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Verifica erros inesperados na conexão
pool.on('error', (error) => {
  console.error('Erro inesperado na conexão com o Supabase:', error);
});

app.use(express.json({ limit: '1mb' }));

// Configuração do CORS
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'https://trace-rep.vercel.app',
  ...(process.env.CORS_ORIGIN || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`Origem bloqueada pelo CORS: ${origin}`);
    return callback(new Error('Origem não autorizada pelo CORS.'));
  }
}));

// Validações e funções auxiliares

const validStatus = value =>
  ['ok', 'warn', 'bad'].includes(value);

const validSeverity = value =>
  ['critical', 'warning', 'info'].includes(value);

const validMaintenanceType = value =>
  ['Preventiva', 'Corretiva', 'Instalação', 'Inspeção'].includes(value);

const requiredText = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw Object.assign(
      new Error(`O campo '${field}' é obrigatório.`),
      { status: 400 }
    );
  }

  return value.trim();
};

const nullableNumber = value => {
  if (value === null || value === '' || value === undefined) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw Object.assign(
      new Error('Valor numérico inválido.'),
      { status: 400 }
    );
  }

  return number;
};

const normalizeRepeater = body => {
  body = body || {};

  const id = requiredText(body.id, 'id').toUpperCase();
  const name = requiredText(body.name, 'name');
  const location = requiredText(body.location, 'location');

  const status = body.status || 'ok';

  if (!validStatus(status)) {
    throw Object.assign(
      new Error('Status inválido. Use ok, warn ou bad.'),
      { status: 400 }
    );
  }

  const temp = nullableNumber(body.temp);
  const voltage = nullableNumber(body.voltage);
  const signal = Number(body.signal ?? 0);

  if (
    !Number.isInteger(signal) ||
    signal < 0 ||
    signal > 100
  ) {
    throw Object.assign(
      new Error('Valores numéricos inválidos para temperatura, tensão ou sinal.'),
      { status: 400 }
    );
  }

  return {
    id,
    name,
    location,
    status,
    temp,
    voltage,
    signal,
    updated: String(body.updated || 'agora'),
    lat: nullableNumber(body.lat),
    lng: nullableNumber(body.lng)
  };
};
// Executa rotas assíncronas e encaminha erros ao Express
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);


// ==============================
// HEALTH CHECK
// ==============================

app.get('/api/health', asyncHandler(async (_req, res) => {
  await pool.query('SELECT 1');

  res.json({
    status: 'ok',
    service: 'TRACE-REP LITE API',
    database: 'Supabase PostgreSQL',
    timestamp: new Date().toISOString()
  });
}));


// ==============================
// REPETIDORAS
// ==============================

app.get('/api/repeaters', asyncHandler(async (req, res) => {
  const params = [];
  let sql = 'SELECT * FROM public.repeaters';

  if (req.query.status && req.query.status !== 'all') {
    if (!validStatus(req.query.status)) {
      return res.status(400).json({
        error: 'Filtro de status inválido.'
      });
    }

    sql += ' WHERE status = $1';
    params.push(req.query.status);
  }

  sql += ' ORDER BY id';

  const result = await pool.query(sql, params);
  res.json(result.rows);
}));


app.get('/api/repeaters/:id', asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM public.repeaters WHERE id = $1',
    [req.params.id.toUpperCase()]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: 'Repetidora não encontrada.'
    });
  }

  res.json(result.rows[0]);
}));


app.post('/api/repeaters', asyncHandler(async (req, res) => {
  const item = normalizeRepeater(req.body);

  const result = await pool.query(`
    INSERT INTO public.repeaters
      (id, name, location, status, temp, voltage, signal, updated, lat, lng)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    item.id,
    item.name,
    item.location,
    item.status,
    item.temp,
    item.voltage,
    item.signal,
    item.updated,
    item.lat,
    item.lng
  ]);

  res.status(201).json(result.rows[0]);
}));


app.put('/api/repeaters/:id', asyncHandler(async (req, res) => {
  const id = req.params.id.toUpperCase();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      'SELECT * FROM public.repeaters WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (currentResult.rowCount === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        error: 'Repetidora não encontrada.'
      });
    }

    const current = currentResult.rows[0];

    const item = normalizeRepeater({
      ...current,
      ...req.body,
      id: current.id
    });

    const result = await client.query(`
      UPDATE public.repeaters
      SET
        name = $1,
        location = $2,
        status = $3,
        temp = $4,
        voltage = $5,
        signal = $6,
        updated = $7,
        lat = $8,
        lng = $9
      WHERE id = $10
      RETURNING *
    `, [
      item.name,
      item.location,
      item.status,
      item.temp,
      item.voltage,
      item.signal,
      item.updated,
      item.lat,
      item.lng,
      item.id
    ]);

    await client.query(`
      INSERT INTO public.telemetry_history
        (repeater_id, temp, voltage, signal)
      VALUES ($1, $2, $3, $4)
    `, [
      item.id,
      item.temp,
      item.voltage,
      item.signal
    ]);

    await client.query('COMMIT');

    res.json(result.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;

  } finally {
    client.release();
  }
}));



app.delete('/api/repeaters/:id', asyncHandler(async (req, res) => {
  const result = await pool.query(
    'DELETE FROM public.repeaters WHERE id = $1',
    [req.params.id.toUpperCase()]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: 'Repetidora não encontrada.'
    });
  }

  res.status(204).end();
}));


// ==============================
// ALERTAS
// ==============================

app.get('/api/alerts', asyncHandler(async (req, res) => {
  let sql = 'SELECT * FROM public.alerts';
  const args = [];
  const where = [];

  if (req.query.ack === 'true') {
    where.push('ack = TRUE');
  }

  if (req.query.ack === 'false') {
    where.push('ack = FALSE');
  }

  if (req.query.severity && req.query.severity !== 'all') {
    if (!validSeverity(req.query.severity)) {
      return res.status(400).json({
        error: 'Filtro de severidade inválido.'
      });
    }

    args.push(req.query.severity);
    where.push(`severity = $${args.length}`);
  }

  if (where.length) {
    sql += ' WHERE ' + where.join(' AND ');
  }

  sql += ' ORDER BY id DESC';

  const result = await pool.query(sql, args);
  res.json(result.rows);
}));


app.post('/api/alerts', asyncHandler(async (req, res) => {
  const body = req.body || {};

  const title = requiredText(body.title, 'title');
  const description = String(body.description || '');
  const device = requiredText(body.device, 'device').toUpperCase();
  const severity = body.severity || 'info';

  if (!validSeverity(severity)) {
    return res.status(400).json({
      error: 'Severidade inválida. Use critical, warning ou info.'
    });
  }

  const repeater = await pool.query(
    'SELECT 1 FROM public.repeaters WHERE id = $1',
    [device]
  );

  if (repeater.rowCount === 0) {
    return res.status(400).json({
      error: 'A repetidora informada não existe.'
    });
  }

  const time = String(body.time || new Date().toISOString());

  const result = await pool.query(`
    INSERT INTO public.alerts
      (title, description, device, severity, time, ack)
    VALUES ($1, $2, $3, $4, $5, FALSE)
    RETURNING *
  `, [title, description, device, severity, time]);

  res.status(201).json(result.rows[0]);
}));


app.patch('/api/alerts/:id/acknowledge', asyncHandler(async (req, res) => {
  const alertId = Number(req.params.id);

  if (!Number.isInteger(alertId) || alertId <= 0) {
    return res.status(400).json({
      error: 'Identificador de alerta inválido.'
    });
  }

  const result = await pool.query(`
    UPDATE public.alerts
    SET ack = TRUE
    WHERE id = $1
    RETURNING *
  `, [alertId]);

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: 'Alerta não encontrado.'
    });
  }

  res.json(result.rows[0]);
}));


app.post('/api/alerts/acknowledge-all', asyncHandler(async (_req, res) => {
  const result = await pool.query(`
    UPDATE public.alerts
    SET ack = TRUE
    WHERE ack = FALSE
  `);

  res.json({
    updated: result.rowCount
  });
}));


// ==============================
// MANUTENÇÕES
// ==============================

app.get('/api/maintenances', asyncHandler(async (req, res) => {
  const params = [];

  let sql = `
    SELECT m.*
    FROM public.maintenances m
  `;

  if (req.query.device) {
    sql += ' WHERE m.device = $1';
    params.push(String(req.query.device).toUpperCase());
  }

  sql += ' ORDER BY m.date DESC, m.id DESC';

  const result = await pool.query(sql, params);
  res.json(result.rows);
}));


app.post('/api/maintenances', asyncHandler(async (req, res) => {
  const body = req.body || {};

  const device = requiredText(body.device, 'device').toUpperCase();
  const type = requiredText(body.type, 'type');
  const tech = requiredText(body.tech, 'tech');
  const date = requiredText(body.date, 'date');
  const note = requiredText(body.note, 'note');

  if (!validMaintenanceType(type)) {
    return res.status(400).json({
      error: 'Tipo de manutenção inválido.'
    });
  }

  const repeater = await pool.query(
    'SELECT 1 FROM public.repeaters WHERE id = $1',
    [device]
  );

  if (repeater.rowCount === 0) {
    return res.status(400).json({
      error: 'A repetidora informada não existe.'
    });
  }

  let id = body.id;

  if (!id) {
    const last = await pool.query(`
      SELECT id
      FROM public.maintenances
      WHERE id LIKE 'MAN-%'
      ORDER BY id DESC
      LIMIT 1
    `);

    const serial = last.rowCount
      ? Number(last.rows[0].id.slice(4)) + 1
      : 102;

    id = `MAN-${String(serial).padStart(4, '0')}`;
  } else {
    id = String(id);
  }

  const result = await pool.query(`
    INSERT INTO public.maintenances
      (id, device, type, tech, date, note)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [id, device, type, tech, date, note]);

  res.status(201).json(result.rows[0]);
}));


// ==============================
// HISTÓRICO DE TELEMETRIA
// ==============================

app.get('/api/telemetry', asyncHandler(async (req, res) => {
  const seconds = Number(req.query.seconds || 43200);

  if (
    !Number.isInteger(seconds) ||
    seconds < 1 ||
    seconds > 86400
  ) {
    return res.status(400).json({
      error: 'Período inválido. Informe entre 1 e 86400 segundos.'
    });
  }

  const result = await pool.query(`
    SELECT
      id,
      repeater_id,
      temp,
      voltage,
      signal,
      recorded_at
    FROM public.telemetry_history
    WHERE recorded_at >= NOW() - ($1 * INTERVAL '1 second')
    ORDER BY recorded_at ASC
    LIMIT 50000
  `, [seconds]);

  res.json(result.rows);
}));

// ==============================
// RESUMO DO DASHBOARD
// ==============================

app.get('/api/dashboard/summary', asyncHandler(async (_req, res) => {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM public.repeaters) AS total,
      (SELECT COUNT(*) FROM public.repeaters WHERE status = 'ok') AS normal,
      (SELECT COUNT(*) FROM public.repeaters WHERE status = 'warn') AS attention,
      (SELECT COUNT(*) FROM public.repeaters WHERE status = 'bad') AS offline,
      (SELECT COUNT(*) FROM public.alerts) AS alerts_total,
      (SELECT COUNT(*) FROM public.alerts WHERE ack = FALSE) AS alerts_active,
      (SELECT COUNT(*) FROM public.maintenances) AS maintenance_total
  `);

  const row = result.rows[0];

  const total = Number(row.total);
  const normal = Number(row.normal);
  const attention = Number(row.attention);
  const offline = Number(row.offline);
  const alertsActive = Number(row.alerts_active);
  const alertsTotal = Number(row.alerts_total);
  const maintenanceCount = Number(row.maintenance_total);

  res.json({
    repeaters: {
      total,
      normal,
      attention,
      offline,
      communicating: total - offline
    },
    alerts: {
      total: alertsTotal,
      active: alertsActive
    },
    maintenances: {
      total: maintenanceCount
    },
    illustrativeAvailability: total
      ? Math.round(((total - offline) / total) * 100)
      : 0
  });
}));


// ==============================
// INTERFACE WEB
// ==============================

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/client.js', (_req, res) => {
  res.sendFile(path.join(__dirname, 'client.js'));
});

app.get('/styles.css', (_req, res) => {
  res.sendFile(path.join(__dirname, 'styles.css'));
});


// ==============================
// TRATAMENTO DE ERROS
// ==============================

app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada.',
    path: req.path
  });
});

app.use((err, _req, res, _next) => {
  // PostgreSQL: registro duplicado
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Já existe um registro com esse identificador.'
    });
  }

  // PostgreSQL: referência a uma repetidora inexistente
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'A repetidora informada não existe ou está vinculada a registros.'
    });
  }

  if (err.status) {
    return res.status(err.status).json({
      error: err.message
    });
  }

  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      error: err.message
    });
  }

  console.error(err);

  res.status(500).json({
    error: 'Erro interno da API.'
  });
});


// ==============================
// INICIALIZAÇÃO E ENCERRAMENTO
// ==============================

// Na Vercel, a aplicação é exportada.
// Localmente, o servidor é iniciado normalmente.

let server;

if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`TRACE-REP LITE API disponível em http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

async function shutdown() {
  console.log('Encerrando TRACE-REP LITE API...');

  if (server) {
    await new Promise(resolve => server.close(resolve));
  }

  await pool.end();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;