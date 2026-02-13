import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
```

**Critical part:** The `resolve.alias` section tells Vite that `@` means `./src`.

---

## 📁 **Verify File Location**

Make sure your file structure is EXACTLY like this:
```
Globe-Trekker/client/
├── src/
│   ├── data/
│   │   ├── treks.json      ← Must exist here
│   │   └── treks.ts        ← Must exist here
│   ├── components/
│   │   └── GlobeViewer.tsx
│   ├── store/
│   ├── lib/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── vite.config.ts          ← Must have path alias
├── package.json
└── index.html
