// Raw Material in the warehouse
export interface RawMaterialBatch {
  id: string
  batchNumber: string // supplier batch number (šarže)
  quantity: number // current quantity in stock
  initialQuantity: number // original quantity when stocked
  unit: string // kg, g, ml, l, pcs
  dateStocked: string // ISO date
  consumed: boolean // fully used up
  dateConsumed?: string // when it was fully used
}

export interface RawMaterial {
  id: string
  name: string
  unit: string // default unit (kg, g, ml, l, pcs)
  currentStock: number // total across all batches
  lowStockThreshold: number // alert when below this
  supplierName?: string
  purchaseLink?: string
  notes?: string
  batches: RawMaterialBatch[]
  createdAt: string
  updatedAt: string
}

// Recipe
export interface RecipeIngredient {
  materialId: string
  materialName: string
  quantity: number // amount needed per batch
  unit: string
}

export interface Recipe {
  id: string
  name: string // e.g. "Kokobana"
  acronym: string // e.g. "KB"
  ingredients: RecipeIngredient[]
  notes?: string
  createdAt: string
  updatedAt: string
}

// Production
export interface ProductionBatchSize {
  weight: number // grams
  quantity: number // how many of this size
}

export interface ProductionRecord {
  id: string
  recipeId: string
  recipeName: string
  recipeAcronym: string
  batchNumber: string // e.g. "kokobana001"
  sizes: ProductionBatchSize[]
  dateProduced: string // ISO date
  materialsUsed: MaterialConsumption[]
  createdAt: string
}

export interface MaterialConsumption {
  materialId: string
  materialName: string
  quantity: number
  unit: string
  sourceBatches: SourceBatch[] // which material batches were used (FIFO)
}

export interface SourceBatch {
  batchId: string
  batchNumber: string
  quantityUsed: number
}

// Batch Evidence (šarže evidence)
export interface BatchEvidenceRecord {
  id: string
  productionRecordId: string
  batchNumber: string // same as production batch number
  recipeName: string
  dateProduced: string
  expiryDate?: string
  materialsUsed: MaterialConsumption[]
  notes?: string
}
