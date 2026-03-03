import { html } from "hono/html";
import { ContainerCard } from "./ContainerCard.js";
import { StatusBadge } from "./StatusBadge.js";

const STATUS_PRIORITY = {
    'dead': 1,
    'exited': 2,
    'stopped': 3,
    'restarting': 4,
    'starting': 5,
    'running': 6,
    'unhealthy': 7,
    'healthy': 8
};
export const ServiceAccordion = (serviceName, containers) => {
    const sortedStatuses = containers.map(c => c.health).sort((a, b) => (STATUS_PRIORITY[a] || 99) - (STATUS_PRIORITY[b] || 99));
    const globalStatus = sortedStatuses[0];
    const initialUpdates = {};
    containers.forEach(c => {
        if (c.lastKnownStatus === 'update available') initialUpdates[c.fullImageId] = true;
    });

    return html`
      <div class="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden"
           x-data="{ 
                open: localStorage.getItem('stack-${serviceName}') === 'true',
                updates: ${JSON.stringify(initialUpdates)},
                get updateCount() { return Object.values(this.updates).filter(v => v).length }
           }"
           @container-update.stop="updates[$event.detail.id] = $event.detail.hasUpdate">
          <div @click="open = !open; localStorage.setItem('stack-${serviceName}', open)"
               class="w-full flex items-center justify-between p-6 hover:bg-gray-750 transition-colors cursor-pointer">
              <div class="flex items-center space-x-4">
                  <div class="relative">
                      <img src="${serviceName === 'Standalone' ? '/assets/images/docker.png' : '/assets/images/docker-stack.png'}"
                           class="w-10 h-10 object-contain bg-gray-900 p-1 rounded">
                      <template x-if="updateCount > 0">
                          <span class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-800 shadow-lg"
                                x-text="updateCount">
                          </span>
                      </template>
                  </div>
                  <div class="text-left">
                      <h2 class="text-xl font-bold text-white">${serviceName}</h2>
                      <p class="text-gray-400 text-xs">${containers.length} container(s)</p>
                  </div>
              </div>
               <div class="flex items-center space-x-2 md:space-x-4">
                  <div class="w-24 flex justify-center">
                      ${StatusBadge(globalStatus)}
                  </div>
                  <svg class="w-5 h-5 text-gray-500 transition-transform duration-300 shrink-0" :class="open ? 'rotate-180' : ''"
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
              </div>
          </div>
          <div x-show="open" x-cloak
               class="p-6 grid grid-cols-1 gap-4 border-t border-gray-700 bg-gray-900/50">
              ${containers.map(c => ContainerCard(c))}
          </div>
      </div>`;
};
