import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'next/navigation': path.resolve(__dirname, 'src/lib/next-navigation.ts'),
      'next/link': path.resolve(__dirname, 'src/lib/next-link.tsx'),
    },
  },
});
