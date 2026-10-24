import { defineConfig } from 'vite';
import { t } from './src/localization';
export default defineConfig({
  base: process.env.PAGES_BASE_PATH || '/chiken-simulator/',
  plugins: [
    {
      name: 'localized-html',
      transformIndexHtml(html) {
        return html
          .replace('<!--game-title-->', t.meta.title)
          .replace('<!--game-description-->', t.meta.description)
          .replace('data-language', `lang="${t.language}"`);
      },
    },
  ],
});
