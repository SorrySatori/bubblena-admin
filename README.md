# 🛍️ Bubblena Admin Panel

Admin panel for managing Bubblena e-commerce orders. Built with React, TypeScript, and Vite.

## Features

- 📊 Order management dashboard
- 📦 Stock management for bath bombs and steamers
- 🔐 Simple authentication system
- 📈 Real-time order statistics
- ✏️ Update order statuses
- ➕ Add inventory with variant support
- ⚠️ Low stock alerts
- 🎨 Beautiful gradient UI
- 📱 Responsive design

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API running (bubblena-be)

### Installation


```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev
```

The admin panel will be available at `http://localhost:5173`

### Default Credentials

- **Username:** `kapybara`
- **Password:** `TajnyHeslo666`

⚠️ **Security Note:** This is a client-side only authentication suitable for internal tools. For production, ensure network-level security (VPN, IP whitelisting) is in place.

## Environment Configuration

See [ENVIRONMENT.md](./ENVIRONMENT.md) for detailed environment variable setup.

**Key Variables:**
- `VITE_API_BASE_URL` - Backend API base URL (default: `http://localhost:3001/api`)
- `VITE_API_KEY` - API key for backend authentication

## Authentication

See [AUTHENTICATION.md](./AUTHENTICATION.md) for authentication implementation details.

## Stock Management

See [STOCK_MANAGEMENT.md](./STOCK_MANAGEMENT.md) for detailed information about managing inventory.

**Quick Overview:**
- View all bath bomb and steamer inventory
- Add stock for specific product variants
- Monitor low stock items (< 10 pieces)
- Real-time stock updates

## Project Structure

```
src/
├── components/
│   ├── Login.tsx              # Login component
│   ├── Login.css              # Login styles
│   ├── StockManagement.tsx    # Stock management component
│   └── StockManagement.css    # Stock management styles
├── App.tsx                     # Main application component
├── App.css                     # Application styles
├── vite-env.d.ts              # Environment variable types
└── main.tsx                    # Application entry point
```

## Available Scripts

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Linting
npm run lint         # Run ESLint
```

## Deployment

### Building for Production

1. Update `.env.production` with your production API URL:
   ```
   VITE_API_BASE_URL=https://api.bubblena.cz/api
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Deploy the `dist/` folder to your hosting provider

### Hosting Options

- Netlify
- Vercel
- GitHub Pages
- Any static hosting service

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **CSS3** - Styling with gradients and animations

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
