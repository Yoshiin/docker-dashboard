import { html } from "hono/html";
import { StatusBadge } from "./StatusBadge.js";

export const ContainerCard = (c) => {
    return html`
       <div class="bg-gray-800/40 border border-gray-700/50 rounded-lg p-4 flex items-center gap-4 group"
            x-data="{ 
                updateStatus: '${c.lastKnownStatus}',
                loading: false,
                refreshUpdate(force = false) {
                    this.loading = true;
                    const url = '/api/check-update?image=' + encodeURIComponent('${c.fullImage}') + '&id=' + encodeURIComponent('${c.fullImageId}') + (force ? '&force=true' : '');
                    fetch(url)
                        .then(res => res.json())
                        .then(data => { 
                           if (data.local) {
                               this.updateStatus = 'local';
                           } else if (data.unavailable) {
                               this.updateStatus = 'unavailable';
                           } else {
                               this.updateStatus = data.upToDate ? 'up to date' : 'update available';
                           }
                           this.loading = false;
                           $dispatch('container-update', { id: '${c.fullImageId}', hasUpdate: this.updateStatus === 'update available' });
                           if (force) {
                               $dispatch('show-notification', { msg: 'Check complete for ' + '${c.name.replace(/'/g, "\\'")}', type: 'success' });
                           }
                        })
                        .catch(() => {
                           this.loading = false;
                           this.updateStatus = 'error';
                        });
                }
            }"
            x-init="refreshUpdate(false)"
            @refresh-container.window="if ($event.detail.id === '${c.fullImageId}' || $event.detail.projectId === '${c.projectName}') refreshUpdate(true)">
          <img :src="updateStatus === 'local' ? '/assets/images/docker.png' : 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/' + '${c.imageName}' + '.png'"
               onerror="this.src='/assets/images/docker.png'"
               class="w-6 h-6 object-contain"
               :class="loading ? 'animate-pulse' : ''">
          <div class="flex-1 min-w-0">
              <h3 class="text-sm font-bold text-gray-200 truncate">${c.name}</h3>
              <p class="text-[10px] text-gray-300 truncate">Service: ${c.serviceName}</p>
              <div class="flex items-center gap-2 mt-1">
                  <p class="text-[9px] font-bold uppercase tracking-wider"
                     :class="{
                                     'text-green-500': updateStatus === 'up to date',
                                     'text-red-500': updateStatus === 'update available',
                                     'text-gray-400': updateStatus === 'local',
                                     'text-gray-500': updateStatus === 'checking' || updateStatus === 'error' || updateStatus === 'unavailable'
                                  }">
                      <span x-text="updateStatus === 'local' ? 'Local Image' : updateStatus"></span>
                  </p>
                  <button @click="refreshUpdate(true)" 
                          :disabled="loading"
                          class="p-1 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                          :class="loading ? 'cursor-not-allowed' : 'cursor-pointer'"
                          title="Force update check">
                      <svg class="w-3 h-3 text-gray-400" :class="loading ? 'animate-spin' : 'group-hover:text-blue-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                  </button>
              </div>
          </div>
          ${StatusBadge(c.health)}
      </div>
  `
}
