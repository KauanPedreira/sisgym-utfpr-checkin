import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-temp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, QrCode as QrCodeIcon, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

const AdminQRCode = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [currentCode, setCurrentCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndGenerateQR();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateNewQRCode();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const checkAdminAndGenerateQR = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!roleData || roleData.role !== "admin") {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      await generateNewQRCode();
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar QR Code.",
        variant: "destructive",
      });
    }
  };

  const generateNewQRCode = async () => {
    setLoading(true);
    try {
      // Deactivate old QR codes
      await supabase
        .from("qrcodes")
        .update({ ativo: false })
        .eq("ativo", true);

      // Generate new code
      const code = `SISGYM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Insert new QR code
      const { error: insertError } = await supabase
        .from("qrcodes")
        .insert({
          codigo: code,
          ativo: true,
        });

      if (insertError) throw insertError;

      // Generate QR code image
      const qrDataUrl = await QRCode.toDataURL(code, {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      setQrCodeUrl(qrDataUrl);
      setCurrentCode(code);
      setTimeLeft(30);

      toast({
        title: "QR Code gerado",
        description: "Novo QR Code válido por 30 segundos",
      });
    } catch (error: any) {
      console.error("Error generating QR code:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar novo QR Code.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            onClick={() => navigate("/dashboard")}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">QR Code Dinâmico</h1>
            <p className="text-sm text-muted-foreground">
              Código atualizado automaticamente a cada 30 segundos
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <QrCodeIcon className="h-5 w-5" />
                  QR Code para Registro de Presença
                </span>
                <Button
                  onClick={generateNewQRCode}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Gerar Novo
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR Code Display */}
              <div className="flex flex-col items-center gap-4">
                {qrCodeUrl ? (
                  <div className="relative">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      className="rounded-lg border-4 border-primary"
                    />
                    <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center font-bold text-xl">
                      {timeLeft}s
                    </div>
                  </div>
                ) : (
                  <div className="w-[400px] h-[400px] bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Gerando QR Code...</p>
                  </div>
                )}

                {/* Timer Bar */}
                <div className="w-full">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-1000"
                      style={{ width: `${(timeLeft / 30) * 100}%` }}
                    />
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    Renovação automática em {timeLeft} segundos
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">Instruções:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Exiba este QR Code para os alunos escanearem</li>
                  <li>• O código é atualizado automaticamente a cada 30 segundos</li>
                  <li>• Apenas QR Codes ativos podem registrar presença</li>
                  <li>• Mantenha esta tela aberta durante o horário de treino</li>
                </ul>
              </div>

              {/* Code Info */}
              {currentCode && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Código atual:</p>
                  <p className="font-mono text-sm break-all">{currentCode}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminQRCode;
