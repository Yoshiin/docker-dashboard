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

import pkg from "../package.json" with { type: "json" };

const app = new Hono()
const dockerService = new DockerService();
const dbService = new DbService();
const version = pkg.version;

const auth = authMiddleware(dbService);

app.use('/containers-list', auth);
app.use('/settings', auth);
app.use('/api/*', auth);

app.get('/health', (c) => c.text('OK', 200));

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
  const statusFilter = c.req.query('status');
  const searchFilter = c.req.query('search')?.toLowerCase();

  const enriched = await dockerService.getContainers();

  const uiEnriched = enriched
    .map(data => {
      const cached = dbService.getCachedImage(data.imageId);
      let lastKnownStatus = cached ? cached.status : 'checking';

      return {
        ...data,
        imageName: data.imageName.split(':')[0].split('/').pop(),
        fullImage: data.imageName,
        fullImageId: data.imageId,
        lastKnownStatus: lastKnownStatus
      };
    })
    .filter(data => {
      const matchStatus = !statusFilter || data.health === statusFilter;
      const matchSearch = !searchFilter || data.projectName.toLowerCase().includes(searchFilter);
      return matchStatus && matchSearch;
    });

  const stacks = uiEnriched.reduce((acc, curr) => {
    (acc[curr.projectName] = acc[curr.projectName] || []).push(curr);
    return acc;
  }, {});

  if (Object.keys(stacks).length === 0) {
    return c.html(html`<div class="col-span-full py-20 text-center"><p class="text-gray-500 font-bold uppercase tracking-widest text-xs">No stacks matching filters</p></div>`);
  }

  return c.html(Object.keys(stacks).sort().map(name => ServiceAccordion(name, stacks[name])).join(''));
});

app.get('/settings', (c) => {
  const msgText = c.req.query('msg');
  const msgType = c.req.query('type');
  const settings = dbService.getAllSettings();
  const message = msgText ? { text: msgText, type: msgType } : null;

  return c.html(Layout(Settings(settings, message), "Settings - Docker Dashboard", version));
});

app.post('/api/settings/general', async (c) => {
  const body = await c.req.parseBody();
  dbService.updateSetting('refresh_time', body.refresh_time);
  dbService.updateSetting('cache_time', body.cache_time);
  return c.redirect('/settings?msg=' + encodeURIComponent('Settings updated') + '&type=success');
});

app.post('/api/settings/reset-cache', async (c) => {
  dbService.clearImageCache();
  return c.redirect('/settings?msg=' + encodeURIComponent('Image cache cleared') + '&type=success');
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
  return c.html(Login(hasError, version));
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
  const refreshTime = dbService.getSetting('refresh_time') || '60';
  const content = html`
      ${Header()}
      <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6" x-data="{ search: '' }">
          <div class="relative w-full md:w-96">
              <input type="text" 
                     name="search" 
                     x-model="search"
                     x-ref="searchInput"
                     placeholder="Search stacks..." 
                     hx-get="/containers-list" 
                     hx-target="#service-list" 
                     hx-trigger="input changed delay:300ms, search-clear"
                     hx-include="[name='status'], [name='search']"
                     class="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors pl-10 pr-10">
              <svg class="w-4 h-4 text-gray-500 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <button x-show="search.length > 0" 
                      @click="search = ''; $nextTick(() => { htmx.trigger($refs.searchInput, 'search-clear'); $refs.searchInput.focus(); })"
                      class="absolute right-3 top-2.5 p-1 text-gray-500 hover:text-gray-300 transition-colors"
                      type="button"
                      x-cloak>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
              </button>
          </div>
          <div class="flex items-center gap-3 w-full md:w-auto">
              <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status:</span>
              <select name="status" 
                      hx-get="/containers-list" 
                      hx-target="#service-list" 
                      hx-trigger="change"
                      hx-include="[name='status'], [name='search']"
                      class="bg-gray-800 border border-gray-700 text-gray-300 text-[10px] font-bold uppercase tracking-widest rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer appearance-none min-w-[140px]">
                  <option value="">All</option>
                  <option value="healthy">Healthy</option>
                  <option value="running">Running</option>
                  <option value="unhealthy">Unhealthy</option>
                  <option value="starting">Starting</option>
                  <option value="restarting">Restarting</option>
                  <option value="stopped">Stopped</option>
                  <option value="exited">Exited</option>
                  <option value="dead">Dead</option>
              </select>
          </div>
      </div>
      <div id="service-list" 
           class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start" 
           hx-get="/containers-list" 
           hx-trigger="load, every ${refreshTime}s"
           hx-include="[name='status'], [name='search']"></div>
  `;
  return c.html(Layout(content, "Docker Dashboard", version));
});

serve({ fetch: app.fetch, port: 3000 });
