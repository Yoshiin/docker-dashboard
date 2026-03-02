import { html } from "hono/html";

export const Notifications = () => {
    return html`
        <div class="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
            <template x-for="n in notifications" :key="n.id">
                <div x-transition:enter="transition ease-out duration-300"
                     x-transition:enter-start="opacity-0 transform translate-x-8"
                     x-transition:enter-end="opacity-100 transform translate-x-0"
                     x-transition:leave="transition ease-in duration-200"
                     x-transition:leave-start="opacity-100 transform translate-x-0"
                     x-transition:leave-end="opacity-0 transform translate-x-8"
                     :class="{
                        'bg-green-600': n.type === 'success',
                        'bg-red-600': n.type === 'error',
                        'bg-blue-600': n.type === 'info'
                     }"
                     class="px-4 py-3 rounded-lg shadow-2xl text-white font-bold text-sm min-w-[200px] flex items-center justify-between border border-white/10 backdrop-blur-md">
                    <span x-text="n.msg"></span>
                    <button @click="notifications = notifications.filter(notif => notif.id !== n.id)" class="ml-4 hover:opacity-70">&times;</button>
                </div>
            </template>
        </div>
    `;
};
