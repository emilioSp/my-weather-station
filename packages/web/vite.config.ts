// Configure vite when running builds or automated checks.

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/my-weather-station/',
  plugins: [react(), tailwindcss()],
});
