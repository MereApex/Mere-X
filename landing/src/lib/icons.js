/* ============================================================
   ICONS — a single hairline stroke set, 24x24, drawn to sit
   comfortably next to Outfit at 300 weight.
   ============================================================ */

import { raw } from "./dom.js";

export const ICONS = {
  /* --- direction --- */
  "arrow-ne": '<path d="M7 17 17 7"/><path d="M8.4 7H17v8.6"/>',
  "arrow-right": '<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>',
  "arrow-left": '<path d="M20 12H5"/><path d="M11 18l-6-6 6-6"/>',
  "arrow-up": '<path d="M12 20V5"/><path d="M6 11l6-6 6 6"/>',
  "arrow-down": '<path d="M12 4v15"/><path d="M18 13l-6 6-6-6"/>',
  "chevron-down": '<path d="M6 9.5l6 6 6-6"/>',
  "chevron-right": '<path d="M9.5 5.5l6.5 6.5-6.5 6.5"/>',
  "chevron-left": '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  "external": '<path d="M13 4h7v7"/><path d="M20 4L10.5 13.5"/><path d="M18.5 14v5.5h-14v-14H10"/>',

  /* --- state --- */
  check: '<path d="M4.5 12.5l5 5L19.5 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.4"/><path d="M15.5 5.6A2 2 0 0 0 13.6 4H6.1A2.1 2.1 0 0 0 4 6.1v7.5a2 2 0 0 0 1.6 2"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.5-5.8"/><path d="M20.3 4.4v4.4h-4.4"/>',
  trash: '<path d="M4 6.5h16"/><path d="M9.5 4h5v2.5h-5z"/><path d="M6.2 6.5l.9 13.5h9.8l.9-13.5"/><path d="M10.2 10v6.5M13.8 10v6.5"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.4"/><path d="M15.5 15.5L20 20"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  more: '<circle cx="5" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  eye: '<path d="M2 12s3.9-6.6 10-6.6S22 12 22 12s-3.9 6.6-10 6.6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  "eye-off": '<path d="M9.7 5.7A10 10 0 0 1 12 5.4c6.1 0 10 6.6 10 6.6a18 18 0 0 1-3.5 4.2M6.4 7.6A17.6 17.6 0 0 0 2 12s3.9 6.6 10 6.6c1.3 0 2.5-.3 3.6-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3.5 3.5l17 17"/>',
  info: '<circle cx="12" cy="12" r="8.4"/><path d="M12 11v5.5"/><circle cx="12" cy="7.9" r=".85" fill="currentColor" stroke="none"/>',
  alert: '<path d="M12 3.8L21 19.4H3z"/><path d="M12 9.8v4.4"/><circle cx="12" cy="16.9" r=".85" fill="currentColor" stroke="none"/>',
  help: '<circle cx="12" cy="12" r="8.4"/><path d="M9.6 9.7a2.5 2.5 0 1 1 4.9.5c0 1.7-2.4 2-2.4 3.7"/><circle cx="12" cy="17" r=".85" fill="currentColor" stroke="none"/>',

  /* --- product / platform --- */
  key: '<circle cx="8" cy="12" r="3.8"/><path d="M11.8 12H21"/><path d="M17.4 12v3.2M20.2 12v2.2"/>',
  code: '<path d="M8.4 7.4L4 12l4.4 4.6"/><path d="M15.6 7.4L20 12l-4.4 4.6"/><path d="M13.7 4.4l-3.4 15.2"/>',
  terminal: '<rect x="3" y="4.6" width="18" height="14.8" rx="2.2"/><path d="M7.4 9.4l3 2.6-3 2.6M12.8 15h4"/>',
  book: '<path d="M4 4.6h6a3 3 0 0 1 3 3v11.8a2.4 2.4 0 0 0-2.4-2.4H4z"/><path d="M20 4.6h-6a3 3 0 0 0-3 3v11.8a2.4 2.4 0 0 1 2.4-2.4H20z"/>',
  chart: '<path d="M3 20h18"/><path d="M6 20v-8M11 20V5.5M16 20v-5M20.5 20V9"/>',
  activity: '<path d="M3 12.4h4l2.4-6.6 4.2 12.4 2.5-5.8H21"/>',
  gauge: '<path d="M4 17.5a9 9 0 1 1 16 0"/><path d="M12 12.6l4.2-3.3"/><circle cx="12" cy="13.4" r="1.4"/>',
  layers: '<path d="M12 3.4L3 8l9 4.6L21 8z"/><path d="M3 12.6L12 17l9-4.4"/><path d="M3 16.8L12 21.2l9-4.4"/>',
  grid: '<rect x="3.4" y="3.4" width="7.2" height="7.2" rx="1.4"/><rect x="13.4" y="3.4" width="7.2" height="7.2" rx="1.4"/><rect x="3.4" y="13.4" width="7.2" height="7.2" rx="1.4"/><rect x="13.4" y="13.4" width="7.2" height="7.2" rx="1.4"/>',
  list: '<path d="M8 6.5h12M8 12h12M8 17.5h12"/><circle cx="4.2" cy="6.5" r=".9" fill="currentColor" stroke="none"/><circle cx="4.2" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="4.2" cy="17.5" r=".9" fill="currentColor" stroke="none"/>',
  plug: '<path d="M9 3v4.6M15 3v4.6"/><path d="M6.6 7.6h10.8v3.6a5.4 5.4 0 0 1-10.8 0z"/><path d="M12 16.6V21"/>',
  webhook: '<path d="M8.6 10.6a3.6 3.6 0 1 1 5.2 3.2"/><path d="M13.8 13.8l3.1 5.3"/><path d="M9.6 19.1h7.3"/><path d="M6.8 19.1a3.6 3.6 0 0 1-.9-6.6l2.7-4.6"/>',
  server: '<rect x="3" y="4" width="18" height="6.4" rx="1.8"/><rect x="3" y="13.6" width="18" height="6.4" rx="1.8"/><path d="M6.8 7.2h.01M6.8 16.8h.01"/>',
  database: '<ellipse cx="12" cy="5.8" rx="7.4" ry="2.8"/><path d="M4.6 5.8v12.4c0 1.5 3.3 2.8 7.4 2.8s7.4-1.3 7.4-2.8V5.8"/><path d="M4.6 12c0 1.5 3.3 2.8 7.4 2.8s7.4-1.3 7.4-2.8"/>',
  cloud: '<path d="M7.4 18.6h10.2a4 4 0 0 0 .5-8A6.5 6.5 0 0 0 6.1 8.9a4.8 4.8 0 0 0 1.3 9.7z"/>',
  cpu: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3.4v3.6M14 3.4v3.6M10 17v3.6M14 17v3.6M3.4 10H7M3.4 14H7M17 10h3.6M17 14h3.6"/>',
  box: '<path d="M12 3.4l8 4v9.2l-8 4-8-4V7.4z"/><path d="M4 7.4l8 4 8-4M12 11.4v9.2"/>',
  package: '<path d="M20.5 7.6v8.8L12 21l-8.5-4.6V7.6L12 3z"/><path d="M3.5 7.6L12 12l8.5-4.4M7.8 5.3l8.5 4.4"/>',
  sliders: '<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>',
  settings: '<circle cx="12" cy="12" r="3.1"/><path d="M19.2 14.4a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a1.9 1.9 0 1 1-3.8 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.3a1.9 1.9 0 1 1 0-3.8h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5v-.3a1.9 1.9 0 1 1 3.8 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a1.9 1.9 0 1 1 0 3.8h-.2a1.6 1.6 0 0 0-1.5 1z"/>',
  bell: '<path d="M6.4 17.4V10a5.6 5.6 0 1 1 11.2 0v7.4"/><path d="M4 17.4h16"/><path d="M10.2 20.4h3.6"/>',
  card: '<rect x="2.8" y="5" width="18.4" height="14" rx="2.4"/><path d="M2.8 9.8h18.4"/><path d="M6.6 14.6h4"/>',
  usage: '<path d="M3 20h18"/><path d="M6 20V9.5M11 20V4M16 20v-7.5M20.5 20V7"/>',
  clock: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7v5.3l3.4 2"/>',
  calendar: '<rect x="3.4" y="5" width="17.2" height="15.4" rx="2.2"/><path d="M3.4 9.8h17.2M8.4 3.4v3.4M15.6 3.4v3.4"/>',
  mail: '<rect x="3" y="5.2" width="18" height="13.6" rx="2.2"/><path d="M3.6 6.4L12 12.6l8.4-6.2"/>',
  file: '<path d="M6 3h7l5 5v13H6z"/><path d="M13 3v5h5"/>',
  folder: '<path d="M3.2 6h6.2l2.1 2.6h9.3v11H3.2z"/>',
  download: '<path d="M12 3.6v11.8"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  upload: '<path d="M12 20.4V8.6"/><path d="M7 13l5-5 5 5"/><path d="M4 4h16"/>',
  image: '<rect x="3" y="4.6" width="18" height="14.8" rx="2.2"/><circle cx="8.6" cy="9.6" r="1.7"/><path d="M3.4 16.6l4.8-4 3.8 3.1 3.2-2.7 5.4 4.6"/>',
  mic: '<rect x="9.2" y="2.8" width="5.6" height="11.2" rx="2.8"/><path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0"/><path d="M12 17.8v3.4M8.6 21.2h6.8"/>',
  wave: '<path d="M3 9.8v4.4M7.5 6.4v11.2M12 3.6v16.8M16.5 6.4v11.2M21 9.8v4.4"/>',
  play: '<path d="M8 5.4l10 6.6-10 6.6z"/>',
  message: '<path d="M3.6 4.6h16.8v11.8H9.4l-5.8 4.2z"/><path d="M7.6 9h8.8M7.6 12.4h5.4"/>',
  chat: '<path d="M20.4 11.6a7.4 7.4 0 0 1-8 7.4 8 8 0 0 1-2.4-.4l-4.6 1.4 1.4-4.2a7.6 7.6 0 0 1-.8-3.4 7.5 7.5 0 0 1 7.6-7.4 7.5 7.5 0 0 1 6.8 6.6z"/>',
  users: '<circle cx="9" cy="8.2" r="3.4"/><path d="M3 20a6.2 6.2 0 0 1 12 0"/><path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.6"/><path d="M17.4 14.6A5.2 5.2 0 0 1 21 19.6"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.6 20.6a7.4 7.4 0 0 1 14.8 0"/>',
  building: '<path d="M4 20.4V4.6h10v15.8"/><path d="M14 9.6h6v10.8"/><path d="M2.6 20.4h18.8"/><path d="M7 8h4M7 11.6h4M7 15.2h4M16.6 13h1M16.6 16.4h1"/>',
  briefcase: '<rect x="3" y="7.4" width="18" height="12.4" rx="2.2"/><path d="M8.6 7.4V5.6a1.8 1.8 0 0 1 1.8-1.8h3.2a1.8 1.8 0 0 1 1.8 1.8v1.8"/><path d="M3 12.4h18"/>',
  globe: '<circle cx="12" cy="12" r="8.4"/><ellipse cx="12" cy="12" rx="3.6" ry="8.4"/><path d="M3.8 12h16.4M5.4 7h13.2M5.4 17h13.2"/>',
  shield: '<path d="M12 3l7.6 2.8v5.9c0 4.9-3.2 7.8-7.6 8.9-4.4-1.1-7.6-4-7.6-8.9V5.8z"/><path d="M8.8 12l2.2 2.2 4.3-4.6"/>',
  lock: '<rect x="4.4" y="10.2" width="15.2" height="10.4" rx="2.2"/><path d="M8 10.2V7.2a4 4 0 1 1 8 0v3"/>',
  scale: '<path d="M12 3.4v17.2M5 7.2h14M8.2 20.6h7.6"/><path d="M5 7.2l-3 6h6zM19 7.2l-3 6h6z"/>',
  flask: '<path d="M9.6 3.4v5.4L4.8 17.6a2.2 2.2 0 0 0 1.9 3.3h10.6a2.2 2.2 0 0 0 1.9-3.3L14.4 8.8V3.4"/><path d="M8.4 3.4h7.2"/><path d="M7.4 14.4h9.2"/>',
  microscope: '<path d="M7 20.4h12"/><path d="M9.4 20.4a5.6 5.6 0 0 0 7.4-5.3"/><path d="M9.6 15.4h4.4"/><path d="M13 3.6l3.6 3.6-4.4 4.4L8.6 8z"/><path d="M11.2 5.4L8 8.6"/>',
  atom: '<circle cx="12" cy="12" r="1.8"/><ellipse cx="12" cy="12" rx="9.4" ry="4" transform="rotate(35 12 12)"/><ellipse cx="12" cy="12" rx="9.4" ry="4" transform="rotate(-35 12 12)"/>',
  orbit: '<circle cx="12" cy="12" r="3.4"/><ellipse cx="12" cy="12" rx="9.6" ry="4.6" transform="rotate(-24 12 12)"/><circle cx="20" cy="8.4" r="1.5" fill="currentColor" stroke="none"/>',
  network: '<circle cx="12" cy="4.6" r="2.1"/><circle cx="5" cy="18" r="2.1"/><circle cx="19" cy="18" r="2.1"/><path d="M12 6.7v5.6M10.4 13.6L6.4 16.4M13.6 13.6l4 2.8"/><circle cx="12" cy="13" r="1"/>',
  sparkle: '<path d="M12 3.2l1.9 5.5 5.5 1.9-5.5 1.9-1.9 5.5-1.9-5.5L4.6 10.6l5.5-1.9z"/><path d="M18.4 16.4l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  bolt: '<path d="M13.4 2.6L4.8 13.4h6.2l-.6 8L19.2 10.6H13z"/>',
  target: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  compass: '<circle cx="12" cy="12" r="8.4"/><path d="M15.4 8.6l-2 4.8-4.8 2 2-4.8z"/>',
  rocket: '<path d="M12 2.8c3.4 2.4 5.2 6 5.2 10.2l-2.4 3.4H9.2L6.8 13C6.8 8.8 8.6 5.2 12 2.8z"/><circle cx="12" cy="10" r="2"/><path d="M9.2 16.4l-2.6 1.2.6-3.6M14.8 16.4l2.6 1.2-.6-3.6"/><path d="M10.6 19.4c.4 1 .8 1.6 1.4 2.2.6-.6 1-1.2 1.4-2.2"/>',
  star: '<path d="M12 3.4l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.9l6.1-.9z"/>',
  heart: '<path d="M12 20.4S3.6 15.6 3.6 9.8A4.6 4.6 0 0 1 12 7.2a4.6 4.6 0 0 1 8.4 2.6c0 5.8-8.4 10.6-8.4 10.6z"/>',
  quote: '<path d="M9.4 6.6c-2.8 1.2-4.4 3.6-4.4 6.4v4.4h5.4v-5.4H7.2c0-2 .8-3.4 2.8-4.2z"/><path d="M18.6 6.6c-2.8 1.2-4.4 3.6-4.4 6.4v4.4h5.4v-5.4h-3.2c0-2 .8-3.4 2.8-4.2z"/>',
  news: '<path d="M4 5h13v14.2H5.6A1.6 1.6 0 0 1 4 17.6z"/><path d="M17 8.4h3v9.2a1.6 1.6 0 0 1-3 0z"/><path d="M7 8.4h7M7 11.6h7M7 14.8h4"/>',
  graduation: '<path d="M2.6 8.8L12 4.6l9.4 4.2-9.4 4.2z"/><path d="M6.4 10.8v4.6c0 1.6 2.5 2.8 5.6 2.8s5.6-1.2 5.6-2.8v-4.6"/><path d="M21.4 8.8v5.4"/>',
  trending: '<path d="M3 16.6l5.4-5.4 3.4 3.4L21 5.6"/><path d="M15.4 5.6H21v5.6"/>',
  moon: '<path d="M20 15.2A8.3 8.3 0 0 1 8.8 4a8.4 8.4 0 1 0 11.2 11.2z"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.4 5.4l1.8 1.8M16.8 16.8l1.8 1.8M18.6 5.4l-1.8 1.8M7.2 16.8l-1.8 1.8"/>',
  logout: '<path d="M10.4 4H4.4v16h6"/><path d="M14.6 8l4 4-4 4M8.8 12h9.8"/>',
  link: '<path d="M10.2 13.8a4 4 0 0 0 5.6 0l2.8-2.8a4 4 0 0 0-5.6-5.6l-1.4 1.4"/><path d="M13.8 10.2a4 4 0 0 0-5.6 0l-2.8 2.8a4 4 0 0 0 5.6 5.6l1.4-1.4"/>',
  hash: '<path d="M9.4 3.6L7.6 20.4M16.4 3.6l-1.8 16.8M4 8.8h16.4M3.6 15.2H20"/>',
  branch: '<circle cx="6.4" cy="5.6" r="2.2"/><circle cx="6.4" cy="18.4" r="2.2"/><circle cx="17.6" cy="9.4" r="2.2"/><path d="M6.4 7.8v8.4"/><path d="M17.6 11.6c0 3-2.6 4.4-5.6 4.8-2.2.3-3.6 1-3.6 2"/>',
  stack: '<rect x="3.4" y="3.6" width="17.2" height="5" rx="1.6"/><rect x="3.4" y="10.4" width="17.2" height="5" rx="1.6"/><path d="M6 18.6h12"/>',
  puzzle: '<path d="M9.4 3.4h5.2v2.2a1.9 1.9 0 1 0 3.8 0V3.4h2.2v5.2h-2.2a1.9 1.9 0 1 0 0 3.8h2.2v8.2h-8.2v-2.2a1.9 1.9 0 1 0-3.8 0v2.2H3.4v-8.2h2.2a1.9 1.9 0 1 0 0-3.8H3.4V3.4h6z"/>',
  wand: '<path d="M4.6 19.4L15 9"/><path d="M13.6 4.2l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z"/><path d="M19.2 12.6l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z"/>',
  translate: '<path d="M3.6 6.2h8.8"/><path d="M8 4v2.2"/><path d="M10.4 6.2c0 3.8-2.6 7.6-6.8 9.4"/><path d="M5.4 11.6c1.4 2 3.2 3.4 5.6 4.2"/><path d="M12.4 20.4l4-9.6 4 9.6"/><path d="M13.8 17.2h5.2"/>',
  robot: '<rect x="4" y="7.6" width="16" height="11.4" rx="3"/><path d="M12 3.6v4"/><circle cx="12" cy="3.2" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="13" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.1" fill="currentColor" stroke="none"/><path d="M9.6 16.4h4.8"/>',
  fingerprint: '<path d="M12 4.4a7.6 7.6 0 0 0-7.6 7.6v2.2"/><path d="M19.6 12a7.6 7.6 0 0 0-3.4-6.3"/><path d="M8 12a4 4 0 0 1 8 0v2.6a10 10 0 0 1-.8 4"/><path d="M12 12v3.4a13 13 0 0 1-1.4 5.8"/><path d="M5.6 18.4a11 11 0 0 0 1-4.4"/><path d="M19.4 15.6a13.6 13.6 0 0 1-.8 4.2"/>',
  scan: '<path d="M4 8.4V6a2 2 0 0 1 2-2h2.4M15.6 4H18a2 2 0 0 1 2 2v2.4M20 15.6V18a2 2 0 0 1-2 2h-2.4M8.4 20H6a2 2 0 0 1-2-2v-2.4"/><path d="M4 12h16"/>',
  infinity: '<path d="M7.4 8.6a3.4 3.4 0 1 0 0 6.8c3.4 0 5.8-6.8 9.2-6.8a3.4 3.4 0 1 1 0 6.8c-3.4 0-5.8-6.8-9.2-6.8z"/>',
  spinner: '<path d="M12 3.6v3.8" opacity=".95"/><path d="M12 16.6v3.8" opacity=".35"/><path d="M20.4 12h-3.8" opacity=".55"/><path d="M7.4 12H3.6" opacity=".8"/><path d="M18 6l-2.7 2.7" opacity=".7"/><path d="M8.7 15.3L6 18" opacity=".45"/><path d="M18 18l-2.7-2.7" opacity=".4"/><path d="M8.7 8.7L6 6" opacity=".9"/>'
};

