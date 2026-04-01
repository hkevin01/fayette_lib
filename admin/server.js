/**
 * FCPL Staff Admin Backend
 * Node.js / Express — manages events.json and content.json.
 *
 * Security hardening (OWASP Top 10):
 *  - A02 Cryptographic Failures: bcrypt(12) password storage; JWT HS256 8-hr expiry
 *  - A03 Injection: all inputs sanitised/truncated; no eval/exec
 *  - A05 Security Misconfiguration: helmet sets 12 security headers
 *  - A06 Vulnerable Components: pinned deps; express-rate-limit for brute-force protection
 *  - A07 Authentication Failures: 10 login attempts per 15 min per IP
 *  - A08 Software Integrity: atomic JSON writes (write→rename)
 *  - File uploads: image MIME-type checked, 5 MB cap, random filename
 */
'use strict';

const express     = require('express');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const multer      = require('multer');
const path        = require('path');
const fs          = require('fs');
const crypto      = require('crypto');

const app = express();

/* ================================================================
   ENVIRONMENT
   ================================================================ */
const PORT       = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR   = process.env.DATA_DIR   || '/data';
const IMAGES_DIR = process.env.IMAGES_DIR || '/images/events';

// JWT secret — must be set externally; crash immediately if missing in production
let JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[fatal] JWT_SECRET must be at least 32 characters in production. Exiting.');
    process.exit(1);
  }
  // Dev fallback — generate ephemeral secret (sessions invalidated on restart)
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('[security] JWT_SECRET not set — using ephemeral secret. Set JWT_SECRET in .env for persistence.');
}

// Password: prefer bcrypt hash (STAFF_PASSWORD_HASH) over plaintext (STAFF_PASSWORD)
const STAFF_HASH  = process.env.STAFF_PASSWORD_HASH || null;
const STAFF_PLAIN = process.env.STAFF_PASSWORD      || '';

if (!STAFF_HASH && !STAFF_PLAIN) {
  console.error('[fatal] Neither STAFF_PASSWORD_HASH nor STAFF_PASSWORD is set. Exiting.');
  process.exit(1);
}
if (STAFF_PLAIN && !STAFF_HASH) {
  console.warn('[security] Using plaintext STAFF_PASSWORD. Migrate to STAFF_PASSWORD_HASH (bcrypt) for production.');
}

/* ================================================================
   TRUST PROXY — needed for rate-limiter to see real client IP behind nginx
   ================================================================ */
app.set('trust proxy', 1);

/* ================================================================
   SECURITY HEADERS via Helmet
   ================================================================ */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:      ["'self'"],
      scriptSrc:       ["'self'", "'unsafe-inline'"],   // admin SPA uses inline scripts
      scriptSrcAttr:   ["'unsafe-inline'"],             // allow inline onclick handlers (admin SPA pattern)
      styleSrc:        ["'self'", "'unsafe-inline'"],
      imgSrc:          ["'self'", "data:", "blob:"],
      fontSrc:         ["'none'"],
      connectSrc:      ["'self'"],
      frameSrc:        ["'none'"],
      objectSrc:       ["'none'"],
      upgradeInsecureRequests: [],
      baseUri:         ["'self'"],
      formAction:      ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,  // not needed for admin SPA
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  strictTransportSecurity: {
    maxAge: 31536000,  // 1 year in seconds
    includeSubDomains: true,
    preload: false,    // set to true if added to HSTS preload list
  },
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
  xDnsPrefetchControl: { allow: false },
}));

/* Remove Express fingerprint */
app.disable('x-powered-by');

/* ================================================================
   RATE LIMITING — A07 Authentication Failures
   ================================================================ */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15-minute window
  max: 10,                    // 10 attempts per window per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
});

/* Global API limiter — 200 req / 15 min */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/admin/api/', apiLimiter);

/* Mutation limiter — 60 write actions / 15 min per IP (prevents staff rampage or scripted attacks) */
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many write operations. Please wait a few minutes.' },
});

/* ================================================================
   BODY PARSING
   ================================================================ */
app.use(express.json({ limit: '256kb' }));  // deliberately small — no large bodies needed

/* ================================================================
   STATIC ADMIN UI
   ================================================================ */
app.use('/admin', express.static(path.join(__dirname, 'public'), {
  etag: true,
  maxAge: '1h',
  index: 'index.html',
}));

/* ================================================================
   AUTH HELPERS
   ================================================================ */
async function verifyPassword(plain) {
  if (!plain || typeof plain !== 'string') return false;
  // cap length to prevent DoS via bcrypt long-input attack
  if (plain.length > 128) return false;
  if (STAFF_HASH) {
    return bcrypt.compare(plain, STAFF_HASH);
  }
  // Plaintext fallback — constant-time comparison
  if (plain.length !== STAFF_PLAIN.length) {
    // Still run a dummy bcrypt to prevent timing oracle
    await bcrypt.compare(plain, '$2a$12$invalidhashfortimingnormalizeXX');
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(plain), Buffer.from(STAFF_PLAIN));
}

