const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'clients.json');

function loadClients() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Error leyendo clients.json', e);
    return {};
  }
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/pdfs', express.static(path.join(__dirname, 'public', 'pdfs')));
app.use('/avatars', express.static(path.join(__dirname, 'public', 'avatars')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/healthz', (req, res) => res.send('ok'));

function resolveTarget(entry) {
  if (!entry) return null;
  if (entry.mode === 'redirect') return entry.target;
  if (entry.mode === 'minisite') return `https://link.pekelink.com/${entry._slug}`;
  return null;
}

app.get('/', (req, res) => {
  res.send('<h1>Pekelink</h1><p>Plataforma de minisites y codigos QR.</p>');
});

// QR domain: qr.pekelink.com/:slug -> redirige al destino (PDF o minisite)
app.get(['/r/:slug', '/:slug'], (req, res, next) => {
  const host = (req.hostname || '').toLowerCase();
  const isQrDomain = host.startsWith('qr.') || req.path.startsWith('/r/');
  const clients = loadClients();
  const slug = req.params.slug;
  const entry = clients[slug];

  if (!entry) return next();
  entry._slug = slug;

  if (isQrDomain) {
    const target = resolveTarget(entry);
    if (!target) return next();
    return res.redirect(302, target);
  }

  // link.pekelink.com domain
  if (entry.mode === 'minisite') {
    return res.render('minisite', { client: entry, slug });
  }
  if (entry.mode === 'redirect') {
    return res.redirect(302, entry.target);
  }
  return next();
});

app.use((req, res) => {
  res.status(404).send('<h1>404</h1><p>No encontrado en Pekelink.</p>');
});

app.listen(PORT, () => console.log(`Pekelink escuchando en puerto ${PORT}`));
