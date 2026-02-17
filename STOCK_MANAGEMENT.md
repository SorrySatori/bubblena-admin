# Stock Management Feature

## Overview

The Stock Management feature allows you to manage inventory for bath bombs and steamers in the Bubblena Admin Panel.

## Features

### 1. Stock Overview Tab
- **Total Items in Stock**: Shows the total count of all products and steamers
- **Product Statistics**: Displays the number of bath bomb types and steamer types
- **Low Stock Alert**: Highlights items with less than 10 pieces in stock
- **Detailed Tables**: 
  - Bath Bombs table showing all variants with weight, price, stock count, and status
  - Steamers table showing all products with weight, price, stock count, and status

### 2. Manage Stock Tab
- **Operation Selection**: Choose between Add to Stock or Remove from Stock
- **Product Type Selection**: Choose between Bath Bomb or Steamer
- **Bath Bombs**:
  - Select from existing bath bomb products
  - Choose weight variant (e.g., 100g, 150g, 200g)
  - Enter quantity to add or remove
  - Current stock is displayed for reference
  - Validation prevents removing more items than available
- **Steamers**:
  - Select from existing steamer products
  - Enter quantity to add or remove
  - Current stock is displayed for reference
  - Validation prevents removing more items than available

## How to Use

### Viewing Stock
1. Navigate to the "Stock Management" tab in the main navigation
2. The Overview tab shows all current stock levels
3. Items with low stock (< 10 pieces) are highlighted in red
4. Check the "Low Stock Alert" section for items that need restocking

### Managing Stock
1. Click on the "Add Stock" tab (now labeled "Manage Stock")
2. Select the operation (Add to Stock or Remove from Stock)
3. Select the product type (Bath Bomb or Steamer)
4. Choose the specific product from the dropdown
5. For bath bombs, select the weight variant
6. Enter the quantity to add or remove
7. Click "Add to Stock" or "Remove from Stock"
8. A success message will confirm the update

**Note**: When removing stock, the system validates that you don't remove more items than are currently available. If you try to remove more than the current stock, you'll see an error message.

## API Integration

The stock management feature integrates with the following backend endpoints:

### Products (Bath Bombs)
- **GET** `/api/products` - Fetch all bath bomb products
- **PUT** `/api/products/:id` - Update product stock levels

### Steamers
- **GET** `/api/steamers` - Fetch all steamer products
- **PUT** `/api/steamers/:id` - Update steamer stock levels

## Authentication

All API requests require the `x-api-key` header with a valid API key. Make sure to set the `VITE_API_KEY` environment variable in your `.env` file.

## Environment Variables

Add the following to your `.env` file:

```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_KEY=your_api_key_here
```

## Data Models

### Bath Bomb (Product)
```typescript
interface Product {
  _id: string
  name: string
  variants: ProductVariant[]
  // ... other fields
}

interface ProductVariant {
  weight: number        // in grams
  price: number         // in CZK
  stockCount: number    // number of pieces
  inStock: boolean      // availability status
}
```

### Steamer
```typescript
interface Steamer {
  _id: string
  name: string
  price: number         // in CZK
  weight: number        // in grams
  stockCount: number    // number of pieces
  inStock: boolean      // availability status
  // ... other fields
}
```

## Notes

- Stock counts are automatically updated when adding inventory
- The `inStock` status is automatically set to `true` when adding stock
- Low stock threshold is set at 10 pieces
- All prices are displayed in Czech Koruna (CZK)
- Weight is displayed in grams (g)

## Features

### Stock Operations
- ✅ **Add to Stock**: Increase inventory levels
- ✅ **Remove from Stock**: Decrease inventory levels with validation
- ✅ **Automatic Status Updates**: `inStock` status automatically updates based on stock levels
- ✅ **Stock Validation**: Prevents removing more items than available

## Future Enhancements

Potential improvements for the stock management feature:
- Stock history and audit log
- Automatic low stock notifications via email
- Bulk stock updates (CSV import)
- Export stock data to CSV
- Stock forecasting based on order history
- Stock movement reports