function requireAuth(req, res, next) {
  const auth = (req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const token = auth.slice(7);
  try {
    req.staff = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired. Please log in again.'
      : 'Invalid token. Please log in again.';
    res.status(401).json({ error: msg });
  }
}

/* ================================================================
   JSON FILE HELPERS — atomic write via temp-file rename
   ================================================================ */
function readJSON(file) {
  const fullPath = path.resolve(DATA_DIR, file);
  // Prevent path traversal
  if (!fullPath.startsWith(path.resolve(DATA_DIR) + path.sep)) {
    throw new Error('Invalid file path');
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function writeJSON(file, data) {
  const base = path.resolve(DATA_DIR);
  const fullPath = path.resolve(base, file);
  if (!fullPath.startsWith(base + path.sep)) throw new Error('Invalid file path');
  const tmp = fullPath + '.tmp.' + crypto.randomBytes(4).toString('hex');
  // Write to temp, then atomically rename (prevents corruption on crash)
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o640 });
  fs.renameSync(tmp, fullPath);
}

/* ================================================================
   AUDIT LOG — every mutating admin action is recorded
   ================================================================ */
const AUDIT_FILE  = 'audit_log.json';
const AUDIT_LIMIT = 500; // keep last N entries

function auditLog(req, action, detail) {
  try {
    const base = path.resolve(DATA_DIR);
    const fullPath = path.resolve(base, AUDIT_FILE);
    if (!fullPath.startsWith(base + path.sep)) return;
    let log = { entries: [] };
    try { log = JSON.parse(fs.readFileSync(fullPath, 'utf8')); } catch (_) {}
    if (!Array.isArray(log.entries)) log.entries = [];
    log.entries.unshift({
      ts:     new Date().toISOString(),
      ip:     req.ip || 'unknown',
      action: String(action).slice(0, 80),
      detail: String(detail || '').slice(0, 200),
    });
    // Trim to limit
    if (log.entries.length > AUDIT_LIMIT) log.entries.length = AUDIT_LIMIT;
    const tmp = fullPath + '.tmp.' + crypto.randomBytes(4).toString('hex');
    fs.writeFileSync(tmp, JSON.stringify(log, null, 2), { encoding: 'utf8', mode: 0o640 });
    fs.renameSync(tmp, fullPath);
  } catch (_) { /* audit must never crash the request */ }
}

/* ================================================================
   AUTO-BACKUP — snapshot data files before destructive writes
   ================================================================ */
const BACKUP_DIR   = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS  = 20; // keep last 20 backup files per data file

function autoBackup(file) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o750 });
    const src = path.resolve(DATA_DIR, file);
    if (!fs.existsSync(src)) return;
    const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(BACKUP_DIR, `${path.basename(file, '.json')}_${ts}.json`);
    fs.copyFileSync(src, dest);
    // Prune old backups for this file
    const prefix = path.basename(file, '.json') + '_';
    const all = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
      .sort();
    if (all.length > MAX_BACKUPS) {
      all.slice(0, all.length - MAX_BACKUPS).forEach(old => {
        try { fs.unlinkSync(path.join(BACKUP_DIR, old)); } catch (_) {}
      });
    }
  } catch (_) { /* backup failure must not crash the request */ }
}

/* ================================================================
   RECYCLE BIN HELPERS — 60-day soft delete for events & announcements
   ================================================================ */
function ensureBinFile() {
  try { readJSON('recycle_bin.json'); }
  catch (_) { writeJSON('recycle_bin.json', { items: [] }); }
}

function addToBin(type, label, data) {
  ensureBinFile();
  const bin = readJSON('recycle_bin.json');
  const now     = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + 60);
  bin.items = Array.isArray(bin.items) ? bin.items : [];
  bin.items.push({
    bin_id:     crypto.randomBytes(8).toString('hex'),
    type,
    label,
    deleted_at: now.toISOString(),
    expires_at: expires.toISOString(),
    data,
  });
  writeJSON('recycle_bin.json', bin);
}

function purgeBin(bin) {
  const now = new Date();
  bin.items = (bin.items || []).filter(item => new Date(item.expires_at) > now);
  return bin;
}

/* ================================================================
   IMAGE UPLOAD — MIME check, 5 MB cap, random filename
   ================================================================ */
try { fs.mkdirSync(IMAGES_DIR, { recursive: true, mode: 0o750 }); } catch (_) {}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_EXT  = new Map([
  ['image/jpeg', '.jpg'], ['image/png', '.png'],
  ['image/gif', '.gif'],  ['image/webp', '.webp'],
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, IMAGES_DIR),
    filename: (_req, file, cb) => {
      const ext  = ALLOWED_EXT.get(file.mimetype) || '.jpg';
      const name = Date.now() + '-' + crypto.randomBytes(8).toString('hex') + ext;
      cb(null, name);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
    cb(null, true);
  },
});

/* ================================================================
   INPUT SANITISATION
   ================================================================ */
function str(v, max) {
  return String(v == null ? '' : v).slice(0, max).trim();
}

function sanitiseEvent(body) {
  return {
    title:          str(body.title, 120),
    start:          str(body.start, 30),
    end:            str(body.end, 30),
    location:       str(body.location, 120),
    category:       str(body.category || 'general', 40),
    description:    str(body.description, 2000),
    recurrence:     str(body.recurrence || 'none', 20),
    recurrence_day: str(body.recurrence_day, 20),
    image: body.image ? str(body.image, 200) : undefined,
  };
}

function sanitiseAnnouncement(body) {
  return {
    title: str(body.title, 120),
    body:  str(body.body,  2000),
    date:  str(body.date || new Date().toISOString().slice(0, 10), 10),
    link:  body.link ? str(body.link, 200) : undefined,
  };
}

/* ================================================================
   API ROUTES
   ================================================================ */

