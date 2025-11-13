import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Dumbbell, 
  QrCode, 
  Calendar, 
  Clipboard, 
  Users, 
  FileText, 
  LogOut,
  Home,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  isAdmin: boolean;
}

export const Sidebar = ({ isAdmin }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

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
  ];

  const adminLinks = [
    { path: "/dashboard", icon: Home, label: "Início" },
    { path: "/admin/qrcode", icon: QrCode, label: "QR Code" },
    { path: "/admin/students", icon: Users, label: "Alunos" },
    { path: "/admin/workouts", icon: Clipboard, label: "Fichas" },
    { path: "/admin/blocking", icon: Shield, label: "Bloqueios" },
    { path: "/admin/reports", icon: FileText, label: "Relatórios" },
    { path: "/admin/attendance", icon: Calendar, label: "Presenças" },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">SisGym</h1>
            <p className="text-xs text-muted-foreground">UTFPR</p>
          </div>
        </div>
        {isAdmin && (
          <div className="mt-3 flex items-center gap-2 text-xs text-primary">
            <Shield className="h-3 w-3" />
            <span>Administrador</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.path} to={link.path}>
              <Button
                variant={isActive(link.path) ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  isActive(link.path) ? "bg-primary/10 text-primary" : ""
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
};
