import { defineConfig } from 'astro/config';

// Static output only: the site is plain HTML served by nginx, no server code.
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  build: {
    // Never inline CSS or JS: the nginx Content-Security-Policy (same as
    // methodica.nl) forbids inline styles and scripts.
    inlineStylesheets: 'never',
  },
  vite: {
    // The exercises live in /exercises (outside site/) so they are readable
    // on GitHub as well. Vite must be allowed to read that folder.
    server: { fs: { allow: ['..'] } },
  },
});