/* ---- POST /admin/api/auth/login ---- */
app.post('/admin/api/auth/login', loginLimiter, async (req, res) => {
  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required.' });
  }
  const ok = await verifyPassword(password);
  if (!ok) {
    // Generic message — never reveal which credential was wrong
    return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  }
  const token = jwt.sign({ role: 'staff' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '8h',
  });
  res.json({ token });
});

/* ---- Events ---- */
app.get('/admin/api/events', requireAuth, (_req, res) => {
  try { res.json(readJSON('events.json')); }
  catch (_) { res.status(500).json({ error: 'Could not read events.' }); }
});

app.post('/admin/api/events', requireAuth, writeLimiter, (req, res) => {
  try {
    const data   = readJSON('events.json');
    const events = Array.isArray(data.events) ? data.events : [];
    const maxId  = events.reduce((m, e) => Math.max(m, Number(e.id) || 0), 0);
    const event  = { id: maxId + 1, ...sanitiseEvent(req.body) };
    events.push(event);
    writeJSON('events.json', { ...data, events });
    res.status(201).json(event);
  } catch (e) {
    res.status(500).json({ error: 'Could not save event.' });
  }
});

app.put('/admin/api/events/:id', requireAuth, writeLimiter, (req, res) => {
  try {
    const id   = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id.' });
    const data = readJSON('events.json');
    const idx  = (data.events || []).findIndex(e => e.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Event not found.' });
    data.events[idx] = { id, ...sanitiseEvent(req.body) };
    writeJSON('events.json', data);
    res.json(data.events[idx]);
  } catch (_) { res.status(500).json({ error: 'Could not update event.' }); }
});

app.delete('/admin/api/events/:id', requireAuth, writeLimiter, (req, res) => {
  try {
    const id    = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id.' });
    const data  = readJSON('events.json');
    const event = (data.events || []).find(e => e.id === id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    autoBackup('events.json');
    data.events = (data.events || []).filter(e => e.id !== id);
    writeJSON('events.json', data);
    addToBin('event', event.title || `Event #${id}`, event);
    auditLog(req, 'delete_event', `id=${id} title=${event.title || ''}`);
    res.json({ ok: true });
  } catch (_) { res.status(500).json({ error: 'Could not delete event.' }); }
});

/* ---- Announcements ---- */
app.get('/admin/api/announcements', requireAuth, (_req, res) => {
  try {
    const data = readJSON('content.json');
    res.json({ announcements: data.announcements || [] });
  } catch (_) { res.status(500).json({ error: 'Could not read announcements.' }); }
});

app.post('/admin/api/announcements', requireAuth, writeLimiter, (req, res) => {
  try {
    const data = readJSON('content.json');
    if (!Array.isArray(data.announcements)) data.announcements = [];
    const entry = sanitiseAnnouncement(req.body);
    data.announcements.unshift(entry);
    writeJSON('content.json', data);
    res.status(201).json(entry);
  } catch (_) { res.status(500).json({ error: 'Could not save announcement.' }); }
});

app.put('/admin/api/announcements/:idx', requireAuth, writeLimiter, (req, res) => {
  try {
    const idx  = parseInt(req.params.idx, 10);
    if (!Number.isFinite(idx) || idx < 0) return res.status(400).json({ error: 'Invalid index.' });
    const data = readJSON('content.json');
    if (!data.announcements || idx >= data.announcements.length) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }
    data.announcements[idx] = sanitiseAnnouncement(req.body);
    writeJSON('content.json', data);
    res.json(data.announcements[idx]);
  } catch (_) { res.status(500).json({ error: 'Could not update announcement.' }); }
});

app.delete('/admin/api/announcements/:idx', requireAuth, writeLimiter, (req, res) => {
  try {
    const idx  = parseInt(req.params.idx, 10);
    if (!Number.isFinite(idx) || idx < 0) return res.status(400).json({ error: 'Invalid index.' });
    const data = readJSON('content.json');
    if (!data.announcements || idx >= data.announcements.length) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }
    const announcement = data.announcements[idx];
    autoBackup('content.json');
    data.announcements.splice(idx, 1);
    writeJSON('content.json', data);
    addToBin('announcement', announcement.title || `Announcement #${idx}`, announcement);
    auditLog(req, 'delete_announcement', `idx=${idx} title=${announcement.title || ''}`);
    res.json({ ok: true });
  } catch (_) { res.status(500).json({ error: 'Could not delete announcement.' }); }
});

/* ---- Image Upload ---- */
app.post('/admin/api/upload', requireAuth, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Image too large — maximum 5 MB.' });
    }
    if (err) return res.status(400).json({ error: err.message || 'Upload failed.' });
    next();
  });
}, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No valid image received (JPEG/PNG/GIF/WebP, max 5 MB).' });
  res.json({ url: '/images/events/' + req.file.filename });
});

/* ================================================================
   CONTENT SECTIONS — branches, programs, digital_resources, site, staff, etc.
   ================================================================ */
const ALLOWED_SECTIONS = new Set([
  'site', 'staff', 'branches', 'programs', 'digital_resources', 'services', 'memorial_program', 'hosting', 'holiday_closures'
]);

