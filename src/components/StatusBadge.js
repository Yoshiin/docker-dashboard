import { html } from "hono/html";

export const StatusBadge = (status) => {
  let healthClass = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  if (status === 'healthy') healthClass = 'bg-green-500/10 text-green-400 border-green-500/20';
  else if (status === 'running') healthClass = 'bg-sky-500/10 text-sky-600 border-sky-500/20';
  else if (status === 'unhealthy') healthClass = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  else if (status === 'exited' || status === 'dead' || status === 'stopped') healthClass = 'bg-red-500/10 text-red-400 border-red-500/20';
  else if (status === 'starting' || status === 'restarting') healthClass = 'bg-gray-500/10 text-gray-500 border-gray-500/20';

  return html`<span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${healthClass}">${status}</span>`;
};
