/**
 * NAV Loading Skeletons
 * Comprehensive loading states for NAV components with accessibility
 */

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Dashboard KPI Cards Skeleton
 */
export function NavKpiCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading dashboard metrics">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Calculator List Skeleton
 */
export function CalculatorListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading calculators">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

/**
 * Calculation History Table Skeleton
 */
export function CalculationHistorySkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading calculation history">
      {/* Table Header Skeleton */}
      <div className="flex items-center space-x-4 p-3 border-b">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-12" />
      </div>
      
      {/* Table Rows Skeleton */}
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center space-x-4 p-3 border-b hover:bg-muted/50">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/**
 * Valuation List Skeleton
 */
export function ValuationListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading valuations">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-64" />
              <div className="flex items-center space-x-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

/**
 * Calculator Form Skeleton
 */
export function CalculatorFormSkeleton() {
  return (
    <Card role="status" aria-label="Loading calculator form">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form Fields */}
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
        
        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Calculator Results Skeleton
 */
export function CalculatorResultsSkeleton() {
  return (
    <Card role="status" aria-label="Loading calculation results">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Result */}
        <div className="text-center py-6 space-y-2">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
        
        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-2 pt-4">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Audit Log Skeleton
 */
export function AuditLogSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading audit log">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-start space-x-3 p-3 border rounded">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-64" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Generic Page Loading Skeleton
 */
export function NavPageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      
      {/* Content Area */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CalculatorFormSkeleton />
        </div>
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/**
 * Search Results Skeleton
 */
export function SearchResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading search results">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start space-x-3">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-72" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export default {
  NavKpiCardsSkeleton,
  CalculatorListSkeleton,
  CalculationHistorySkeleton,
  ValuationListSkeleton,
  CalculatorFormSkeleton,
  CalculatorResultsSkeleton,
  AuditLogSkeleton,
  NavPageSkeleton,
  SearchResultsSkeleton
}