function sanitiseContentSection(section, data) {
  switch (section) {
    case 'site': {
      return {
        name:              str(data.name, 200),
        tagline:           str(data.tagline, 300),
        tagline_author:    str(data.tagline_author, 200),
        phone_main:        str(data.phone_main, 30),
        phone_alt:         str(data.phone_alt, 30),
        fax:               str(data.fax, 30),
        email:             str(data.email, 200),
        address:           str(data.address, 300),
        catalog_url:       str(data.catalog_url, 500),
        libby_url:         str(data.libby_url, 500),
        hoopla_url:        str(data.hoopla_url, 500),
        wowbrary_url:      str(data.wowbrary_url, 500),
        libanywhere_url:   str(data.libanywhere_url, 500),
        library_chef_url:  str(data.library_chef_url, 500),
        wv_info_depot_url: str(data.wv_info_depot_url, 500),
        facebook_url:      str(data.facebook_url, 500),
      };
    }
    case 'staff': {
      const bookmobileStaff = Array.isArray(data.bookmobile_staff)
        ? data.bookmobile_staff.slice(0, 20).map(s => str(s, 120)).filter(Boolean)
        : [];
      return {
        director:                 str(data.director, 120),
        assistant_director:       str(data.assistant_director, 120),
        assistant_director_email: str(data.assistant_director_email, 200),
        bookmobile_staff:         bookmobileStaff,
      };
    }
    case 'branches': {
      if (!Array.isArray(data)) throw new Error('branches must be an array');
      return data.slice(0, 20).map(b => ({
        id:      str(b.id, 40),
        name:    str(b.name, 120),
        address: str(b.address, 200),
        city:    str(b.city, 100),
        phone:   str(b.phone, 80),
        fax:     str(b.fax || '', 80),
        hours: Array.isArray(b.hours) ? b.hours.slice(0, 10).map(h => ({
          days:  str(h.days, 40),
          open:  str(h.open, 20),
          close: str(h.close, 20),
        })) : [],
        note:    str(b.note || '', 500),
      }));
    }
    case 'programs': {
      const clean = {};
      // storytimes + baby_lapsit: arrays of {branch, schedule, ages}
      for (const key of ['storytimes', 'baby_lapsit']) {
        if (Array.isArray(data[key])) {
          clean[key] = data[key].slice(0, 20).map(item => ({
            branch:   str(item.branch || '', 80),
            schedule: str(item.schedule || '', 200),
            ages:     str(item.ages || '', 80),
          }));
        } else {
          clean[key] = [];
        }
      }
      // adult_book_club: {location, schedule}
      const abc = data.adult_book_club || {};
      clean.adult_book_club = {
        location: str(abc.location || '', 120),
        schedule: str(abc.schedule || '', 200),
      };
      // library_chef: {description, url, features[]}
      const lc = data.library_chef || {};
      clean.library_chef = {
        description: str(lc.description || '', 2000),
        url:         str(lc.url || '', 500),
        features: Array.isArray(lc.features)
          ? lc.features.slice(0, 20).map(f => str(f, 200)).filter(Boolean)
          : [],
      };
      return clean;
    }
    case 'digital_resources': {
      if (!Array.isArray(data)) throw new Error('digital_resources must be an array');
      return data.slice(0, 50).map(r => ({
        name:        str(r.name, 120),
        url:         str(r.url, 500),
        description: str(r.description, 500),
      }));
    }
    case 'services': {
      const free = Array.isArray(data.free) ? data.free.slice(0, 50).map(s => str(s, 300)).filter(Boolean) : [];
      const paid = Array.isArray(data.paid) ? data.paid.slice(0, 50).map(s => str(s, 300)).filter(Boolean) : [];
      return { free, paid };
    }
    case 'memorial_program': {
      return {
        description: str(data.description, 3000),
        form_url:    str(data.form_url, 500),
        contact:     str(data.contact, 500),
      };
    }
    case 'hosting': {
      return {
        dns_provider:    str(data.dns_provider, 120),
        hosting_service: str(data.hosting_service, 160),
        server_ip:       str(data.server_ip, 120),
        domain_renewal:  str(data.domain_renewal, 30),
        ssl_provider:    str(data.ssl_provider, 120),
        ssl_expiry:      str(data.ssl_expiry, 30),
      };
    }
    case 'holiday_closures': {
      const VALID_KEYS = new Set([
        'new_years_day','mlk_day','presidents_day','good_friday','memorial_day','juneteenth',
        'wv_day','independence_day','labor_day','columbus_day','veterans_day',
        'thanksgiving','thanksgiving_friday','christmas_eve','christmas_day','new_years_eve'
      ]);
      const observed = Array.isArray(data.observed)
        ? data.observed.filter(k => VALID_KEYS.has(String(k)))
        : [];
      return {
        observed,
        extra_notes: str(data.extra_notes || '', 600),
      };
    }
    default:
      throw new Error('Unknown section');
  }
}

app.get('/admin/api/content/:section', requireAuth, (req, res) => {
  const { section } = req.params;
  if (!ALLOWED_SECTIONS.has(section)) return res.status(400).json({ error: 'Unknown section.' });
  try {
    const data = readJSON('content.json');
    res.json({ section, data: data[section] });
  } catch (_) { res.status(500).json({ error: 'Could not read content.' }); }
});

app.put('/admin/api/content/:section', requireAuth, writeLimiter, (req, res) => {
  const { section } = req.params;
  if (!ALLOWED_SECTIONS.has(section)) return res.status(400).json({ error: 'Unknown section.' });
  try {
    const sanitised = sanitiseContentSection(section, req.body);
    autoBackup('content.json');
    const data = readJSON('content.json');
    data[section] = sanitised;
    writeJSON('content.json', data);
    auditLog(req, 'update_content', `section=${section}`);
    res.json({ section, data: sanitised });
  } catch (e) { res.status(500).json({ error: e.message || 'Could not update content.' }); }
});

