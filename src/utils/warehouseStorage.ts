import type {
  RawMaterial,
  RawMaterialBatch,
  Recipe,
  ProductionRecord,
  BatchEvidenceRecord,
  MaterialConsumption,
  SourceBatch,
} from '../types/warehouse'

const KEYS = {
  RAW_MATERIALS: 'bubblena_raw_materials',
  RECIPES: 'bubblena_recipes',
  PRODUCTION_RECORDS: 'bubblena_production_records',
  BATCH_EVIDENCE: 'bubblena_batch_evidence',
  PRODUCTION_COUNTER: 'bubblena_production_counter',
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

// === RAW MATERIALS ===

export function getRawMaterials(): RawMaterial[] {
  const data = localStorage.getItem(KEYS.RAW_MATERIALS)
  return data ? JSON.parse(data) : []
}

export function saveRawMaterials(materials: RawMaterial[]): void {
  localStorage.setItem(KEYS.RAW_MATERIALS, JSON.stringify(materials))
}

export function addRawMaterial(material: Omit<RawMaterial, 'id' | 'currentStock' | 'batches' | 'createdAt' | 'updatedAt'>): RawMaterial {
  const materials = getRawMaterials()
  const now = new Date().toISOString()
  const newMaterial: RawMaterial = {
    ...material,
    id: generateId(),
    currentStock: 0,
    batches: [],
    createdAt: now,
    updatedAt: now,
  }
  materials.push(newMaterial)
  saveRawMaterials(materials)
  return newMaterial
}

export function updateRawMaterial(id: string, updates: Partial<RawMaterial>): RawMaterial | null {
  const materials = getRawMaterials()
  const index = materials.findIndex(m => m.id === id)
  if (index === -1) return null
  materials[index] = { ...materials[index], ...updates, updatedAt: new Date().toISOString() }
  saveRawMaterials(materials)
  return materials[index]
}

export function deleteRawMaterial(id: string): void {
  const materials = getRawMaterials().filter(m => m.id !== id)
  saveRawMaterials(materials)
}

export function addMaterialBatch(
  materialId: string,
  batch: Omit<RawMaterialBatch, 'id' | 'consumed' | 'initialQuantity'>
): RawMaterial | null {
  const materials = getRawMaterials()
  const material = materials.find(m => m.id === materialId)
  if (!material) return null

  const newBatch: RawMaterialBatch = {
    ...batch,
    id: generateId(),
    initialQuantity: batch.quantity,
    consumed: false,
  }
  material.batches.push(newBatch)
  material.currentStock = material.batches
    .filter(b => !b.consumed)
    .reduce((sum, b) => sum + b.quantity, 0)
  material.updatedAt = new Date().toISOString()
  saveRawMaterials(materials)
  return material
}

// === RECIPES ===

export function getRecipes(): Recipe[] {
  const data = localStorage.getItem(KEYS.RECIPES)
  return data ? JSON.parse(data) : []
}

export function saveRecipes(recipes: Recipe[]): void {
  localStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes))
}

