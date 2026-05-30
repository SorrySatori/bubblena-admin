import { useState, useEffect } from 'react'
import type { Recipe, RecipeIngredient, RawMaterial } from '../types/warehouse'
import { getRecipes, addRecipe, updateRecipe, deleteRecipe, getRawMaterials, seedRecipes } from '../utils/warehouseStorage'
import './Warehouse.css'

const Recipes = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [showAddRecipe, setShowAddRecipe] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<string | null>(null)
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null)

  // Form states
  const [recipeName, setRecipeName] = useState('')
  const [recipeAcronym, setRecipeAcronym] = useState('')
  const [recipeNotes, setRecipeNotes] = useState('')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])

  useEffect(() => {
    seedRecipes()
    refreshData()
  }, [])

  const refreshData = () => {
    setRecipes(getRecipes())
    setMaterials(getRawMaterials())
  }

  const resetForm = () => {
    setRecipeName('')
    setRecipeAcronym('')
    setRecipeNotes('')
    setIngredients([])
  }

  const addIngredient = () => {
    setIngredients([...ingredients, { materialId: '', materialName: '', quantity: 0, unit: 'g' }])
  }

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    const updated = [...ingredients]
    if (field === 'materialId') {
      const material = materials.find(m => m.id === value)
      updated[index] = {
        ...updated[index],
        materialId: value as string,
        materialName: material?.name || '',
        unit: material?.unit || 'g',
      }
    } else {
      (updated[index] as Record<string, unknown>)[field] = value
    }
    setIngredients(updated)
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleAddRecipe = (e: React.FormEvent) => {
    e.preventDefault()
    addRecipe({
      name: recipeName,
      acronym: recipeAcronym,
      ingredients,
      notes: recipeNotes || undefined,
    })
    resetForm()
    setShowAddRecipe(false)
    refreshData()
  }

  const startEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe.id)
    setRecipeName(recipe.name)
    setRecipeAcronym(recipe.acronym)
    setRecipeNotes(recipe.notes || '')
    setIngredients([...recipe.ingredients])
  }

  const handleUpdateRecipe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecipe) return
    updateRecipe(editingRecipe, {
      name: recipeName,
      acronym: recipeAcronym,
      ingredients,
      notes: recipeNotes || undefined,
    })
    resetForm()
    setEditingRecipe(null)
    refreshData()
  }

  const handleDeleteRecipe = (id: string) => {
    if (confirm('Opravdu smazat tento recept?')) {
      deleteRecipe(id)
      refreshData()
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

        <div className="ingredients-section">
          <div className="ingredients-header">
            <h4>Suroviny na 1 batch</h4>
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
                    <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Množství ({ing.unit})</label>
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

      {materials.length === 0 && (
        <div className="alerts-section">
          <p>⚠️ Nejprve přidejte suroviny do skladu, abyste mohli vytvořit recept.</p>
        </div>
      )}

      {showAddRecipe && renderForm(handleAddRecipe, false)}
      {editingRecipe && renderForm(handleUpdateRecipe, true)}

      <div className="recipes-list">
        {recipes.length === 0 ? (
          <p className="empty-state">Zatím nemáte žádné recepty.</p>
        ) : (
          recipes.map(recipe => (
            <div key={recipe.id} className="material-card">
              <div className="material-header" onClick={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}>
                <div className="material-info">
                  <h4>{recipe.name}</h4>
                  <span className="stock-badge">{recipe.acronym}</span>
                  <span className="stock-badge">{recipe.ingredients.length} surovin</span>
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
                            <td>{ing.quantity} {ing.unit}</td>
                            <td className={!hasEnough ? 'text-danger' : 'text-success'}>
                              {material ? `${material.currentStock} ${material.unit}` : 'N/A'}
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
