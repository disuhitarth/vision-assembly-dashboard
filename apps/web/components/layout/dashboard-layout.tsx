'use client'

import React from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { useSocket } from '@/hooks/use-socket'
import { ConnectionStatus } from '@/components/ui/connection-status'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isConnected, reconnecting } = useSocket()

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header />
        
        {/* Connection Status Banner */}
        {!isConnected && (
          <ConnectionStatus 
            connected={isConnected} 
            reconnecting={reconnecting}
          />
        )}
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}