export function addRecipe(recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Recipe {
  const recipes = getRecipes()
  const now = new Date().toISOString()
  const newRecipe: Recipe = {
    ...recipe,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  }
  recipes.push(newRecipe)
  saveRecipes(recipes)
  return newRecipe
}

export function updateRecipe(id: string, updates: Partial<Recipe>): Recipe | null {
  const recipes = getRecipes()
  const index = recipes.findIndex(r => r.id === id)
  if (index === -1) return null
  recipes[index] = { ...recipes[index], ...updates, updatedAt: new Date().toISOString() }
  saveRecipes(recipes)
  return recipes[index]
}

export function deleteRecipe(id: string): void {
  const recipes = getRecipes().filter(r => r.id !== id)
  saveRecipes(recipes)
}

// === PRODUCTION ===

export function getProductionRecords(): ProductionRecord[] {
  const data = localStorage.getItem(KEYS.PRODUCTION_RECORDS)
  return data ? JSON.parse(data) : []
}

function saveProductionRecords(records: ProductionRecord[]): void {
  localStorage.setItem(KEYS.PRODUCTION_RECORDS, JSON.stringify(records))
}

function getNextBatchNumber(acronym: string): string {
  const counters = JSON.parse(localStorage.getItem(KEYS.PRODUCTION_COUNTER) || '{}')
  const current = counters[acronym] || 0
  const next = current + 1
  counters[acronym] = next
  localStorage.setItem(KEYS.PRODUCTION_COUNTER, JSON.stringify(counters))
  return `${acronym.toLowerCase()}${String(next).padStart(3, '0')}`
}

/**
 * Produce a batch: deduct materials from warehouse using FIFO, create production record and batch evidence.
 */
export function produceBatch(
  recipeId: string,
  sizes: { weight: number; quantity: number }[],
  dateProduced: string
): { success: boolean; error?: string; record?: ProductionRecord } {
  const recipes = getRecipes()
  const recipe = recipes.find(r => r.id === recipeId)
  if (!recipe) return { success: false, error: 'Recept nenalezen' }

  const materials = getRawMaterials()

  // Check if we have enough of each ingredient
  for (const ingredient of recipe.ingredients) {
    const material = materials.find(m => m.id === ingredient.materialId)
    if (!material) {
      return { success: false, error: `Surovina "${ingredient.materialName}" nenalezena ve skladu` }
    }
    if (material.currentStock < ingredient.quantity) {
      return {
        success: false,
        error: `Nedostatek suroviny "${ingredient.materialName}": potřeba ${ingredient.quantity} ${ingredient.unit}, skladem ${material.currentStock} ${ingredient.unit}`,
      }
    }
  }

  // Deduct materials using FIFO
  const materialsUsed: MaterialConsumption[] = []

  for (const ingredient of recipe.ingredients) {
    const material = materials.find(m => m.id === ingredient.materialId)!
    let remaining = ingredient.quantity
    const sourceBatches: SourceBatch[] = []

    // Sort batches by date stocked (FIFO - oldest first)
    const availableBatches = material.batches
      .filter(b => !b.consumed && b.quantity > 0)
      .sort((a, b) => new Date(a.dateStocked).getTime() - new Date(b.dateStocked).getTime())

    for (const batch of availableBatches) {
      if (remaining <= 0) break

      const used = Math.min(batch.quantity, remaining)
      batch.quantity -= used
      remaining -= used

      sourceBatches.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantityUsed: used,
      })

      if (batch.quantity <= 0) {
        batch.consumed = true
        batch.dateConsumed = new Date().toISOString()
      }
    }

    material.currentStock = material.batches
      .filter(b => !b.consumed)
      .reduce((sum, b) => sum + b.quantity, 0)
    material.updatedAt = new Date().toISOString()

    materialsUsed.push({
      materialId: material.id,
      materialName: material.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      sourceBatches,
    })
  }

  saveRawMaterials(materials)

  // Create production record
  const batchNumber = getNextBatchNumber(recipe.acronym)
  const productionRecord: ProductionRecord = {
    id: generateId(),
    recipeId: recipe.id,
    recipeName: recipe.name,
    recipeAcronym: recipe.acronym,
    batchNumber,
    sizes,
    dateProduced,
    materialsUsed,
    createdAt: new Date().toISOString(),
  }

  const records = getProductionRecords()
  records.push(productionRecord)
  saveProductionRecords(records)

  // Create batch evidence record
  const evidenceRecord: BatchEvidenceRecord = {
    id: generateId(),
    productionRecordId: productionRecord.id,
    batchNumber,
    recipeName: recipe.name,
    dateProduced,
    materialsUsed,
  }

  const evidence = getBatchEvidence()
  evidence.push(evidenceRecord)
  saveBatchEvidence(evidence)

  return { success: true, record: productionRecord }
}

// === BATCH EVIDENCE ===

export function getBatchEvidence(): BatchEvidenceRecord[] {
  const data = localStorage.getItem(KEYS.BATCH_EVIDENCE)
  return data ? JSON.parse(data) : []
}

