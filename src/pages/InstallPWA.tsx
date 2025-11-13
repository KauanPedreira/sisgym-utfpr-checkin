import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPWA = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      toast({
        title: "App instalado!",
        description: "O SisGym foi instalado com sucesso no seu dispositivo.",
      });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Instalação não disponível",
        description: "Use o menu do seu navegador para instalar o app.",
        variant: "destructive",
      });
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast({
        title: "Instalação iniciada!",
        description: "O app será instalado em instantes.",
      });
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const getInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
      return {
        title: "Instalar no iOS",
        steps: [
          "Toque no botão de compartilhar (ícone com seta para cima)",
          "Role para baixo e toque em 'Adicionar à Tela de Início'",
          "Toque em 'Adicionar' no canto superior direito",
          "O ícone do SisGym aparecerá na sua tela inicial"
        ]
      };
    } else if (isAndroid) {
      return {
        title: "Instalar no Android",
        steps: [
          "Toque no menu (três pontos) no canto superior direito",
          "Selecione 'Adicionar à tela inicial' ou 'Instalar app'",
          "Confirme a instalação",
          "O ícone do SisGym aparecerá na sua tela inicial"
        ]
      };
    }

    return {
      title: "Instalar no Desktop",
      steps: [
        "Clique no ícone de instalação na barra de endereços",
        "Ou acesse o menu do navegador e selecione 'Instalar SisGym'",
        "Confirme a instalação",
        "O app será aberto em uma janela própria"
      ]
    };
  };

  const instructions = getInstallInstructions();

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-500" />
              App Instalado!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              O SisGym já está instalado no seu dispositivo. Você pode acessá-lo pela tela inicial.
            </p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Ir para o Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-6 w-6 text-primary" />
              Instalar SisGym
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <img 
              src="/pwa-icon-192.png" 
              alt="SisGym Icon" 
              className="w-24 h-24 mx-auto rounded-2xl shadow-lg"
            />
            <p className="text-sm text-muted-foreground">
              Instale o SisGym no seu dispositivo para acesso rápido e funcionamento offline
            </p>
          </div>

          {isInstallable && (
            <Button 
              onClick={handleInstallClick} 
              className="w-full"
              size="lg"
            >
              <Download className="h-5 w-5 mr-2" />
              Instalar Agora
            </Button>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">{instructions.title}</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold text-sm mb-2">Benefícios:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Acesso rápido pela tela inicial
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Funciona sem internet (offline)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Experiência como app nativo
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Notificações em tempo real
              </li>
            </ul>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="w-full"
          >
            Continuar no Navegador
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallPWA;
