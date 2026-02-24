import { createContext, useContext, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import { PanelLeft } from 'lucide-react';

interface SidebarContextValue {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const SidebarCtx = createContext<SidebarContextValue | null>(null);

function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarCtx);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SidebarCtx.Provider value={{ open, setOpen }}>
      <div className="flex h-screen overflow-hidden bg-gray-950 text-white">
        {children}
      </div>
    </SidebarCtx.Provider>
  );
}

export function Sidebar({ children }: { children: ReactNode }) {
  const { open, setOpen } = useSidebar();
  return (
    <>
      {/* Mobile overlay — closes sidebar on tap */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      {/* Sidebar panel */}
      <aside
        className={[
          'fixed md:relative z-50 md:z-auto',
          'flex flex-col w-72 h-full flex-none shrink-0',
          'bg-gray-950 border-r border-gray-800',
          'transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {children}
      </aside>
    </>
  );
}

export function SidebarHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-800 shrink-0">
      {children}
    </div>
  );
}

export function SidebarContent({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {children}
    </div>
  );
}

export function SidebarFooter({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 border-t border-gray-800 p-3">
      {children}
    </div>
  );
}

export function SidebarGroup({ children }: { children: ReactNode }) {
  return <div className="px-3 py-3">{children}</div>;
}

export function SidebarGroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
      {children}
    </p>
  );
}

export function SidebarMenu({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-0.5">{children}</div>;
}

export function SidebarMenuItem({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export function SidebarSeparator() {
  return <div className="mx-3 border-t border-gray-800 my-1" />;
}

export function SidebarInset({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`relative flex-1 min-w-0 overflow-hidden ${className}`}>
      {children}
    </main>
  );
}

export function SidebarTrigger() {
  const { setOpen } = useSidebar();
  return (
    <button
      className="absolute top-3 left-3 z-30 flex items-center justify-center w-8 h-8 bg-gray-800/90 hover:bg-gray-700 border border-gray-700 rounded-md transition-colors md:hidden"
      onClick={() => setOpen(o => !o)}
      title="Open sidebar"
      aria-label="Open sidebar"
    >
      <PanelLeft size={14} className="text-gray-400" />
    </button>
  );
}
