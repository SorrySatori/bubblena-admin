import { useState, useEffect } from 'react'
import './StockManagement.css'

interface ProductVariant {
  weight: number
  price: number
  stockCount: number
  inStock: boolean
}

interface Product {
  _id: string
  name: string
  variants: ProductVariant[]
  createdAt?: string
  updatedAt?: string
}

interface Steamer {
  _id: string
  name: string
  price: number
  weight: number
  stockCount: number
  inStock: boolean
  createdAt?: string
  updatedAt?: string
}

interface StockManagementProps {
  apiBaseUrl: string
}

const StockManagement = ({ apiBaseUrl }: StockManagementProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'add'>('overview')
  const [products, setProducts] = useState<Product[]>([])
  const [steamers, setSteamers] = useState<Steamer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Add form states
  const [productType, setProductType] = useState<'bathbomb' | 'steamer'>('bathbomb')
  const [operation, setOperation] = useState<'add' | 'remove'>('add')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedSteamer, setSelectedSteamer] = useState('')
  const [weightVariant, setWeightVariant] = useState('')
  const [quantity, setQuantity] = useState('')

  useEffect(() => {
    fetchStock()
  }, [])

  const fetchStock = async () => {
    try {
      setLoading(true)
      setError(null)

      const headers = {
        'x-api-key': import.meta.env.VITE_API_KEY || ''
      }

      const [productsRes, steamersRes] = await Promise.all([
        fetch(`${apiBaseUrl}/products`, { headers }),
        fetch(`${apiBaseUrl}/steamers`, { headers })
      ])

      const productsData = await productsRes.json()
      const steamersData = await steamersRes.json()

      setProducts(productsData)
      setSteamers(steamersData)
    } catch (err) {
      setError('Error loading stock data. Make sure the backend is running.')
      console.error('Error fetching stock:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    try {
      if (productType === 'bathbomb') {
        if (!selectedProduct || !weightVariant || !quantity) {
          setError('Please fill in all fields for bath bomb')
          return
        }

        // Find the product and update the specific variant
        const product = products.find(p => p._id === selectedProduct)
        if (!product) {
          setError('Product not found')
          return
        }

        const variantIndex = product.variants.findIndex(v => v.weight === parseFloat(weightVariant))
        if (variantIndex === -1) {
          setError('Weight variant not found')
          return
        }

        // Calculate new stock count
        const currentStock = product.variants[variantIndex].stockCount
        const quantityNum = parseInt(quantity)
        const newStockCount = operation === 'add' 
          ? currentStock + quantityNum 
          : currentStock - quantityNum

        // Validate stock count
        if (newStockCount < 0) {
          setError(`Cannot remove ${quantityNum} items. Only ${currentStock} in stock.`)
          return
        }

        // Update the variant stock count
        const updatedVariants = [...product.variants]
        updatedVariants[variantIndex] = {
          ...updatedVariants[variantIndex],
          stockCount: newStockCount,
          inStock: newStockCount > 0
        }

        const response = await fetch(`${apiBaseUrl}/products/${selectedProduct}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_API_KEY || ''
          },
          body: JSON.stringify({
            ...product,
            variants: updatedVariants
          }),
        })

        if (response.ok) {
          const action = operation === 'add' ? 'added' : 'removed'
          const preposition = operation === 'add' ? 'to' : 'from'
          setSuccessMessage(`Successfully ${action} ${quantity} pieces ${preposition} ${product.name} (${weightVariant}g)`)
          fetchStock()
          resetForm()
        } else {
          setError('Failed to update stock')
        }
      } else {
        // Steamer
        if (!selectedSteamer || !quantity) {
          setError('Please fill in all fields for steamer')
          return
        }

        const steamer = steamers.find(s => s._id === selectedSteamer)
        if (!steamer) {
          setError('Steamer not found')
          return
        }

        // Calculate new stock count
        const currentStock = steamer.stockCount
        const quantityNum = parseInt(quantity)
        const newStockCount = operation === 'add' 
          ? currentStock + quantityNum 
          : currentStock - quantityNum

        // Validate stock count
        if (newStockCount < 0) {
          setError(`Cannot remove ${quantityNum} items. Only ${currentStock} in stock.`)
          return
        }

        const response = await fetch(`${apiBaseUrl}/steamers/${selectedSteamer}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_API_KEY || ''
          },
          body: JSON.stringify({
            ...steamer,
            stockCount: newStockCount,
            inStock: newStockCount > 0
          }),
        })

        if (response.ok) {
          const action = operation === 'add' ? 'added' : 'removed'
          const preposition = operation === 'add' ? 'to' : 'from'
          setSuccessMessage(`Successfully ${action} ${quantity} pieces ${preposition} ${steamer.name}`)
          fetchStock()
          resetForm()
        } else {
          setError('Failed to update stock')
        }
      }
    } catch (err) {
      setError('Error updating stock')
      console.error('Error:', err)
    }
  }

  const resetForm = () => {
    setSelectedProduct('')
    setSelectedSteamer('')
    setWeightVariant('')
    setQuantity('')
  }

  const getTotalStock = () => {
    const productStock = products.reduce((total, product) => {
      return total + product.variants.reduce((sum, variant) => sum + variant.stockCount, 0)
    }, 0)
    const steamerStock = steamers.reduce((total, steamer) => total + steamer.stockCount, 0)
    return productStock + steamerStock
  }

  const getLowStockItems = () => {
    const lowStockProducts = products.flatMap(product =>
      product.variants
        .filter(variant => variant.stockCount < 10)
        .map(variant => ({
          name: `${product.name} (${variant.weight}g)`,
          stock: variant.stockCount,
          type: 'Bath Bomb'
        }))
    )

    const lowStockSteamers = steamers
      .filter(steamer => steamer.stockCount < 10)
      .map(steamer => ({
        name: steamer.name,
        stock: steamer.stockCount,
        type: 'Steamer'
      }))

    return [...lowStockProducts, ...lowStockSteamers]
  }

  const selectedProductData = products.find(p => p._id === selectedProduct)

  return (
    <div className="stock-management">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Stock Overview
        </button>
        <button
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          ➕ Add Stock
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="overview-section">
          <div className="stock-stats">
            <div className="stat-card">
              <h3>Total Items in Stock</h3>
              <p className="stat-number">{getTotalStock()}</p>
            </div>
            <div className="stat-card">
              <h3>Bath Bomb Types</h3>
              <p className="stat-number">{products.length}</p>
            </div>
            <div className="stat-card">
              <h3>Steamer Types</h3>
              <p className="stat-number">{steamers.length}</p>
            </div>
            <div className="stat-card warning">
              <h3>Low Stock Items</h3>
              <p className="stat-number">{getLowStockItems().length}</p>
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading stock data...</div>
          ) : (
            <>
              <div className="stock-section">
                <h2>🛁 Bath Bombs</h2>
                {products.length === 0 ? (
                  <p className="no-data">No bath bombs found</p>
                ) : (
                  <div className="stock-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>Weight</th>
                          <th>Price</th>
                          <th>Stock Count</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) =>
                          product.variants.map((variant, index) => (
                            <tr key={`${product._id}-${index}`}>
                              <td>{product.name}</td>
                              <td>{variant.weight}g</td>
                              <td>{variant.price} Kč</td>
                              <td>
                                <span className={variant.stockCount < 10 ? 'low-stock' : ''}>
                                  {variant.stockCount}
                                </span>
                              </td>
                              <td>
                                <span className={`status ${variant.inStock ? 'in-stock' : 'out-of-stock'}`}>
                                  {variant.inStock ? '✓ In Stock' : '✗ Out of Stock'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="stock-section">
                <h2>💨 Steamers</h2>
                {steamers.length === 0 ? (
                  <p className="no-data">No steamers found</p>
                ) : (
                  <div className="stock-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>Weight</th>
                          <th>Price</th>
                          <th>Stock Count</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {steamers.map((steamer) => (
                          <tr key={steamer._id}>
                            <td>{steamer.name}</td>
                            <td>{steamer.weight}g</td>
                            <td>{steamer.price} Kč</td>
                            <td>
                              <span className={steamer.stockCount < 10 ? 'low-stock' : ''}>
                                {steamer.stockCount}
                              </span>
                            </td>
                            <td>
                              <span className={`status ${steamer.inStock ? 'in-stock' : 'out-of-stock'}`}>
                                {steamer.inStock ? '✓ In Stock' : '✗ Out of Stock'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {getLowStockItems().length > 0 && (
                <div className="stock-section low-stock-alert">
                  <h2>⚠️ Low Stock Alert</h2>
                  <div className="low-stock-list">
                    {getLowStockItems().map((item, index) => (
                      <div key={index} className="low-stock-item">
                        <span className="item-name">{item.name}</span>
                        <span className="item-type">{item.type}</span>
                        <span className="item-stock">{item.stock} left</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'add' && (
        <div className="add-section">
          <h2>Manage Stock</h2>
          
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          <form onSubmit={handleAddStock} className="add-form">
            <div className="form-group">
              <label>Operation</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    value="add"
                    checked={operation === 'add'}
                    onChange={(e) => setOperation(e.target.value as 'add' | 'remove')}
                  />
                  ➕ Add to Stock
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    value="remove"
                    checked={operation === 'remove'}
                    onChange={(e) => setOperation(e.target.value as 'add' | 'remove')}
                  />
                  ➖ Remove from Stock
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Product Type</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    value="bathbomb"
                    checked={productType === 'bathbomb'}
                    onChange={(e) => setProductType(e.target.value as 'bathbomb' | 'steamer')}
                  />
                  🛁 Bath Bomb
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    value="steamer"
                    checked={productType === 'steamer'}
                    onChange={(e) => setProductType(e.target.value as 'bathbomb' | 'steamer')}
                  />
                  💨 Steamer
                </label>
              </div>
            </div>

            {productType === 'bathbomb' ? (
              <>
                <div className="form-group">
                  <label htmlFor="product">Select Bath Bomb</label>
                  <select
                    id="product"
                    value={selectedProduct}
                    onChange={(e) => {
                      setSelectedProduct(e.target.value)
                      setWeightVariant('')
                    }}
                    required
                  >
                    <option value="">-- Select Bath Bomb --</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProduct && selectedProductData && (
                  <div className="form-group">
                    <label htmlFor="weight">Select Weight Variant</label>
                    <select
                      id="weight"
                      value={weightVariant}
                      onChange={(e) => setWeightVariant(e.target.value)}
                      required
                    >
                      <option value="">-- Select Weight --</option>
                      {selectedProductData.variants.map((variant, index) => (
                        <option key={index} value={variant.weight}>
                          {variant.weight}g (Current stock: {variant.stockCount})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <div className="form-group">
                <label htmlFor="steamer">Select Steamer</label>
                <select
                  id="steamer"
                  value={selectedSteamer}
                  onChange={(e) => setSelectedSteamer(e.target.value)}
                  required
                >
                  <option value="">-- Select Steamer --</option>
                  {steamers.map((steamer) => (
                    <option key={steamer._id} value={steamer._id}>
                      {steamer.name} (Current stock: {steamer.stockCount})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="quantity">
                {operation === 'add' ? 'Quantity to Add' : 'Quantity to Remove'}
              </label>
              <input
                type="number"
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                placeholder="Enter quantity"
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className={`submit-button ${operation === 'remove' ? 'remove-button' : ''}`}>
                {operation === 'add' ? '➕ Add to Stock' : '➖ Remove from Stock'}
              </button>
              <button type="button" onClick={resetForm} className="reset-button">
                Reset
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default StockManagement
