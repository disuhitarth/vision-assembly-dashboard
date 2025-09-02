'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  MessageSquare, 
  Settings, 
  User,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useSocket } from '@/hooks/use-socket'
import { useDashboardStore } from '@/stores/dashboard-store'
import { formatDistanceToNow } from 'date-fns'

export function Header() {
  const { isConnected, lastUpdate } = useSocket()
  const { alarmCount, activeAlarms } = useDashboardStore()
  const criticalAlarms = activeAlarms?.filter(alarm => alarm.severity === 'critical').length || 0

  const currentTime = new Date().toLocaleTimeString()

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Left Section - Real-time Info */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono tabular-nums">{currentTime}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className={isConnected ? "text-green-400" : "text-red-400"}>
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          {lastUpdate && (
            <span className="text-muted-foreground">
              • Last update {formatDistanceToNow(lastUpdate)} ago
            </span>
          )}
        </div>
      </div>
      
      {/* Center Section - Active Alarms Quick Status */}
      {alarmCount > 0 && (
        <div className="flex items-center gap-4">
          <Badge 
            variant={criticalAlarms > 0 ? "destructive" : "secondary"}
            className={criticalAlarms > 0 ? "animate-pulse" : ""}
          >
            {alarmCount} Active Alarms
            {criticalAlarms > 0 && ` (${criticalAlarms} Critical)`}
          </Badge>
        </div>
      )}
      
      {/* Right Section - User Controls */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative min-h-touch min-w-touch"
        >
          <Bell className="w-5 h-5" />
          {alarmCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {alarmCount > 99 ? '99+' : alarmCount}
            </Badge>
          )}
        </Button>
        
        {/* AI Copilot Toggle */}
        <Button 
          variant="ghost" 
          size="sm"
          className="min-h-touch min-w-touch"
          onClick={() => {
            // This would trigger copilot drawer
            console.log('Toggle copilot')
          }}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="hidden sm:inline ml-2">AI Assistant</span>
        </Button>
        
        {/* Settings */}
        <Button 
          variant="ghost" 
          size="sm"
          className="min-h-touch min-w-touch"
        >
          <Settings className="w-5 h-5" />
        </Button>
        
        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">Operator</p>
            <p className="text-xs text-muted-foreground">Station 1</p>
          </div>
          <Avatar className="w-8 h-8">
            <AvatarFallback>
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}