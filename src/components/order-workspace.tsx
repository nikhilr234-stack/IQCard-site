import type { ReactNode } from 'react'
import styles from './order-workspace.module.css'

export function OrderWorkspace({ children }: { children: ReactNode }) {
  return <div className={styles.surface}>{children}</div>
}