/* ---- Individual DELETE for array-type content sections (soft-delete → recycle bin) ---- */
const PROGRAM_ARRAY_KEYS = new Set(['storytimes', 'baby_lapsit']);

app.delete('/admin/api/content/digital_resources/:idx', requireAuth, writeLimiter, (req, res) => {
  try {
    const idx = parseInt(req.params.idx, 10);
    if (!Number.isFinite(idx) || idx < 0) return res.status(400).json({ error: 'Invalid index.' });
    const data = readJSON('content.json');
    const resources = Array.isArray(data.digital_resources) ? data.digital_resources : [];
    if (idx >= resources.length) return res.status(404).json({ error: 'Resource not found.' });
    const removed = resources.splice(idx, 1)[0];
    data.digital_resources = resources;
    autoBackup('content.json');
    writeJSON('content.json', data);
    addToBin('digital_resource', removed.name || `Resource #${idx}`, removed);
    auditLog(req, 'delete_resource', `name=${removed.name || ''}`);
    res.json({ ok: true });
  } catch (_) { res.status(500).json({ error: 'Could not delete resource.' }); }
});

app.delete('/admin/api/content/programs/:key/:idx', requireAuth, writeLimiter, (req, res) => {
  try {
    const { key } = req.params;
    if (!PROGRAM_ARRAY_KEYS.has(key)) return res.status(400).json({ error: 'Invalid program key.' });
    const idx = parseInt(req.params.idx, 10);
    if (!Number.isFinite(idx) || idx < 0) return res.status(400).json({ error: 'Invalid index.' });
    const data = readJSON('content.json');
    const programs = data.programs || {};
    const arr = Array.isArray(programs[key]) ? programs[key] : [];
    if (idx >= arr.length) return res.status(404).json({ error: 'Program entry not found.' });
    const removed = arr.splice(idx, 1)[0];
    programs[key] = arr;
    data.programs = programs;
    autoBackup('content.json');
    writeJSON('content.json', data);
    addToBin('program', `${key} – ${removed.branch || ''}`, { ...removed, _key: key });
    auditLog(req, 'delete_program', `key=${key} branch=${removed.branch || ''}`);
    res.json({ ok: true });
  } catch (_) { res.status(500).json({ error: 'Could not delete program entry.' }); }
});

/* ---- Homepage Images ---- */
app.get('/admin/api/homepage-images', requireAuth, (_req, res) => {
  try {
    const data = readJSON('content.json');
    res.json({ images: Array.isArray(data.homepage_images) ? data.homepage_images : [] });
  } catch (_) { res.status(500).json({ error: 'Could not read homepage images.' }); }
});

app.post('/admin/api/homepage-images', requireAuth, (req, res) => {
  try {
    const { src, alt, caption, type, link, link_label } = req.body || {};
    const allowedTypes = new Set(['slider', 'featured']);
    const entry = {
      id:         Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      src:        str(src || '', 500),
      alt:        str(alt || '', 200),
      caption:    str(caption || '', 300),
      type:       allowedTypes.has(type) ? type : 'slider',
      link:       link ? str(link, 500) : undefined,
      link_label: link_label ? str(link_label, 200) : undefined,
    };
    if (!entry.src) return res.status(400).json({ error: 'src is required.' });
    const data = readJSON('content.json');
    if (!Array.isArray(data.homepage_images)) data.homepage_images = [];
    data.homepage_images.push(entry);
    writeJSON('content.json', data);
    res.status(201).json(entry);
  } catch (_) { res.status(500).json({ error: 'Could not add image.' }); }
});

app.put('/admin/api/homepage-images/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { alt, caption, type, link, link_label } = req.body || {};
    const allowedTypes = new Set(['slider', 'featured']);
    const data = readJSON('content.json');
    const images = Array.isArray(data.homepage_images) ? data.homepage_images : [];
    const idx = images.findIndex(img => img.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Image not found.' });
    images[idx] = {
      ...images[idx],
      alt:        str(alt || images[idx].alt || '', 200),
      caption:    str(caption !== undefined ? caption : images[idx].caption, 300),
      type:       allowedTypes.has(type) ? type : images[idx].type,
      link:       link !== undefined ? (link ? str(link, 500) : undefined) : images[idx].link,
      link_label: link_label !== undefined ? (link_label ? str(link_label, 200) : undefined) : images[idx].link_label,
    };
    data.homepage_images = images;
    writeJSON('content.json', data);
    res.json(images[idx]);
  } catch (_) { res.status(500).json({ error: 'Could not update image.' }); }
});

app.delete('/admin/api/homepage-images/:id', requireAuth, writeLimiter, (req, res) => {
  try {
    const { id } = req.params;
    const data = readJSON('content.json');
    const images = Array.isArray(data.homepage_images) ? data.homepage_images : [];
    const removed = images.find(img => img.id === id);
    if (!removed) return res.status(404).json({ error: 'Image not found.' });
    autoBackup('content.json');
    data.homepage_images = images.filter(img => img.id !== id);
    writeJSON('content.json', data);
    addToBin('homepage_image', removed.alt || removed.src || id, removed);
    auditLog(req, 'delete_image', `alt=${removed.alt || ''} src=${removed.src || ''}`);
    res.json({ ok: true });
  } catch (_) { res.status(500).json({ error: 'Could not delete image.' }); }
});

