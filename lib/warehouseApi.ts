import type {
  RawMaterial,
  Recipe,
  RecipeIngredient,
  ProductionRecord,
  ProductionBatchSize,
  BatchEvidenceRecord,
  MaterialConsumption,
  FinishedProduct,
} from '@/types/warehouse'

// Vše jde přes serverovou proxy, která doplní x-api-key mimo prohlížeč.
const API_BASE_URL = '/api/be'

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Chyba ${res.status}`
    try {
      const data = await res.json()
      message = data.message || message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

// ---- mappers (Mongo _id -> id) ----

function mapMaterial(m: any): RawMaterial {
  return {
    id: m._id ?? m.id,
    name: m.name,
    currentStock: m.currentStock ?? 0,
    lowStockThreshold: m.lowStockThreshold ?? 0,
    supplierName: m.supplierName,
    purchaseLink: m.purchaseLink,
    notes: m.notes,
    batches: (m.batches || []).map((b: any) => ({
      id: b._id ?? b.id,
      batchNumber: b.batchNumber,
      quantity: b.quantity,
      initialQuantity: b.initialQuantity,
      dateStocked: b.dateStocked,
      consumed: !!b.consumed,
      dateConsumed: b.dateConsumed,
    })),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }
}

function mapRecipe(r: any): Recipe {
  return {
    id: r._id ?? r.id,
    name: r.name,
    acronym: r.acronym,
    ingredients: (r.ingredients || []).map((i: any) => ({
      materialId: i.materialId,
      materialName: i.materialName,
      quantity: i.quantity,
    })),
    productType: r.productType ?? null,
    productId: r.productId,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function mapRecord(p: any): ProductionRecord {
  return {
    id: p._id ?? p.id,
    recipeId: p.recipeId,
    recipeName: p.recipeName,
    recipeAcronym: p.recipeAcronym,
    batchNumber: p.batchNumber,
    lotNumber: p.lotNumber,
    productType: p.productType ?? null,
    productId: p.productId,
    sizes: (p.sizes || []).map((s: any) => ({ weight: s.weight, quantity: s.quantity })),
    materialsUsed: (p.materialsUsed || []).map((mu: any) => ({
      materialId: mu.materialId,
      materialName: mu.materialName,
      quantity: mu.quantity,
      sourceBatches: (mu.sourceBatches || []).map((sb: any) => ({
        batchId: sb.batchId,
        batchNumber: sb.batchNumber,
        quantityUsed: sb.quantityUsed,
      })),
    })),
    dateProduced: p.dateProduced,
    notes: p.notes,
    expiryDate: p.expiryDate,
    createdAt: p.createdAt,
  }
}

// ===== RAW MATERIALS =====

export async function getRawMaterials(): Promise<RawMaterial[]> {
  const data = await handle<any[]>(await fetch(`${API_BASE_URL}/raw-materials`, { headers: headers() }))
  return data.map(mapMaterial)
}

export async function addRawMaterial(material: {
  name: string
  lowStockThreshold?: number
  supplierName?: string
  purchaseLink?: string
  notes?: string
}): Promise<RawMaterial> {
  const data = await handle<any>(
    await fetch(`${API_BASE_URL}/raw-materials`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(material),
    })
  )
  return mapMaterial(data)
}

export async function updateRawMaterial(id: string, updates: Partial<RawMaterial>): Promise<RawMaterial> {
  const data = await handle<any>(
    await fetch(`${API_BASE_URL}/raw-materials/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(updates),
    })
  )
  return mapMaterial(data)
}

export async function deleteRawMaterial(id: string): Promise<void> {
  await handle(await fetch(`${API_BASE_URL}/raw-materials/${id}`, { method: 'DELETE', headers: headers() }))
}

export async function addMaterialBatch(
  materialId: string,
  batch: { batchNumber: string; quantity: number; dateStocked: string }
): Promise<RawMaterial> {
  const data = await handle<any>(
    await fetch(`${API_BASE_URL}/raw-materials/${materialId}/add-batch`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(batch),
    })
  )
  return mapMaterial(data)
}

