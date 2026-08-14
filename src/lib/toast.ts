import type { ReactNode } from "react"
import { toast } from "@/components/ui/toast"

export interface ToastOptions {
  type?: string
  title?: ReactNode
  description?: ReactNode
  timeout?: number
}

export function showToast(options: ToastOptions) {
  return toast.add(options)
}

export function toastSuccess(title: ReactNode, description?: ReactNode) {
  return toast.add({ type: "success", title, description })
}

export function toastError(title: ReactNode, description?: ReactNode) {
  return toast.add({ type: "error", title, description })
}

export function toastWarning(title: ReactNode, description?: ReactNode) {
  return toast.add({ type: "warning", title, description })
}

export function toastInfo(title: ReactNode, description?: ReactNode) {
  return toast.add({ type: "info", title, description })
}

export function toastLoading(title: ReactNode, description?: ReactNode) {
  return toast.add({ type: "loading", title, description, timeout: 0 })
}
