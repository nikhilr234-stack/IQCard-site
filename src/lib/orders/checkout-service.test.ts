import { describe, expect, it, vi } from 'vitest'
import { createOrderCheckout, OrderCheckoutError, type CheckoutDependencies, type CheckoutOrder, type ProviderOrder } from './checkout-service'

const account = { id: 'owner-1', email: 'owner@example.com', role: 'client' as const }
const request = {
  requestKey: '7e57d004-2b97-4e7d-8c1d-7f3d4f8e2d10', designId: 'IQD-ABC123', phone: '+919000000000',
  shippingAddress: { recipientName: 'Test Person', line1: '1 Test Street', line2: '', locality: 'Test', city: 'Pune', state: 'MH', postalCode: '411001', country: 'IN' as const },
}
const config = { mode: 'test' as const, keyId: 'rzp_test_public', keySecret: 'secret', shippingPaise: 12500, taxPaise: 0 }

function dependencies() {
  return {
    getSavedDesign: vi.fn(async () => ({
      design_id: request.designId,
      design_payload: { schemaVersion: '1.0', configuration: { material: 'Walnut', identity: { name: 'Test Person', tone: 'dark', composition: 'signature' }, backLayout: 'pure' } },
    })),
    createOrGetOrder: vi.fn(async (): Promise<CheckoutOrder> => ({ id: 'local-1', order_number: 'IQ-1', owner_id: account.id, client_request_key: request.requestKey, design_id: request.designId, card_snapshot: { schemaVersion: 2, material: 'metal' }, phone: request.phone, shipping_address: request.shippingAddress, currency: 'INR', pricing_version: 'flat-inr-v2', card_subtotal_paise: 79900, shipping_paise: 12500, tax_paise: 0, total_paise: 92400, payment_status: 'pending', fulfillment_status: 'unfulfilled', payment_provider: 'razorpay', gateway_order_id: null })),
    findOrderByRequestKey: vi.fn(async (): Promise<CheckoutOrder | null> => null), findProviderOrder: vi.fn(async (): Promise<ProviderOrder | null> => null),
    createProviderOrder: vi.fn(async () => ({ id: 'order_test123', amount: 92400, currency: 'INR' })),
    attachProviderOrder: vi.fn(async () => true), reserveProviderOrderCreation: vi.fn(async () => true), releaseProviderOrderCreation: vi.fn(async () => undefined),
  }
}

describe('createOrderCheckout', () => {
  it('resumes by request key before reading a possibly edited design', async () => {
    const deps = dependencies()
    deps.findOrderByRequestKey.mockResolvedValueOnce({ id: 'local-1', order_number: 'IQ-1', owner_id: account.id, client_request_key: request.requestKey, design_id: request.designId, card_snapshot: { schemaVersion: 2 }, phone: request.phone, shipping_address: request.shippingAddress, currency: 'INR', pricing_version: 'flat-inr-v2', card_subtotal_paise: 79900, shipping_paise: 12500, tax_paise: 0, total_paise: 92400, payment_status: 'pending', fulfillment_status: 'unfulfilled', payment_provider: 'razorpay', gateway_order_id: 'order_existing' })
    deps.findProviderOrder.mockResolvedValueOnce({ id: 'order_existing', amount: 92400, currency: 'INR' })

    const result = await createOrderCheckout(account, request, config, deps as CheckoutDependencies)

    expect(deps.getSavedDesign).not.toHaveBeenCalled()
    expect(result.payment.orderId).toBe('order_existing')
    expect(result.order.cardSnapshot).toEqual({ schemaVersion: 2 })
  })

  it('uses server price and persists a snapshot before asking the provider', async () => {
    const deps = dependencies()
    await createOrderCheckout(account, request, config, deps as CheckoutDependencies)

    expect(deps.createOrGetOrder).toHaveBeenCalledWith(expect.objectContaining({ designId: request.designId, price: expect.objectContaining({ totalPaise: 92400, cardSubtotalPaise: 79900 }) }))
    expect(deps.reserveProviderOrderCreation).toHaveBeenCalledOnce()
    expect(deps.attachProviderOrder).toHaveBeenCalledWith('local-1', expect.any(String), expect.objectContaining({ id: 'order_test123' }))
  })

  it('recovers a provider order that was created before the previous request lost its attachment', async () => {
    const deps = dependencies()
    deps.findProviderOrder.mockResolvedValueOnce({ id: 'order_recovered123', amount: 92400, currency: 'INR' })

    const result = await createOrderCheckout(account, request, config, deps as CheckoutDependencies)

    expect(deps.createProviderOrder).not.toHaveBeenCalled()
    expect(deps.attachProviderOrder).toHaveBeenCalledWith('local-1', expect.any(String), expect.objectContaining({ id: 'order_recovered123' }))
    expect(result.payment.orderId).toBe('order_recovered123')
  })

  it('rejects a second concurrent provider-order creation', async () => {
    const deps = dependencies()
    deps.reserveProviderOrderCreation.mockResolvedValueOnce(false)

    await expect(createOrderCheckout(account, request, config, deps as CheckoutDependencies)).rejects.toBeInstanceOf(OrderCheckoutError)
    expect(deps.createProviderOrder).not.toHaveBeenCalled()
  })
})
