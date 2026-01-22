import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Briefcase, TrendingUp, Clock, AlertCircle, Users, Filter, X } from 'lucide-react'
import { usePipeline, usePipelineStats } from '@/hooks/usePipeline'
import { STATUS_LABELS } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  identified: '#9ca3af',
  researching: '#3b82f6',
  preparing: '#eab308',
  applied: '#a855f7',
  interviewing: '#6366f1',
  offer: '#22c55e',
  closed_won: '#059669',
  closed_lost: '#ef4444',
}

export function Dashboard() {
  const { items, loading, error } = usePipeline()

  // Filter state
  const [companyFilter, setCompanyFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  // Get unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const companies = new Set<string>()
    const roles = new Set<string>()
    const locations = new Set<string>()

    items.forEach((item) => {
      if (item.company_name) companies.add(item.company_name)
      if (item.posting_role) roles.add(item.posting_role)
      if (item.location) locations.add(item.location)
    })

    return {
      companies: Array.from(companies).sort(),
      roles: Array.from(roles).sort(),
      locations: Array.from(locations).sort(),
    }
  }, [items])

  // Apply filters
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (companyFilter && item.company_name !== companyFilter) return false
      if (roleFilter && item.posting_role !== roleFilter) return false
      if (locationFilter && item.location !== locationFilter) return false
      return true
    })
  }, [items, companyFilter, roleFilter, locationFilter])

  const hasFilters = companyFilter || roleFilter || locationFilter
  const clearFilters = () => {
    setCompanyFilter('')
    setRoleFilter('')
    setLocationFilter('')
  }

  const stats = usePipelineStats(filteredItems)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-700">
        Failed to load data: {error}
      </div>
    )
  }

  const pieData = [
    { name: 'Pre-Apply', value: stats.preApplyCount, color: '#9ca3af' },
    { name: 'Applied', value: stats.appliedCount, color: '#a855f7' },
    { name: 'Interviewing', value: stats.interviewingCount, color: '#6366f1' },
    { name: 'Offer', value: stats.offerCount, color: '#22c55e' },
    { name: 'Closed', value: stats.closedCount, color: '#6b7280' },
  ].filter((d) => d.value > 0)

  const barData = Object.entries(stats.statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      status: STATUS_LABELS[status as keyof typeof STATUS_LABELS],
      count,
      fill: STATUS_COLORS[status],
    }))

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-gray-600">
            Track your job search progress
            {hasFilters && (
              <span className="ml-2 text-primary-600">
                (filtered: {filteredItems.length} of {items.length})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Company</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Companies</option>
              {filterOptions.companies.map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Job Title</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Roles</option>
              {filterOptions.roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Location</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Locations</option>
              {filterOptions.locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Opportunities"
          value={stats.totalCount}
          icon={<Briefcase className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Active"
          value={stats.activeCount}
          icon={<Clock className="h-6 w-6" />}
          color="yellow"
        />
        <StatCard
          title="Response Rate"
          value={`${stats.responseRate}%`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="High Priority"
          value={stats.highPriorityCount}
          icon={<AlertCircle className="h-6 w-6" />}
          color="red"
        />
        <StatCard
          title="Upcoming Interviews"
          value={stats.upcomingInterviewCount}
          icon={<Users className="h-6 w-6" />}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Phase Distribution */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 font-semibold text-gray-900">
            Pipeline Distribution
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-gray-500">
              No opportunities yet
            </div>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 font-semibold text-gray-900">By Status</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  dataKey="status"
                  type="category"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="count" name="Opportunities">
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-gray-500">
              No opportunities yet
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 font-semibold text-gray-900">Pipeline Funnel</h3>
        <div className="flex items-end justify-between gap-2">
          <FunnelStage
            label="Identified"
            count={stats.statusCounts.identified}
            color="bg-gray-400"
            maxCount={stats.totalCount}
          />
          <FunnelStage
            label="Researching"
            count={stats.statusCounts.researching}
            color="bg-blue-500"
            maxCount={stats.totalCount}
          />
          <FunnelStage
            label="Preparing"
            count={stats.statusCounts.preparing}
            color="bg-yellow-500"
            maxCount={stats.totalCount}
          />
          <FunnelStage
            label="Applied"
            count={stats.statusCounts.applied}
            color="bg-purple-500"
            maxCount={stats.totalCount}
          />
          <FunnelStage
            label="Interviewing"
            count={stats.statusCounts.interviewing}
            color="bg-indigo-500"
            maxCount={stats.totalCount}
          />
          <FunnelStage
            label="Offer"
            count={stats.statusCounts.offer}
            color="bg-green-500"
            maxCount={stats.totalCount}
          />
          <FunnelStage
            label="Won"
            count={stats.statusCounts.closed_won}
            color="bg-emerald-600"
            maxCount={stats.totalCount}
          />
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  color: 'blue' | 'yellow' | 'green' | 'purple' | 'red'
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  red: 'bg-red-50 text-red-600',
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-4">
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

interface FunnelStageProps {
  label: string
  count: number
  color: string
  maxCount: number
}

function FunnelStage({ label, count, color, maxCount }: FunnelStageProps) {
  const height = maxCount > 0 ? Math.max(20, (count / maxCount) * 200) : 20
  return (
    <div className="flex flex-1 flex-col items-center">
      <div
        className={`w-full rounded-t ${color} transition-all duration-300`}
        style={{ height: `${height}px` }}
      />
      <div className="mt-2 text-center">
        <div className="text-lg font-bold text-gray-900">{count}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  )
}
