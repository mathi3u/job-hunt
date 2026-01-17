import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, GitBranch, FileText, Users, Building2 } from 'lucide-react'

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-gray-900">Job Tracker</h1>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </NavLink>
            <NavLink
              to="/pipeline"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <GitBranch className="h-4 w-4" />
              Pipeline
            </NavLink>
            <NavLink
              to="/cv-bank"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <FileText className="h-4 w-4" />
              CV Bank
            </NavLink>
            <NavLink
              to="/contact-bank"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Users className="h-4 w-4" />
              Contacts
            </NavLink>
            <NavLink
              to="/companies"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                  isActive
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Building2 className="h-4 w-4" />
              Companies
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
