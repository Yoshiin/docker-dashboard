import { Hono } from 'hono'
import { html } from 'hono/html'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import bcrypt from 'bcrypt';
import { Login } from "./components/Login.js";
import { ServiceAccordion } from "./components/ServiceAccordion.js";
import { Settings } from "./components/Settings.js";
import { Layout } from "./components/Layout.js";
import { Header } from "./components/Header.js";
import { DbService } from "./services/db.service.js";
import { DockerService } from "./services/docker.service.js";
import { authMiddleware } from "./middlewares/auth.middleware.js";

const app = new Hono()
const dockerService = new DockerService();
const dbService = new DbService();

const auth = authMiddleware(dbService);

app.use('/containers-list', auth);
app.use('/settings', auth);
app.use('/api/*', auth);

app.use('/assets/*', serveStatic({
  root: './public',
  rewriteRequestPath: (path => path.replace(/^\/assets/, ''))
}))

app.get('/api/check-update', async (c) => {
  const image = c.req.query('image');
  const id = c.req.query('id');
  const force = c.req.query('force') === 'true';
  const now = Date.now();

  const cacheTimeMinutes = parseInt(dbService.getSetting('cache_time') || '30');
  const cacheLimit = cacheTimeMinutes * 60 * 1000;

  const cached = dbService.getCachedImage(id);

  if (!force && cached && (now - cached.last_check) < cacheLimit) {
    const isUpToDate = cached.status === 'up to date';
    const isUnavailable = cached.status === 'unavailable';
    const isLocal = cached.status === 'local';

    return c.json({
      upToDate: isUpToDate,
      unavailable: isUnavailable,
      local: isLocal,
      fromCache: true
    });
  }

  const containers = await dockerService.getContainers();
  const container = containers.find(cnt => cnt.imageId === id || cnt.fullImageId === id);

  const result = await dockerService.checkUpdate(image, container?.repoDigests || []);

  let statusToStore;
  if (result.local) {
    statusToStore = 'local';
  } else if (result.error) {
    statusToStore = 'unavailable';
  } else {
    statusToStore = result.upToDate ? 'up to date' : 'update available';
  }

  dbService.updateImageCache(id, statusToStore, now);

  return c.json({
    upToDate: result.upToDate || false,
    unavailable: statusToStore === 'unavailable',
    local: statusToStore === 'local'
  });
});

app.get('/containers-list', async (c) => {
  const enriched = await dockerService.getContainers();

  const uiEnriched = enriched.map(data => {
    const cached = dbService.getCachedImage(data.imageId);
    let lastKnownStatus = cached ? cached.status : 'checking';

    return {
      ...data,
      imageName: data.imageName.split(':')[0].split('/').pop(),
      fullImage: data.imageName,
      fullImageId: data.imageId,
      lastKnownStatus: lastKnownStatus
    };
  });

  const stacks = uiEnriched.reduce((acc, curr) => {
    (acc[curr.projectName] = acc[curr.projectName] || []).push(curr);
    return acc;
  }, {});
  return c.html(Object.keys(stacks).sort().map(name => ServiceAccordion(name, stacks[name])).join(''));
});

app.get('/settings', (c) => {
  const msgText = c.req.query('msg');
  const msgType = c.req.query('type');
  const settings = dbService.getAllSettings();
  const message = msgText ? { text: msgText, type: msgType } : null;

  return c.html(Layout(Settings(settings, message), "Settings - Docker Dashboard"));
});

app.post('/api/settings/general', async (c) => {
  const body = await c.req.parseBody();
  dbService.updateSetting('refresh_time', body.refresh_time);
  dbService.updateSetting('cache_time', body.cache_time);
  return c.redirect('/settings?msg=' + encodeURIComponent('Settings updated') + '&type=success');
});

app.post('/api/settings/password', async (c) => {
  const body = await c.req.parseBody();
  const sessionId = getCookie(c, 'session_id');
  const session = dbService.getSession(sessionId, Date.now());

  const user = dbService.getUserById(session.user_id);

  if (body.new_password !== body.confirm_password) {
    return c.redirect('/settings?msg=' + encodeURIComponent('Passwords do not match') + '&type=error');
  }

  if (bcrypt.compareSync(body.old_password, user.password_hash)) {
    const newHash = bcrypt.hashSync(body.new_password, 10);
    dbService.updateUserPassword(user.id, newHash);
    return c.redirect('/settings?msg=' + encodeURIComponent('Password updated') + '&type=success');
  }

  return c.redirect('/settings?msg=' + encodeURIComponent('Incorrect old password') + '&type=error');
});

app.get('/login', (c) => {
  const hasError = c.req.query('error') === '1';
  return c.html(Login(hasError));
});

app.post('/login', async (c) => {
  const body = await c.req.parseBody();
  const user = dbService.getUserByUsername(body.username);

  if (user && bcrypt.compareSync(body.password, user.password_hash)) {
    const sessionId = Math.random().toString(36).substring(2);
    const expiresAt = Date.now() + (1000 * 60 * 60 * 24); // 24h

    dbService.createSession(sessionId, user.id, expiresAt);
    setCookie(c, 'session_id', sessionId, { httpOnly: true, expires: new Date(expiresAt) });
    return c.redirect('/');
  }
  return c.redirect('/login?error=1');
});

app.get('/logout', (c) => {
  const sessionId = getCookie(c, 'session_id');
  if (sessionId) dbService.deleteSession(sessionId);
  deleteCookie(c, 'session_id');
  return c.redirect('/login');
});

app.get('/', auth, (c) => {
  const refreshTime = dbService.getSetting('refresh_time') || '10';
  const content = html`
      ${Header()}
      <div id="service-list" hx-get="/containers-list" hx-trigger="load, every ${refreshTime}s"></div>
  `;
  return c.html(Layout(content));
});

serve({ fetch: app.fetch, port: 3000 });
