import type { ReactNode } from 'react'
import { OrderWorkspace } from '@/components/order-workspace'

export default function AdminOrdersLayout({ children }: { children: ReactNode }) {
  return <OrderWorkspace>{children}</OrderWorkspace>
}
