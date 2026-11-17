"use client"

import { Loader2 } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { api, session, type AdminUser, type User } from "@/lib/api"

interface AuthState {
  user: User
  isAdmin: boolean
  /** Admin only: everyone's accounts, so the admin can pick whose data to view. */
  users: AdminUser[]
  viewAs: string
  setViewAs: (id: string) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}

/** Pages other than /login only render for a signed-in user; anyone else is sent to /login. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [viewAs, setViewAsState] = useState("")
  const onLogin = pathname?.startsWith("/login")

  useEffect(() => {
    if (onLogin) return
    if (!session.token()) {
      router.replace("/login")
      return
    }
    api.me()
      .then((u) => {
        setUser(u)
        if (u.role === "admin") {
          setViewAsState(session.viewAs())
          api.adminUsers().then(setUsers).catch(() => setUsers([]))
        } else {
          session.setViewAs("")
        }
      })
      .catch(() => router.replace("/login"))
  }, [onLogin, router])

  const setViewAs = useCallback((id: string) => {
    session.setViewAs(id)
    setViewAsState(id)
    window.location.reload() // every panel reloads with the chosen user's data
  }, [])

  const logout = useCallback(async () => {
    await api.logout()
    session.clear()
    window.location.href = "/login"
  }, [])

  if (onLogin) return <>{children}</>
  if (!user) {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
        <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading…</span>
      </div>
    )
  }
  return (
    <AuthContext.Provider value={{ user, isAdmin: user.role === "admin", users, viewAs, setViewAs, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