/* ---- Recycle Bin ---- */

// GET — list active items (auto-purge expired on every read)
app.get('/admin/api/recycle-bin', requireAuth, (_req, res) => {
  try {
    ensureBinFile();
    const bin = purgeBin(readJSON('recycle_bin.json'));
    writeJSON('recycle_bin.json', bin);
    res.json({ items: bin.items });
  } catch (_) { res.status(500).json({ error: 'Could not read recycle bin.' }); }
});

// POST /:binId/restore — put item back into its original collection
app.post('/admin/api/recycle-bin/:binId/restore', requireAuth, writeLimiter, (req, res) => {
  try {
    ensureBinFile();
    const binId = str(req.params.binId, 32);
    const bin   = readJSON('recycle_bin.json');
    const idx   = (bin.items || []).findIndex(i => i.bin_id === binId);
    if (idx === -1) return res.status(404).json({ error: 'Item not found in recycle bin.' });
    const item  = bin.items[idx];

    if (item.type === 'event') {
      const evData = readJSON('events.json');
      const events = Array.isArray(evData.events) ? evData.events : [];
      const maxId  = events.reduce((m, e) => Math.max(m, Number(e.id) || 0), 0);
      events.push({ ...item.data, id: maxId + 1 });
      writeJSON('events.json', { ...evData, events });
    } else if (item.type === 'announcement') {
      const cData = readJSON('content.json');
      if (!Array.isArray(cData.announcements)) cData.announcements = [];
      cData.announcements.unshift(item.data);
      writeJSON('content.json', cData);
    } else if (item.type === 'digital_resource') {
      const cData = readJSON('content.json');
      if (!Array.isArray(cData.digital_resources)) cData.digital_resources = [];
      cData.digital_resources.push(item.data);
      writeJSON('content.json', cData);
    } else if (item.type === 'program') {
      const cData = readJSON('content.json');
      if (!cData.programs) cData.programs = {};
      const key = item.data._key;
      if (!key || !PROGRAM_ARRAY_KEYS.has(key)) return res.status(400).json({ error: 'Cannot restore: unknown program key.' });
      const { _key: _k, ...restData } = item.data;
      if (!Array.isArray(cData.programs[key])) cData.programs[key] = [];
      cData.programs[key].push(restData);
      writeJSON('content.json', cData);
    } else if (item.type === 'homepage_image') {
      const cData = readJSON('content.json');
      if (!Array.isArray(cData.homepage_images)) cData.homepage_images = [];
      cData.homepage_images.push(item.data);
      writeJSON('content.json', cData);
    } else {
      return res.status(400).json({ error: 'Unknown item type.' });
    }

    bin.items.splice(idx, 1);
    writeJSON('recycle_bin.json', bin);
    res.json({ ok: true });
  } catch (_) { res.status(500).json({ error: 'Could not restore item.' }); }
});

// DELETE /:binId — permanently delete one bin item
app.delete('/admin/api/recycle-bin/:binId', requireAuth, writeLimiter, (req, res) => {
  try {
    ensureBinFile();
    const binId  = str(req.params.binId, 32);
    const bin    = readJSON('recycle_bin.json');
    const before = (bin.items || []).length;
    bin.items    = (bin.items || []).filter(i => i.bin_id !== binId);
    if (bin.items.length === before) return res.status(404).json({ error: 'Item not found.' });
    writeJSON('recycle_bin.json', bin);
    res.json({ ok: true });
  } catch (_) { res.status(500).json({ error: 'Could not delete item.' }); }
});

/* ---- General site image upload (bookmobile photo, homepage images etc.) ---- */
const GENERAL_IMAGES_DIR = process.env.GENERAL_IMAGES_DIR || '/images';
try { fs.mkdirSync(GENERAL_IMAGES_DIR, { recursive: true, mode: 0o750 }); } catch (_) {}

const uploadGeneral = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, GENERAL_IMAGES_DIR),
    filename: (_req, file, cb) => {
      const ext  = ALLOWED_EXT.get(file.mimetype) || '.jpg';
      const name = Date.now() + '-' + crypto.randomBytes(8).toString('hex') + ext;
      cb(null, name);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
    cb(null, true);
  },
});

app.post('/admin/api/upload/general', requireAuth, (req, res, next) => {
  uploadGeneral.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Image too large — maximum 10 MB.' });
    }
    if (err) return res.status(400).json({ error: err.message || 'Upload failed.' });
    next();
  });
}, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No valid image received.' });
  res.json({ url: '/images/' + req.file.filename });
});

/* ================================================================
   ANALYTICS ENDPOINTS — client-side tracking data collection
   ================================================================ */

/**
 * POST /admin/api/analytics/pageview
 * Collect pageview data from public website
 * Body: { url, title, referrer, user_agent, timestamp }
 */
