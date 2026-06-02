import { useState, useEffect } from 'react'
import type { BatchEvidenceRecord, MaterialConsumption } from '../types/warehouse'
import { getBatchEvidence, getRawMaterials, updateProductionRecord } from '../utils/warehouseApi'
import './Warehouse.css'

interface BackendBatch {
  id: string
  batchId: string
  bombName: string
  bombAcronym: string
  lotNumber: string
  variants: { weight: number; stockCount: number }[]
  source: 'backend'
}

interface BatchEvidenceProps {
  apiBaseUrl: string
}

const BatchEvidence = ({ apiBaseUrl }: BatchEvidenceProps) => {
  const [records, setRecords] = useState<BatchEvidenceRecord[]>([])
  const [backendBatches, setBackendBatches] = useState<BackendBatch[]>([])
  const [materialNames, setMaterialNames] = useState<string[]>([])
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [editingMaterials, setEditingMaterials] = useState<string | null>(null)
  const [editMaterials, setEditMaterials] = useState<{ materialName: string; quantity: string; batchNumber: string }[]>([])

  useEffect(() => {
    refreshData()
    fetchBackendBatches()
  }, [])

  const refreshData = async () => {
    try {
      const [evidence, materials] = await Promise.all([getBatchEvidence(), getRawMaterials()])
      setRecords(evidence)
      setMaterialNames(materials.map(m => m.name))
    } catch {
      // ignore
    }
  }

  const fetchBackendBatches = async () => {
    try {
      const headers: Record<string, string> = {
        'x-api-key': import.meta.env.VITE_API_KEY || '',
      }
      const res = await fetch(`${apiBaseUrl}/bombs`, { headers })
      if (!res.ok) return

      const bombs: { _id: string; name: string; acronym: string; lots: { lotNumber: string; batches: { _id?: string; batchId: string; variants: { weight: number; stockCount: number }[] }[] }[] }[] = await res.json()

      const allBatches: BackendBatch[] = []
      for (const bomb of bombs) {
        for (const lot of bomb.lots) {
          for (const batch of lot.batches) {
            allBatches.push({
              id: batch._id || batch.batchId,
              batchId: batch.batchId,
              bombName: bomb.name,
              bombAcronym: bomb.acronym,
              lotNumber: lot.lotNumber,
              variants: batch.variants,
              source: 'backend',
            })
          }
        }
      }
      setBackendBatches(allBatches)
    } catch {
      // Backend not available
    }
  }

  // Merge: production/evidence records + backend bomb batches that have no matching evidence record
  const recordBatchNumbers = new Set(records.map(r => r.batchNumber))
  const backendOnly = backendBatches.filter(bb => !recordBatchNumbers.has(bb.batchId))

  const allDisplayItems = [
    ...records.map(r => ({ type: 'record' as const, id: r.id, batchNumber: r.batchNumber, recipeName: r.recipeName, dateProduced: r.dateProduced, data: r })),
    ...backendOnly.map(bb => ({ type: 'backend' as const, id: bb.id, batchNumber: bb.batchId, recipeName: bb.bombName, dateProduced: '', data: bb })),
  ]

  const filteredItems = allDisplayItems.filter(item =>
    item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.recipeName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSaveNotes = async (recordId: string) => {
    try {
      await updateProductionRecord(recordId, { notes: notesValue || undefined })
      refreshData()
    } catch {
      // ignore
    }
    setEditingNotes(null)
  }

  const handleSaveMaterials = async (recordId: string) => {
    const materialsUsed: MaterialConsumption[] = editMaterials
      .filter(em => em.materialName.trim())
      .map(em => ({
        materialId: '',
        materialName: em.materialName,
        quantity: Number(em.quantity) || 0,
        sourceBatches: em.batchNumber ? [{ batchId: '', batchNumber: em.batchNumber, quantityUsed: Number(em.quantity) || 0 }] : [],
      }))

    try {
      await updateProductionRecord(recordId, { materialsUsed })
      refreshData()
    } catch {
      // ignore
    }
    setEditingMaterials(null)
    setEditMaterials([])
  }

  const startEditMaterials = (recordId: string, existing: MaterialConsumption[]) => {
    setEditingMaterials(recordId)
    setEditMaterials(
      existing.length > 0
        ? existing.map(mu => ({
            materialName: mu.materialName,
            quantity: String(mu.quantity),
            batchNumber: mu.sourceBatches.map(sb => sb.batchNumber).join(', '),
          }))
        : [{ materialName: '', quantity: '', batchNumber: '' }]
    )
  }

  const addEditMaterialRow = () => {
    setEditMaterials([...editMaterials, { materialName: '', quantity: '', batchNumber: '' }])
  }

  const updateEditMaterial = (index: number, field: string, value: string) => {
    const updated = [...editMaterials]
    updated[index] = { ...updated[index], [field]: value }
    setEditMaterials(updated)
  }

  const removeEditMaterial = (index: number) => {
    setEditMaterials(editMaterials.filter((_, i) => i !== index))
  }

  const exportToCSV = () => {
    const headers = ['Číslo šarže', 'Recept', 'Datum výroby', 'Suroviny', 'Šarže surovin']
    const rows = records.map(r => [
      r.batchNumber,
      r.recipeName,
      new Date(r.dateProduced).toLocaleDateString('cs-CZ'),
      r.materialsUsed.map(mu => `${mu.materialName} (${mu.quantity} g)`).join('; '),
      r.materialsUsed.map(mu =>
        mu.sourceBatches.map(sb => `${mu.materialName}: ${sb.batchNumber}`).join('; ')
      ).join('; '),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `evidence_sarzi_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const exportToPrintable = () => {
    const printContent = `
      <html>
      <head>
        <title>Evidence šarží - Bubblena</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #667eea; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .date { color: #666; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>Evidence šarží - Bubblena</h1>
        <p>Export: ${new Date().toLocaleDateString('cs-CZ')}</p>
        <table>
          <thead>
            <tr>
              <th>Číslo šarže</th>
              <th>Recept</th>
              <th>Datum výroby</th>
              <th>Suroviny</th>
              <th>Šarže surovin</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td><strong>${r.batchNumber}</strong></td>
                <td>${r.recipeName}</td>
                <td>${new Date(r.dateProduced).toLocaleDateString('cs-CZ')}</td>
                <td>${r.materialsUsed.map(mu => `${mu.materialName}: ${mu.quantity} g`).join('<br>')}</td>
                <td>${r.materialsUsed.map(mu =>
                  mu.sourceBatches.map(sb => `${mu.materialName}: ${sb.batchNumber} (${sb.quantityUsed} g)`).join('<br>')
                ).join('<br>')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="warehouse-section">
      <div className="warehouse-header">
        <h2>📋 Evidence šarží</h2>
        <div className="header-actions">
          <button className="btn-secondary" onClick={exportToCSV}>📥 Export CSV</button>
          <button className="btn-secondary" onClick={exportToPrintable}>🖨️ Tisk / PDF</button>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Hledat dle čísla šarže nebo receptu..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="materials-list">
        {filteredItems.length === 0 ? (
          <p className="empty-state">
            {searchTerm ? 'Žádné záznamy nenalezeny.' : 'Zatím žádné záznamy.'}
          </p>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="material-card">
              <div className="material-header" onClick={() => setExpandedRecord(expandedRecord === item.id ? null : item.id)}>
                <div className="material-info">
                  <h4>{item.batchNumber}</h4>
                  <span className="stock-badge">{item.recipeName}</span>
                  {item.dateProduced && (
                    <span className="stock-badge">
                      {new Date(item.dateProduced).toLocaleDateString('cs-CZ')}
                    </span>
                  )}
                  {item.type === 'record' && (item.data as BatchEvidenceRecord).materialsUsed.length === 0 && (
                    <span className="stock-badge" style={{ background: '#fff3cd', color: '#856404' }}>Bez surovin</span>
                  )}
                  {item.type === 'backend' && (
                    <span className="stock-badge" style={{ background: '#fff3cd', color: '#856404' }}>Ručně přidáno</span>
                  )}
                </div>
              </div>

              {expandedRecord === item.id && item.type === 'record' && (
                <div className="batches-list">
                  {(() => {
                    const record = item.data as BatchEvidenceRecord
                    return (
                      <>
                        {record.lotNumber && <p className="material-meta">📦 LOT: {record.lotNumber}</p>}
                        {record.materialsUsed.length > 0 ? (
                          <>
                            <h5>Použité suroviny a jejich šarže</h5>
                            <table className="batches-table">
                              <thead>
                                <tr>
                                  <th>Surovina</th>
                                  <th>Množství</th>
                                  <th>Šarže (FIFO)</th>
                                  <th>Použito ze šarže</th>
                                </tr>
                              </thead>
                              <tbody>
                                {record.materialsUsed.map((mu, i) => (
                                  mu.sourceBatches.length > 0 ? (
                                    mu.sourceBatches.map((sb, j) => (
                                      <tr key={`${i}-${j}`}>
                                        {j === 0 && (
                                          <>
                                            <td rowSpan={mu.sourceBatches.length}>{mu.materialName}</td>
                                            <td rowSpan={mu.sourceBatches.length}>{mu.quantity} g</td>
                                          </>
                                        )}
                                        <td>{sb.batchNumber}</td>
                                        <td>{sb.quantityUsed} g</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr key={`${i}-0`}>
                                      <td>{mu.materialName}</td>
                                      <td>{mu.quantity} g</td>
                                      <td colSpan={2}>—</td>
                                    </tr>
                                  )
                                ))}
                              </tbody>
                            </table>
                          </>
                        ) : (
                          <p className="empty-state">Žádné suroviny zatím nezadány.</p>
                        )}

                        {record.notes && <p className="material-meta">📝 {record.notes}</p>}

                        <div className="form-actions" style={{ marginTop: '0.5rem' }}>
                          <button className="btn-sm btn-secondary" onClick={() => startEditMaterials(record.id, record.materialsUsed)}>
                            ✏️ Editovat suroviny
                          </button>
                          <button className="btn-sm btn-secondary" onClick={() => { setEditingNotes(record.id); setNotesValue(record.notes || '') }}>
                            📝 Poznámka
                          </button>
                        </div>

                        {editingNotes === record.id && (
                          <div className="form-card" style={{ marginTop: '0.5rem' }}>
                            <div className="form-group">
                              <label>Poznámka</label>
                              <textarea value={notesValue} onChange={e => setNotesValue(e.target.value)} rows={2} />
                            </div>
                            <div className="form-actions">
                              <button className="btn-sm btn-primary" onClick={() => handleSaveNotes(record.id)}>Uložit</button>
                              <button className="btn-sm btn-secondary" onClick={() => setEditingNotes(null)}>Zrušit</button>
                            </div>
                          </div>
                        )}

                        {editingMaterials === record.id && (
                          <div className="form-card" style={{ marginTop: '0.5rem' }}>
                            <h5>Editace surovin</h5>
                            {editMaterials.map((em, idx) => (
                              <div key={idx} className="ingredient-row">
                                <select value={em.materialName} onChange={e => updateEditMaterial(idx, 'materialName', e.target.value)}>
                                  <option value="">Vyberte surovinu...</option>
                                  {materialNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                  ))}
                                </select>
                                <input type="number" placeholder="Množství (g)" value={em.quantity} onChange={e => updateEditMaterial(idx, 'quantity', e.target.value)} style={{ width: '90px' }} />
                                <input placeholder="Č. šarže" value={em.batchNumber} onChange={e => updateEditMaterial(idx, 'batchNumber', e.target.value)} style={{ width: '100px' }} />
                                <button className="btn-sm btn-danger" onClick={() => removeEditMaterial(idx)}>✕</button>
                              </div>
                            ))}
                            <div className="form-actions">
                              <button className="btn-sm btn-secondary" onClick={addEditMaterialRow}>+ Surovina</button>
                              <button className="btn-sm btn-primary" onClick={() => handleSaveMaterials(record.id)}>Uložit</button>
                              <button className="btn-sm btn-secondary" onClick={() => setEditingMaterials(null)}>Zrušit</button>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}

              {expandedRecord === item.id && item.type === 'backend' && (
                <div className="batches-list">
                  {(() => {
                    const bb = item.data as BackendBatch
                    return (
                      <>
                        <p className="material-meta">📦 LOT: {bb.lotNumber}</p>
                        <p className="material-meta">
                          Velikosti: {bb.variants.map(v => `${v.weight}g × ${v.stockCount} ks`).join(', ')}
                        </p>
                        <p className="empty-state">Tento batch byl přidán ručně přes Sklad koulí — bez evidence surovin (nevznikl výrobou receptu).</p>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default BatchEvidence
