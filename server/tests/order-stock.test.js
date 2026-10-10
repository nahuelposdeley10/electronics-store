import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { StockMovement } from '../models/StockMovement.js'
import { deductApprovedStock } from '../lib/order-stock.js'

test('stock: descuenta productos y registra movimientos en una misma transacción', async () => {
  const originals = {
    session: mongoose.startSession,
    order: Order.updateOne,
    product: Product.findOneAndUpdate,
    movement: StockMovement.create,
  }
  const session = {
    async withTransaction(fn) { await fn() },
    async endSession() {},
  }
  const events = []
  mongoose.startSession = async () => session
  Order.updateOne = async (filter, update, options) => {
    assert.equal(options.session, session)
    assert.equal(filter.stockDeducted, false)
    events.push('claim')
    return { modifiedCount: 1 }
  }
  Product.findOneAndUpdate = async (filter, update, options) => {
    assert.equal(options.session, session)
    assert.equal(filter.adminId, 'tenant-a')
    assert.deepEqual(update, { $inc: { stock: -2 } })
    events.push('product')
    return { id: 12, name: 'Teclado', stock: 3 }
  }
  StockMovement.create = async (docs, options) => {
    assert.equal(options.session, session)
    assert.equal(docs[0].stockBefore, 5)
    assert.equal(docs[0].stockAfter, 3)
    events.push('movement')
  }
  const order = { _id: 'order-a', adminId: 'tenant-a', status: 'approved', stockDeducted: false, items: [{ productId: 12, name: 'Teclado', quantity: 2 }] }
  try {
    const result = await deductApprovedStock(order)
    assert.equal(result.count, 1)
    assert.equal(order.stockDeducted, true)
    assert.deepEqual(events, ['claim', 'product', 'movement'])
  } finally {
    mongoose.startSession = originals.session
    Order.updateOne = originals.order
    Product.findOneAndUpdate = originals.product
    StockMovement.create = originals.movement
  }
})

test('stock: omite órdenes ya descontadas y ventas POS', async () => {
  assert.equal(await deductApprovedStock({ status: 'approved', stockDeducted: true }), null)
  assert.equal(await deductApprovedStock({ status: 'approved', source: 'pos' }), null)
  assert.equal(await deductApprovedStock({ status: 'pending' }), null)
})
test('stock: ante falta de unidades aborta la transacción y no marca la orden como descontada', async () => {
  const originals = {
    session: mongoose.startSession,
    order: Order.updateOne,
    product: Product.findOneAndUpdate,
    movement: StockMovement.create,
  }
  let aborted = false
  let closed = false
  mongoose.startSession = async () => ({
    async withTransaction(fn) {
      try { await fn() } catch (error) { aborted = true; throw error }
    },
    async endSession() { closed = true },
  })
  Order.updateOne = async () => ({ modifiedCount: 1 })
  Product.findOneAndUpdate = async () => null
  StockMovement.create = async () => { throw new Error('No se debe registrar movimiento') }
  const order = {
    _id: 'order-out-of-stock',
    adminId: 'tenant-a',
    status: 'approved',
    stockDeducted: false,
    items: [{ productId: 99, name: 'Monitor', quantity: 2 }],
  }
  try {
    await assert.rejects(deductApprovedStock(order), { code: 'OUT_OF_STOCK' })
    assert.equal(aborted, true)
    assert.equal(closed, true)
    assert.equal(order.stockDeducted, false)
  } finally {
    mongoose.startSession = originals.session
    Order.updateOne = originals.order
    Product.findOneAndUpdate = originals.product
    StockMovement.create = originals.movement
  }
})

test('stock: un reclamo de orden ya procesado no descuenta nuevamente', async () => {
  const originalSession = mongoose.startSession
  const originalUpdate = Order.updateOne
  const originalProduct = Product.findOneAndUpdate
  let productCalls = 0
  mongoose.startSession = async () => ({
    async withTransaction(fn) { await fn() },
    async endSession() {},
  })
  Order.updateOne = async () => ({ modifiedCount: 0 })
  Product.findOneAndUpdate = async () => { productCalls++; return null }
  try {
    const result = await deductApprovedStock({
      _id: 'order-already-claimed',
      status: 'approved',
      stockDeducted: false,
      items: [{ productId: 1, name: 'Mouse', quantity: 1 }],
    })
    assert.equal(result, null)
    assert.equal(productCalls, 0)
  } finally {
    mongoose.startSession = originalSession
    Order.updateOne = originalUpdate
    Product.findOneAndUpdate = originalProduct
  }
})