app.post('/admin/api/analytics/pageview', (req, res) => {
  try {
    const { url, title, referrer, user_agent, timestamp } = req.body || {};
    // Basic validation
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }
    
    // Ensure analytics.json exists with proper structure
    let analytics = { pageviews: [], events: [], last_updated: new Date().toISOString() };
    try {
      const existing = readJSON('analytics.json');
      if (existing && typeof existing === 'object') analytics = existing;
    } catch (_) {
      // File doesn't exist yet, will be created
    }

    // Cap arrays to prevent unbounded growth (keep last 10000 entries)
    if (!Array.isArray(analytics.pageviews)) analytics.pageviews = [];
    if (!Array.isArray(analytics.events)) analytics.events = [];
    
    // Add pageview entry
    analytics.pageviews.push({
      url: str(url, 500),
      title: str(title, 200),
      referrer: str(referrer, 500),
      user_agent: str(user_agent, 500),
      timestamp: str(timestamp, 30) || new Date().toISOString(),
    });

    // Keep only last 10000 pageviews (rolling window)
    if (analytics.pageviews.length > 10000) {
      analytics.pageviews = analytics.pageviews.slice(-10000);
    }

    analytics.last_updated = new Date().toISOString();
    writeJSON('analytics.json', analytics);
    res.json({ ok: true });
  } catch (e) {
    console.error('[analytics/pageview]', e.message);
    res.status(500).json({ error: 'Could not record pageview' });
  }
});

/**
 * POST /admin/api/analytics/event
 * Collect user event data (link clicks, tab changes, etc.)
 * Body: { event_type, event_data, user_agent, timestamp }
 */
app.post('/admin/api/analytics/event', (req, res) => {
  try {
    const { event_type, event_data, user_agent, timestamp } = req.body || {};
    if (!event_type || typeof event_type !== 'string') {
      return res.status(400).json({ error: 'event_type is required' });
    }

    let analytics = { pageviews: [], events: [], last_updated: new Date().toISOString() };
    try {
      const existing = readJSON('analytics.json');
      if (existing && typeof existing === 'object') analytics = existing;
    } catch (_) {}

    if (!Array.isArray(analytics.events)) analytics.events = [];

    // Add event entry
    analytics.events.push({
      event_type: str(event_type, 50),
      event_data: typeof event_data === 'object' ? JSON.stringify(event_data).slice(0, 500) : str(event_data, 500),
      user_agent: str(user_agent, 500),
      timestamp: str(timestamp, 30) || new Date().toISOString(),
    });

    // Keep only last 10000 events
    if (analytics.events.length > 10000) {
      analytics.events = analytics.events.slice(-10000);
    }

    analytics.last_updated = new Date().toISOString();
    writeJSON('analytics.json', analytics);
    res.json({ ok: true });
  } catch (e) {
    console.error('[analytics/event]', e.message);
    res.status(500).json({ error: 'Could not record event' });
  }
});

/**
 * GET /admin/api/analytics/summary
 * Get analytics summary (requires auth)
 */
