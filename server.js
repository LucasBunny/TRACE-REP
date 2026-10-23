'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// USANDO O SQLITE NATIVO DO NODE.JS (Disponível a partir do Node 22+)
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

// Inicializa o banco SQLite nativo
const db = new DatabaseSync(path.join(dataDir, 'trace-rep-lite.sqlite'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

app.use(express.json({ limit: '1mb' }));
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000')
  .split(',').map(value => value.trim()).filter(Boolean);
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origem não autorizada pelo CORS.'));
} }));

// Criação das tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS repeaters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('ok','warn','bad')),
    temp REAL,
    voltage REAL,
    signal INTEGER NOT NULL DEFAULT 0 CHECK(signal BETWEEN 0 AND 100),
    updated TEXT NOT NULL DEFAULT 'agora',
    lat REAL,
    lng REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    device TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('critical','warning','info')),
    time TEXT NOT NULL DEFAULT (datetime('now')),
    ack INTEGER NOT NULL DEFAULT 0 CHECK(ack IN (0,1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(device) REFERENCES repeaters(id) ON UPDATE CASCADE ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS maintenances (
    id TEXT PRIMARY KEY,
    device TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('Preventiva','Corretiva','Instalação','Inspeção')),
    tech TEXT NOT NULL,
    date TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(device) REFERENCES repeaters(id) ON UPDATE CASCADE ON DELETE CASCADE
  );
`);

const count = table => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

if (count('repeaters') === 0) {
  const insert = db.prepare(`INSERT INTO repeaters (id,name,location,status,temp,voltage,signal,updated,lat,lng)
    VALUES (@id,@name,@location,@status,@temp,@voltage,@signal,@updated,@lat,@lng)`);
  const seed = [
    {id:'REP-001',name:'Torre A · Centro',location:'São Paulo, SP',status:'ok',temp:42.6,voltage:12.2,signal:78,updated:'há 8 s',lat:-23.5505,lng:-46.6333},
    {id:'REP-002',name:'Torre B · Norte',location:'Guarulhos, SP',status:'warn',temp:62.4,voltage:11.9,signal:41,updated:'há 12 s',lat:-23.4543,lng:-46.5337},
    {id:'REP-003',name:'Laboratório',location:'Campus · Bloco 3',status:'ok',temp:35.8,voltage:12.4,signal:92,updated:'há 5 s',lat:-23.5614,lng:-46.7302},
    {id:'REP-004',name:'Torre C · Sul',location:'Santo André, SP',status:'bad',temp:null,voltage:null,signal:0,updated:'há 18 min',lat:-23.6639,lng:-46.5383},
    {id:'REP-005',name:'Torre D · Oeste',location:'Osasco, SP',status:'ok',temp:39.1,voltage:12.1,signal:84,updated:'há 16 s',lat:-23.5325,lng:-46.7917}
  ];
  db.exec('BEGIN TRANSACTION;');
  try {
    for (const row of seed) insert.run(row);
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

if (count('alerts') === 0) {
  const insert = db.prepare('INSERT INTO alerts (title,description,device,severity,time,ack) VALUES (@title,@description,@device,@severity,@time,@ack)');
  const seed = [
    {title:'Temperatura acima do limite',description:'Leitura de 62,4 °C · limite de demonstração: 60 °C',device:'REP-002',severity:'critical',time:'demonstração · recente',ack:0},
    {title:'Equipamento sem comunicação',description:'Sem leitura recebida há mais de 15 minutos',device:'REP-004',severity:'critical',time:'demonstração · recente',ack:0},
    {title:'Tensão abaixo do ideal',description:'Última leitura válida: 11,9 V',device:'REP-002',severity:'warning',time:'demonstração',ack:1},
    {title:'Inspeção registrada',description:'Manutenção preventiva concluída',device:'REP-003',severity:'info',time:'demonstração',ack:1}
  ];
  db.exec('BEGIN TRANSACTION;');
  try {
    for (const row of seed) insert.run(row);
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

if (count('maintenances') === 0) {
  const insert = db.prepare('INSERT INTO maintenances (id,device,type,tech,date,note) VALUES (@id,@device,@type,@tech,@date,@note)');
  const today = new Date().toISOString().slice(0,10);
  const seed = [
    {id:'MAN-0104',device:'REP-003',type:'Preventiva',tech:'Marina Costa',date:today,note:'Inspeção visual do gabinete e conferência dos conectores.'},
    {id:'MAN-0103',device:'REP-001',type:'Inspeção',tech:'Lucas Almeida',date:today,note:'Verificação de temperatura e alimentação.'},
    {id:'MAN-0102',device:'REP-002',type:'Corretiva',tech:'Rafael Souza',date:today,note:'Verificar elevação de temperatura no próximo ciclo.'}
  ];
  db.exec('BEGIN TRANSACTION;');
  try {
    for (const row of seed) insert.run(row);
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

const validStatus = value => ['ok','warn','bad'].includes(value);
const validSeverity = value => ['critical','warning','info'].includes(value);
const validMaintenanceType = value => ['Preventiva','Corretiva','Instalação','Inspeção'].includes(value);
const requiredText = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) throw Object.assign(new Error(`O campo '${field}' é obrigatório.`), { status: 400 });
  return value.trim();
};
const nullableNumber = value => value === null || value === '' || value === undefined ? null : Number(value);
const normalizeRepeater = body => {
  const id = requiredText(body.id, 'id').toUpperCase();
  const name = requiredText(body.name, 'name');
  const location = requiredText(body.location, 'location');
  const status = body.status || 'ok';
  if (!validStatus(status)) throw Object.assign(new Error('Status inválido. Use ok, warn ou bad.'), { status: 400 });
  const temp = nullableNumber(body.temp);
  const voltage = nullableNumber(body.voltage);
  const signal = Number(body.signal ?? 0);
  if ((temp !== null && !Number.isFinite(temp)) || (voltage !== null && !Number.isFinite(voltage)) || !Number.isInteger(signal) || signal < 0 || signal > 100) {
    throw Object.assign(new Error('Valores numéricos inválidos para temperatura, tensão ou sinal.'), { status: 400 });
  }
  return { id, name, location, status, temp, voltage, signal, updated: String(body.updated || 'agora'), lat: nullableNumber(body.lat), lng: nullableNumber(body.lng) };
};

app.get('/api/health', (_req, res) => res.json({status:'ok', service:'TRACE-REP LITE API', database:'SQLite (Native)', timestamp:new Date().toISOString()}));

app.get('/api/repeaters', (req, res) => {
  const params = [];
  let sql = 'SELECT * FROM repeaters';
  if (req.query.status && req.query.status !== 'all') {
    if (!validStatus(req.query.status)) return res.status(400).json({error:'Filtro de status inválido.'});
    sql += ' WHERE status = ?'; params.push(req.query.status);
  }
  sql += ' ORDER BY id';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/repeaters/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM repeaters WHERE id = ?').get(req.params.id.toUpperCase());
  if (!item) return res.status(404).json({error:'Repetidora não encontrada.'});
  res.json(item);
});

app.post('/api/repeaters', (req, res) => {
  const item = normalizeRepeater(req.body);
  db.prepare(`INSERT INTO repeaters (id,name,location,status,temp,voltage,signal,updated,lat,lng)
    VALUES (@id,@name,@location,@status,@temp,@voltage,@signal,@updated,@lat,@lng)`).run(item);
  res.status(201).json(db.prepare('SELECT * FROM repeaters WHERE id=?').get(item.id));
});

app.put('/api/repeaters/:id', (req, res) => {
  const current = db.prepare('SELECT * FROM repeaters WHERE id=?').get(req.params.id.toUpperCase());
  if (!current) return res.status(404).json({error:'Repetidora não encontrada.'});
  const item = normalizeRepeater({...current, ...req.body, id:current.id});
  db.prepare(`UPDATE repeaters SET name=@name,location=@location,status=@status,temp=@temp,voltage=@voltage,signal=@signal,updated=@updated,lat=@lat,lng=@lng WHERE id=@id`).run(item);
  res.json(db.prepare('SELECT * FROM repeaters WHERE id=?').get(item.id));
});

app.delete('/api/repeaters/:id', (req, res) => {
  const result = db.prepare('DELETE FROM repeaters WHERE id=?').run(req.params.id.toUpperCase());
  if (!result.changes) return res.status(404).json({error:'Repetidora não encontrada.'});
  res.status(204).end();
});

app.get('/api/alerts', (req, res) => {
  let sql = 'SELECT * FROM alerts'; const args = []; const where = [];
  if (req.query.ack === 'true') where.push('ack = 1');
  if (req.query.ack === 'false') where.push('ack = 0');
  if (req.query.severity && req.query.severity !== 'all') {
    if (!validSeverity(req.query.severity)) return res.status(400).json({error:'Filtro de severidade inválido.'});
    where.push('severity = ?'); args.push(req.query.severity);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY id DESC';
  res.json(db.prepare(sql).all(...args).map(row => ({...row, ack:Boolean(row.ack)})));
});

app.post('/api/alerts', (req, res) => {
  const title = requiredText(req.body.title, 'title');
  const description = String(req.body.description || '');
  const device = requiredText(req.body.device, 'device').toUpperCase();
  const severity = req.body.severity || 'info';
  if (!validSeverity(severity)) return res.status(400).json({error:'Severidade inválida. Use critical, warning ou info.'});
  if (!db.prepare('SELECT 1 FROM repeaters WHERE id=?').get(device)) return res.status(400).json({error:'A repetidora informada não existe.'});
  const time = String(req.body.time || new Date().toISOString());
  const result = db.prepare('INSERT INTO alerts (title,description,device,severity,time,ack) VALUES (?,?,?,?,?,0)').run(title,description,device,severity,time);
  res.status(201).json({...db.prepare('SELECT * FROM alerts WHERE id=?').get(Number(result.lastInsertRowid)),ack:false});
});

app.patch('/api/alerts/:id/acknowledge', (req, res) => {
  const alertId = Number(req.params.id);
  const result = db.prepare('UPDATE alerts SET ack=1 WHERE id=?').run(alertId);
  if (!result.changes) return res.status(404).json({error:'Alerta não encontrado.'});
  res.json({...db.prepare('SELECT * FROM alerts WHERE id=?').get(alertId),ack:true});
});

app.post('/api/alerts/acknowledge-all', (_req, res) => {
  const result = db.prepare('UPDATE alerts SET ack=1 WHERE ack=0').run();
  res.json({updated:result.changes});
});

app.get('/api/maintenances', (req, res) => {
  const rows = db.prepare(`SELECT m.* FROM maintenances m ${req.query.device ? 'WHERE m.device = ?' : ''} ORDER BY m.date DESC, m.id DESC`)
    .all(...(req.query.device ? [String(req.query.device).toUpperCase()] : []));
  res.json(rows);
});

app.post('/api/maintenances', (req, res) => {
  const device = requiredText(req.body.device, 'device').toUpperCase();
  const type = requiredText(req.body.type, 'type');
  const tech = requiredText(req.body.tech, 'tech');
  const date = requiredText(req.body.date, 'date');
  const note = requiredText(req.body.note, 'note');
  if (!validMaintenanceType(type)) return res.status(400).json({error:'Tipo de manutenção inválido.'});
  if (!db.prepare('SELECT 1 FROM repeaters WHERE id=?').get(device)) return res.status(400).json({error:'A repetidora informada não existe.'});
  const last = db.prepare("SELECT id FROM maintenances WHERE id LIKE 'MAN-%' ORDER BY id DESC LIMIT 1").get();
  const serial = last ? Number(last.id.slice(4)) + 1 : 102;
  const id = String(req.body.id || `MAN-${String(serial).padStart(4,'0')}`);
  db.prepare('INSERT INTO maintenances (id,device,type,tech,date,note) VALUES (?,?,?,?,?,?)').run(id,device,type,tech,date,note);
  res.status(201).json(db.prepare('SELECT * FROM maintenances WHERE id=?').get(id));
});

app.get('/api/dashboard/summary', (_req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS n FROM repeaters').get().n;
  const normal = db.prepare("SELECT COUNT(*) AS n FROM repeaters WHERE status='ok'").get().n;
  const attention = db.prepare("SELECT COUNT(*) AS n FROM repeaters WHERE status='warn'").get().n;
  const offline = db.prepare("SELECT COUNT(*) AS n FROM repeaters WHERE status='bad'").get().n;
  const alertsActive = db.prepare('SELECT COUNT(*) AS n FROM alerts WHERE ack=0').get().n;
  const maintenanceCount = db.prepare('SELECT COUNT(*) AS n FROM maintenances').get().n;
  res.json({repeaters:{total,normal,attention,offline,communicating:total-offline},alerts:{total:count('alerts'),active:alertsActive},maintenances:{total:maintenanceCount},illustrativeAvailability:total ? Math.round((total-offline)/total*100) : 0});
});

app.use((req, res) => res.status(404).json({error:'Rota não encontrada.',path:req.path}));
app.use((err, _req, res, _next) => {
  if (err.message && (err.message.includes('UNIQUE constraint failed') || err.message.includes('PRIMARY KEY constraint failed'))) {
    return res.status(409).json({error:'Já existe um registro com esse identificador.'});
  }
  if (err.status) return res.status(err.status).json({error:err.message});
  if (err.message && err.message.includes('CORS')) return res.status(403).json({error:err.message});
  console.error(err);
  res.status(500).json({error:'Erro interno da API.'});
});

const server = app.listen(PORT, () => {
  console.log(`TRACE-REP LITE API disponível em http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

function shutdown() {
  server.close(() => { db.close(); process.exit(0); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);