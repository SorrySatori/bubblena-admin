import { useState, useEffect } from 'react'
import { ALLOWED_BOMB_WEIGHTS } from '../constants/variants'
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

  // Delete confirmation modal (whole product)
  const [deleteTarget, setDeleteTarget] = useState<
    { type: 'bathbomb' | 'steamer' | 'damaged'; id: string; name: string } | null
  >(null)
  const [deleting, setDeleting] = useState(false)

  // Stock-adjustment modal — remove pieces from a bomb variant / steamer / damaged product
  const [adjustTarget, setAdjustTarget] = useState<
    {
      kind: 'bomb' | 'steamer' | 'damaged'
      deleteType: 'bathbomb' | 'steamer' | 'damaged'
      id: string
      productName: string
      label: string
      stock: number
      li?: number
      bi?: number
      vi?: number
    } | null
  >(null)
  const [removeQty, setRemoveQty] = useState('1')
  const [savingAdjust, setSavingAdjust] = useState(false)

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
      setError('Chyba načítání dat skladu. Ujistěte se, že backend běží.')
      console.error('Error fetching stock:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteEndpoint = (type: 'bathbomb' | 'steamer' | 'damaged') =>
    type === 'bathbomb' ? 'bombs' : type === 'steamer' ? 'steamers' : 'damaged-products'

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const response = await fetch(
        `${apiBaseUrl}/${deleteEndpoint(deleteTarget.type)}/${deleteTarget.id}`,
        {
          method: 'DELETE',
          headers: { 'x-api-key': import.meta.env.VITE_API_KEY || '' },
        }
      )
      if (response.ok) {
        setSuccessMessage(`Úspěšně smazáno: ${deleteTarget.name}`)
        setDeleteTarget(null)
        fetchStock()
      } else {
        const errData = await response.json().catch(() => ({}))
        setError(errData.message || 'Nepodařilo se smazat položku')
      }
    } catch (err) {
      setError('Chyba při mazání položky')
      console.error('Error deleting:', err)
    } finally {
      setDeleting(false)
    }
  }

  const adjustStock = async () => {
    if (!adjustTarget) return
    const qty = parseInt(removeQty)
    if (!qty || qty < 1) {
      setError('Zadejte platný počet kusů')
      return
    }

    setSavingAdjust(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_API_KEY || '',
      }
      let response: Response
      let removedVariant = false

      if (adjustTarget.kind === 'bomb') {
        const bomb = bombs.find((b) => b._id === adjustTarget.id)
        if (!bomb) throw new Error('Koule nenalezena')
        const lots: BombLot[] = JSON.parse(JSON.stringify(bomb.lots))
        const li = adjustTarget.li!
        const bi = adjustTarget.bi!
        const vi = adjustTarget.vi!
        const variant = lots[li].batches[bi].variants[vi]
        const remaining = variant.stockCount - qty
        if (remaining > 0) {
          variant.stockCount = remaining
          variant.inStock = true
        } else {
          // remove the whole variant, then clean up empty batch / lot
          removedVariant = true
          lots[li].batches[bi].variants.splice(vi, 1)
          if (lots[li].batches[bi].variants.length === 0) lots[li].batches.splice(bi, 1)
          if (lots[li].batches.length === 0) lots.splice(li, 1)
        }
        response = await fetch(`${apiBaseUrl}/bombs/${adjustTarget.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ lots }),
        })
      } else if (adjustTarget.kind === 'steamer') {
        const steamer = steamers.find((s) => s._id === adjustTarget.id)
        if (!steamer) throw new Error('Steamer nenalezen')
        const newTotal = Math.max(0, steamer.stockCount - qty)
        response = await fetch(`${apiBaseUrl}/steamers/${adjustTarget.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ ...steamer, stockCount: newTotal, inStock: newTotal > 0 }),
        })
      } else {
        const dp = damagedProducts.find((d) => d._id === adjustTarget.id)
        if (!dp) throw new Error('Produkt nenalezen')
        const newStock = Math.max(0, dp.stockCount - qty)
        response = await fetch(`${apiBaseUrl}/damaged-products/${adjustTarget.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ ...dp, stockCount: newStock, inStock: newStock > 0 }),
        })
      }

      if (response.ok) {
        setSuccessMessage(
          removedVariant
            ? `Varianta odstraněna: ${adjustTarget.label}`
            : `Odebráno ${qty} ks — ${adjustTarget.label}`
        )
        setAdjustTarget(null)
        setRemoveQty('1')
        fetchStock()
      } else {
        const errData = await response.json().catch(() => ({}))
        setError(errData.message || 'Nepodařilo se upravit sklad')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při úpravě skladu')
      console.error('Error adjusting stock:', err)
    } finally {
      setSavingAdjust(false)
    }
  }

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    try {
      if (productType === 'bathbomb') {
        if (!selectedBomb) {
          setError('Vyberte prosím koupelovou kouli')
          return
        }

        // Validate variants
        const validVariants = newVariants.filter(v => v.weight && v.stockCount)
        if (validVariants.length === 0) {
          setError('Přidejte alespoň jednu variantu s váhou a počtem kusů')
          return
        }

        const bomb = bombs.find(b => b._id === selectedBomb)
        if (!bomb) {
          setError('Koule nenalezena')
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
          setSuccessMessage(`Úspěšně přidána batch ${lastBatch.batchId} do LOT ${lastLot.lotNumber} (${bomb.name})`)
          fetchStock()
          resetForm()
        } else {
          const errData = await response.json()
          setError(errData.message || 'Nepodařilo se přidat batch')
        }
      } else if (productType === 'damaged') {
        // Damaged product
        if (!selectedDamaged || !quantity) {
          setError('Vyplňte prosím všechna pole')
          return
        }

        const damaged = damagedProducts.find(d => d._id === selectedDamaged)
        if (!damaged) {
          setError('Poškozený produkt nenalezen')
          return
        }

        const currentStock = damaged.stockCount
        const quantityNum = parseInt(quantity)
        const newStockCount = operation === 'add' 
          ? currentStock + quantityNum 
          : currentStock - quantityNum

        if (newStockCount < 0) {
          setError(`Nelze odebrat ${quantityNum} ks. Skladem pouze ${currentStock}.`)
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
          const action = operation === 'add' ? 'přidáno' : 'odebráno'
          setSuccessMessage(`Úspěšně ${action} ${quantity} ks - ${damaged.bathBombType}`)
          fetchStock()
          resetForm()
        } else {
          setError('Nepodařilo se aktualizovat sklad')
        }
      } else {
        // Steamer
        if (!selectedSteamer || !quantity) {
          setError('Vyplňte prosím všechna pole pro steamer')
          return
        }

        const steamer = steamers.find(s => s._id === selectedSteamer)
        if (!steamer) {
          setError('Steamer nenalezen')
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
            setSuccessMessage(`Úspěšně přidána batch ${lastBatch.batchId} (${quantity} ks) do ${steamer.name} [LOT ${lastLot.lotNumber}]`)
            fetchStock()
            resetForm()
          } else {
            setError('Nepodařilo se přidat batch')
          }
        } else {
          // Remove: update stockCount directly
          const currentStock = steamer.stockCount
          const newStockCount = currentStock - quantityNum

          if (newStockCount < 0) {
            setError(`Nelze odebrat ${quantityNum} ks. Skladem pouze ${currentStock}.`)
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
            setSuccessMessage(`Úspěšně odebráno ${quantity} ks z ${steamer.name}`)
            fetchStock()
            resetForm()
          } else {
            setError('Nepodařilo se aktualizovat sklad')
          }
        }
      }
    } catch (err) {
      setError('Chyba při aktualizaci skladu')
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
      setError('Vyplňte prosím všechna povinná pole')
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
        setSuccessMessage(`Úspěšně vytvořen poškozený produkt: ${newDamagedBathBombType}`)
        fetchStock()
        resetDamagedForm()
      } else {
        setError('Nepodařilo se vytvořit poškozený produkt')
      }
    } catch (err) {
      setError('Chyba při vytváření poškozeného produktu')
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
              type: 'Koule'
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
        type: 'Poškozené'
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
            📊 Přehled skladu
        </button>
        <button
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          ➕ Přidat na sklad
        </button>
        <button
          className={`tab ${activeTab === 'add-damaged' ? 'active' : ''}`}
          onClick={() => setActiveTab('add-damaged')}
        >
          💔 Přidat poškozený produkt
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="overview-section">
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}
          <div className="stock-stats">
            <div className="stat-card">
              <h3>Celkem na skladě</h3>
              <p className="stat-number">{getTotalStock()}</p>
            </div>
            <div className="stat-card">
              <h3>Druhy koulí</h3>
              <p className="stat-number">{bombs.length}</p>
            </div>
            <div className="stat-card">
              <h3>Druhy steamerů</h3>
              <p className="stat-number">{steamers.length}</p>
            </div>
            <div className="stat-card">
              <h3>Poškozené produkty</h3>
              <p className="stat-number">{damagedProducts.length}</p>
            </div>
            <div className="stat-card warning">
              <h3>Nízký stav</h3>
              <p className="stat-number">{getLowStockItems().length}</p>
            </div>
          </div>

          {loading ? (
            <div className="loading">Načítání dat skladu...</div>
          ) : (
            <>
              <div className="stock-section">
                <h2>🛜 Koupelové koule</h2>
                {bombs.length === 0 ? (
                  <p className="no-data">Žádné koupelové koule nenalezeny</p>
                ) : (
                  <div className="stock-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Název</th>
                          <th>LOT</th>
                          <th>Batch</th>
                          <th>Váha</th>
                          <th>Cena</th>
                          <th>Skladem</th>
                          <th>Stav</th>
                          <th>Akce</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bombs.map((bomb) =>
                          bomb.lots.map((lot, lotIndex) =>
                            lot.batches.map((batch, batchIndex) =>
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
                                      {variant.inStock ? '✓ Skladem' : '✗ Vyprodáno'}
                                    </span>
                                  </td>
                                  <td className="action-cell">
                                    <button
                                      className="btn-remove-qty"
                                      onClick={() => {
                                        setAdjustTarget({
                                          kind: 'bomb',
                                          deleteType: 'bathbomb',
                                          id: bomb._id,
                                          productName: bomb.name,
                                          label: `${bomb.name} (${variant.weight}g)`,
                                          stock: variant.stockCount,
                                          li: lotIndex,
                                          bi: batchIndex,
                                          vi: vIndex,
                                        })
                                        setRemoveQty('1')
                                      }}
                                    >
                                      ➖ Odebrat
                                    </button>
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
                <h2>💨 Steamery</h2>
                {steamers.length === 0 ? (
                  <p className="no-data">Žádné steamery nenalezeny</p>
                ) : (
                  <div className="stock-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Název</th>
                          <th>LOT</th>
                          <th>Batch</th>
                          <th>Ks v batchi</th>
                          <th>Celkem</th>
                          <th>Stav</th>
                          <th>Akce</th>
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
                                      {steamer.inStock ? '✓ Skladem' : '✗ Vyprodáno'}
                                    </span>
                                  </td>
                                  <td className="action-cell">
                                    <button
                                      className="btn-remove-qty"
                                      onClick={() => {
                                        setAdjustTarget({
                                          kind: 'steamer',
                                          deleteType: 'steamer',
                                          id: steamer._id,
                                          productName: steamer.name,
                                          label: steamer.name,
                                          stock: steamer.stockCount,
                                        })
                                        setRemoveQty('1')
                                      }}
                                    >
                                      ➖ Odebrat
                                    </button>
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
                                  {steamer.inStock ? '✓ Skladem' : '✗ Vyprodáno'}
                                </span>
                              </td>
                              <td className="action-cell">
                                <button
                                  className="btn-delete"
                                  onClick={() => setDeleteTarget({ type: 'steamer', id: steamer._id, name: steamer.name })}
                                >
                                  🗑️ Smazat
                                </button>
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
                <h2>💔 Poškozené produkty (Zachraň kouli)</h2>
                {damagedProducts.length === 0 ? (
                  <p className="no-data">Žádné poškozené produkty nenalezeny</p>
                ) : (
                  <div className="stock-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Druh koule</th>
                          <th>Váha</th>
                          <th>Cena</th>
                          <th>Stupeň poškození</th>
                          <th>Skladem</th>
                          <th>Stav</th>
                          <th>Akce</th>
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
                                {dp.inStock ? '✓ Skladem' : '✗ Vyprodáno'}
                              </span>
                            </td>
                            <td className="action-cell">
                              <button
                                className="btn-remove-qty"
                                onClick={() => {
                                  setAdjustTarget({
                                    kind: 'damaged',
                                    deleteType: 'damaged',
                                    id: dp._id,
                                    productName: `${dp.bathBombType} ${dp.weight}g`,
                                    label: `${dp.bathBombType} ${dp.weight}g`,
                                    stock: dp.stockCount,
                                  })
                                  setRemoveQty('1')
                                }}
                              >
                                ➖ Odebrat
                              </button>
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
                  <h2>⚠️ Nízký stav zásob</h2>
                  <div className="low-stock-list">
                    {getLowStockItems().map((item, index) => (
                      <div key={index} className="low-stock-item">
                        <span className="item-name">{item.name}</span>
                        <span className="item-type">{item.type}</span>
                        <span className="item-stock">{item.stock} ks</span>
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
          <h2>Správa skladu</h2>
          
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          <form onSubmit={handleAddStock} className="add-form">
            {productType !== 'bathbomb' && (
              <div className="form-group">
                <label>Operace</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="add"
                      checked={operation === 'add'}
                      onChange={(e) => setOperation(e.target.value as 'add' | 'remove')}
                    />
                    ➕ Přidat na sklad
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      value="remove"
                      checked={operation === 'remove'}
                      onChange={(e) => setOperation(e.target.value as 'add' | 'remove')}
                    />
                    ➖ Odebrat ze skladu
                  </label>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Typ produktu</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    value="bathbomb"
                    checked={productType === 'bathbomb'}
                    onChange={(e) => setProductType(e.target.value as 'bathbomb' | 'steamer' | 'damaged')}
                  />
                  🛜 Koupelová koule
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
                  <label htmlFor="bomb">Vyberte koupelové koule</label>
                  <select
                    id="bomb"
                    value={selectedBomb}
                    onChange={(e) => setSelectedBomb(e.target.value)}
                    required
                  >
                    <option value="">-- Vyberte kouli --</option>
                    {bombs.map((bomb) => (
                      <option key={bomb._id} value={bomb._id}>
                        {bomb.name} ({bomb.acronym})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBomb && (
                  <div className="form-group">
                    <label>Varianty pro novou batch</label>
                    <div className="variants-list">
                      {newVariants.map((variant, index) => (
                        <div key={index} className="variant-row">
                          <select
                            value={variant.weight}
                            onChange={(e) => updateVariantRow(index, 'weight', e.target.value)}
                            required
                          >
                            <option value="">-- Váha --</option>
                            {ALLOWED_BOMB_WEIGHTS.map((w) => (
                              <option key={w} value={w}>{w}g</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Počet ks"
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
                        + Přidat variantu
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : productType === 'damaged' ? (
              <div className="form-group">
                <label htmlFor="damaged">Vyberte poškozený produkt</label>
                <select
                  id="damaged"
                  value={selectedDamaged}
                  onChange={(e) => setSelectedDamaged(e.target.value)}
                  required
                >
                  <option value="">-- Vyberte poškozený produkt --</option>
                  {damagedProducts.map((dp) => (
                    <option key={dp._id} value={dp._id}>
                      {dp.bathBombType} - {getDamageLevelLabel(dp.damageLevel)} (Skladem: {dp.stockCount})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="steamer">Vyberte steamer</label>
                <select
                  id="steamer"
                  value={selectedSteamer}
                  onChange={(e) => setSelectedSteamer(e.target.value)}
                  required
                >
                  <option value="">-- Vyberte steamer --</option>
                  {steamers.map((steamer) => (
                    <option key={steamer._id} value={steamer._id}>
                      {steamer.name} (Skladem: {steamer.stockCount})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {productType !== 'bathbomb' && (
              <div className="form-group">
                <label htmlFor="quantity">
                  {operation === 'add' ? 'Počet k přidání' : 'Počet k odebrání'}
                </label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  placeholder="Zadejte počet"
                  required
                />
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className={`submit-button ${operation === 'remove' ? 'remove-button' : ''}`}>
                {productType === 'bathbomb' ? '➕ Přidat batch' : operation === 'add' ? '➕ Přidat na sklad' : '➖ Odebrat ze skladu'}
              </button>
              <button type="button" onClick={resetForm} className="reset-button">
                Resetovat
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'add-damaged' && (
        <div className="add-section">
          <h2>Přidat nový poškozený produkt</h2>
          
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}

          <form onSubmit={handleCreateDamaged} className="add-form">
            <div className="form-group">
              <label htmlFor="damaged-type">Druh koule *</label>
              <input
                type="text"
                id="damaged-type"
                value={newDamagedBathBombType}
                onChange={(e) => setNewDamagedBathBombType(e.target.value)}
                placeholder="např. Kokobana"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="damaged-weight">Gramáž (g) *</label>
              <input
                type="number"
                id="damaged-weight"
                value={newDamagedWeight}
                onChange={(e) => setNewDamagedWeight(e.target.value)}
                placeholder="Zadejte gramáž"
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="damaged-price">Cena (Kč) *</label>
              <input
                type="number"
                id="damaged-price"
                value={newDamagedPrice}
                onChange={(e) => setNewDamagedPrice(e.target.value)}
                placeholder="Zadejte cenu"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Stav poškození *</label>
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
              <label htmlFor="damaged-stock">Počet kusů *</label>
              <input
                type="number"
                id="damaged-stock"
                value={newDamagedStockCount}
                onChange={(e) => setNewDamagedStockCount(e.target.value)}
                placeholder="Zadejte počet"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="damaged-image">URL obrázku</label>
              <input
                type="text"
                id="damaged-image"
                value={newDamagedImageUrl}
                onChange={(e) => setNewDamagedImageUrl(e.target.value)}
                placeholder="URL obrázku (volitelné)"
              />
            </div>

            <div className="form-group">
              <label htmlFor="damaged-description">Popis</label>
              <textarea
                id="damaged-description"
                value={newDamagedDescription}
                onChange={(e) => setNewDamagedDescription(e.target.value)}
                placeholder="Popis (volitelné)"
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button">
                💔 Vytvořit poškozený produkt
              </button>
              <button type="button" onClick={resetDamagedForm} className="reset-button">
                Resetovat
              </button>
            </div>
          </form>
        </div>
      )}

      {adjustTarget && (
        <div className="modal-overlay" onClick={() => !savingAdjust && setAdjustTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Odebrat ze skladu</h3>
            <p>
              <strong>{adjustTarget.label}</strong> (skladem {adjustTarget.stock} ks)
            </p>
            <div className="form-group">
              <label htmlFor="remove-qty">Počet kusů k odebrání</label>
              <input
                id="remove-qty"
                type="number"
                min="1"
                max={adjustTarget.stock}
                value={removeQty}
                onChange={(e) => setRemoveQty(e.target.value)}
              />
              {adjustTarget.kind === 'bomb' && (
                <small className="modal-hint">
                  Odebrání všech {adjustTarget.stock} ks tuto variantu ze skladu odstraní.
                </small>
              )}
            </div>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setAdjustTarget(null)}
                disabled={savingAdjust}
              >
                Zrušit
              </button>
              <button
                className="btn-confirm-delete"
                onClick={adjustStock}
                disabled={savingAdjust}
              >
                {savingAdjust ? 'Ukládám…' : '➖ Odebrat kusy'}
              </button>
            </div>
            <hr className="modal-divider" />
            <button
              className="btn-delete-whole"
              disabled={savingAdjust}
              onClick={() => {
                const t = adjustTarget
                setAdjustTarget(null)
                setDeleteTarget({ type: t.deleteType, id: t.id, name: t.productName })
              }}
            >
              🗑️ Smazat celý{' '}
              {adjustTarget.kind === 'bomb'
                ? `produkt „${adjustTarget.productName}" (všechny šarže)`
                : adjustTarget.kind === 'steamer'
                  ? `steamer „${adjustTarget.productName}"`
                  : `produkt „${adjustTarget.productName}"`}
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Opravdu smazat?</h3>
            <p>
              Chystáte se nenávratně smazat <strong>{deleteTarget.name}</strong>
              {deleteTarget.type === 'bathbomb' && ' (včetně všech LOTů, šarží a variant)'}
              {deleteTarget.type === 'steamer' && ' (včetně všech LOTů a šarží)'}
              . Tuto akci nelze vzít zpět.
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Zrušit
              </button>
              <button className="btn-confirm-delete" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Mažu…' : '🗑️ Smazat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StockManagement
