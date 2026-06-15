'use client'

import { logoutAction } from '@/app/login/actions'
import { Bell, LogOut, User } from 'lucide-react'

interface TopBarProps {
  shopName: string
  userName: string
  planName: string | null
}

export function TopBar({ shopName, userName, planName }: TopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-100 bg-white px-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 leading-tight">{shopName}</h2>
        {planName && (
          <p className="text-xs text-gray-400 capitalize">{planName} Plan</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <Bell className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-gray-100 cursor-default">
          <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center">
            <User className="h-4 w-4 text-orange-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">{userName}</span>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </form>
      </div>
    </header>
  )
}
