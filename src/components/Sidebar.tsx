import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Dumbbell, 
  QrCode, 
  Calendar, 
  Clipboard, 
  Users, 
  FileText, 
  LogOut,
  Home,
  Shield,
  UserCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  isAdmin: boolean;
}

export const AppSidebar = ({ isAdmin }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { open } = useSidebar();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const studentLinks = [
    { path: "/dashboard", icon: Home, label: "Início" },
    { path: "/scanner", icon: QrCode, label: "Escanear QR" },
    { path: "/attendance", icon: Calendar, label: "Histórico" },
    { path: "/workouts", icon: Clipboard, label: "Meus Treinos" },
    { path: "/profile", icon: UserCircle, label: "Meu Perfil" },
  ];

  const adminLinks = [
    { path: "/dashboard", icon: Home, label: "Início" },
    { path: "/admin/qrcode", icon: QrCode, label: "QR Code" },
    { path: "/admin/students", icon: Users, label: "Alunos" },
    { path: "/admin/workouts", icon: Clipboard, label: "Fichas" },
    { path: "/admin/blocking", icon: Shield, label: "Bloqueios" },
    { path: "/admin/reports", icon: FileText, label: "Relatórios" },
    { path: "/admin/attendance", icon: Calendar, label: "Presenças" },
    { path: "/profile", icon: UserCircle, label: "Meu Perfil" },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-8 w-8 text-primary shrink-0" />
          {open && (
            <div>
              <h1 className="text-xl font-bold text-foreground">SisGym</h1>
              <p className="text-xs text-muted-foreground">UTFPR</p>
            </div>
          )}
        </div>
        {isAdmin && open && (
          <div className="mt-3 flex items-center gap-2 text-xs text-primary">
            <Shield className="h-3 w-3" />
            <span>Administrador</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);
                return (
                  <SidebarMenuItem key={link.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={link.label}
                    >
                      <Link to={link.path} className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
