import { reactive } from "vue"

interface InstallEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "ttt:install-dismissed"

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream

const wasDismissed = () => {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1"
  } catch {
    return false
  }
}

let deferred: InstallEvent | null = null

/** `canPrompt`: browser offers a native install. `iosHint`: show Add to Home Screen instructions. */
export const install = reactive({ canPrompt: false, iosHint: false, visible: false })

export function setupPwa() {
  // itch.io (hash routing) runs us in an iframe on another origin; no install there.
  if (import.meta.env.VITE_ROUTER_HASH) return

  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}))
  }

  if (standalone()) return

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    deferred = e as InstallEvent
    install.canPrompt = true
    install.visible = !wasDismissed()
  })
  window.addEventListener("appinstalled", () => {
    deferred = null
    install.visible = false
  })

  if (isIos()) {
    install.iosHint = true
    install.visible = !wasDismissed()
  }
}

export async function promptInstall() {
  if (!deferred) return
  await deferred.prompt()
  await deferred.userChoice
  deferred = null
  install.canPrompt = false
  install.visible = false
}

export function dismissInstall() {
  install.visible = false
  try {
    localStorage.setItem(DISMISSED_KEY, "1")
  } catch {}
}
