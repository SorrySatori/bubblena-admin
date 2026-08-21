'use client'

import { useState, useEffect } from 'react'
import type { Recipe, RecipeIngredient, RawMaterial, FinishedProduct } from '@/types/warehouse'
import { getRecipes, addRecipe, updateRecipe, deleteRecipe, getRawMaterials, getFinishedProducts } from '@/lib/warehouseApi'

const Recipes = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [products, setProducts] = useState<FinishedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddRecipe, setShowAddRecipe] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<string | null>(null)
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null)

  // Form states
  const [recipeName, setRecipeName] = useState('')
  const [recipeAcronym, setRecipeAcronym] = useState('')
  const [recipeNotes, setRecipeNotes] = useState('')
  const [recipeProductId, setRecipeProductId] = useState('')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])

  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [recs, mats, prods] = await Promise.all([getRecipes(), getRawMaterials(), getFinishedProducts()])
      setRecipes(recs)
      setMaterials(mats)
      setProducts(prods)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba načítání receptů')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setRecipeName('')
    setRecipeAcronym('')
    setRecipeNotes('')
    setRecipeProductId('')
    setIngredients([])
  }

  const addIngredient = () => {
    setIngredients([...ingredients, { materialId: '', materialName: '', quantity: 0 }])
  }

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    const updated = [...ingredients]
    if (field === 'materialId') {
      const material = materials.find(m => m.id === value)
      updated[index] = {
        ...updated[index],
        materialId: value as string,
        materialName: material?.name || '',
      }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setIngredients(updated)
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const selectedProduct = products.find(p => p.id === recipeProductId)

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addRecipe({
        name: recipeName,
        acronym: recipeAcronym,
        ingredients,
        productType: selectedProduct?.type ?? null,
        productId: selectedProduct?.id,
        notes: recipeNotes || undefined,
      })
      resetForm()
      setShowAddRecipe(false)
      refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při ukládání receptu')
    }
  }

  const startEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe.id)
    setRecipeName(recipe.name)
    setRecipeAcronym(recipe.acronym)
    setRecipeNotes(recipe.notes || '')
    setRecipeProductId(recipe.productId || '')
    setIngredients([...recipe.ingredients])
  }

  const handleUpdateRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecipe) return
    try {
      await updateRecipe(editingRecipe, {
        name: recipeName,
        acronym: recipeAcronym,
        ingredients,
        productType: selectedProduct?.type ?? null,
        productId: selectedProduct?.id,
        notes: recipeNotes || undefined,
      })
      resetForm()
      setEditingRecipe(null)
      refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při úpravě receptu')
    }
  }

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('Opravdu smazat tento recept?')) return
    try {
      await deleteRecipe(id)
      refreshData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při mazání receptu')
    }
  }

  const renderForm = (onSubmit: (e: React.FormEvent) => void, isEdit: boolean) => (
    <div className="form-card">
      <h3>{isEdit ? 'Upravit recept' : 'Nový recept'}</h3>
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Název receptu *</label>
            <input value={recipeName} onChange={e => setRecipeName(e.target.value)} required placeholder="např. Kokobana" />
          </div>
          <div className="form-group">
            <label>Zkratka *</label>
            <input value={recipeAcronym} onChange={e => setRecipeAcronym(e.target.value)} required placeholder="např. KB" />
          </div>
        </div>

        <div className="form-group">
          <label>Vyráběný produkt (sklad hotových výrobků)</label>
          <select value={recipeProductId} onChange={e => setRecipeProductId(e.target.value)}>
            <option value="">— nenavázáno (jen odpis surovin) —</option>
            <optgroup label="Koule">
              {products.filter(p => p.type === 'bomb').map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
            <optgroup label="Steamery">
              {products.filter(p => p.type === 'steamer').map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="ingredients-section">
          <div className="ingredients-header">
            <h4>Suroviny na 1 batch (v gramech)</h4>
            <button type="button" className="btn-sm btn-primary" onClick={addIngredient}>+ Přidat surovinu</button>
          </div>

          {ingredients.length === 0 && (
            <p className="empty-state">Přidejte suroviny do receptu</p>
          )}

          {ingredients.map((ing, index) => (
            <div key={index} className="ingredient-row">
              <div className="form-group">
                <label>Surovina</label>
                <select
                  value={ing.materialId}
                  onChange={e => updateIngredient(index, 'materialId', e.target.value)}
                  required
                >
                  <option value="">Vyberte...</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Množství (g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={ing.quantity || ''}
                  onChange={e => updateIngredient(index, 'quantity', Number(e.target.value))}
                  required
                />
              </div>
              <button type="button" className="btn-sm btn-danger" onClick={() => removeIngredient(index)}>✕</button>
            </div>
          ))}
        </div>

        <div className="form-group">
          <label>Poznámky</label>
          <textarea value={recipeNotes} onChange={e => setRecipeNotes(e.target.value)} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">{isEdit ? 'Uložit změny' : 'Vytvořit recept'}</button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { resetForm(); isEdit ? setEditingRecipe(null) : setShowAddRecipe(false) }}
          >
            Zrušit
          </button>
        </div>
      </form>
    </div>
  )

  return (
    <div className="warehouse-section">
      <div className="warehouse-header">
        <h2>📖 Recepty</h2>
        <button className="btn-primary" onClick={() => { resetForm(); setShowAddRecipe(true) }}>
          + Nový recept
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!loading && materials.length === 0 && (
        <div className="alerts-section">
          <p>⚠️ Nejprve přidejte suroviny do skladu, abyste mohli vytvořit recept.</p>
        </div>
      )}

      {showAddRecipe && renderForm(handleAddRecipe, false)}
      {editingRecipe && renderForm(handleUpdateRecipe, true)}

      <div className="recipes-list">
        {loading ? (
          <p className="empty-state">Načítání…</p>
        ) : recipes.length === 0 ? (
          <p className="empty-state">Zatím nemáte žádné recepty.</p>
        ) : (
          recipes.map(recipe => (
            <div key={recipe.id} className="material-card">
              <div className="material-header" onClick={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}>
                <div className="material-info">
                  <h4>{recipe.name}</h4>
                  <span className="stock-badge">{recipe.acronym}</span>
                  <span className="stock-badge">{recipe.ingredients.length} surovin</span>
                  {recipe.productId ? (
                    <span className="stock-badge" title="Navázaný produkt">
                      🎯 {products.find(p => p.id === recipe.productId)?.name
                        || (recipe.productType === 'steamer' ? 'Steamer' : 'Koule')}
                    </span>
                  ) : (
                    <span className="stock-badge" style={{ background: '#fff3cd', color: '#856404' }}>Bez produktu</span>
                  )}
                </div>
                <div className="material-actions">
                  <button className="btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); startEditRecipe(recipe) }}>
                    ✏️
                  </button>
                  <button className="btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(recipe.id) }}>
                    🗑️
                  </button>
                </div>
              </div>

              {recipe.notes && <p className="material-meta">📝 {recipe.notes}</p>}

              {expandedRecipe === recipe.id && (
                <div className="batches-list">
                  <h5>Složení (na 1 batch)</h5>
                  <table className="batches-table">
                    <thead>
                      <tr>
                        <th>Surovina</th>
                        <th>Množství</th>
                        <th>Skladem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipe.ingredients.map((ing, i) => {
                        const material = materials.find(m => m.id === ing.materialId)
                        const hasEnough = material ? material.currentStock >= ing.quantity : false
                        return (
                          <tr key={i} className={!hasEnough ? 'low-stock-row' : ''}>
                            <td>{ing.materialName}</td>
                            <td>{ing.quantity} g</td>
                            <td className={!hasEnough ? 'text-danger' : 'text-success'}>
                              {material ? `${material.currentStock} g` : 'N/A'}
                            </td>
                          </tr>
                        )
                      })}
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

export default Recipes
