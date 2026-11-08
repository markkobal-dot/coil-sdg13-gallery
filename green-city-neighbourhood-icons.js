/* Small original symbols shared by map markers and resident reports. */
const paths={
 roads:'M4 8h5m6 0h5M4 16h5m6 0h5M10 3 8 21M16 3l-2 18',
 noise:'m3 9 5 0 5-5v16l-5-5H3Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
 shade:'M12 21v-8M8 21h8M7 15a4 4 0 0 1-1-8 6 6 0 0 1 12 0 4 4 0 0 1-1 8Z',
 mobility:'M5 17V6c0-4 14-4 14 0v11ZM5 10h14M8 5h8M8 17v4m8-4v4M8 13h.1M16 13h.1',
 health:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',
 safety:'m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Zm-4 9 3 3 5-6',
 services:'M4 21V8h16v13M2 8l10-6 10 6ZM8 11v6m4-6v6m4-6v6M2 21h20',
 traffic:'M5 3 3 21M19 3l2 18M12 3v4m0 4v3m0 4v3M8 9h8v7H8Z',
 well:'m5 12 4 4L19 6'
};
export function needIcon(id){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[id]||paths.well)+'"/></svg>';}
