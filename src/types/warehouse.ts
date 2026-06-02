// All raw-material quantities are in GRAMS (no per-item unit field).

// Supplier intake batch (šarže) of a raw material
export interface RawMaterialBatch {
  id: string
  batchNumber: string // supplier batch number (šarže)
  quantity: number // current remaining quantity in grams
  initialQuantity: number // original quantity when stocked, grams
  dateStocked: string // ISO date
  consumed: boolean // fully used up
  dateConsumed?: string // when it was fully used
}

export interface RawMaterial {
  id: string
  name: string
  currentStock: number // total grams across all non-consumed batches
  lowStockThreshold: number // alert when below this (grams)
  supplierName?: string
  purchaseLink?: string
  notes?: string
  batches: RawMaterialBatch[]
  createdAt?: string
  updatedAt?: string
}

// Recipe
export interface RecipeIngredient {
  materialId: string
  materialName: string
  quantity: number // grams needed per batch
}

export interface Recipe {
  id: string
  name: string // e.g. "Kokobana"
  acronym: string // e.g. "KB"
  ingredients: RecipeIngredient[]
  productType?: 'bomb' | 'steamer' | null // bound finished product collection
  productId?: string // Bomb/Steamer id this recipe produces
  notes?: string
  createdAt?: string
  updatedAt?: string
}

// A finished product (Bomb or Steamer) a recipe can be bound to
export interface FinishedProduct {
  id: string
  name: string
  type: 'bomb' | 'steamer'
}

// Production
export interface ProductionBatchSize {
  weight: number // grams per piece
  quantity: number // how many of this size
}

export interface SourceBatch {
  batchId: string
  batchNumber: string
  quantityUsed: number // grams
}

export interface MaterialConsumption {
  materialId: string
  materialName: string
  quantity: number // total grams
  sourceBatches: SourceBatch[] // which material batches were used (FIFO)
}

export interface ProductionRecord {
  id: string
  recipeId: string
  recipeName: string
  recipeAcronym: string
  batchNumber: string // assigned product batchId, e.g. "KB-001"
  lotNumber?: string // e.g. "BB-KB-001"
  productType?: 'bomb' | 'steamer' | null
  productId?: string
  sizes: ProductionBatchSize[]
  dateProduced: string // ISO date
  materialsUsed: MaterialConsumption[]
  notes?: string
  expiryDate?: string
  createdAt?: string
}

// Batch Evidence reuses the production record shape (one collection in the DB)
export type BatchEvidenceRecord = ProductionRecord
