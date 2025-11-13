import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/Sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QRScannerDialog } from "@/components/QRScannerDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";

const Scanner = () => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const navigate = useNavigate();

  // Get user ID on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar isAdmin={false} />
        
        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 flex h-14 items-center border-b border-border bg-background px-4">
            <SidebarTrigger />
          </div>
          <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Registrar Presença
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Escaneie o QR Code exibido na academia para registrar sua presença
                </p>
                
                <Button
                  onClick={() => setScannerOpen(true)}
                  className="w-full"
                  size="lg"
                >
                  <QrCode className="mr-2 h-5 w-5" />
                  Abrir Scanner
                </Button>

                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-sm">Instruções:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Permita o acesso à câmera quando solicitado</li>
                    <li>• Aponte a câmera para o QR Code exibido</li>
                    <li>• A presença será registrada automaticamente</li>
                    <li>• Apenas QR Codes ativos podem ser escaneados</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {userId && (
        <QRScannerDialog 
          open={scannerOpen} 
          onOpenChange={setScannerOpen}
          userId={userId}
        />
      )}
    </div>
    </SidebarProvider>
  );
};

export default Scanner;