function saveBatchEvidence(records: BatchEvidenceRecord[]): void {
  localStorage.setItem(KEYS.BATCH_EVIDENCE, JSON.stringify(records))
}

// === LOW STOCK ALERTS ===

export function getLowStockAlerts(): RawMaterial[] {
  const materials = getRawMaterials()
  return materials.filter(m => m.currentStock <= m.lowStockThreshold)
}

// === SEED DATA ===

const SEED_MATERIALS: { name: string; unit: string }[] = [
  { name: 'Aktivní uhlí', unit: 'g' },
  { name: 'Aqua', unit: 'ml' },
  { name: 'Cocamidopropyl Betaine', unit: 'g' },
  { name: 'EO bergamot', unit: 'ml' },
  { name: 'EO levandule', unit: 'ml' },
  { name: 'EO santal', unit: 'ml' },
  { name: 'EO višeň a švestka', unit: 'ml' },
  { name: 'EO černý bez', unit: 'ml' },
  { name: 'FO broskev', unit: 'ml' },
  { name: 'FO pomeranč', unit: 'ml' },
  { name: 'Glitry stříbrné', unit: 'g' },
  { name: 'Glycerinové barvivo fialová', unit: 'g' },
  { name: 'Glycerinové barvivo modrá', unit: 'g' },
  { name: 'Glycerinové barvivo oranžová', unit: 'g' },
  { name: 'Glycerinové barvivo růžová', unit: 'g' },
  { name: 'Glycerinové barvivo fialová EXTRA', unit: 'g' },
  { name: 'Hrubozrná sůl', unit: 'g' },
  { name: 'Jedlá soda', unit: 'g' },
  { name: 'Kokosový olej', unit: 'g' },
  { name: 'Kukuřičný škrob', unit: 'g' },
  { name: 'Kyselina citronová', unit: 'g' },
  { name: 'MICA blueberry', unit: 'g' },
  { name: 'MICA deep ocean', unit: 'g' },
  { name: 'MICA red orange', unit: 'g' },
  { name: 'MICA rosegold', unit: 'g' },
  { name: 'MICA soft ametyst', unit: 'g' },
  { name: 'MICA sunbeam', unit: 'g' },
  { name: 'MICA super orange', unit: 'g' },
  { name: 'MICA warmspice', unit: 'g' },
  { name: 'P80', unit: 'g' },
  { name: 'SLES', unit: 'g' },
  { name: 'SLSA', unit: 'g' },
  { name: 'Sléz květ', unit: 'g' },
  { name: 'Sušené mléko', unit: 'g' },
  { name: 'Sušený měsíček', unit: 'g' },
  { name: 'Sůl Epsomská', unit: 'g' },
  { name: 'Sůl z mrtvého moře', unit: 'g' },
  { name: 'Vanilka - parfémová kompozice', unit: 'ml' },
  { name: 'Vonný olej - kokos', unit: 'ml' },
]

export function seedRawMaterials(): void {
  const existing = getRawMaterials()
  if (existing.length > 0) return // already seeded

  const now = new Date().toISOString()
  const materials: RawMaterial[] = SEED_MATERIALS.map(({ name, unit }) => ({
    id: generateId() + Math.random().toString(36).substr(2, 4),
    name,
    unit,
    currentStock: 0,
    lowStockThreshold: 0,
    batches: [],
    createdAt: now,
    updatedAt: now,
  }))

  saveRawMaterials(materials)
}

// === SEED INITIAL STOCK ===

const SEED_STOCK_KEY = 'bubblena_stock_seeded'

