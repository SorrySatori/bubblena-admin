import { useEffect, useState } from 'react'
import './DiscountManagement.css'

type DiscountCodeType = 'global' | 'individual'

interface DiscountCode {
  _id: string
  code: string
  type: DiscountCodeType
  percentage: number
  freeShipping: boolean
  validUntil?: string
  isActive: boolean
  usedAt?: string
  usedByOrderId?: string
  createdAt: string
}

interface DiscountManagementProps {
  apiBaseUrl: string
}

const headers = () => ({
  'Content-Type': 'application/json',
  'x-api-key': import.meta.env.VITE_API_KEY || '',
})

const generateCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'BUBL-'
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}

const formatDate = (date?: string) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('cs-CZ')
}

const DiscountManagement = ({ apiBaseUrl }: DiscountManagementProps) => {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [globalCode, setGlobalCode] = useState('')
  const [globalValidUntil, setGlobalValidUntil] = useState('')
  const [globalPercentage, setGlobalPercentage] = useState('')

  const [individualCode, setIndividualCode] = useState(generateCode())
  const [individualPercentage, setIndividualPercentage] = useState('')
  const [individualFreeShipping, setIndividualFreeShipping] = useState(false)

  const fetchDiscountCodes = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${apiBaseUrl}/discount-codes`, { headers: headers() })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load discount codes')
      }

      setDiscountCodes(data.discountCodes)
    } catch (err: any) {
      setError(err.message || 'Error loading discount codes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDiscountCodes()
  }, [])

  const createDiscountCode = async (payload: Record<string, unknown>) => {
    setError(null)
    setSuccessMessage(null)

    const response = await fetch(`${apiBaseUrl}/discount-codes`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    })
    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to create discount code')
    }

    setSuccessMessage(`Discount code ${data.discountCode.code} created.`)
    await fetchDiscountCodes()
  }

  const handleCreateGlobal = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await createDiscountCode({
        code: globalCode,
        type: 'global',
        percentage: Number(globalPercentage),
        freeShipping: false,
        validUntil: globalValidUntil,
      })
      setGlobalCode('')
      setGlobalValidUntil('')
      setGlobalPercentage('')
    } catch (err: any) {
      setError(err.message || 'Failed to create global discount code')
    }
  }

  const handleCreateIndividual = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await createDiscountCode({
        code: individualCode,
        type: 'individual',
        percentage: Number(individualPercentage || 0),
        freeShipping: individualFreeShipping,
      })
      setIndividualCode(generateCode())
      setIndividualPercentage('')
      setIndividualFreeShipping(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create individual discount code')
    }
  }

  const toggleActive = async (discountCode: DiscountCode) => {
    try {
      setError(null)
      const response = await fetch(`${apiBaseUrl}/discount-codes/${discountCode._id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ isActive: !discountCode.isActive }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update discount code')
      }

      await fetchDiscountCodes()
    } catch (err: any) {
      setError(err.message || 'Failed to update discount code')
    }
  }

  return (
    <div className="discount-management">
      <div className="discount-grid">
        <section className="discount-card">
          <h2>Global percentage code</h2>
          <p className="discount-help">Reusable by everyone until the selected date.</p>
          <form onSubmit={handleCreateGlobal} className="discount-form">
            <label>
              Code
              <input value={globalCode} onChange={(e) => setGlobalCode(e.target.value.toUpperCase())} placeholder="SUMMER10" required />
            </label>
            <label>
              Valid until
              <input type="date" value={globalValidUntil} onChange={(e) => setGlobalValidUntil(e.target.value)} required />
            </label>
            <label>
              Discount (%)
              <input type="number" min="1" max="100" value={globalPercentage} onChange={(e) => setGlobalPercentage(e.target.value)} required />
            </label>
            <button type="submit" className="primary-button">Create global code</button>
          </form>
        </section>

        <section className="discount-card">
          <h2>Individual one-use code</h2>
          <p className="discount-help">Generated random code. Can be percentage, free shipping, or both.</p>
          <form onSubmit={handleCreateIndividual} className="discount-form">
            <label>
              Generated code
              <div className="code-row">
                <input value={individualCode} onChange={(e) => setIndividualCode(e.target.value.toUpperCase())} required />
                <button type="button" className="secondary-button" onClick={() => setIndividualCode(generateCode())}>Generate</button>
              </div>
            </label>
            <label>
              Discount (%)
              <input type="number" min="0" max="100" value={individualPercentage} onChange={(e) => setIndividualPercentage(e.target.value)} placeholder="0" />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={individualFreeShipping} onChange={(e) => setIndividualFreeShipping(e.target.checked)} />
              Free shipping
            </label>
            <button type="submit" className="primary-button" disabled={!individualFreeShipping && Number(individualPercentage || 0) <= 0}>
              Create individual code
            </button>
          </form>
        </section>
      </div>

      {error && <div className="error">{error}</div>}
      {successMessage && <div className="success">{successMessage}</div>}

      <section className="discount-list">
        <div className="discount-list-header">
          <h2>Existing discount codes</h2>
          <button type="button" className="secondary-button" onClick={fetchDiscountCodes}>Refresh</button>
        </div>

        {loading ? (
          <div className="loading">Loading discount codes...</div>
        ) : discountCodes.length === 0 ? (
          <div className="no-orders">No discount codes found</div>
        ) : (
          <div className="discount-table">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Discount</th>
                  <th>Valid until</th>
                  <th>Status</th>
                  <th>Used</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {discountCodes.map((discountCode) => (
                  <tr key={discountCode._id}>
                    <td><span className="discount-code-text">{discountCode.code}</span></td>
                    <td>{discountCode.type}</td>
                    <td>
                      {discountCode.percentage > 0 && `${discountCode.percentage}%`}
                      {discountCode.percentage > 0 && discountCode.freeShipping && ' + '}
                      {discountCode.freeShipping && 'Free shipping'}
                    </td>
                    <td>{formatDate(discountCode.validUntil)}</td>
                    <td>
                      <span className={`discount-status ${discountCode.isActive ? 'active' : 'inactive'}`}>
                        {discountCode.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{discountCode.usedAt ? `Yes (${discountCode.usedByOrderId || 'order'})` : 'No'}</td>
                    <td>
                      <button type="button" className="secondary-button" onClick={() => toggleActive(discountCode)}>
                        {discountCode.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default DiscountManagement
