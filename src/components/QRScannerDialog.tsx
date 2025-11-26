import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const QRScannerDialog = ({ open, onOpenChange, userId }: QRScannerDialogProps) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      startScanner();
    } else {
      stopScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [open]);

  const startScanner = async () => {
    try {
      // Wait a bit to ensure the div is mounted
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Check if element exists
      const element = document.getElementById("qr-reader-dialog");
      if (!element) {
        throw new Error("Scanner element not found");
      }

      // Clear any existing scanner instance
      if (scannerRef.current) {
        try {
          await scannerRef.current.clear();
        } catch (e) {
          console.log("Error clearing previous scanner:", e);
        }
      }

      const scanner = new Html5Qrcode("qr-reader-dialog");
      scannerRef.current = scanner;

      // Try to get camera list first
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        throw new Error("Nenhuma câmera encontrada");
      }

      // Prefer back camera on mobile
      const cameraId = cameras.length > 1 ? cameras[cameras.length - 1].id : cameras[0].id;

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        onScanSuccess,
        () => {
          // Ignore continuous scan errors
        }
      );
      setScanning(true);
      setError(null);
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      const errorMessage = err.message || "Não foi possível acessar a câmera";
      setError(errorMessage);
      toast({
        title: "Erro ao acessar câmera",
        description: "Verifique se você concedeu permissão para usar a câmera e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const currentScanner = scannerRef.current;
        scannerRef.current = null;
        
        if (currentScanner.isScanning) {
          await currentScanner.stop();
        }
        await currentScanner.clear();
        setScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
        // Force reset state even if stop fails
        scannerRef.current = null;
        setScanning(false);
      }
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    console.log("QR Code detected:", decodedText);
    setResult(decodedText);
    await stopScanner();
    await registerAttendance(decodedText);
  };

  const registerAttendance = async (qrCodeValue: string) => {
    try {
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
          aluno_user_id: userId,
          qrcode_id: qrCode.id,
        });

      if (attendanceError) {
        console.error("Error registering attendance:", attendanceError);
        setError("Erro ao registrar presença");
        toast({
          title: "Erro",
          description: "Não foi possível registrar a presença.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Presença registrada!",
        description: "Sua presença foi registrada com sucesso.",
      });

      setTimeout(() => {
        setResult(null);
        setError(null);
        onOpenChange(false);
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

  const handleRetry = () => {
    setResult(null);
    setError(null);
    startScanner();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scanner QR Code
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Scanner Container */}
          <div className="relative rounded-lg overflow-hidden bg-black min-h-[300px] flex items-center justify-center">
            <div id="qr-reader-dialog" className="w-full"></div>
            {!scanning && !result && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <p className="text-white">Iniciando câmera...</p>
              </div>
            )}
          </div>

          {/* Success State */}
          {result && !error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="h-6 w-6 text-green-500 shrink-0" />
              <div>
                <p className="font-medium text-green-500">Sucesso!</p>
                <p className="text-sm text-muted-foreground">Presença registrada</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <XCircle className="h-6 w-6 text-red-500 shrink-0" />
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
