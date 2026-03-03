import { html } from 'hono/html'

export const Login = (error = false, version = "") => {
    return html`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Login - Docker Dashboard</title>
            <script src="/assets/vendor/htmx.js"></script>
            <script src="/assets/vendor/alpine.js" defer></script>
            <link rel="stylesheet" href="/assets/vendor/tailwind.css">
        </head>
        <body class="bg-gray-900 text-gray-100 min-h-screen flex flex-col items-center justify-center p-4 antialiased">
            <div class="w-full max-w-sm flex-grow flex flex-col justify-center">
                <!-- Header -->
                <div class="mb-8 flex flex-col items-center">
                    <h1 class="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
                        DOCKER<span class="text-blue-500"> DASHBOARD</span>
                    </h1>
                </div>

                <!-- Form Card -->
                <div class="bg-gray-800 border-2 border-gray-700/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                    <!-- Subtle background glow -->
                    <div class="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors duration-700"></div>

                    ${error ? html`
                        <div class="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 animate-head-shake">
                            <span class="text-red-500">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                </svg>
                            </span>
                            <p class="text-red-400 text-sm font-semibold">Invalid credentials</p>
                        </div>
                    ` : ''}

                    <form action="/login" method="POST" class="space-y-6 relative z-10">
                        <div class="space-y-2">
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Username</label>
                            <input type="text" name="username" required 
                                   class="w-full bg-gray-900 border-2 border-gray-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-all duration-300 placeholder-gray-600 font-medium" 
                                   placeholder="Your username">
                        </div>
                        <div class="space-y-2">
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Password</label>
                            <input type="password" name="password" required 
                                   class="w-full bg-gray-900 border-2 border-gray-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-all duration-300 placeholder-gray-600 font-medium" 
                                   placeholder="••••••••">
                        </div>
                        <button type="submit" 
                                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-blue-900/20 uppercase tracking-widest">
                            Sign In
                        </button>
                    </form>
                </div>
            </div>

            <footer class="mt-auto py-8 text-center">
                <p class="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">
                    v${version}
                </p>
            </footer>
        </body>
        </html>
    `;
};
