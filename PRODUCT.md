# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are Buenos Aires (CABA/GBA) shoppers buying consumer electronics. Their job: find a device, compare price on the spot, and buy with minimal friction — favoring stores that offer good prices, installment plans, and a local safety net (pickup, warranty, technical service). All copy and interaction language is Argentine Spanish (Rioplatense, voseo).

## Product Purpose

TechStore is an online electronics storefront: browse a catalog, search, open product details, add to cart, apply coupons, and complete an order that is fulfilled via WhatsApp and local pickup. Success is a shopper moving from interest to a confirmed order with no uncertainty about price, installments, or shipping.

## Positioning

Price + installments + local service. Up to 12 cuotas sin interés, free shipping above a threshold, official warranty, in-house technical service, and physical pickup in Villa Urquiza, CABA — the confidence of a neighborhood store paired with broad reach across the country.

## Operating Context

- Currency is ARS, formatted for the `es-AR` locale ($1.234.567).
- Installments are computed from price tiers: 12 cuotas ≥ $100.000, 6 cuotas ≥ $50.000, else 3 cuotas.
- Free shipping kicks in above a $300.000 subtotal; otherwise a flat shipping cost applies.
- Orders are not a payment gateway: checkout completes the cart and the store follows up by WhatsApp/phone.
- Two coupon codes exist and validate in-app: `BIENVENIDA10` (10%) and `STORE15` (15%).

## Capabilities and Constraints

Catalog of 12 products across audio, móviles, computación, wearables, entretenimiento, periféricos, and fotografía; each product has ARS price, optional old price and discount, rating, stock, specs, image (remote Unsplash), and badges. Views: home (hero, benefits, sections, brands, newsletter), search results, product detail (installments, specs, stock urgency, related items), and cart (quantity control, coupons, free-shipping progress, order completion). Cart and coupon state persist in `localStorage`. The app is built with React 19 + Vite; no router library — navigation is state-based.

No backend, accounts, or payment integration. Product images are remote Unsplash URLs and must not be re-hosted within this exercise.

## Brand Commitments

Name: TechStore. Tagline context: "TechStore — Electrónica". Voice is casual Argentine Spanish with voseo ("Buscá", "agregá") and light emoji use throughout copy. Nothing beyond the name and voice was confirmed as binding.

## Evidence on Hand

The full catalog, copy, prices, badges, coupons, contact details, and address currently in the codebase are demo/fiction — confirmed by the owner as "por el momento nada es real." Future work must not present them as real commitments. No logos, brand assets, photography, testimonials, or legal documents exist.

## Product Principles

1. Buenos Aires shoppers first: prices in ARS and installments front and center; never bury the price.
2. Local service is the trust story: pickup, official warranty, and in-house technical service are the differentiators to surface.
3. Browse-to-cart-to-order is one continuous, frictionless line: search, detail, and cart must never feel disconnected.
4. Honest demo: the catalog and contact data are fictional; design must not fabricate credibility claims (testimonials, real stock guarantees, licensing).