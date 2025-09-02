'use client'

import { useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { StatusHeader } from '@/components/dashboard/status-header'
import { LiveFeed } from '@/components/dashboard/live-feed'
import { MetricsGrid } from '@/components/dashboard/metrics-grid'
import { DefectTimeline } from '@/components/dashboard/defect-timeline'
import { AlarmTable } from '@/components/dashboard/alarm-table'
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts'
import { CopilotDrawer } from '@/components/copilot/copilot-drawer'
import { useSocket } from '@/hooks/use-socket'
import { useDashboardStore } from '@/stores/dashboard-store'

export default function DashboardPage() {
  const { isConnected } = useSocket()
  const { mode, setMode } = useDashboardStore()

  useEffect(() => {
    // Set mode from environment
    const envMode = process.env.NEXT_PUBLIC_MODE as 'demo' | 'live'
    if (envMode) {
      setMode(envMode)
    }
  }, [setMode])

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full space-y-6 p-6">
        {/* Status Header - Shows line state, mode, connectivity */}
        <StatusHeader />
        
        {/* Main Dashboard Grid */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Live Feed & Controls */}
          <div className="xl:col-span-1 space-y-6">
            <LiveFeed />
            <MetricsGrid />
          </div>
          
          {/* Middle Column - Defects & Analytics */}
          <div className="xl:col-span-1 space-y-6">
            <DefectTimeline />
            <AnalyticsCharts />
          </div>
          
          {/* Right Column - Alarms & Recent Activity */}
          <div className="xl:col-span-1 space-y-6">
            <AlarmTable />
          </div>
        </div>
      </div>
      
      {/* AI Copilot Drawer */}
      <CopilotDrawer />
    </DashboardLayout>
  )
}