export async function updateMaterialBatch(
  materialId: string,
  batchId: string,
  updates: { batchNumber?: string; quantity?: number; initialQuantity?: number; dateStocked?: string }
): Promise<RawMaterial> {
  const data = await handle<any>(
    await fetch(`${API_BASE_URL}/raw-materials/${materialId}/batch/${batchId}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(updates),
    })
  )
  return mapMaterial(data)
}

export async function deleteMaterialBatch(materialId: string, batchId: string): Promise<RawMaterial> {
  const data = await handle<any>(
    await fetch(`${API_BASE_URL}/raw-materials/${materialId}/batch/${batchId}`, {
      method: 'DELETE',
      headers: headers(),
    })
  )
  return mapMaterial(data)
}

export async function getLowStockAlerts(): Promise<RawMaterial[]> {
  const materials = await getRawMaterials()
  return materials.filter(m => m.currentStock <= m.lowStockThreshold)
}

// ===== RECIPES =====

export async function getRecipes(): Promise<Recipe[]> {
  const data = await handle<any[]>(await fetch(`${API_BASE_URL}/recipes`, { headers: headers() }))
  return data.map(mapRecipe)
}

export async function addRecipe(recipe: {
  name: string
  acronym: string
  ingredients: RecipeIngredient[]
  productType?: 'bomb' | 'steamer' | null
  productId?: string
  notes?: string
}): Promise<Recipe> {
  const data = await handle<any>(
    await fetch(`${API_BASE_URL}/recipes`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(recipe),
    })
  )
  return mapRecipe(data)
}

export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
  const data = await handle<any>(
    await fetch(`${API_BASE_URL}/recipes/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(updates),
    })
  )
  return mapRecipe(data)
}

export async function deleteRecipe(id: string): Promise<void> {
  await handle(await fetch(`${API_BASE_URL}/recipes/${id}`, { method: 'DELETE', headers: headers() }))
}

// ===== PRODUCTION / BATCH EVIDENCE =====

export async function getProductionRecords(): Promise<ProductionRecord[]> {
  const data = await handle<any[]>(await fetch(`${API_BASE_URL}/production`, { headers: headers() }))
  return data.map(mapRecord)
}

export const getBatchEvidence = getProductionRecords

// ===== FINISHED PRODUCTS (for binding a recipe) =====

export async function getFinishedProducts(): Promise<FinishedProduct[]> {
  const [bombsRes, steamersRes] = await Promise.all([
    fetch(`${API_BASE_URL}/bombs`, { headers: headers() }),
    fetch(`${API_BASE_URL}/steamers`, { headers: headers() }),
  ])
  const bombs = bombsRes.ok ? await bombsRes.json() : []
  const steamers = steamersRes.ok ? await steamersRes.json() : []
  return [
    ...bombs.map((b: any) => ({ id: b._id, name: b.name, type: 'bomb' as const })),
    ...steamers.map((s: any) => ({ id: s._id, name: s.name, type: 'steamer' as const })),
  ]
}

export async function produceBatch(
  recipeId: string,
  sizes: ProductionBatchSize[],
  dateProduced: string
): Promise<{ success: boolean; error?: string; record?: ProductionRecord; productType?: string | null }> {
  try {
    const res = await fetch(`${API_BASE_URL}/production`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ recipeId, sizes, dateProduced }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: false, error: data.message || `Chyba ${res.status}` }
    }
    const data = await res.json()
    return { success: true, record: mapRecord(data.record), productType: data.productType }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Neznámá chyba' }
  }
}

export async function updateProductionRecord(
  id: string,
  updates: { notes?: string; materialsUsed?: MaterialConsumption[]; expiryDate?: string }
): Promise<BatchEvidenceRecord> {
  const data = await handle<any>(
    await fetch(`${API_BASE_URL}/production/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(updates),
    })
  )
  return mapRecord(data)
}

// ===== SEED =====

export async function seedWarehouse(): Promise<{ message: string; materials?: number; recipes?: number }> {
  const res = await fetch(`${API_BASE_URL}/raw-materials/seed`, { method: 'POST', headers: headers() })
  return res.json()
}
