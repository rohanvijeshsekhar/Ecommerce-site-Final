import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabPanelProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  children: React.ReactNode;
  className?: string;
}

const TabPanel: React.FC<TabPanelProps> = ({
  tabs,
  activeTab,
  onChange,
  children,
  className = "",
}) => {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Tab bar header */}
      <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none gap-2 px-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-[#005B63] text-[#005B63]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
              }`}
            >
              {tab.icon && <span className="w-3.5 h-3.5 shrink-0">{tab.icon}</span>}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content area */}
      <div className="flex-1 overflow-y-auto p-1 mt-4">
        {children}
      </div>
    </div>
  );
};

export default TabPanel;
