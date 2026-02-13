import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, '.'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },
});
```

---

## 🎯 **Alternative: Check .gitignore**

Create/update `.gitignore` to make SURE `index.html` is not being ignored:

### **File:** `Globe-Trekker/client/.gitignore`
```
node_modules
dist
.env
.env.local
*.log

# Make sure index.html is NOT ignored
!index.html
