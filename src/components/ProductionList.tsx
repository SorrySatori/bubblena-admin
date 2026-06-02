import { useState, useEffect } from 'react'
import type { Recipe, ProductionRecord, ProductionBatchSize } from '../types/warehouse'
import { getRecipes, getProductionRecords, produceBatch } from '../utils/warehouseApi'
import './Warehouse.css'

const ProductionList = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [records, setRecords] = useState<ProductionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddProduction, setShowAddProduction] = useState(false)
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form
  const [selectedRecipe, setSelectedRecipe] = useState('')
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0])
  const [sizes, setSizes] = useState<ProductionBatchSize[]>([{ weight: 0, quantity: 0 }])

  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = async () => {
    try {
      setLoading(true)
      const [recs, prod] = await Promise.all([getRecipes(), getProductionRecords()])
      setRecipes(recs)
      setRecords(prod)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba načítání výroby')
    } finally {
      setLoading(false)
    }
  }

  const addSize = () => {
    setSizes([...sizes, { weight: 0, quantity: 0 }])
  }

  const updateSize = (index: number, field: keyof ProductionBatchSize, value: number) => {
    const updated = [...sizes]
    updated[index] = { ...updated[index], [field]: value }
    setSizes(updated)
  }

  const removeSize = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index))
  }

  const handleProduce = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const validSizes = sizes.filter(s => s.weight > 0 && s.quantity > 0)
    if (validSizes.length === 0) {
      setError('Zadejte alespoň jednu velikost s množstvím')
      return
    }

    setSubmitting(true)
    try {
      const result = await produceBatch(selectedRecipe, validSizes, productionDate)
      if (result.success && result.record) {
        const stockMsg = result.productType
          ? ` Zároveň přidáno do skladu (${result.productType === 'bomb' ? 'koule' : 'steamery'}).`
          : ' (Sklad hotových výrobků nebyl aktualizován — produkt nenalezen v backendu.)'
        const lotMsg = result.record.lotNumber ? ` [LOT ${result.record.lotNumber}]` : ''
        setSuccess(`Batch "${result.record.batchNumber}"${lotMsg} úspěšně vyrobena! Suroviny odepsány (FIFO).${stockMsg}`)
        setShowAddProduction(false)
        setSelectedRecipe('')
        setSizes([{ weight: 0, quantity: 0 }])
        refreshData()
      } else {
        setError(result.error || 'Neznámá chyba')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="warehouse-section">
      <div className="warehouse-header">
        <h2>🏭 List výroby</h2>
        <button className="btn-primary" onClick={() => setShowAddProduction(true)}>
          + Zaznamenat výrobu
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showAddProduction && (
        <div className="form-card">
          <h3>Nová výroba</h3>
          {recipes.length === 0 ? (
            <p className="empty-state">⚠️ Nejprve vytvořte recept.</p>
          ) : (
            <form onSubmit={handleProduce}>
              <div className="form-row">
                <div className="form-group">
                  <label>Recept *</label>
                  <select value={selectedRecipe} onChange={e => setSelectedRecipe(e.target.value)} required>
                    <option value="">Vyberte recept...</option>
                    {recipes.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.acronym})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Datum výroby</label>
                  <input type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} />
                </div>
              </div>

              <div className="ingredients-section">
                <div className="ingredients-header">
                  <h4>Vyrobené velikosti</h4>
                  <button type="button" className="btn-sm btn-primary" onClick={addSize}>+ Velikost</button>
                </div>
                {sizes.map((size, index) => (
                  <div key={index} className="ingredient-row">
                    <div className="form-group">
                      <label>Váha</label>
                      <select
                        value={size.weight || ''}
                        onChange={e => updateSize(index, 'weight', Number(e.target.value))}
                        required
                      >
                        <option value="">-- Váha --</option>
                        <option value="150">150g</option>
                        <option value="120">120g</option>
                        <option value="115">115g</option>
                        <option value="40">40g</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Počet kusů</label>
                      <input
                        type="number"
                        value={size.quantity || ''}
                        onChange={e => updateSize(index, 'quantity', Number(e.target.value))}
                        placeholder="např. 10"
                        min="1"
                      />
                    </div>
                    {sizes.length > 1 && (
                      <button type="button" className="btn-sm btn-danger" onClick={() => removeSize(index)}>✕</button>
                    )}
                  </div>
                ))}
              </div>

              {selectedRecipe && (
                <div className="recipe-preview">
                  <h5>Spotřeba surovin (1 batch):</h5>
                  <ul>
                    {recipes.find(r => r.id === selectedRecipe)?.ingredients.map((ing, i) => (
                      <li key={i}>{ing.materialName}: {ing.quantity} g</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Vyrábím…' : 'Vyrobit & odepsat suroviny'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowAddProduction(false)}>Zrušit</button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="materials-list">
        {loading ? (
          <p className="empty-state">Načítání…</p>
        ) : records.length === 0 ? (
          <p className="empty-state">Zatím žádná výroba.</p>
        ) : (
          records.map(record => (
            <div key={record.id} className="material-card">
              <div className="material-header" onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}>
                <div className="material-info">
                  <h4>{record.batchNumber}</h4>
                  <span className="stock-badge">{record.recipeName}</span>
                  {record.lotNumber && <span className="stock-badge">LOT {record.lotNumber}</span>}
                  <span className="stock-badge">
                    {new Date(record.dateProduced).toLocaleDateString('cs-CZ')}
                  </span>
                </div>
                <div className="material-actions">
                  <span className="sizes-summary">
                    {record.sizes.map(s => `${s.quantity}× ${s.weight}g`).join(', ')}
                  </span>
                </div>
              </div>

              {expandedRecord === record.id && (
                <div className="batches-list">
                  <h5>Spotřebované suroviny</h5>
                  <table className="batches-table">
                    <thead>
                      <tr>
                        <th>Surovina</th>
                        <th>Množství</th>
                        <th>Ze šarží (FIFO)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.materialsUsed.map((mu, i) => (
                        <tr key={i}>
                          <td>{mu.materialName}</td>
                          <td>{mu.quantity} g</td>
                          <td>
                            {mu.sourceBatches.map(sb =>
                              `${sb.batchNumber} (${sb.quantityUsed} g)`
                            ).join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ProductionList
