# Bubblena Admin Panel - Setup Guide

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file and add your configuration:

```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_KEY=your_api_key_here
```

**Important:** Get the `VITE_API_KEY` value from your backend's `.env` file. It should match the `API_KEY` variable in `bubblena-be/.env`.

### 3. Start the Development Server

```bash
npm run dev
```

The admin panel will be available at `http://localhost:5173`

### 4. Login

Use the default credentials:
- **Username:** `kapybara`
- **Password:** `TajnyHeslo666`

## Features Available

### 📦 Orders Tab
- View all orders
- Update order status (pending, processing, shipped, delivered, cancelled)
- View customer information
- Track order statistics

### 📊 Stock Management Tab

#### Overview
- View total items in stock
- See all bath bomb variants with stock levels
- See all steamer products with stock levels
- Monitor low stock items (< 10 pieces)

#### Add Stock
- Select product type (Bath Bomb or Steamer)
- Choose specific product and variant
- Add quantity to existing stock
- Real-time stock updates

## Troubleshooting

### Backend Connection Issues

If you see "Error connecting to server" or "Error loading stock data":

1. **Check if backend is running:**
   ```bash
   cd ../bubblena-be
   npm run dev
   ```

2. **Verify API URL:**
   - Make sure `VITE_API_BASE_URL` in your `.env` matches your backend URL
   - Default: `http://localhost:3001/api`

3. **Check API Key:**
   - Ensure `VITE_API_KEY` matches the `API_KEY` in your backend `.env`
   - The backend requires this for authentication

4. **Restart dev server after .env changes:**
   ```bash
   # Stop the dev server (Ctrl+C)
   npm run dev
   ```

### Authentication Issues

If you can't log in:
- Verify you're using the correct credentials (see above)
- Clear browser localStorage: Open DevTools → Application → Local Storage → Clear

### Stock Management Not Loading

If products/steamers don't appear:
1. Check that you have products and steamers in your database
2. Verify the backend API endpoints are working:
   - `GET http://localhost:3001/api/products`
   - `GET http://localhost:3001/api/steamers`
3. Check browser console for error messages

## Backend Requirements

Make sure your backend (`bubblena-be`) has:

1. **Products (Bath Bombs)** with variants:
   ```typescript
   {
     name: "Product Name",
     variants: [
       {
         weight: 100,
         price: 150,
         stockCount: 50,
         inStock: true
       }
     ]
   }
   ```

2. **Steamers**:
   ```typescript
   {
     name: "Steamer Name",
     price: 120,
     weight: 80,
     stockCount: 30,
     inStock: true
   }
   ```

## Production Deployment

### 1. Update Production Environment

Create `.env.production`:

```bash
VITE_API_BASE_URL=https://api.bubblena.cz/api
VITE_API_KEY=your_production_api_key
```

### 2. Build

```bash
npm run build
```

### 3. Deploy

Upload the `dist/` folder to your hosting provider (Netlify, Vercel, etc.)

## Additional Documentation

- [STOCK_MANAGEMENT.md](./STOCK_MANAGEMENT.md) - Detailed stock management documentation
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Authentication implementation details
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Environment variables guide
- [README.md](./README.md) - General project information

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check the backend logs
3. Verify all environment variables are set correctly
4. Ensure the backend is running and accessible
