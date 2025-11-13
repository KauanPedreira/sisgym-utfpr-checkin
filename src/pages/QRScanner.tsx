import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const QRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanError
      );
      setScanning(true);
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
      toast({
        title: "Erro ao acessar câmera",
        description: "Verifique se você concedeu permissão para usar a câmera.",
        variant: "destructive",
      });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    console.log("QR Code detected:", decodedText);
    setResult(decodedText);
    await stopScanner();
    await registerAttendance(decodedText);
  };

  const onScanError = (errorMessage: string) => {
    // Ignore scan errors (they happen continuously while scanning)
  };

  const registerAttendance = async (qrCodeValue: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Verify QR Code is valid and active
      const { data: qrCode, error: qrError } = await supabase
        .from("qrcodes")
        .select("*")
        .eq("codigo", qrCodeValue)
        .eq("ativo", true)
        .single();

      if (qrError || !qrCode) {
        setError("QR Code inválido ou expirado");
        toast({
          title: "QR Code inválido",
          description: "Este QR Code não é válido ou já expirou.",
          variant: "destructive",
        });
        return;
      }

      // Register attendance
      const { error: attendanceError } = await supabase
        .from("presencas")
        .insert({
          aluno_user_id: user.id,
          qrcode_id: qrCode.id,
        });

      if (attendanceError) {
        console.error("Error registering attendance:", attendanceError);
        setError("Erro ao registrar presença");
        toast({
          title: "Erro",
          description: "Não foi possível registrar a presença. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Update student's total attendance
      const { error: updateError } = await supabase.rpc("increment_attendance", {
        user_id: user.id,
      });

      toast({
        title: "Presença registrada!",
        description: "Sua presença foi registrada com sucesso.",
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("Error:", err);
      setError("Erro ao processar QR Code");
      toast({
        title: "Erro",
        description: err.message || "Erro ao processar QR Code",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    stopScanner();
    navigate("/dashboard");
  };

  const handleRetry = () => {
    setResult(null);
    setError(null);
    startScanner();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            onClick={handleBack}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Scanner QR Code</h1>
            <p className="text-sm text-muted-foreground">Aponte a câmera para o QR Code</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                {scanning ? "Escaneando..." : "Scanner"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Scanner Container */}
              <div className="relative rounded-lg overflow-hidden bg-black">
                <div id="qr-reader" className="w-full"></div>
                {!scanning && !result && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <p className="text-white">Iniciando câmera...</p>
                  </div>
                )}
              </div>

              {/* Success State */}
              {result && !error && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium text-green-500">QR Code lido com sucesso!</p>
                    <p className="text-sm text-muted-foreground">Registrando presença...</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <XCircle className="h-6 w-6 text-red-500" />
                    <div>
                      <p className="font-medium text-red-500">Erro</p>
                      <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                  </div>
                  <Button onClick={handleRetry} className="w-full">
                    Tentar Novamente
                  </Button>
                </div>
              )}

              {/* Instructions */}
              {scanning && !result && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Posicione o QR Code dentro do quadrado
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A leitura será feita automaticamente
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default QRScanner;
