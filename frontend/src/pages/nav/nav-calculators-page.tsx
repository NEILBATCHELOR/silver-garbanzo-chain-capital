/**
 * NAV Calculators Page
 * Catalog page displaying all 22 calculators organized by category
 */

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Calculator, Clock, TrendingUp, Filter, Grid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCalculators } from '@/hooks/nav'
import { getCalculatorCategories } from '@/components/nav/calculators/calculators.config'
import { NavNavigation } from '@/components/nav'

export default function NavCalculatorsPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedComplexity, setSelectedComplexity] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Get calculators with filtering
  const { 
    allCalculators, 
    priorityCalculators,
    extendedCalculators,
    isLoading, 
    isError,
    error,
    searchCalculators: search,
    stats
  } = useCalculators()

  const categories = getCalculatorCategories()
  const filteredCalculators = React.useMemo(() => {
    let calculators = allCalculators

    // Apply search
    if (searchQuery.trim()) {
      calculators = search(searchQuery.trim())
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      calculators = calculators.filter(calc => calc.category === selectedCategory)
    }

    // Apply complexity filter
    if (selectedComplexity !== 'all') {
      calculators = calculators.filter(calc => calc.complexityLevel === selectedComplexity)
    }

    return calculators
  }, [allCalculators, searchQuery, selectedCategory, selectedComplexity, search])

  const handleCalculatorClick = (calculatorId: string) => {
    navigate(`/nav/calculators/${calculatorId}`)
  }

  if (isLoading) {
    return (
      <>
        <NavNavigation />
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (isError) {
    return (
      <>
        <NavNavigation />
        <div className="container mx-auto px-6 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">Error Loading Calculators</CardTitle>
              <CardDescription className="text-red-600">
                {error?.message || 'Failed to load NAV calculators. Please try again.'}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Horizontal Navigation */}
      <NavNavigation />
      
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">NAV Calculators</h1>
              <p className="text-muted-foreground mt-1">
                Choose from {stats.total} specialized calculators for accurate NAV calculations
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">{stats.enabled}</div>
                <p className="text-xs text-muted-foreground">Available</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">{stats.priority}</div>
                <p className="text-xs text-muted-foreground">Priority</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">{stats.byComplexity.basic}</div>
                <p className="text-xs text-muted-foreground">Basic Level</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">{stats.byComplexity.advanced}</div>
                <p className="text-xs text-muted-foreground">Advanced</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search calculators..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedComplexity} onValueChange={setSelectedComplexity}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Complexity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Calculators */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({filteredCalculators.length})</TabsTrigger>
            <TabsTrigger value="priority">Priority ({priorityCalculators.length})</TabsTrigger>
            <TabsTrigger value="extended">Extended ({extendedCalculators.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <CalculatorsGrid 
              calculators={filteredCalculators} 
              viewMode={viewMode}
              onCalculatorClick={handleCalculatorClick}
            />
          </TabsContent>

          <TabsContent value="priority" className="space-y-6">
            <CalculatorsGrid 
              calculators={priorityCalculators} 
              viewMode={viewMode}
              onCalculatorClick={handleCalculatorClick}
            />
          </TabsContent>

          <TabsContent value="extended" className="space-y-6">
            <CalculatorsGrid 
              calculators={extendedCalculators} 
              viewMode={viewMode}
              onCalculatorClick={handleCalculatorClick}
            />
          </TabsContent>
        </Tabs>

        {/* No Results */}
        {filteredCalculators.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No calculators found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or filters
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('all')
                  setSelectedComplexity('all')
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

interface CalculatorsGridProps {
  calculators: any[]
  viewMode: 'grid' | 'list'
  onCalculatorClick: (id: string) => void
}

function CalculatorsGrid({ calculators, viewMode, onCalculatorClick }: CalculatorsGridProps) {
  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {calculators.map(calculator => (
          <Card 
            key={calculator.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onCalculatorClick(calculator.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <Calculator className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">{calculator.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {calculator.description}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <ComplexityBadge level={calculator.complexityLevel} />
                  <Badge variant="outline">{calculator.category}</Badge>
                  {calculator.estimatedDuration && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {calculator.estimatedDuration}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {calculators.map(calculator => (
        <Card 
          key={calculator.id} 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
          onClick={() => onCalculatorClick(calculator.id)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <Calculator className="h-8 w-8 text-primary" />
              <ComplexityBadge level={calculator.complexityLevel} />
            </div>
            <CardTitle className="text-lg">{calculator.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {calculator.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <Badge variant="outline">{calculator.category}</Badge>
                {calculator.estimatedDuration && (
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {calculator.estimatedDuration}
                  </div>
                )}
              </div>
              
              {calculator.features && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Features:</p>
                  <div className="space-y-1">
                    {calculator.features.slice(0, 3).map((feature: string, index: number) => (
                      <div key={index} className="flex items-center text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="line-clamp-1">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button className="w-full mt-3" size="sm">
                Launch Calculator
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface ComplexityBadgeProps {
  level: 'basic' | 'intermediate' | 'advanced'
}

function ComplexityBadge({ level }: ComplexityBadgeProps) {
  const variants = {
    basic: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Basic' },
    intermediate: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Intermediate' },
    advanced: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Advanced' }
  }

  const variant = variants[level]
  
  return (
    <Badge 
      className={`${variant.color} border text-xs`}
      variant="outline"
    >
      {variant.label}
    </Badge>
  )
}