export function icon(name, className = "icon") {
  const body = ICONS[name] || ICONS.info;
  return raw(
    `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`
  );
}

/** The master Mere X monogram. Its colour is controlled by CSS per theme. */
export function mereXMark(height = 32) {
  return raw(`<img class="brand-glyph" src="/brand/mere-x-mark.png" alt=""
    width="1536" height="1024" style="--glyph-h:${height}px" decoding="async" />`);
}

/** A crisp text wordmark that remains sharp at every viewport size. */
export function mereXWordmark(height = 16) {
  return raw(`<span class="brand-wordmark" style="--wordmark-h:${height}px">Mere X</span>`);
}

/** Circular tick ring used around the hero orb. */
export function tickRing(count = 72) {
  let out = "";
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const long = i % 6 === 0;
    const r1 = long ? 44 : 46.5;
    const r2 = 48;
    out += `<line x1="${(50 + Math.cos(angle) * r1).toFixed(2)}" y1="${(50 + Math.sin(angle) * r1).toFixed(2)}" x2="${(50 + Math.cos(angle) * r2).toFixed(2)}" y2="${(50 + Math.sin(angle) * r2).toFixed(2)}" opacity="${long ? 0.9 : 0.4}"/>`;
  }
  return raw(`<svg class="orb-ticks" viewBox="0 0 100 100" aria-hidden="true">${out}</svg>`);
}

