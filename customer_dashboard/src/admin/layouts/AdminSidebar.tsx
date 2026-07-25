import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tag, Award, Layers, DollarSign,
  ShoppingCart, Users, Handshake, Shield, HeadphonesIcon,
  BarChart3, Bell, UserCog, ClipboardList, Settings,
  ChevronLeft, ChevronRight, X, LayoutTemplate, Sparkles, LogOut, Truck
} from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../types/admin';
import type { NavGroup } from '../types/admin';

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar navigation definition
// ─────────────────────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard',  label: 'Dashboard',     icon: 'LayoutDashboard', path: '/admin'           },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { id: 'homepage',   label: 'Homepage',      icon: 'LayoutTemplate',   path: '/admin/homepage'   },
      { id: 'products',   label: 'Products',      icon: 'Package',          path: '/admin/products'   },
      { id: 'categories', label: 'Categories',    icon: 'Tag',              path: '/admin/categories' },
      { id: 'brands',     label: 'Brands',        icon: 'Award',            path: '/admin/brands'     },
      { id: 'combos',     label: 'Combo deals',   icon: 'Sparkles',         path: '/admin/combos'     },
      { id: 'solutions',  label: 'Explore Solutions', icon: 'Layers',       path: '/admin/solutions'  },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'inventory',    label: 'Inventory',     icon: 'Layers',      path: '/admin/inventory'    },
      { id: 'pricing',      label: 'Pricing',        icon: 'DollarSign',  path: '/admin/pricing'      },
      { id: 'orders',       label: 'Orders',         icon: 'ShoppingCart',path: '/admin/orders',       badgeVariant: 'danger'  },
      { id: 'fulfillment',  label: 'Fulfillment',    icon: 'Truck',       path: '/admin/fulfillment'  },
    ],
  },
  {
    label: 'Customers & dealers',
    items: [
      { id: 'customers',  label: 'Customers',      icon: 'Users',            path: '/admin/customers'  },
      { id: 'dealers',    label: 'Dealers',         icon: 'Handshake',        path: '/admin/dealers',   badgeVariant: 'warning' },
    ],
  },
  {
    label: 'Services',
    items: [
      { id: 'warranty',   label: 'Warranty',        icon: 'Shield',           path: '/admin/warranty'   },
      { id: 'support',    label: 'Support',          icon: 'HeadphonesIcon',   path: '/admin/support'    },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'reports',         label: 'Reports',        icon: 'BarChart3',     path: '/admin/reports'       },
      { id: 'notifications',   label: 'Notifications',  icon: 'Bell',          path: '/admin/notifications' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'users',      label: 'Users & roles',  icon: 'UserCog',          path: '/admin/users'      },
      { id: 'audit',      label: 'Audit logs',      icon: 'ClipboardList',    path: '/admin/audit'      },
      { id: 'settings',   label: 'Settings',        icon: 'Settings',         path: '/admin/settings'   },
    ],
  },
];

// Icon map
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard, Package, Tag, Award, Layers, DollarSign,
  ShoppingCart, Users, Handshake, Shield, HeadphonesIcon,
  BarChart3, Bell, UserCog, ClipboardList, Settings, LayoutTemplate, Sparkles, Truck,
};

// ─────────────────────────────────────────────────────────────────────────────
// AdminSidebar
// ─────────────────────────────────────────────────────────────────────────────

