import { useState, useEffect } from 'react'
import { ALLOWED_BOMB_WEIGHTS } from '../constants/variants'
import MultiSelect, { type MultiSelectOption } from './MultiSelect'
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

  // Stock-adjustment modal — remove pieces from a bomb weight variant / steamer / damaged product
  const [adjustTarget, setAdjustTarget] = useState<
    {
      kind: 'bomb' | 'steamer' | 'damaged'
      deleteType: 'bathbomb' | 'steamer' | 'damaged'
      id: string
      productName: string
      label: string
      stock: number
      weight?: number // bombs: which weight variant to draw down (across all batches)
    } | null
  >(null)
  const [removeQty, setRemoveQty] = useState('1')
  const [savingAdjust, setSavingAdjust] = useState(false)

  // Filtering & sorting (overview tables)
  const [bombNameFilter, setBombNameFilter] = useState<string[]>([])
  const [bombWeightFilter, setBombWeightFilter] = useState<string[]>([])
  const [bombSort, setBombSort] = useState<{ key: 'name' | 'weight' | 'price' | 'stock'; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' })
  const [steamerNameFilter, setSteamerNameFilter] = useState<string[]>([])
  const [steamerSort, setSteamerSort] = useState<{ key: 'name' | 'stock'; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' })
  const [damagedTypeFilter, setDamagedTypeFilter] = useState<string[]>([])
  const [damagedWeightFilter, setDamagedWeightFilter] = useState<string[]>([])
  const [damagedSort, setDamagedSort] = useState<{ key: 'type' | 'weight' | 'price' | 'stock'; dir: 'asc' | 'desc' }>({ key: 'type', dir: 'asc' })

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
        const weight = adjustTarget.weight!
        const lots: BombLot[] = JSON.parse(JSON.stringify(bomb.lots))

        // Draw down `qty` pieces of this weight across all batches (oldest first).
        let toRemove = qty
        for (const lot of lots) {
          for (const batch of lot.batches) {
            for (const variant of batch.variants) {
              if (toRemove <= 0) break
              if (variant.weight !== weight) continue
              const take = Math.min(variant.stockCount, toRemove)
              variant.stockCount -= take
              variant.inStock = variant.stockCount > 0
              toRemove -= take
            }
          }
        }

        // Clean up emptied variants / batches / lots.
        for (let li = lots.length - 1; li >= 0; li--) {
          for (let bi = lots[li].batches.length - 1; bi >= 0; bi--) {
            lots[li].batches[bi].variants = lots[li].batches[bi].variants.filter((v) => v.stockCount > 0)
            if (lots[li].batches[bi].variants.length === 0) lots[li].batches.splice(bi, 1)
          }
          if (lots[li].batches.length === 0) lots.splice(li, 1)
        }
        removedVariant = qty >= adjustTarget.stock

        response = await fetch(`${apiBaseUrl}/bombs/${adjustTarget.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ lots }),
        })
      } else if (adjustTarget.kind === 'steamer') {
        const steamer = steamers.find((s) => s._id === adjustTarget.id)
        if (!steamer) throw new Error('Steamer nenalezen')
        const lots: SteamerLot[] = JSON.parse(JSON.stringify(steamer.lots || []))

        // Draw down `qty` pieces across all batches (oldest first) so the
        // batches stay the source of truth, in sync with the total.
        let toRemove = qty
        for (const lot of lots) {
          for (const batch of lot.batches) {
            if (toRemove <= 0) break
            const take = Math.min(batch.stockCount, toRemove)
            batch.stockCount -= take
            toRemove -= take
          }
        }

        // Clean up emptied batches / lots.
        for (let li = lots.length - 1; li >= 0; li--) {
          lots[li].batches = lots[li].batches.filter((b) => b.stockCount > 0)
          if (lots[li].batches.length === 0) lots.splice(li, 1)
        }

        const newTotal = lots.reduce(
          (sum, lot) => sum + lot.batches.reduce((bs, b) => bs + b.stockCount, 0),
          0
        )

        response = await fetch(`${apiBaseUrl}/steamers/${adjustTarget.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ lots, stockCount: newTotal, inStock: newTotal > 0 }),
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

  // ---- filtering & sorting helpers ----
  const cmp = (a: number | string, b: number | string) =>
    typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b, 'cs') : Number(a) - Number(b)

  const toggleSort = <T extends string>(
    sort: { key: T; dir: 'asc' | 'desc' },
    setSort: (s: { key: T; dir: 'asc' | 'desc' }) => void,
    key: T
  ) => setSort(sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })

  const arrow = (active: boolean, dir: 'asc' | 'desc') => (active ? (dir === 'asc' ? ' ▲' : ' ▼') : '')

  // Filter option lists (derived from current data)
  const bombNameOptions: MultiSelectOption[] = [...new Set(bombs.map((b) => b.name))]
    .sort((a, b) => a.localeCompare(b, 'cs'))
    .map((n) => ({ value: n, label: n }))
  const bombWeightOptions: MultiSelectOption[] = [
    ...new Set(bombs.flatMap((b) => b.lots.flatMap((l) => l.batches.flatMap((bt) => bt.variants.map((v) => v.weight))))),
  ]
    .sort((a, b) => a - b)
    .map((w) => ({ value: String(w), label: `${w}g` }))
  const damagedTypeOptions: MultiSelectOption[] = [...new Set(damagedProducts.map((d) => d.bathBombType))]
    .sort((a, b) => a.localeCompare(b, 'cs'))
    .map((t) => ({ value: t, label: t }))
  const damagedWeightOptions: MultiSelectOption[] = [...new Set(damagedProducts.map((d) => d.weight))]
    .sort((a, b) => a - b)
    .map((w) => ({ value: String(w), label: `${w}g` }))
  const steamerNameOptions: MultiSelectOption[] = [...new Set(steamers.map((s) => s.name))]
    .sort((a, b) => a.localeCompare(b, 'cs'))
    .map((n) => ({ value: n, label: n }))

  // Bombs aggregated per weight variant (batches summed together)
  const bombRows = bombs
    .flatMap((bomb) => {
      const byWeight = new Map<number, { price: number; stock: number }>()
      bomb.lots.forEach((lot) =>
        lot.batches.forEach((batch) =>
          batch.variants.forEach((v) => {
            const cur = byWeight.get(v.weight) || { price: v.price, stock: 0 }
            cur.stock += v.stockCount
            cur.price = v.price
            byWeight.set(v.weight, cur)
          })
        )
      )
      return [...byWeight.entries()].map(([weight, { price, stock }]) => ({
        bombId: bomb._id,
        bombName: bomb.name,
        weight,
        price,
        stock,
      }))
    })
    .filter(
      (r) =>
        (bombNameFilter.length === 0 || bombNameFilter.includes(r.bombName)) &&
        (bombWeightFilter.length === 0 || bombWeightFilter.includes(String(r.weight)))
    )
    .sort((a, b) => {
      const d = bombSort.dir === 'asc' ? 1 : -1
      if (bombSort.key === 'name') return cmp(a.bombName, b.bombName) * d || cmp(a.weight, b.weight)
      return cmp(a[bombSort.key], b[bombSort.key]) * d
    })

  const filteredSteamers = steamers
    .filter((s) => steamerNameFilter.length === 0 || steamerNameFilter.includes(s.name))
    .slice()
    .sort((a, b) => {
      const d = steamerSort.dir === 'asc' ? 1 : -1
      return (steamerSort.key === 'name' ? cmp(a.name, b.name) : cmp(a.stockCount, b.stockCount)) * d
    })

  const filteredDamaged = damagedProducts
    .filter(
      (d) =>
        (damagedTypeFilter.length === 0 || damagedTypeFilter.includes(d.bathBombType)) &&
        (damagedWeightFilter.length === 0 || damagedWeightFilter.includes(String(d.weight)))
    )
    .slice()
    .sort((a, b) => {
      const d = damagedSort.dir === 'asc' ? 1 : -1
      if (damagedSort.key === 'type') return cmp(a.bathBombType, b.bathBombType) * d
      if (damagedSort.key === 'weight') return cmp(a.weight, b.weight) * d
      if (damagedSort.key === 'price') return cmp(a.price, b.price) * d
      return cmp(a.stockCount, b.stockCount) * d
    })

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
                <div className="filter-bar">
                  <MultiSelect label="Název" options={bombNameOptions} selected={bombNameFilter} onChange={setBombNameFilter} />
                  <MultiSelect label="Váha" options={bombWeightOptions} selected={bombWeightFilter} onChange={setBombWeightFilter} />
                </div>
                {bombs.length === 0 ? (
                  <p className="no-data">Žádné koupelové koule nenalezeny</p>
                ) : bombRows.length === 0 ? (
                  <p className="no-data">Nic neodpovídá hledání.</p>
                ) : (
                  <div className="stock-table">
                    <table>
                      <thead>
                        <tr>
                          <th className="sortable" onClick={() => toggleSort(bombSort, setBombSort, 'name')}>
                            Název{arrow(bombSort.key === 'name', bombSort.dir)}
                          </th>
                          <th className="sortable" onClick={() => toggleSort(bombSort, setBombSort, 'weight')}>
                            Váha{arrow(bombSort.key === 'weight', bombSort.dir)}
                          </th>
                          <th className="sortable" onClick={() => toggleSort(bombSort, setBombSort, 'price')}>
                            Cena{arrow(bombSort.key === 'price', bombSort.dir)}
                          </th>
                          <th className="sortable" onClick={() => toggleSort(bombSort, setBombSort, 'stock')}>
                            Skladem{arrow(bombSort.key === 'stock', bombSort.dir)}
                          </th>
                          <th>Stav</th>
                          <th>Akce</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bombRows.map((row) => (
                          <tr key={`${row.bombId}-${row.weight}`}>
                            <td>{row.bombName}</td>
                            <td>{row.weight}g</td>
                            <td>{row.price} Kč</td>
                            <td>
                              <span className={row.stock < 10 ? 'low-stock' : ''}>{row.stock}</span>
                            </td>
                            <td>
                              <span className={`status ${row.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                                {row.stock > 0 ? '✓ Skladem' : '✗ Vyprodáno'}
                              </span>
                            </td>
                            <td className="action-cell">
                              <button
                                className="btn-remove-qty"
                                onClick={() => {
                                  setAdjustTarget({
                                    kind: 'bomb',
                                    deleteType: 'bathbomb',
                                    id: row.bombId,
                                    productName: row.bombName,
                                    label: `${row.bombName} (${row.weight}g)`,
                                    stock: row.stock,
                                    weight: row.weight,
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

              <div className="stock-section">
                <h2>💨 Steamery</h2>
                <div className="filter-bar">
                  <MultiSelect label="Název" options={steamerNameOptions} selected={steamerNameFilter} onChange={setSteamerNameFilter} />
                </div>
                {steamers.length === 0 ? (
                  <p className="no-data">Žádné steamery nenalezeny</p>
                ) : filteredSteamers.length === 0 ? (
                  <p className="no-data">Nic neodpovídá hledání.</p>
                ) : (
                  <div className="stock-table">
                    <table>
                      <thead>
                        <tr>
                          <th className="sortable" onClick={() => toggleSort(steamerSort, setSteamerSort, 'name')}>
                            Název{arrow(steamerSort.key === 'name', steamerSort.dir)}
                          </th>
                          <th>LOT</th>
                          <th>Batch</th>
                          <th>Ks v batchi</th>
                          <th className="sortable" onClick={() => toggleSort(steamerSort, setSteamerSort, 'stock')}>
                            Celkem{arrow(steamerSort.key === 'stock', steamerSort.dir)}
                          </th>
                          <th>Stav</th>
                          <th>Akce</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSteamers.map((steamer) =>
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
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="stock-section">
                <h2>💔 Poškozené produkty (Zachraň kouli)</h2>
                <div className="filter-bar">
                  <MultiSelect label="Druh" options={damagedTypeOptions} selected={damagedTypeFilter} onChange={setDamagedTypeFilter} />
                  <MultiSelect label="Váha" options={damagedWeightOptions} selected={damagedWeightFilter} onChange={setDamagedWeightFilter} />
                </div>
                {damagedProducts.length === 0 ? (
                  <p className="no-data">Žádné poškozené produkty nenalezeny</p>
                ) : filteredDamaged.length === 0 ? (
                  <p className="no-data">Nic neodpovídá hledání.</p>
                ) : (
                  <div className="stock-table">
                    <table>
                      <thead>
                        <tr>
                          <th className="sortable" onClick={() => toggleSort(damagedSort, setDamagedSort, 'type')}>
                            Druh koule{arrow(damagedSort.key === 'type', damagedSort.dir)}
                          </th>
                          <th className="sortable" onClick={() => toggleSort(damagedSort, setDamagedSort, 'weight')}>
                            Váha{arrow(damagedSort.key === 'weight', damagedSort.dir)}
                          </th>
                          <th className="sortable" onClick={() => toggleSort(damagedSort, setDamagedSort, 'price')}>
                            Cena{arrow(damagedSort.key === 'price', damagedSort.dir)}
                          </th>
                          <th>Stupeň poškození</th>
                          <th className="sortable" onClick={() => toggleSort(damagedSort, setDamagedSort, 'stock')}>
                            Skladem{arrow(damagedSort.key === 'stock', damagedSort.dir)}
                          </th>
                          <th>Stav</th>
                          <th>Akce</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDamaged.map((dp) => (
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
