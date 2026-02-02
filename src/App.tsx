import { useState, useEffect } from 'react'
import './App.css'
import Login from './components/Login'

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

const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/order`

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
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
        setError('Failed to fetch orders')
      }
    } catch (err) {
      setError('Error connecting to server. Make sure the backend is running.')
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check if user is already authenticated
    const credentials = localStorage.getItem('adminAuth')
    if (credentials) {
      // Verify credentials are valid
      try {
        const decoded = atob(credentials)
        const validCredentials = 'kapybara:TajnyHeslo666'
        if (decoded === validCredentials) {
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem('adminAuth')
          setIsAuthenticated(false)
        }
      } catch (err) {
        localStorage.removeItem('adminAuth')
        setIsAuthenticated(false)
      }
    }
    setAuthLoading(false)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [isAuthenticated])

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('adminAuth')
    setIsAuthenticated(false)
    setOrders([])
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
        alert('Failed to update order status')
      }
    } catch (err) {
      alert('Error updating order status')
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

  if (authLoading) {
    return (
      <div className="app">
        <div className="container">
          <div className="loading">Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="header-content">
            <div>
              <h1>🛍️ Bubblena Admin Panel</h1>
              <p>Manage your orders and track their status</p>
            </div>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </header>

        <div className="stats">
          <div className="stat-card">
            <h3>Total Orders</h3>
            <p>{stats.total}</p>
          </div>
          <div className="stat-card">
            <h3>Pending</h3>
            <p>{stats.pending}</p>
          </div>
          <div className="stat-card">
            <h3>Processing</h3>
            <p>{stats.processing}</p>
          </div>
          <div className="stat-card">
            <h3>Shipped</h3>
            <p>{stats.shipped}</p>
          </div>
          <div className="stat-card">
            <h3>Delivered</h3>
            <p>{stats.delivered}</p>
          </div>
          <div className="stat-card">
            <h3>Cancelled</h3>
            <p>{stats.cancelled}</p>
          </div>
        </div>

        <div className="orders-section">
          <h2>Orders</h2>
          
          {error && (
            <div className="error">
              {error}
            </div>
          )}

          {loading ? (
            <div className="loading">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="no-orders">No orders found</div>
          ) : (
            <div className="orders-table">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
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
                      <td>{order.items.length} item(s)</td>
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
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
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
      </div>
    </div>
  )
}

export default App
