import { useState, useEffect } from 'react'
import './StockManagement.css'

interface BombVariant {
  weight: number
  price: number
  stockCount: number
  inStock: boolean
}

interface BombBatch {
  _id?: string
  batchId: string
  variants: BombVariant[]
}

interface BombLot {
  _id?: string
  lotNumber: string
  batches: BombBatch[]
}

interface Bomb {
  _id: string
  name: string
  acronym: string
  lots: BombLot[]
  createdAt?: string
  updatedAt?: string
}

interface SteamerBatch {
  _id?: string
  batchId: string
  stockCount: number
}

interface SteamerLot {
  _id?: string
  lotNumber: string
  batches: SteamerBatch[]
}

interface Steamer {
  _id: string
  name: string
  price: number
  weight: number
  stockCount: number
  inStock: boolean
  lots: SteamerLot[]
  createdAt?: string
  updatedAt?: string
}

interface DamagedProduct {
  _id: string
  bathBombType: string
  weight: number
  price: number
  damageLevel: 'lehce' | 'stredne' | 'prach'
  stockCount: number
  inStock: boolean
  imageUrl?: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

interface NewVariantEntry {
  weight: string
  stockCount: string
}

interface StockManagementProps {
  apiBaseUrl: string
}

const StockManagement = ({ apiBaseUrl }: StockManagementProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'add' | 'add-damaged'>('overview')
  const [bombs, setBombs] = useState<Bomb[]>([])
  const [steamers, setSteamers] = useState<Steamer[]>([])
  const [damagedProducts, setDamagedProducts] = useState<DamagedProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Add form states
  const [productType, setProductType] = useState<'bathbomb' | 'steamer' | 'damaged'>('bathbomb')
  const [operation, setOperation] = useState<'add' | 'remove'>('add')
  const [selectedBomb, setSelectedBomb] = useState('')
  const [selectedSteamer, setSelectedSteamer] = useState('')
  const [selectedDamaged, setSelectedDamaged] = useState('')
  const [quantity, setQuantity] = useState('')

  // Multi-variant form for bath bombs
  const [newVariants, setNewVariants] = useState<NewVariantEntry[]>([{ weight: '', stockCount: '' }])

  // New damaged product form states
  const [newDamagedBathBombType, setNewDamagedBathBombType] = useState('')
  const [newDamagedWeight, setNewDamagedWeight] = useState('')
  const [newDamagedPrice, setNewDamagedPrice] = useState('')
  const [newDamagedLevel, setNewDamagedLevel] = useState<'lehce' | 'stredne' | 'prach'>('lehce')
  const [newDamagedStockCount, setNewDamagedStockCount] = useState('')
  const [newDamagedImageUrl, setNewDamagedImageUrl] = useState('')
  const [newDamagedDescription, setNewDamagedDescription] = useState('')

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

      const [bombsRes, steamersRes, damagedRes] = await Promise.all([
        fetch(`${apiBaseUrl}/bombs`, { headers }),
        fetch(`${apiBaseUrl}/steamers`, { headers }),
        fetch(`${apiBaseUrl}/damaged-products`, { headers })
      ])

      const bombsData = await bombsRes.json()
      const steamersData = await steamersRes.json()
      const damagedData = await damagedRes.json()

      setBombs(bombsData)
      setSteamers(steamersData)
      setDamagedProducts(damagedData)
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
        if (!selectedBomb) {
          setError('Please select a bath bomb')
          return
        }

        // Validate variants
        const validVariants = newVariants.filter(v => v.weight && v.stockCount)
        if (validVariants.length === 0) {
          setError('Please add at least one variant with weight and stock count')
          return
        }

        const bomb = bombs.find(b => b._id === selectedBomb)
        if (!bomb) {
          setError('Bomb not found')
          return
        }

        const variants = validVariants.map(v => ({
          weight: parseFloat(v.weight),
          stockCount: parseInt(v.stockCount),
        }))

        const response = await fetch(`${apiBaseUrl}/bombs/${selectedBomb}/add-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_API_KEY || ''
          },
          body: JSON.stringify({ variants }),
        })

        if (response.ok) {
          const updatedBomb = await response.json()
          const lastLot = updatedBomb.lots[updatedBomb.lots.length - 1]
          const lastBatch = lastLot.batches[lastLot.batches.length - 1]
          setSuccessMessage(`Successfully added batch ${lastBatch.batchId} to LOT ${lastLot.lotNumber} (${bomb.name})`)
          fetchStock()
          resetForm()
        } else {
          const errData = await response.json()
          setError(errData.message || 'Failed to add batch')
        }
      } else if (productType === 'damaged') {
        // Damaged product
        if (!selectedDamaged || !quantity) {
          setError('Please fill in all fields for damaged product')
          return
        }

        const damaged = damagedProducts.find(d => d._id === selectedDamaged)
        if (!damaged) {
          setError('Damaged product not found')
          return
        }

        const currentStock = damaged.stockCount
        const quantityNum = parseInt(quantity)
        const newStockCount = operation === 'add' 
          ? currentStock + quantityNum 
          : currentStock - quantityNum

        if (newStockCount < 0) {
          setError(`Cannot remove ${quantityNum} items. Only ${currentStock} in stock.`)
          return
        }

        const response = await fetch(`${apiBaseUrl}/damaged-products/${selectedDamaged}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_API_KEY || ''
          },
          body: JSON.stringify({
            ...damaged,
            stockCount: newStockCount,
            inStock: newStockCount > 0
          }),
        })

        if (response.ok) {
          const action = operation === 'add' ? 'added' : 'removed'
          const preposition = operation === 'add' ? 'to' : 'from'
          setSuccessMessage(`Successfully ${action} ${quantity} pieces ${preposition} ${damaged.bathBombType}`)
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

        const quantityNum = parseInt(quantity)

        if (operation === 'add') {
          // Use add-batch endpoint
          const response = await fetch(`${apiBaseUrl}/steamers/${selectedSteamer}/add-batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': import.meta.env.VITE_API_KEY || ''
            },
            body: JSON.stringify({ stockCount: quantityNum }),
          })

          if (response.ok) {
            const updatedSteamer = await response.json()
            const lastLot = updatedSteamer.lots[updatedSteamer.lots.length - 1]
            const lastBatch = lastLot.batches[lastLot.batches.length - 1]
            setSuccessMessage(`Successfully added batch ${lastBatch.batchId} (${quantity} pcs) to ${steamer.name} [LOT ${lastLot.lotNumber}]`)
            fetchStock()
            resetForm()
          } else {
            setError('Failed to add batch')
          }
        } else {
          // Remove: update stockCount directly
          const currentStock = steamer.stockCount
          const newStockCount = currentStock - quantityNum

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
            setSuccessMessage(`Successfully removed ${quantity} pieces from ${steamer.name}`)
            fetchStock()
            resetForm()
          } else {
            setError('Failed to update stock')
          }
        }
      }
    } catch (err) {
      setError('Error updating stock')
      console.error('Error:', err)
    }
  }

  const resetForm = () => {
    setSelectedBomb('')
    setSelectedSteamer('')
    setSelectedDamaged('')
    setQuantity('')
    setNewVariants([{ weight: '', stockCount: '' }])
  }

  const resetDamagedForm = () => {
    setNewDamagedBathBombType('')
    setNewDamagedWeight('')
    setNewDamagedPrice('')
    setNewDamagedLevel('lehce')
    setNewDamagedStockCount('')
    setNewDamagedImageUrl('')
    setNewDamagedDescription('')
  }

  const handleCreateDamaged = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!newDamagedBathBombType || !newDamagedWeight || !newDamagedPrice || !newDamagedStockCount) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch(`${apiBaseUrl}/damaged-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_API_KEY || ''
        },
        body: JSON.stringify({
          bathBombType: newDamagedBathBombType,
          weight: parseFloat(newDamagedWeight),
          price: parseFloat(newDamagedPrice),
          damageLevel: newDamagedLevel,
          stockCount: parseInt(newDamagedStockCount),
          inStock: parseInt(newDamagedStockCount) > 0,
          imageUrl: newDamagedImageUrl || undefined,
          description: newDamagedDescription || undefined,
        }),
      })

      if (response.ok) {
        setSuccessMessage(`Successfully created damaged product: ${newDamagedBathBombType}`)
        fetchStock()
        resetDamagedForm()
      } else {
        setError('Failed to create damaged product')
      }
    } catch (err) {
      setError('Error creating damaged product')
      console.error('Error:', err)
    }
  }

  const getDamageLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      'lehce': 'Lehce poškozená',
      'stredne': 'Středně poškozená',
      'prach': 'Prach'
    }
    return labels[level] || level
  }

  const getTotalStock = () => {
    const bombStock = bombs.reduce((total, bomb) => {
      return total + bomb.lots.reduce((lotSum, lot) => {
        return lotSum + lot.batches.reduce((batchSum, batch) => {
          return batchSum + batch.variants.reduce((varSum, variant) => varSum + variant.stockCount, 0)
        }, 0)
      }, 0)
    }, 0)
    const steamerStock = steamers.reduce((total, steamer) => total + steamer.stockCount, 0)
    const damagedStock = damagedProducts.reduce((total, dp) => total + dp.stockCount, 0)
    return bombStock + steamerStock + damagedStock
  }

  const getLowStockItems = () => {
    const lowStockBombs = bombs.flatMap(bomb =>
      bomb.lots.flatMap(lot =>
        lot.batches.flatMap(batch =>
          batch.variants
            .filter(variant => variant.stockCount < 10)
            .map(variant => ({
              name: `${bomb.name} (${variant.weight}g) [${batch.batchId}]`,
              stock: variant.stockCount,
              type: 'Bath Bomb'
            }))
        )
      )
    )

    const lowStockSteamers = steamers
      .filter(steamer => steamer.stockCount < 10)
      .map(steamer => ({
        name: steamer.name,
        stock: steamer.stockCount,
        type: 'Steamer'
      }))

    const lowStockDamaged = damagedProducts
      .filter(dp => dp.stockCount < 10)
      .map(dp => ({
        name: `${dp.bathBombType} (${getDamageLevelLabel(dp.damageLevel)})`,
        stock: dp.stockCount,
        type: 'Damaged'
      }))

    return [...lowStockBombs, ...lowStockSteamers, ...lowStockDamaged]
  }

  const addVariantRow = () => {
    setNewVariants([...newVariants, { weight: '', stockCount: '' }])
  }

  const removeVariantRow = (index: number) => {
    if (newVariants.length > 1) {
      setNewVariants(newVariants.filter((_, i) => i !== index))
    }
  }

  const updateVariantRow = (index: number, field: keyof NewVariantEntry, value: string) => {
    const updated = [...newVariants]
    updated[index] = { ...updated[index], [field]: value }
    setNewVariants(updated)
  }

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
        <button
          className={`tab ${activeTab === 'add-damaged' ? 'active' : ''}`}
          onClick={() => setActiveTab('add-damaged')}
        >
          💔 Add Damaged Product
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
              <p className="stat-number">{bombs.length}</p>
            </div>
            <div className="stat-card">
              <h3>Steamer Types</h3>
              <p className="stat-number">{steamers.length}</p>
            </div>
            <div className="stat-card">
              <h3>Damaged Products</h3>
              <p className="stat-number">{damagedProducts.length}</p>
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
                {bombs.length === 0 ? (
                  <p className="no-data">No bath bombs found</p>
                ) : (
                  <div className="stock-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>LOT</th>
                          <th>Batch</th>
                          <th>Weight</th>
                          <th>Price</th>
                          <th>Stock Count</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bombs.map((bomb) =>
                          bomb.lots.map((lot) =>
                            lot.batches.map((batch) =>
                              batch.variants.map((variant, vIndex) => (
                                <tr key={`${bomb._id}-${lot.lotNumber}-${batch.batchId}-${vIndex}`}>
                                  <td>{bomb.name}</td>
                                  <td>{lot.lotNumber}</td>
                                  <td>{batch.batchId}</td>
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
                            )
                          )
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
                          <th>LOT</th>
                          <th>Batch</th>
                          <th>Batch Stock</th>
                          <th>Total Stock</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {steamers.map((steamer) =>
                          steamer.lots && steamer.lots.length > 0 ? (
                            steamer.lots.map((lot) =>
                              lot.batches.map((batch) => (
                                <tr key={`${steamer._id}-${batch.batchId}`}>
                                  <td>{steamer.name}</td>
                                  <td>{lot.lotNumber}</td>
                                  <td>{batch.batchId}</td>
                                  <td>{batch.stockCount}</td>
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
                              ))
                            )
                          ) : (
                            <tr key={steamer._id}>
                              <td>{steamer.name}</td>
                              <td>—</td>
                              <td>—</td>
                              <td>—</td>
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
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="stock-section">
                <h2>💔 Damaged Products (Zachraň kouli)</h2>
                {damagedProducts.length === 0 ? (
                  <p className="no-data">No damaged products found</p>
                ) : (
                  <div className="stock-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Bath Bomb Type</th>
                          <th>Weight</th>
                          <th>Price</th>
                          <th>Damage Level</th>
                          <th>Stock Count</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {damagedProducts.map((dp) => (
                          <tr key={dp._id}>
                            <td>{dp.bathBombType}</td>
                            <td>{dp.weight}g</td>
                            <td>{dp.price} Kč</td>
                            <td>{getDamageLevelLabel(dp.damageLevel)}</td>
                            <td>
                              <span className={dp.stockCount < 10 ? 'low-stock' : ''}>
                                {dp.stockCount}
                              </span>
                            </td>
                            <td>
                              <span className={`status ${dp.inStock ? 'in-stock' : 'out-of-stock'}`}>
                                {dp.inStock ? '✓ In Stock' : '✗ Out of Stock'}
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
            {productType !== 'bathbomb' && (
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
            )}

            <div className="form-group">
              <label>Product Type</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    value="bathbomb"
                    checked={productType === 'bathbomb'}
                    onChange={(e) => setProductType(e.target.value as 'bathbomb' | 'steamer' | 'damaged')}
                  />
                  🛁 Bath Bomb
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    value="steamer"
                    checked={productType === 'steamer'}
                    onChange={(e) => setProductType(e.target.value as 'bathbomb' | 'steamer' | 'damaged')}
                  />
                  💨 Steamer
                </label>
              </div>
            </div>

            {productType === 'bathbomb' ? (
              <>
                <div className="form-group">
                  <label htmlFor="bomb">Select Bath Bomb</label>
                  <select
                    id="bomb"
                    value={selectedBomb}
                    onChange={(e) => setSelectedBomb(e.target.value)}
                    required
                  >
                    <option value="">-- Select Bath Bomb --</option>
                    {bombs.map((bomb) => (
                      <option key={bomb._id} value={bomb._id}>
                        {bomb.name} ({bomb.acronym})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBomb && (
                  <div className="form-group">
                    <label>Variants for new batch</label>
                    <div className="variants-list">
                      {newVariants.map((variant, index) => (
                        <div key={index} className="variant-row">
                          <select
                            value={variant.weight}
                            onChange={(e) => updateVariantRow(index, 'weight', e.target.value)}
                            required
                          >
                            <option value="">-- Weight --</option>
                            <option value="150">150g</option>
                            <option value="120">120g</option>
                            <option value="115">115g</option>
                            <option value="40">40g</option>
                          </select>
                          <input
                            type="number"
                            placeholder="Stock Count"
                            value={variant.stockCount}
                            onChange={(e) => updateVariantRow(index, 'stockCount', e.target.value)}
                            min="0"
                            required
                          />
                          {newVariants.length > 1 && (
                            <button type="button" className="remove-variant-btn" onClick={() => removeVariantRow(index)}>
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" className="add-variant-btn" onClick={addVariantRow}>
                        + Add Variant
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : productType === 'damaged' ? (
              <div className="form-group">
                <label htmlFor="damaged">Select Damaged Product</label>
                <select
                  id="damaged"
                  value={selectedDamaged}
                  onChange={(e) => setSelectedDamaged(e.target.value)}
                  required
                >
                  <option value="">-- Select Damaged Product --</option>
                  {damagedProducts.map((dp) => (
                    <option key={dp._id} value={dp._id}>
                      {dp.bathBombType} - {getDamageLevelLabel(dp.damageLevel)} (Current stock: {dp.stockCount})
                    </option>
                  ))}
                </select>
              </div>
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

            {productType !== 'bathbomb' && (
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
            )}

            <div className="form-actions">
              <button type="submit" className={`submit-button ${operation === 'remove' ? 'remove-button' : ''}`}>
                {productType === 'bathbomb' ? '➕ Add Batch' : operation === 'add' ? '➕ Add to Stock' : '➖ Remove from Stock'}
              </button>
              <button type="button" onClick={resetForm} className="reset-button">
                Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'add-damaged' && (
        <div className="add-section">
          <h2>Add New Damaged Product</h2>
          
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          <form onSubmit={handleCreateDamaged} className="add-form">
            <div className="form-group">
              <label htmlFor="damaged-type">Druh koule (Bath Bomb Type) *</label>
              <input
                type="text"
                id="damaged-type"
                value={newDamagedBathBombType}
                onChange={(e) => setNewDamagedBathBombType(e.target.value)}
                placeholder="e.g. Kokobana"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="damaged-weight">Gramáž (Weight in grams) *</label>
              <input
                type="number"
                id="damaged-weight"
                value={newDamagedWeight}
                onChange={(e) => setNewDamagedWeight(e.target.value)}
                placeholder="Enter weight in grams"
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="damaged-price">Price (Kč) *</label>
              <input
                type="number"
                id="damaged-price"
                value={newDamagedPrice}
                onChange={(e) => setNewDamagedPrice(e.target.value)}
                placeholder="Enter price"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Stav poškození (Damage Level) *</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    value="lehce"
                    checked={newDamagedLevel === 'lehce'}
                    onChange={(e) => setNewDamagedLevel(e.target.value as 'lehce' | 'stredne' | 'prach')}
                  />
                  Lehce poškozená
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    value="stredne"
                    checked={newDamagedLevel === 'stredne'}
                    onChange={(e) => setNewDamagedLevel(e.target.value as 'lehce' | 'stredne' | 'prach')}
                  />
                  Středně poškozená
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    value="prach"
                    checked={newDamagedLevel === 'prach'}
                    onChange={(e) => setNewDamagedLevel(e.target.value as 'lehce' | 'stredne' | 'prach')}
                  />
                  Prach
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="damaged-stock">Stock Count *</label>
              <input
                type="number"
                id="damaged-stock"
                value={newDamagedStockCount}
                onChange={(e) => setNewDamagedStockCount(e.target.value)}
                placeholder="Enter stock count"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="damaged-image">Image URL</label>
              <input
                type="text"
                id="damaged-image"
                value={newDamagedImageUrl}
                onChange={(e) => setNewDamagedImageUrl(e.target.value)}
                placeholder="Enter image URL (optional)"
              />
            </div>

            <div className="form-group">
              <label htmlFor="damaged-description">Description</label>
              <textarea
                id="damaged-description"
                value={newDamagedDescription}
                onChange={(e) => setNewDamagedDescription(e.target.value)}
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button">
                💔 Create Damaged Product
              </button>
              <button type="button" onClick={resetDamagedForm} className="reset-button">
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