const SEED_STOCK: { materialName: string; batchNumber: string; quantity: number; dateStocked: string }[] = [
  { materialName: 'Glitry stříbrné', batchNumber: '3349G', quantity: 106, dateStocked: '2026-01-01' },
  { materialName: 'Hrubozrná sůl', batchNumber: '240808', quantity: 250, dateStocked: '2026-01-01' },
  { materialName: 'Jedlá soda', batchNumber: 'SOP-007', quantity: 20000, dateStocked: '2026-01-01' },
  { materialName: 'Kokosový olej', batchNumber: 'L161368', quantity: 5000, dateStocked: '2026-01-01' },
  { materialName: 'Kukuřičný škrob', batchNumber: '170825', quantity: 6000, dateStocked: '2026-01-01' },
  { materialName: 'Kyselina citronová', batchNumber: 'A22412004', quantity: 5000, dateStocked: '2026-01-01' },
  { materialName: 'MICA rosegold', batchNumber: '11514', quantity: 53, dateStocked: '2026-01-01' },
  { materialName: 'MICA sunbeam', batchNumber: '1842663', quantity: 40, dateStocked: '2026-01-01' },
  { materialName: 'P80', batchNumber: '4744', quantity: 100, dateStocked: '2026-01-01' },
  { materialName: 'SLSA', batchNumber: '9228997', quantity: 400, dateStocked: '2026-01-01' },
  { materialName: 'Vanilka - parfémová kompozice', batchNumber: 'PK251439', quantity: 30, dateStocked: '2026-01-01' },
  { materialName: 'Vonný olej - kokos', batchNumber: 'PK258572', quantity: 50, dateStocked: '2026-01-01' },
  { materialName: 'Glycerinové barvivo fialová EXTRA', batchNumber: '31012027', quantity: 50, dateStocked: '2026-01-01' },
]

export function seedInitialStock(): void {
  if (localStorage.getItem(SEED_STOCK_KEY)) return

  const materials = getRawMaterials()
  if (materials.length === 0) return

  for (const stock of SEED_STOCK) {
    const material = materials.find(m => m.name === stock.materialName)
    if (!material) continue
    if (material.batches.length > 0) continue // already has stock

    const batch: RawMaterialBatch = {
      id: generateId() + Math.random().toString(36).substr(2, 4),
      batchNumber: stock.batchNumber,
      quantity: stock.quantity,
      initialQuantity: stock.quantity,
      unit: material.unit,
      dateStocked: stock.dateStocked,
      consumed: false,
    }
    material.batches.push(batch)
    material.currentStock = stock.quantity
    material.updatedAt = new Date().toISOString()
  }

  saveRawMaterials(materials)
  localStorage.setItem(SEED_STOCK_KEY, 'true')
}

// === SEED RECIPES ===

