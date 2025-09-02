'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  Camera, 
  Cog, 
  AlertTriangle, 
  Activity,
  Database,
  Users,
  HelpCircle,
  Power
} from 'lucide-react'
import { ModeIndicator } from '@/components/industrial/mode-indicator'
import { EmergencyStop } from '@/components/industrial/emergency-stop'

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Vision', href: '/vision', icon: Camera },
  { name: 'Analytics', href: '/analytics', icon: Activity },
  { name: 'Alarms', href: '/alarms', icon: AlertTriangle },
  { name: 'Data', href: '/data', icon: Database },
  { name: 'Settings', href: '/settings', icon: Cog },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Help', href: '/help', icon: HelpCircle },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo & Title */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Camera className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Vision Dashboard</h1>
            <ModeIndicator className="text-xs" />
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 min-h-touch text-industrial-base",
                    isActive && "bg-secondary text-secondary-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Button>
              </Link>
            )
          })}
        </div>
      </nav>
      
      {/* Emergency Controls */}
      <div className="p-4 border-t border-border space-y-4">
        <EmergencyStop />
        
        {/* System Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">System Status</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 font-medium">Online</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">API Connection</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-green-400 font-medium">Connected</span>
            </div>
          </div>
        </div>
        
        {/* Power Options */}
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3 min-h-touch text-industrial-base"
          disabled
        >
          <Power className="w-5 h-5" />
          System Controls
        </Button>
      </div>
    </div>
  )
}