const AdminSidebar: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar, isMobileSidebarOpen, setMobileSidebarOpen, adminRole } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, adminUser, logout } = useAuth();
  const activeAdmin = adminUser || user;
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const userInitials = activeAdmin
    ? (activeAdmin.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)) || activeAdmin.email?.[0]?.toUpperCase() || 'A'
    : 'A';

  const userName = activeAdmin ? activeAdmin.full_name?.trim() || activeAdmin.email : 'Admin User';

  const NavItem = ({ item }: { item: NavGroup['items'][0] }) => {
    const Icon = ICON_MAP[item.icon];
    const active = isActive(item.path);
    const collapsed = isSidebarCollapsed;

    return (
      <div className="relative group" onMouseEnter={() => setHoveredTooltip(item.id)} onMouseLeave={() => setHoveredTooltip(null)}>
        <Link
          to={item.path}
          onClick={() => setMobileSidebarOpen(false)}
          className={`flex items-center gap-3 transition-all duration-250 select-none relative group/link
            ${collapsed 
              ? 'justify-center mx-2 px-3 py-2.5 rounded-xl' 
              : 'pl-6 pr-4 py-3 rounded-l-none rounded-r-full mr-2'
            }
            ${active
              ? 'bg-gradient-to-r from-[#005F63] via-[#087276] to-[#0B7C80] text-white shadow-[0_4px_16px_rgba(0,95,99,0.22)] font-bold backdrop-blur-md border border-white/20'
              : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-900 backdrop-blur-sm font-medium'}`}
        >
          {Icon && (
            <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors duration-200 ${active ? 'text-white' : 'text-slate-400 group-hover/link:text-slate-700'}`} />
          )}

          {!collapsed && (
            <span className={`text-[13px] tracking-tight truncate flex-1 transition-colors ${active ? 'text-white font-bold' : 'text-slate-600 group-hover/link:text-slate-900 font-semibold'}`}>
              {item.label}
            </span>
          )}

          {!collapsed && item.badge && item.badge > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0
              ${item.badgeVariant === 'danger' ? 'bg-rose-500 text-white' :
                item.badgeVariant === 'warning' ? 'bg-amber-400 text-white' :
                'bg-white/20 text-white'}`}>
              {item.badge}
            </span>
          )}
        </Link>

        {/* Tooltip on collapsed */}
        {collapsed && hoveredTooltip === item.id && (
          <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
            <div className="bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
              {item.label}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900" />
            </div>
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white/85 backdrop-blur-2xl border-r border-slate-200/80 shadow-[4px_0_30px_rgba(0,0,0,0.02)] select-none relative overflow-hidden">
      {/* Top subtle sheen glow */}
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-[#005F63]/[0.04] to-transparent pointer-events-none" />

      {/* Logo + Collapse toggle */}
      <div className={`flex items-center px-6 py-6 border-b border-slate-200/60 bg-white/40 backdrop-blur-md shrink-0 relative z-10
        ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isSidebarCollapsed && (
          <div className="flex items-center">
            <img
              src="/images/Artboard 1@4x (1).png"
              alt="FAAZO Logo"
              className="h-7 w-auto object-contain"
            />
          </div>
        )}
        {isSidebarCollapsed && (
          <div className="w-[30px] h-[28px] overflow-hidden relative flex items-center justify-start shrink-0">
            <img
              src="/images/Artboard 1@4x (1).png"
              alt="FAAZO Logo"
              className="h-[92%] max-w-none object-contain absolute left-0"
              style={{ width: 'auto' }}
            />
          </div>
        )}

        {/* Desktop collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex w-7 h-7 items-center justify-center rounded-xl bg-white/80 backdrop-blur-md border border-slate-200/80
            text-slate-450 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200 shrink-0 shadow-2xs"
        >
          {isSidebarCollapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile close */}
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="lg:hidden w-7 h-7 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-md border border-slate-200/80
            text-slate-450 hover:bg-slate-100 transition-all duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto pl-0 pr-2 py-5 space-y-6 scrollbar-thin relative z-10">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1.5">
            {!isSidebarCollapsed ? (
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.14em] pl-6">
                {group.label}
              </p>
            ) : (
              <div className="border-t border-slate-200/60 my-3 mx-1" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Profile section */}
      <div className="p-4 border-t border-slate-200/70 bg-gradient-to-br from-slate-50/90 via-white/70 to-slate-50/90 backdrop-blur-xl shrink-0 relative z-10">
        {!isSidebarCollapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/90 transition-all duration-200 border border-slate-200/50 hover:border-slate-300 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#005F63]/15 to-[#0B7C80]/10 text-[#005F63] flex items-center justify-center font-black text-sm shrink-0 border border-[#005F63]/20 shadow-2xs">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-slate-800 truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5 font-semibold">
                {ROLE_LABELS[adminRole] || 'Administrator'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="relative group/avatar">
              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#005F63]/15 to-[#0B7C80]/10 text-[#005F63] flex items-center justify-center font-black text-sm border border-[#005F63]/20 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50/50 transition-all duration-250 group"
              >
                <span className="group-hover:hidden">{userInitials}</span>
                <LogOut className="w-3.5 h-3.5 hidden group-hover:block" />
              </button>
              
              <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200">
                <div className="bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                  {userName} (Logout)
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 bg-white/85 backdrop-blur-2xl border-r border-slate-200/80
          h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'w-[78px]' : 'w-[260px]'}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <div className={`lg:hidden fixed inset-0 z-40 transition-all duration-300
        ${isMobileSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity duration-300
            ${isMobileSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileSidebarOpen(false)}
        />
        {/* Panel */}
        <aside
          className={`absolute left-0 top-0 bottom-0 w-[270px] bg-white/95 backdrop-blur-2xl shadow-2xl
            transition-transform duration-300 ease-out z-50
            ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  );
};

export { NAV_GROUPS, ICON_MAP };
export default AdminSidebar;
