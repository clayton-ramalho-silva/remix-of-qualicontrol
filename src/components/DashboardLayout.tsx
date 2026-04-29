import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  ClipboardList,
  PlusCircle,
  Building2,
  Truck,
  BrainCircuit,
  Shield,
  FileText,
  ClipboardCheck,
  Settings,
  Users,
  Layers,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import NotificationBell from "./NotificationBell";

const AW_LOGO_WHITE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663403343148/3awzRPTf7NtQjpo8LEDXgX/Logo athie l wohnrath_White_462306ea.png";
const AW_LOGO_BLACK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663403343148/3awzRPTf7NtQjpo8LEDXgX/Logo athie l wohnrath_Black_c476567f.png";

type MenuItem = { icon: typeof LayoutDashboard; label: string; path: string; separator?: false } | { separator: true };

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: ClipboardCheck, label: "Verificações", path: "/verificacoes" },
  { icon: PlusCircle, label: "Novo Desvio", path: "/desvios/novo" },
  { icon: ClipboardList, label: "Desvios", path: "/desvios" },
  { icon: BrainCircuit, label: "Assistente IA", path: "/assistente" },
  { icon: FileText, label: "Relatório", path: "/relatorio" },
  { separator: true },
  { icon: Building2, label: "Obras", path: "/obras" },
  { icon: Layers, label: "Plantas", path: "/plantas" },
  { icon: Truck, label: "Fornecedores", path: "/fornecedores" },
  { icon: Users, label: "Usuários", path: "/usuarios" },
  { icon: Settings, label: "Administração", path: "/administracao" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const navItems = menuItems.filter((item): item is Exclude<MenuItem, { separator: true }> => !('separator' in item && item.separator));
  const activeMenuItem = navItems.find(
    (item) => item.path === "/" ? location === "/" : location.startsWith(item.path)
  );
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <div className="flex min-h-svh w-full" ref={sidebarRef}>
      <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-sidebar-foreground/60" />
              </button>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 gap-0.5">
                  <img src={AW_LOGO_WHITE} alt="athie|wohnrath" className="h-4 object-contain object-left" />
                  <span className="text-[11px] font-semibold tracking-widest uppercase text-sidebar-foreground/70">
                    QualiControl
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item, idx) => {
                if ('separator' in item && item.separator) {
                  return (
                    <div key={`sep-${idx}`} className="my-2 mx-2 border-t border-sidebar-border/40" />
                  );
                }
                const navItem = item as Exclude<MenuItem, { separator: true }>;
                const isActive = navItem.path === "/"
                  ? location === "/"
                  : location.startsWith(navItem.path);
                return (
                  <SidebarMenuItem key={navItem.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(navItem.path)}
                      tooltip={navItem.label}
                      className="h-10 transition-all font-normal"
                    >
                      <navItem.icon className={`h-4 w-4 ${isActive ? "text-sidebar-primary" : ""}`} />
                      <span>{navItem.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <div className="flex items-center gap-3 rounded-lg px-1 py-1 w-full group-data-[collapsible=icon]:justify-center">
              <Avatar className="h-9 w-9 border border-sidebar-border shrink-0">
                <AvatarFallback className="text-xs font-medium bg-sidebar-primary text-sidebar-primary-foreground">
                  AW
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                  Athié | Wohnrath
                </p>
                <p className="text-xs text-sidebar-foreground/50 truncate mt-1.5">
                  Gestão de Qualidade
                </p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
      {!isCollapsed && !isMobile && (
        <div
          className="hidden md:block fixed top-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors"
          onMouseDown={() => setIsResizing(true)}
          style={{ zIndex: 50, left: `var(--sidebar-width)` }}
        />
      )}

      <SidebarInset className="flex-1 min-w-0">
        {/* Header bar with notification bell */}
        <div className={`flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40 ${isMobile ? '' : ''}`}>
          <div className="flex items-center gap-2">
            {isMobile && <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />}
            <span className="tracking-tight text-foreground font-medium text-sm">
              {activeMenuItem?.label ?? "Menu"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
                    {user.name?.charAt(0)?.toUpperCase() || "U"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                    {user.name || user.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout()} className="text-red-500">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </div>
  );
}
