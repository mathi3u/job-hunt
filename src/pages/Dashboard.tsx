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
  LineChart,
  Line,
} from 'recharts'
import { Briefcase, TrendingUp, Clock, AlertCircle, Users, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import { usePipeline, usePipelineStats } from '@/hooks/usePipeline'
import { usePageTitle } from '@/hooks/usePageTitle'
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
  usePageTitle('Dashboard')
  const { items, loading, error } = usePipeline()

  // Filter state
  const [companyFilter, setCompanyFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  // Activity graph week offset (0 = current week, 1 = last week, etc.)
  const [weekOffset, setWeekOffset] = useState(0)

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

  // Calculate daily activity for the selected week
  const activityData = useMemo(() => {
    const today = startOfDay(new Date())
    const weekStart = subDays(today, 6 + weekOffset * 7)
    const weekEnd = subDays(today, weekOffset * 7)

    const days: { date: string; fullDate: string; applications: number; interviews: number }[] = []

    for (let i = 0; i < 7; i++) {
      const day = subDays(weekEnd, 6 - i)
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)

      // Count applications on this day (using target_apply_date)
      const applications = filteredItems.filter((item) => {
        if (!item.target_apply_date) return false
        const applyDate = new Date(item.target_apply_date)
        return isWithinInterval(applyDate, { start: dayStart, end: dayEnd })
      }).length

      // Count items that moved to interviewing on this day (using updated_at as proxy)
      const interviews = filteredItems.filter((item) => {
        if (item.status !== 'interviewing' && item.status !== 'offer' && item.status !== 'closed_won') return false
        if (!item.updated_at) return false
        const updateDate = new Date(item.updated_at)
        return isWithinInterval(updateDate, { start: dayStart, end: dayEnd })
      }).length

      days.push({
        date: format(day, 'EEE'),
        fullDate: format(day, 'MMM d'),
        applications,
        interviews,
      })
    }

    return {
      days,
      rangeLabel: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`,
    }
  }, [filteredItems, weekOffset])

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
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
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Company</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Job Title</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Location</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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

      {/* Activity Graph */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Daily Activity</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{activityData.rangeLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              title="Previous week"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
            >
              Today
            </button>
            <button
              onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
              disabled={weekOffset === 0}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
              title="Next week"
            >
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
        {activityData.days.some(d => d.applications > 0 || d.interviews > 0) ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={activityData.days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#9ca3af' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#9ca3af' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(31, 41, 55, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
              />
              <Line
                type="monotone"
                dataKey="applications"
                name="Applications"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="interviews"
                name="Interviews"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[250px] items-center justify-center text-gray-500 dark:text-gray-400">
            No activity in this period
          </div>
        )}
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Applications</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Interviews</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Phase Distribution */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
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
            <div className="flex h-[250px] items-center justify-center text-gray-500 dark:text-gray-400">
              No opportunities yet
            </div>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">By Status</h3>
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
            <div className="flex h-[250px] items-center justify-center text-gray-500 dark:text-gray-400">
              No opportunities yet
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Pipeline Funnel</h3>
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
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-4">
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
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
        <div className="text-lg font-bold text-gray-900 dark:text-white">{count}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      </div>
    </div>
  )
}