/* ============================================================
   PILLAR ICONS — the four marks in the homepage feature band.
   Drawn at 48x48 with a finer stroke than the UI set: they sit
   bare on the paper rather than inside a tile, so they carry
   more detail and read as small diagrams.
   ============================================================ */

export const PILLAR_ICONS = {
  /* Precision reticle — research */
  reticle:
    '<circle cx="24" cy="24" r="13"/>' +
    '<circle cx="24" cy="24" r="6.2"/>' +
    '<circle cx="24" cy="24" r="1.5" fill="currentColor" stroke="none"/>' +
    '<path d="M24 3.5v9M24 35.5v9M3.5 24h9M35.5 24h9"/>' +
    '<path d="M14.8 33.2 6.6 41.4"/>' +
    '<circle cx="5.4" cy="42.6" r="1.6"/>',

  /* Stacked plates — safety by design */
  plates:
    '<path d="M24 5.6 42 14.2 24 22.8 6 14.2z"/>' +
    '<path d="M6 21.4 24 30l18-8.6"/>' +
    '<path d="M6 28.6 24 37.2l18-8.6"/>' +
    '<path d="M6 35.8 24 44.4l18-8.6"/>',

  /* Ring of nodes — human-centred */
  nodes:
    '<circle cx="12.51" cy="14.36" r="3.10" fill="currentColor" stroke="none"/><circle cx="17.76" cy="10.36" r="2.92" fill="currentColor" stroke="none"/><circle cx="24.22" cy="9.00" r="2.74" fill="currentColor" stroke="none"/><circle cx="30.63" cy="10.55" r="2.56" fill="currentColor" stroke="none"/><circle cx="35.77" cy="14.70" r="2.38" fill="currentColor" stroke="none"/><circle cx="38.62" cy="20.65" r="2.20" fill="currentColor" stroke="none"/><circle cx="38.64" cy="27.25" r="2.03" fill="currentColor" stroke="none"/><circle cx="35.83" cy="33.22" r="1.85" fill="currentColor" stroke="none"/><circle cx="30.73" cy="37.40" r="1.67" fill="currentColor" stroke="none"/><circle cx="24.33" cy="39.00" r="1.49" fill="currentColor" stroke="none"/><circle cx="17.86" cy="37.69" r="1.31" fill="currentColor" stroke="none"/><circle cx="12.58" cy="33.73" r="1.13" fill="currentColor" stroke="none"/><circle cx="9.51" cy="27.88" r="0.95" fill="currentColor" stroke="none"/>',

  /* Radial burst — long-term impact */
  burst:
    '<path d="M28.20 24.00L44.50 24.00M28.06 25.09L37.52 27.62M27.64 26.10L41.75 34.25M26.97 26.97L33.90 33.90M26.10 27.64L34.25 41.75M25.09 28.06L27.62 37.52M24.00 28.20L24.00 44.50M22.91 28.06L20.38 37.52M21.90 27.64L13.75 41.75M21.03 26.97L14.10 33.90M20.36 26.10L6.25 34.25M19.94 25.09L10.48 27.62M19.80 24.00L3.50 24.00M19.94 22.91L10.48 20.38M20.36 21.90L6.25 13.75M21.03 21.03L14.10 14.10M21.90 20.36L13.75 6.25M22.91 19.94L20.38 10.48M24.00 19.80L24.00 3.50M25.09 19.94L27.62 10.48M26.10 20.36L34.25 6.25M26.97 21.03L33.90 14.10M27.64 21.90L41.75 13.75M28.06 22.91L37.52 20.38"/>' +
    '<circle cx="24" cy="24" r="2.6" fill="currentColor" stroke="none"/>'
};

export function pillarIcon(name, size = 46) {
  const body = PILLAR_ICONS[name];
  if (!body) return icon(name);
  return raw(
    `<svg class="pillar-icon" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true" focusable="false">${body}</svg>`
  );
}
