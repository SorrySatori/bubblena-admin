# 🛍️ Bubblena Admin Panel

A simple and elegant admin panel for managing Bubblena orders.

## Features

- 📊 **Dashboard Overview**: View statistics for all orders at a glance
- 📋 **Order Management**: See all orders with customer details, items, and totals
- 🔄 **Status Updates**: Easily change order status (Pending → Processing → Shipped → Delivered)
- 🎨 **Modern UI**: Beautiful gradient design with responsive layout
- ⚡ **Real-time Updates**: Changes are reflected immediately

## Prerequisites

Make sure the backend server is running at `http://localhost:3001`

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The admin panel will be available at `http://localhost:5173`

## Build for Production

```bash
npm run build
```

## Order Statuses

- **Pending**: New order, awaiting processing
- **Processing**: Order is being prepared
- **Shipped**: Order has been shipped to customer
- **Delivered**: Order successfully delivered
- **Cancelled**: Order has been cancelled

## Tech Stack

- React 18
- TypeScript
- Vite
- CSS3 (with modern gradients and animations)

## API Endpoints Used

- `GET /api/order` - Fetch all orders
- `PATCH /api/order/:orderId/status` - Update order status
