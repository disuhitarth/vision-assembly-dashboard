'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Play, 
  Pause, 
  Square, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react'
import { useDashboardStore } from '@/stores/dashboard-store'
import { useSocket } from '@/hooks/use-socket'

export function StatusHeader() {
  const { 
    lineState, 
    oeeScore, 
    throughput, 
    qualityScore, 
    mode 
  } = useDashboardStore()
  
  const { isConnected } = useSocket()

  const getLineStateInfo = (state: number) => {
    switch (state) {
      case 0:
        return { 
          label: 'Stopped', 
          icon: Square, 
          className: 'status-stopped',
          bgClass: 'bg-red-900/20'
        }
      case 1:
        return { 
          label: 'Running', 
          icon: Play, 
          className: 'status-running',
          bgClass: 'bg-green-900/20'
        }
      case 2:
        return { 
          label: 'Paused', 
          icon: Pause, 
          className: 'status-paused',
          bgClass: 'bg-yellow-900/20'
        }
      case 3:
        return { 
          label: 'Fault', 
          icon: AlertTriangle, 
          className: 'status-fault',
          bgClass: 'bg-red-900/40'
        }
      default:
        return { 
          label: 'Unknown', 
          icon: Activity, 
          className: 'bg-gray-900/20 text-gray-400',
          bgClass: 'bg-gray-900/20'
        }
    }
  }

  const stateInfo = getLineStateInfo(lineState)
  const StateIcon = stateInfo.icon

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Line Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Line Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stateInfo.bgClass}`}>
              <StateIcon className={`w-6 h-6 ${
                lineState === 1 ? 'text-green-400' :
                lineState === 3 ? 'text-red-400 animate-pulse' :
                lineState === 2 ? 'text-yellow-400' :
                'text-red-400'
              }`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stateInfo.label}</p>
              <p className="text-xs text-muted-foreground">
                {mode === 'demo' ? 'Demo Mode' : 'Live Production'}
                {!isConnected && ' • Offline'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OEE Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            OEE Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{oeeScore.toFixed(1)}%</span>
              <div className="flex items-center text-sm">
                {oeeScore >= 85 ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span className={oeeScore >= 85 ? 'text-green-400' : 'text-red-400'}>
                  {oeeScore >= 85 ? 'Excellent' : oeeScore >= 70 ? 'Good' : 'Poor'}
                </span>
              </div>
            </div>
            <Progress 
              value={oeeScore} 
              className="h-2"
              // Custom color based on score
              style={{
                '--progress-background': oeeScore >= 85 ? 'rgb(34 197 94)' : 
                                       oeeScore >= 70 ? 'rgb(251 191 36)' : 
                                       'rgb(239 68 68)'
              } as React.CSSProperties}
            />
            <p className="text-xs text-muted-foreground">
              Target: 85% • Current Shift
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Throughput */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Throughput
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">
                {throughput.current}
              </span>
              <span className="text-sm text-muted-foreground">parts/hour</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Target: {throughput.target}</span>
              <Badge variant={throughput.current >= throughput.target ? "secondary" : "destructive"}>
                {((throughput.current / throughput.target) * 100).toFixed(1)}%
              </Badge>
            </div>
            <Progress 
              value={(throughput.current / throughput.target) * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quality Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Quality Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{qualityScore.toFixed(1)}%</span>
              <div className="flex items-center text-sm">
                {qualityScore >= 98 ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span className={qualityScore >= 98 ? 'text-green-400' : 'text-red-400'}>
                  {qualityScore >= 98 ? 'Excellent' : qualityScore >= 95 ? 'Good' : 'Poor'}
                </span>
              </div>
            </div>
            <Progress 
              value={qualityScore} 
              className="h-2"
              style={{
                '--progress-background': qualityScore >= 98 ? 'rgb(34 197 94)' : 
                                       qualityScore >= 95 ? 'rgb(251 191 36)' : 
                                       'rgb(239 68 68)'
              } as React.CSSProperties}
            />
            <p className="text-xs text-muted-foreground">
              Pass Rate • Last 100 parts
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}