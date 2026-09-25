import { useState } from 'react'
import { useEffect, useMemo } from 'react'
import { CartContext } from './cartContext'
import { useToast } from './useToast'
import { fetchSiteSettings } from '../lib/siteSettings'
import { getTenantHeaders } from '../lib/tenant'

const STORAGE_KEY = 'electronics-store-cart'
const COUPON_STORAGE_KEY = 'electronics-store-coupon'

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

export default function CartProvider({ children }) {
  const { showToast } = useToast()
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
  const [shippingConfig, setShippingConfig] = useState({
    enabled: true,
    cost: 5999,
    freeThreshold: 300000,
  })
  const [onlinePayEnabled, setOnlinePayEnabled] = useState(true)
  const [storeWhatsapp, setStoreWhatsapp] = useState('')

  useEffect(() => {
    fetchSiteSettings().then((data) => {
      if (data.shipping) {
        setShippingConfig({
          enabled: data.shipping.enabled !== false,
          cost: Number(data.shipping.cost) > 0 ? Number(data.shipping.cost) : 5999,
          freeThreshold:
            Number(data.shipping.freeThreshold) > 0
              ? Number(data.shipping.freeThreshold)
              : 300000,
        })
      }
      if (data.store?.whatsapp) setStoreWhatsapp(String(data.store.whatsapp))
      if (data.payments?.mercadopago) {
        setOnlinePayEnabled(data.payments.mercadopago.onlineEnabled !== false)
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
      .catch((err) => {
        setCouponMap({})
        setAppliedCoupon(null)
        console.warn('No se pudieron cargar los cupones', err)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const refreshFromServer = () => {
      const ids = [...new Set(items.map((item) => item.id))]
      if (!ids.length) return
      Promise.all(
        ids.map((id) =>
          fetch(`/api/products/${id}`, { headers: getTenantHeaders() })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
            .catch(() => null),
        ),
      ).then((fresh) => {
        const byId = new Map(fresh.filter(Boolean).map((p) => [p.id, p]))
        setItems((prev) => {
          let changed = false
          const next = []
          for (const item of prev) {
            const product = byId.get(item.id)
            if (product && product.stock <= 0) {
              changed = true
              continue
            }
            if (!product) {
              next.push(item)
              continue
            }
            const line = {
              ...item,
              name: product.name,
              price: Number(product.price),
              image: product.image,
              freeShipping: Boolean(product.freeShipping),
              quantity: Math.min(item.quantity, product.stock),
            }
            if (
              line.name === item.name &&
              Number(line.price) === Number(item.price) &&
              line.image === item.image &&
              Boolean(line.freeShipping) === Boolean(item.freeShipping) &&
              line.quantity === item.quantity
            ) {
              next.push(item)
            } else {
              changed = true
              next.push(line)
            }
          }
          return changed ? next : prev
        })
      })
    }

    refreshFromServer()
    const onFocus = () => refreshFromServer()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [items])

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
    showToast(`${product.name} agregado al carrito`, 'success')
  }

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id, quantity) => {
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
      showToast('Cupón inválido', 'warn')
      return false
    }
    setAppliedCoupon(normalized)
    showToast(`Cupón ${normalized} aplicado`, 'success')
    return true
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    showToast('Cupón quitado', 'success')
  }

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  )

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + round2(item.price * item.quantity),
        0,
      ),
    [items],
  )

  const discountRate = appliedCoupon ? couponMap[appliedCoupon] || 0 : 0
  const discount = round2((subtotal * discountRate) / 100)

  const shippingEnabled = shippingConfig.enabled !== false
  const freeShippingThreshold = shippingConfig.freeThreshold
  const hasFreeShipping =
    shippingEnabled &&
    (items.some((item) => item.freeShipping) ||
      subtotal >= freeShippingThreshold)
  const shippingCost =
    items.length === 0 || !shippingEnabled
      ? 0
      : hasFreeShipping
        ? 0
        : round2(shippingConfig.cost)

  const total = round2(subtotal - discount + shippingCost)

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
    shippingEnabled,
    hasFreeShipping,
    freeShippingThreshold,
    onlinePayEnabled,
    storeWhatsapp,
    total,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
