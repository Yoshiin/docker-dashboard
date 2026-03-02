import { html } from "hono/html";
import { Notifications } from "./Notifications.js";

export const Layout = (content, title = "Docker Dashboard") => {
    return html`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <script src="/assets/vendor/htmx.js"></script>
        <script src="/assets/vendor/alpine.js" defer></script>
        <link rel="stylesheet" href="/assets/vendor/tailwind.css">
        <style>
            [x-cloak] { display: none !important; }
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        </style>
    </head>
    <body class="bg-gray-900 text-gray-100 p-4 md:p-8"
          x-data="{ 
            notifications: [], 
            addNotification(msg, type = 'success') {
                const id = Date.now();
                this.notifications.push({ id, msg, type });
                setTimeout(() => {
                    this.notifications = this.notifications.filter(n => n.id !== id);
                }, 3000);
            }
          }"
          @show-notification.window="addNotification($event.detail.msg, $event.detail.type)">
        <div class="max-w-6xl mx-auto">
            ${content}
        </div>
        
        ${Notifications()}
    </body>
    </html>
  `;
};
