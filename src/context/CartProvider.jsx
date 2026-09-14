import { useState } from 'react'
import { useEffect, useMemo } from 'react'
import { CartContext } from './cartContext'
import { useCatalog } from './useCatalog'
import { fetchSiteSettings } from '../lib/siteSettings'
import { getTenantHeaders } from '../lib/tenant'

const STORAGE_KEY = 'electronics-store-cart'
const COUPON_STORAGE_KEY = 'electronics-store-coupon'

export default function CartProvider({ children }) {
  const { products } = useCatalog()
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      return localStorage.getItem(COUPON_STORAGE_KEY) || null
    } catch {
      return null
    }
  })
  const [couponMap, setCouponMap] = useState({})
  const [toast, setToast] = useState(null)
  const [shippingConfig, setShippingConfig] = useState({
    cost: 5999,
    freeThreshold: 300000,
  })

  useEffect(() => {
    fetchSiteSettings().then((data) => {
      if (data.shipping) {
        setShippingConfig({
          cost: Number(data.shipping.cost) > 0 ? Number(data.shipping.cost) : 5999,
          freeThreshold:
            Number(data.shipping.freeThreshold) > 0
              ? Number(data.shipping.freeThreshold)
              : 300000,
        })
      }
    })
  }, [])

  useEffect(() => {
    let alive = true
    fetch('/api/coupons', { headers: getTenantHeaders() })
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error('No se pudieron leer los cupones')),
      )
      .then((data) => {
        if (!alive) return
        const map = {}
        for (const c of data.items || []) map[c.code] = c.percent
        setCouponMap(map)
        setAppliedCoupon((prev) => (prev && map[prev] ? prev : null))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem(COUPON_STORAGE_KEY, appliedCoupon)
    } else {
      localStorage.removeItem(COUPON_STORAGE_KEY)
    }
  }, [appliedCoupon])

  const notify = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  const addItem = (product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          freeShipping: product.freeShipping,
          quantity: 1,
        },
      ]
    })
    notify(`${product.name} agregado al carrito`)
  }

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id, quantity) => {
    const product = products.find((p) => p.id === Number(id))
    if (product && quantity > product.stock) {
      notify(`Solo hay ${product.stock} unidades en stock`)
      return
    }
    if (quantity <= 0) {
      removeItem(id)
      return
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item)),
    )
  }

  const clearCart = () => setItems([])

  const applyCoupon = (code) => {
    const normalized = (code || '').trim().toUpperCase()
    if (!(normalized in couponMap)) {
      notify('Cupón inválido')
      return false
    }
    setAppliedCoupon(normalized)
    notify(`Cupón ${normalized} aplicado`)
    return true
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    notify('Cupón quitado')
  }

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  )

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  )

  const discountRate = appliedCoupon ? couponMap[appliedCoupon] || 0 : 0
  const discount = (subtotal * discountRate) / 100

  const freeShippingThreshold = shippingConfig.freeThreshold
  const hasFreeShipping =
    items.some((item) => item.freeShipping) ||
    subtotal >= freeShippingThreshold
  const shippingCost = items.length === 0 ? 0 : hasFreeShipping ? 0 : shippingConfig.cost

  const total = subtotal - discount + shippingCost

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    subtotal,
    discount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    shippingCost,
    hasFreeShipping,
    freeShippingThreshold,
    total,
    toast,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
