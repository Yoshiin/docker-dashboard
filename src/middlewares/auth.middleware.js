import { getCookie, deleteCookie } from 'hono/cookie';

export const authMiddleware = (dbService) => async (c, next) => {
    const sessionId = getCookie(c, 'session_id');
    if (!sessionId) return c.redirect('/login');

    const session = dbService.getSession(sessionId, Date.now());
    if (!session) {
        deleteCookie(c, 'session_id');
        return c.redirect('/login');
    }
    await next();
};
