import { useState, useEffect } from 'react'
import type { RawMaterial } from '../types/warehouse'
import {
  getRawMaterials,
  saveRawMaterials,
  addRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  addMaterialBatch,
  getLowStockAlerts,
  seedRawMaterials,
  seedInitialStock,
} from '../utils/warehouseStorage'
import './Warehouse.css'

const RawMaterials = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [alerts, setAlerts] = useState<RawMaterial[]>([])
  const [showAddMaterial, setShowAddMaterial] = useState(false)
  const [showAddBatch, setShowAddBatch] = useState<string | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null)
  const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null)
  const [showAlerts, setShowAlerts] = useState(false)

  // Add material form
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('g')
  const [newThreshold, setNewThreshold] = useState('')
  const [newSupplier, setNewSupplier] = useState('')
  const [newLink, setNewLink] = useState('')
  const [newNotes, setNewNotes] = useState('')

  // Add batch form
  const [batchNumber, setBatchNumber] = useState('')
  const [batchQuantity, setBatchQuantity] = useState('')
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0])

  // Edit form
  const [editThreshold, setEditThreshold] = useState('')
  const [editSupplier, setEditSupplier] = useState('')
  const [editLink, setEditLink] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Edit batch
  const [editingBatch, setEditingBatch] = useState<string | null>(null)
  const [editBatchNumber, setEditBatchNumber] = useState('')
  const [editBatchQuantity, setEditBatchQuantity] = useState('')
  const [editBatchInitial, setEditBatchInitial] = useState('')
  const [editBatchDate, setEditBatchDate] = useState('')

  useEffect(() => {
    seedRawMaterials()
    seedInitialStock()
    refreshData()
  }, [])

  const refreshData = () => {
    setMaterials(getRawMaterials())
    setAlerts(getLowStockAlerts())
  }

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault()
    addRawMaterial({
      name: newName,
      unit: newUnit,
      lowStockThreshold: Number(newThreshold) || 0,
      supplierName: newSupplier || undefined,
      purchaseLink: newLink || undefined,
      notes: newNotes || undefined,
    })
    setNewName('')
    setNewUnit('g')
    setNewThreshold('')
    setNewSupplier('')
    setNewLink('')
    setNewNotes('')
    setShowAddMaterial(false)
    refreshData()
  }

  const handleAddBatch = (e: React.FormEvent, materialId: string) => {
    e.preventDefault()
    addMaterialBatch(materialId, {
      batchNumber,
      quantity: Number(batchQuantity),
      unit: materials.find(m => m.id === materialId)?.unit || 'g',
      dateStocked: batchDate,
    })
    setBatchNumber('')
    setBatchQuantity('')
    setBatchDate(new Date().toISOString().split('T')[0])
    setShowAddBatch(null)
    refreshData()
  }

  const handleUpdateMaterial = (id: string) => {
    updateRawMaterial(id, {
      lowStockThreshold: Number(editThreshold) || 0,
      supplierName: editSupplier || undefined,
      purchaseLink: editLink || undefined,
      notes: editNotes || undefined,
    })
    setEditingMaterial(null)
    refreshData()
  }

  const handleDeleteMaterial = (id: string) => {
    if (confirm('Opravdu smazat tuto surovinu?')) {
      deleteRawMaterial(id)
      refreshData()
    }
  }

  const startEditingBatch = (batch: { id: string; batchNumber: string; quantity: number; initialQuantity: number; dateStocked: string }) => {
    setEditingBatch(batch.id)
    setEditBatchNumber(batch.batchNumber)
    setEditBatchQuantity(String(batch.quantity))
    setEditBatchInitial(String(batch.initialQuantity))
    setEditBatchDate(batch.dateStocked.split('T')[0])
  }

  const handleSaveBatch = (materialId: string) => {
    const mats = getRawMaterials()
    const mat = mats.find(m => m.id === materialId)
    if (!mat) return
    const batch = mat.batches.find(b => b.id === editingBatch)
    if (!batch) return

    batch.batchNumber = editBatchNumber
    batch.quantity = Number(editBatchQuantity)
    batch.initialQuantity = Number(editBatchInitial)
    batch.dateStocked = editBatchDate
    batch.consumed = batch.quantity <= 0

    mat.currentStock = mat.batches.filter(b => !b.consumed).reduce((sum, b) => sum + b.quantity, 0)
    mat.updatedAt = new Date().toISOString()
    saveRawMaterials(mats)
    setEditingBatch(null)
    refreshData()
  }

  const handleDeleteBatch = (materialId: string, batchId: string) => {
    if (!confirm('Opravdu smazat tuto šarži?')) return
    const mats = getRawMaterials()
    const mat = mats.find(m => m.id === materialId)
    if (!mat) return
    mat.batches = mat.batches.filter(b => b.id !== batchId)
    mat.currentStock = mat.batches.filter(b => !b.consumed).reduce((sum, b) => sum + b.quantity, 0)
    mat.updatedAt = new Date().toISOString()
    saveRawMaterials(mats)
    refreshData()
  }

  const startEditing = (material: RawMaterial) => {
    setEditingMaterial(material.id)
    setEditThreshold(String(material.lowStockThreshold))
    setEditSupplier(material.supplierName || '')
    setEditLink(material.purchaseLink || '')
    setEditNotes(material.notes || '')
  }

  return (
    <div className="warehouse-section">
      <div className="warehouse-header">
        <h2>🧪 Sklad surovin</h2>
        <button className="btn-primary" onClick={() => setShowAddMaterial(true)}>
          + Přidat surovinu
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="alerts-section">
          <h3 className="alerts-toggle" onClick={() => setShowAlerts(!showAlerts)}>
            {showAlerts ? '▾' : '▸'} ⚠️ Nízký stav zásob ({alerts.length})
          </h3>
          {showAlerts && (
            <div className="alerts-list">
              {alerts.map(a => (
                <div key={a.id} className="alert-item">
                  <strong>{a.name}</strong>: {a.currentStock} {a.unit} (minimum: {a.lowStockThreshold} {a.unit})
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddMaterial && (
        <div className="form-card">
          <h3>Nová surovina</h3>
          <form onSubmit={handleAddMaterial}>
            <div className="form-row">
              <div className="form-group">
                <label>Název *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Jednotka</label>
                <select value={newUnit} onChange={e => setNewUnit(e.target.value)}>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="ks">ks</option>
                </select>
              </div>
              <div className="form-group">
                <label>Min. množství (upozornění)</label>
                <input type="number" value={newThreshold} onChange={e => setNewThreshold(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Dodavatel</label>
                <input value={newSupplier} onChange={e => setNewSupplier(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Odkaz na e-shop</label>
                <input value={newLink} onChange={e => setNewLink(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Poznámky</label>
              <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Uložit</button>
              <button type="button" className="btn-secondary" onClick={() => setShowAddMaterial(false)}>Zrušit</button>
            </div>
          </form>
        </div>
      )}

      <div className="materials-list">
        {materials.length === 0 ? (
          <p className="empty-state">Zatím nemáte žádné suroviny. Přidejte první!</p>
        ) : (
          materials.map(material => (
            <div key={material.id} className={`material-card ${material.currentStock <= material.lowStockThreshold ? 'low-stock' : ''}`}>
              <div className="material-header" onClick={() => setExpandedMaterial(expandedMaterial === material.id ? null : material.id)}>
                <div className="material-info">
                  <h4>{material.name}</h4>
                  <span className="stock-badge">
                    {material.currentStock} {material.unit}
                  </span>
                  {material.currentStock <= material.lowStockThreshold && (
                    <span className="low-badge">⚠️ Dochází</span>
                  )}
                </div>
                <div className="material-actions">
                  <button className="btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); setShowAddBatch(material.id) }}>
                    + Šarže
                  </button>
                  <button className="btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); startEditing(material) }}>
                    ✏️
                  </button>
                  <button className="btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(material.id) }}>
                    🗑️
                  </button>
                </div>
              </div>

              {material.supplierName && <p className="material-meta">Dodavatel: {material.supplierName}</p>}
              {material.purchaseLink && (
                <p className="material-meta">
                  <a href={material.purchaseLink} target="_blank" rel="noopener noreferrer">🔗 Odkaz na nákup</a>
                </p>
              )}
              {material.notes && <p className="material-meta">📝 {material.notes}</p>}

              {editingMaterial === material.id && (
                <div className="edit-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Min. množství</label>
                      <input type="number" value={editThreshold} onChange={e => setEditThreshold(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Dodavatel</label>
                      <input value={editSupplier} onChange={e => setEditSupplier(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Odkaz</label>
                      <input value={editLink} onChange={e => setEditLink(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Poznámky</label>
                    <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} />
                  </div>
                  <div className="form-actions">
                    <button className="btn-primary" onClick={() => handleUpdateMaterial(material.id)}>Uložit</button>
                    <button className="btn-secondary" onClick={() => setEditingMaterial(null)}>Zrušit</button>
                  </div>
                </div>
              )}

              {showAddBatch === material.id && (
                <div className="edit-form">
                  <h5>Naskladnit šarži</h5>
                  <form onSubmit={(e) => handleAddBatch(e, material.id)}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Číslo šarže *</label>
                        <input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>Množství ({material.unit}) *</label>
                        <input type="number" step="0.01" value={batchQuantity} onChange={e => setBatchQuantity(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>Datum naskladnění</label>
                        <input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)} />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn-primary">Naskladnit</button>
                      <button type="button" className="btn-secondary" onClick={() => setShowAddBatch(null)}>Zrušit</button>
                    </div>
                  </form>
                </div>
              )}

              {expandedMaterial === material.id && (
                <div className="batches-list">
                  <h5>Šarže ({material.batches.length})</h5>
                  {material.batches.length === 0 ? (
                    <p className="empty-state">Žádné šarže</p>
                  ) : (
                    <table className="batches-table">
                      <thead>
                        <tr>
                          <th>Číslo šarže</th>
                          <th>Zbývá</th>
                          <th>Původní</th>
                          <th>Naskladněno</th>
                          <th>Stav</th>
                          <th>Akce</th>
                        </tr>
                      </thead>
                      <tbody>
                        {material.batches
                          .sort((a, b) => new Date(a.dateStocked).getTime() - new Date(b.dateStocked).getTime())
                          .map(batch => (
                            editingBatch === batch.id ? (
                              <tr key={batch.id}>
                                <td><input value={editBatchNumber} onChange={e => setEditBatchNumber(e.target.value)} style={{width: '100px'}} /></td>
                                <td><input type="number" value={editBatchQuantity} onChange={e => setEditBatchQuantity(e.target.value)} style={{width: '70px'}} /> {material.unit}</td>
                                <td><input type="number" value={editBatchInitial} onChange={e => setEditBatchInitial(e.target.value)} style={{width: '70px'}} /> {material.unit}</td>
                                <td><input type="date" value={editBatchDate} onChange={e => setEditBatchDate(e.target.value)} /></td>
                                <td>{Number(editBatchQuantity) <= 0 ? <span className="badge-consumed">Spotřebováno</span> : <span className="badge-active">Aktivní</span>}</td>
                                <td>
                                  <button className="btn-sm btn-primary" onClick={() => handleSaveBatch(material.id)}>💾</button>
                                  <button className="btn-sm btn-secondary" onClick={() => setEditingBatch(null)}>✕</button>
                                </td>
                              </tr>
                            ) : (
                              <tr key={batch.id} className={batch.consumed ? 'consumed' : ''}>
                                <td>{batch.batchNumber}</td>
                                <td>{batch.quantity} {material.unit}</td>
                                <td>{batch.initialQuantity} {material.unit}</td>
                                <td>{new Date(batch.dateStocked).toLocaleDateString('cs-CZ')}</td>
                                <td>
                                  {batch.consumed ? (
                                    <span className="badge-consumed">Spotřebováno</span>
                                  ) : (
                                    <span className="badge-active">Aktivní</span>
                                  )}
                                </td>
                                <td>
                                  <button className="btn-sm btn-secondary" onClick={() => startEditingBatch(batch)}>✏️</button>
                                  <button className="btn-sm btn-danger" onClick={() => handleDeleteBatch(material.id, batch.id)}>🗑️</button>
                                </td>
                              </tr>
                            )
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default RawMaterials