app.get('/admin/api/analytics/summary', requireAuth, (_req, res) => {
  try {
    let analytics = { pageviews: [], events: [], last_updated: new Date().toISOString() };
    try {
      const existing = readJSON('analytics.json');
      if (existing && typeof existing === 'object') analytics = existing;
    } catch (_) {}

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count pageviews in last 24h
    const pv24h = (analytics.pageviews || []).filter(pv => {
      try { return new Date(pv.timestamp) > last24h; } catch (_) { return false; }
    }).length;

    // Count events in last 24h
    const ev24h = (analytics.events || []).filter(ev => {
      try { return new Date(ev.timestamp) > last24h; } catch (_) { return false; }
    }).length;

    // Top pages (last 24h)
    const pageMap = {};
    (analytics.pageviews || []).forEach(pv => {
      try {
        if (new Date(pv.timestamp) > last24h) {
          const key = pv.url || 'unknown';
          pageMap[key] = (pageMap[key] || 0) + 1;
        }
      } catch (_) {}
    });
    const topPages = Object.entries(pageMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([url, count]) => ({ url, count }));

    // Top events (last 24h)
    const eventMap = {};
    (analytics.events || []).forEach(ev => {
      try {
        if (new Date(ev.timestamp) > last24h) {
          const key = ev.event_type || 'unknown';
          eventMap[key] = (eventMap[key] || 0) + 1;
        }
      } catch (_) {}
    });
    const topEvents = Object.entries(eventMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    res.json({
      pageviews_24h: pv24h,
      events_24h: ev24h,
      total_pageviews: (analytics.pageviews || []).length,
      total_events: (analytics.events || []).length,
      top_pages: topPages,
      top_events: topEvents,
      last_updated: analytics.last_updated,
    });
  } catch (e) {
    console.error('[analytics/summary]', e.message);
    res.status(500).json({ error: 'Could not generate summary' });
  }
});

/**
 * GET /admin/api/analytics/pageviews
 * Get all pageviews (requires auth)
 * Query: ?limit=100&offset=0
 */
app.get('/admin/api/analytics/pageviews', requireAuth, (req, res) => {
  try {
    let analytics = { pageviews: [], events: [], last_updated: new Date().toISOString() };
    try {
      const existing = readJSON('analytics.json');
      if (existing && typeof existing === 'object') analytics = existing;
    } catch (_) {}

    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const pageviews = (analytics.pageviews || []).slice(-limit * 2).reverse().slice(offset, offset + limit);
    
    res.json({ pageviews, total: (analytics.pageviews || []).length, limit, offset });
  } catch (e) {
    console.error('[analytics/pageviews]', e.message);
    res.status(500).json({ error: 'Could not fetch pageviews' });
  }
});

/**
 * GET /admin/api/analytics/events
 * Get all events (requires auth)
 * Query: ?limit=100&offset=0
 */
app.get('/admin/api/analytics/events', requireAuth, (req, res) => {
  try {
    let analytics = { pageviews: [], events: [], last_updated: new Date().toISOString() };
    try {
      const existing = readJSON('analytics.json');
      if (existing && typeof existing === 'object') analytics = existing;
    } catch (_) {}

    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
    const events = (analytics.events || []).slice(-limit * 2).reverse().slice(offset, offset + limit);
    
    res.json({ events, total: (analytics.events || []).length, limit, offset });
  } catch (e) {
    console.error('[analytics/events]', e.message);
    res.status(500).json({ error: 'Could not fetch events' });
  }
});

/* ================================================================
   SYSTEM MANAGEMENT ENDPOINTS — Docker control, backups, health
   ================================================================ */

/**
 * GET /admin/api/system/health
 * Check system health and uptime (requires auth)
 */
app.get('/admin/api/system/health', requireAuth, (_req, res) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  res.json({
    status: 'ok',
    uptime_seconds: Math.floor(uptime),
    uptime_minutes: Math.floor(uptime / 60),
    uptime_hours: Math.floor(uptime / 3600),
    memory: {
      rss: Math.round(memory.rss / 1024 / 1024) + ' MB',
      heap_used: Math.round(memory.heapUsed / 1024 / 1024) + ' MB',
      heap_total: Math.round(memory.heapTotal / 1024 / 1024) + ' MB',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /admin/api/system/restart
 * Signal a graceful restart (requires auth)
 * Note: Actual restart is handled by docker-compose or systemd
 */
app.post('/admin/api/system/restart', requireAuth, (req, res) => {
  console.log('[system] Restart signal received from staff portal');
  res.json({ 
    ok: true,
    message: 'Restart signal sent. Service should restart within 5 seconds.',
    timestamp: new Date().toISOString(),
  });
  // Give client time to receive response
  setTimeout(() => {
    console.log('[system] Initiating graceful shutdown');
    process.exit(0);
  }, 500);
});

/**
 * DELETE /admin/api/analytics
 * Clear all analytics data (requires auth) — WARNING: destructive
 */
app.delete('/admin/api/analytics', requireAuth, (req, res) => {
  try {
    const analytics = { pageviews: [], events: [], last_updated: new Date().toISOString() };
    writeJSON('analytics.json', analytics);
    res.json({ ok: true, message: 'Analytics data cleared' });
  } catch (e) {
    res.status(500).json({ error: 'Could not clear analytics' });
  }
});

/* ================================================================
   AUDIT LOG ENDPOINT — read only
   ================================================================ */
app.get('/admin/api/audit-log', requireAuth, (req, res) => {
  try {
    const base = path.resolve(DATA_DIR);
    const fullPath = path.resolve(base, AUDIT_FILE);
    if (!fullPath.startsWith(base + path.sep)) return res.status(400).json({ error: 'Invalid path.' });
    let log = { entries: [] };
    try { log = JSON.parse(fs.readFileSync(fullPath, 'utf8')); } catch (_) {}
    res.json({ entries: Array.isArray(log.entries) ? log.entries : [] });
  } catch (_) { res.status(500).json({ error: 'Could not read audit log.' }); }
});

/* ================================================================
   BACKUP LIST + RESTORE ENDPOINTS
   ================================================================ */
app.get('/admin/api/backups', requireAuth, (req, res) => {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o750 });
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, 60)
      .map(f => ({
        name: f,
        size: fs.statSync(path.join(BACKUP_DIR, f)).size,
        mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime.toISOString(),
      }));
    res.json({ backups: files });
  } catch (_) { res.status(500).json({ error: 'Could not list backups.' }); }
});

app.post('/admin/api/backups/:filename/restore', requireAuth, writeLimiter, (req, res) => {
  try {
    const base  = path.resolve(DATA_DIR);
    const bkDir = path.resolve(BACKUP_DIR);
    // Validate filename — only allow safe filenames (letters, digits, _, -)
    const fname = req.params.filename;
    if (!/^[a-zA-Z0-9_\-]+\.json$/.test(fname)) return res.status(400).json({ error: 'Invalid filename.' });
    const src   = path.resolve(bkDir, fname);
    if (!src.startsWith(bkDir + path.sep)) return res.status(400).json({ error: 'Path traversal denied.' });
    if (!fs.existsSync(src)) return res.status(404).json({ error: 'Backup file not found.' });
    // Determine target data file from backup filename prefix
    const targetFile = fname.replace(/_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/, '.json');
    const target = path.resolve(base, targetFile);
    if (!target.startsWith(base + path.sep)) return res.status(400).json({ error: 'Invalid target path.' });
    // Take a fresh backup of current state before overwriting
    autoBackup(targetFile);
    fs.copyFileSync(src, target);
    auditLog(req, 'restore_backup', `file=${fname}`);
    res.json({ ok: true, restored: fname, to: targetFile });
  } catch (_) { res.status(500).json({ error: 'Could not restore backup.' }); }
});

/* ================================================================
   ERROR HANDLER — never leak stack traces
   ================================================================ */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'An internal error occurred.' });
});

/* ================================================================
   START
   ================================================================ */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`FCPL Admin backend running on port ${PORT}`);
  console.log(`Data directory : ${DATA_DIR}`);
  console.log(`Images directory: ${IMAGES_DIR}`);
  console.log(`Password auth : ${STAFF_HASH ? 'bcrypt hash ✓' : 'plaintext (upgrade recommended)'}`);
});


