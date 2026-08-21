'use client'

import { useState, useEffect } from 'react'
import StockManagement from '@/components/StockManagement'
import RawMaterials from '@/components/RawMaterials'
import Recipes from '@/components/Recipes'
import ProductionList from '@/components/ProductionList'
import BatchEvidence from '@/components/BatchEvidence'

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  imageUrl: string
}

interface CustomerInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface Order {
  _id: string
  orderId: string
  customerInfo: CustomerInfo
  items: OrderItem[]
  totals: {
    total: number
  }
  status: string
  createdAt: string
  updatedAt: string
}

const API_BASE_URL = '/api/be'
const API_URL = `${API_BASE_URL}/order`

function AdminApp() {
  const [activeTab, setActiveTab] = useState<'orders' | 'stock' | 'raw-materials' | 'recipes' | 'production' | 'batch-evidence'>('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(API_URL)
      const data = await response.json()
      
      if (data.success) {
        setOrders(data.orders)
      } else {
        setError('Nepodařilo se načíst objednávky')
      }
    } catch (err) {
      setError('Chyba připojení k serveru. Ujistěte se, že backend běží.')
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/session', { method: 'DELETE' })
    } finally {
      window.location.href = '/login'
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_URL}/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (data.success) {
        // Update the local state
        setOrders(orders.map(order => 
          order.orderId === orderId 
            ? { ...order, status: newStatus }
            : order
        ))
      } else {
        alert('Nepodařilo se aktualizovat stav objednávky')
      }
    } catch (err) {
      alert('Chyba při aktualizaci stavu objednávky')
      console.error('Error updating order:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('cs-CZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
    }).format(price)
  }

  const getOrderStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
    }
    return stats
  }

  const stats = getOrderStats()

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="header-content">
            <div>
              <h1>🛍️ Bubblena Admin Panel</h1>
              <p>Správa objednávek a sledování stavu</p>
            </div>
            <button onClick={handleLogout} className="logout-button">
              Odhlásit se
            </button>
          </div>
        </header>

        <div className="main-tabs">
          <button
            className={`main-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📦 Objednávky
          </button>
          <button
            className={`main-tab ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            📊 Sklad koulí
          </button>
          <button
            className={`main-tab ${activeTab === 'raw-materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('raw-materials')}
          >
            🧪 Sklad surovin
          </button>
          <button
            className={`main-tab ${activeTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            📖 Recepty
          </button>
          <button
            className={`main-tab ${activeTab === 'production' ? 'active' : ''}`}
            onClick={() => setActiveTab('production')}
          >
            🏭 Výroba
          </button>
          <button
            className={`main-tab ${activeTab === 'batch-evidence' ? 'active' : ''}`}
            onClick={() => setActiveTab('batch-evidence')}
          >
            📋 Evidence šarží
          </button>
        </div>

        {activeTab === 'orders' && (
          <>
        <div className="stats">
          <div className="stat-card">
            <h3>Celkem objednávek</h3>
            <p>{stats.total}</p>
          </div>
          <div className="stat-card">
            <h3>Čekající</h3>
            <p>{stats.pending}</p>
          </div>
          <div className="stat-card">
            <h3>Zpracovává se</h3>
            <p>{stats.processing}</p>
          </div>
          <div className="stat-card">
            <h3>Odesláno</h3>
            <p>{stats.shipped}</p>
          </div>
          <div className="stat-card">
            <h3>Doručeno</h3>
            <p>{stats.delivered}</p>
          </div>
          <div className="stat-card">
            <h3>Zrušeno</h3>
            <p>{stats.cancelled}</p>
          </div>
        </div>

        <div className="orders-section">
          <h2>Objednávky</h2>
          
          {error && (
            <div className="error">
              {error}
            </div>
          )}

          {loading ? (
            <div className="loading">Načítání objednávek...</div>
          ) : orders.length === 0 ? (
            <div className="no-orders">Žádné objednávky</div>
          ) : (
            <div className="orders-table">
              <table>
                <thead>
                  <tr>
                    <th>ID objednávky</th>
                    <th>Zákazník</th>
                    <th>Položky</th>
                    <th>Celkem</th>
                    <th>Stav</th>
                    <th>Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>
                        <span className="order-id">{order.orderId}</span>
                      </td>
                      <td>
                        <div className="customer-info">
                          <div className="customer-name">
                            {order.customerInfo?.firstName} {order.customerInfo?.lastName}
                          </div>
                          <div className="customer-email">
                            {order.customerInfo?.email}
                          </div>
                        </div>
                      </td>
                      <td>{order.items.length} položek</td>
                      <td>
                        <span className="order-total">
                          {formatPrice(order.totals.total)}
                        </span>
                      </td>
                      <td>
                        <select
                          className="status-select"
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.orderId, e.target.value)}
                        >
                          <option value="pending">Čekající</option>
                          <option value="processing">Zpracovává se</option>
                          <option value="shipped">Odesláno</option>
                          <option value="delivered">Doručeno</option>
                          <option value="cancelled">Zrušeno</option>
                        </select>
                      </td>
                      <td>
                        <span className="order-date">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}

        {activeTab === 'stock' && (
          <StockManagement apiBaseUrl={API_BASE_URL} />
        )}

        {activeTab === 'raw-materials' && <RawMaterials />}
        {activeTab === 'recipes' && <Recipes />}
        {activeTab === 'production' && <ProductionList />}
        {activeTab === 'batch-evidence' && <BatchEvidence apiBaseUrl={API_BASE_URL} />}
      </div>
    </div>
  )
}

export default AdminApp