const SEED_RECIPES: { name: string; acronym: string; ingredients: { materialName: string; quantity: number }[] }[] = [
  {
    name: 'Blossan',
    acronym: 'BLS',
    ingredients: [
      { materialName: 'Jedlá soda', quantity: 750 },
      { materialName: 'Kyselina citronová', quantity: 300 },
      { materialName: 'Kukuřičný škrob', quantity: 60 },
      { materialName: 'Kokosový olej', quantity: 9 },
      { materialName: 'EO santal', quantity: 9 },
      { materialName: 'Sůl Epsomská', quantity: 30 },
      { materialName: 'SLES', quantity: 12 },
      { materialName: 'MICA soft ametyst', quantity: 3 },
      { materialName: 'Sléz květ', quantity: 2.1 },
      { materialName: 'P80', quantity: 9 },
      { materialName: 'Glycerinové barvivo fialová EXTRA', quantity: 2.3 },
    ],
  },
  {
    name: 'Kokobana',
    acronym: 'KB',
    ingredients: [
      { materialName: 'Jedlá soda', quantity: 750 },
      { materialName: 'Kyselina citronová', quantity: 300 },
      { materialName: 'Kukuřičný škrob', quantity: 90 },
      { materialName: 'Vonný olej - kokos', quantity: 12 },
      { materialName: 'Vanilka - parfémová kompozice', quantity: 6 },
      { materialName: 'SLSA', quantity: 9 },
      { materialName: 'MICA sunbeam', quantity: 3.5 },
      { materialName: 'MICA rosegold', quantity: 0.9 },
      { materialName: 'Glitry stříbrné', quantity: 6 },
      { materialName: 'P80', quantity: 12 },
      { materialName: 'Aqua', quantity: 7.5 },
      { materialName: 'Hrubozrná sůl', quantity: 38 },
    ],
  },
  {
    name: 'Noirvana',
    acronym: 'NV',
    ingredients: [
      { materialName: 'Jedlá soda', quantity: 735 },
      { materialName: 'Kyselina citronová', quantity: 294 },
      { materialName: 'Kukuřičný škrob', quantity: 42 },
      { materialName: 'Kokosový olej', quantity: 19.5 },
      { materialName: 'EO bergamot', quantity: 4.5 },
      { materialName: 'EO černý bez', quantity: 4.5 },
      { materialName: 'Sůl z mrtvého moře', quantity: 15 },
      { materialName: 'Sušené mléko', quantity: 30 },
      { materialName: 'Aktivní uhlí', quantity: 6 },
      { materialName: 'Sušený měsíček', quantity: 1 },
      { materialName: 'P80', quantity: 12.5 },
      { materialName: 'Cocamidopropyl Betaine', quantity: 9 },
    ],
  },
  {
    name: 'Blue orbit',
    acronym: 'BO',
    ingredients: [
      { materialName: 'Jedlá soda', quantity: 750 },
      { materialName: 'Kyselina citronová', quantity: 300 },
      { materialName: 'Kukuřičný škrob', quantity: 90 },
      { materialName: 'SLSA', quantity: 12 },
      { materialName: 'MICA deep ocean', quantity: 1.5 },
      { materialName: 'MICA blueberry', quantity: 1.5 },
      { materialName: 'Glitry stříbrné', quantity: 3 },
      { materialName: 'EO višeň a švestka', quantity: 12 },
      { materialName: 'Kokosový olej', quantity: 6 },
      { materialName: 'Aqua', quantity: 7 },
      { materialName: 'Glycerinové barvivo modrá', quantity: 2.3 },
      { materialName: 'Glycerinové barvivo fialová', quantity: 2.3 },
      { materialName: 'P80', quantity: 12 },
    ],
  },
  {
    name: 'Summer madness',
    acronym: 'SM',
    ingredients: [
      { materialName: 'Jedlá soda', quantity: 690 },
      { materialName: 'Kyselina citronová', quantity: 276 },
      { materialName: 'Kukuřičný škrob', quantity: 105.8 },
      { materialName: 'MICA warmspice', quantity: 2.3 },
      { materialName: 'MICA red orange', quantity: 2.3 },
      { materialName: 'MICA super orange', quantity: 2.3 },
      { materialName: 'FO broskev', quantity: 6.9 },
      { materialName: 'FO pomeranč', quantity: 6.9 },
      { materialName: 'Kokosový olej', quantity: 4.6 },
      { materialName: 'Glycerinové barvivo růžová', quantity: 1.5 },
      { materialName: 'Glycerinové barvivo oranžová', quantity: 1.5 },
      { materialName: 'P80', quantity: 13.8 },
      { materialName: 'Cocamidopropyl Betaine', quantity: 9.2 },
    ],
  },
  {
    name: 'Steamer levandule',
    acronym: 'SL',
    ingredients: [
      { materialName: 'Jedlá soda', quantity: 124 },
      { materialName: 'Kyselina citronová', quantity: 71 },
      { materialName: 'Kokosový olej', quantity: 3 },
      { materialName: 'EO levandule', quantity: 6 },
    ],
  },
]

export function seedRecipes(): void {
  const existing = getRecipes()
  const existingNames = new Set(existing.map(r => r.name))
  const missing = SEED_RECIPES.filter(r => !existingNames.has(r.name))
  if (missing.length === 0) return

  const materials = getRawMaterials()
  const now = new Date().toISOString()

  const newRecipes: Recipe[] = missing.map(({ name, acronym, ingredients }) => ({
    id: generateId() + Math.random().toString(36).substr(2, 4),
    name,
    acronym,
    ingredients: ingredients.map(ing => {
      const mat = materials.find(m => m.name === ing.materialName)
      return {
        materialId: mat?.id || '',
        materialName: ing.materialName,
        quantity: ing.quantity,
        unit: mat?.unit || 'g',
      }
    }),
    createdAt: now,
    updatedAt: now,
  }))

  saveRecipes([...existing, ...newRecipes])
}
