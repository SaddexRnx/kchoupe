## Goal
Give store owners a realistic way to manage delivery in Algeria. Start with a hybrid model: manual carriers cover 100% of the market, with API-ready hooks for carriers that later offer APIs.

## Why this approach
Algerian logistics (Yalidine, ZR Express, Ecouriers, Rapidex, etc.) do not have a single public API. Most stores still paste a tracking number into the customer chat manually. We will mirror that reality, but structure the data so API integrations can plug in later without re-architecting.

## What we will build

### Database changes
- New `public.carriers` table (workspace-owned carriers, e.g. "Yalidine Alger", "ZR Express Oran", "Manual").
- New `public.shipping_zones` table: per-workspace wilaya → price + free-shipping threshold.
- Extend `orders` with: `delivery_fee`, `cod_amount`, `carrier_id`, `tracking_number`, `shipping_status`, `wilaya`, `commune`, `address`, `customer_phone`, `delivered_at`.
- New order status values: `pending`, `confirmed`, `paid`, `shipped`, `out_for_delivery`, `delivered`, `cancelled`, `returned`, `refunded`.
- New `public.delivery_status_history` table: log each shipping transition.
- Seed all 58 Algerian wilayas in a small reference table.

### Backend functions
- `listCarriers`, `createCarrier`, `updateCarrier`, `deleteCarrier`.
- `listShippingZones`, `upsertShippingZone`, `deleteShippingZone`.
- `calculateShippingFee(workspace_id, wilaya, order_value)`.
- `assignShipment(order_id, carrier_id, tracking_number, shipping_status)`.
- `updateOrderDeliveryStatus` with history logging.
- `shippingWebhook` public route (signature placeholder) for carrier tracking callbacks.

### UI changes
- **Settings → Delivery**: manage carriers and wilaya prices, set free-shipping threshold.
- **Products page / storefront**: AI reads the shipping fee when quoting a price.
- **Order detail drawer**: assign carrier, add tracking number, update delivery status, view timeline.
- **Inbox AI prompt**: when a customer asks about delivery, AI can quote the fee and tracking status.
- **Orders table**: new columns for carrier, tracking, shipping status.

### AI integration
- Inject shipping rules and carrier list into the customer-chat system prompt.
- If the AI detects an order intent, ask for wilaya + commune + phone and estimate the delivery fee.
- When a tracking number exists, AI can repeat it to the customer.

### Manual fallback (default)
Every carrier starts in `manual` mode. Store owner assigns a tracking number by hand. The app copies a formatted tracking message to the clipboard so the owner can paste it into Telegram/WhatsApp/Instagram. Later, if a carrier key is provided, we can switch to `api` mode and auto-create the shipment.

### Algerian specifics
- All prices in DZD unless the workspace currency is changed.
- COD field is separate from the order total because most Algerian orders are cash on delivery.
- Wilaya + commune + phone are required before an order is marked confirmed.

## Out of scope for this plan
- Live API integrations with Algerian carriers (will be empty adapters ready for future keys).
- SMS tracking notifications.
- Real-time GPS tracking.

## Success criteria
1. Store owner can add carriers and set per-wilaya prices in Settings.
2. AI can quote a delivery price during a conversation.
3. Orders can be assigned a carrier, tracking number, and delivery status timeline.
4. Customer can ask "where is my order?" and the AI replies with the latest tracking status.
5. All new fields are translated into FR/AR.