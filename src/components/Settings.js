import { html } from "hono/html";
import { Header } from "./Header.js";

export const Settings = (settings, message = null) => {
    return html`
    <div class="max-w-2xl mx-auto space-y-8">
        ${Header(false)}
        
        <a href="/" class="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-blue-400 uppercase tracking-widest transition-colors group">
            <svg class="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back
        </a>

        ${message ? html`
            <div class="p-4 rounded-lg border ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'} text-sm font-medium">
                ${message.text}
            </div>
        ` : ''}

        <section class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div class="p-6 border-b border-gray-700 bg-gray-900/20">
                <h3 class="text-sm font-bold text-gray-400 uppercase tracking-widest">General Settings</h3>
            </div>
            <form action="/api/settings/general" method="POST" class="p-6 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Refresh Interval (seconds)</label>
                        <input type="number" name="refresh_time" value="${settings.refresh_time}" required
                               class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Update Cache (minutes)</label>
                        <input type="number" name="cache_time" value="${settings.cache_time}" required
                               class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors">
                    </div>
                </div>
                <button type="submit" class="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors">
                    Save Settings
                </button>
            </form>
        </section>

        <section class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div class="p-6 border-b border-gray-700 bg-gray-900/20">
                <h3 class="text-sm font-bold text-gray-400 uppercase tracking-widest">Security</h3>
            </div>
            <form action="/api/settings/password" method="POST" class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Old Password</label>
                    <input type="password" name="old_password" required
                           class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors">
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Password</label>
                        <input type="password" name="new_password" required
                               class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                        <input type="password" name="confirm_password" required
                               class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors">
                    </div>
                </div>
                <button type="submit" class="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors">
                    Update Password
                </button>
            </form>
        </section>
    </div>
  `;
};
