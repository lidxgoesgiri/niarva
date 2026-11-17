// Keep the page icon consistent with the existing NIARVA glyph.
const glyph = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#0B1024"/>
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#B894FA"/><stop offset="1" stop-color="#4F6CF6"/>
  </linearGradient></defs>
  <path d="M6 26V6l20 20V6" fill="none" stroke="url(#g)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="26" cy="6" r="2.4" fill="#E9EDF5"/>
</svg>`;

export const landingIcon = `data:image/svg+xml,${encodeURIComponent(glyph)}`;
