import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const NotificationPermission = () => {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
      
      // Show prompt if not granted and user hasn't dismissed it
      const dismissed = localStorage.getItem("notification-prompt-dismissed");
      if (Notification.permission === "default" && !dismissed) {
        setShowPrompt(true);
      }
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPushNotifications = async () => {
    try {
      setLoading(true);

      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== "granted") {
        toast({
          title: "Permissão negada",
          description: "Você não receberá notificações.",
          variant: "destructive",
        });
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // VAPID public key (you'll need to generate this)
      const vapidPublicKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr9qBKEwnhn1PNV9PHJdCNI";
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Save subscription to database
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from("push_subscriptions")
          .upsert({
            user_id: user.id,
            subscription: subscription.toJSON(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id",
          });

        if (error) throw error;

        toast({
          title: "Notificações ativadas!",
          description: "Você receberá alertas sobre treinos e bloqueios.",
        });
      }

      setShowPrompt(false);
    } catch (error: any) {
      console.error("Error subscribing to push notifications:", error);
      toast({
        title: "Erro ao ativar notificações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem("notification-prompt-dismissed", "true");
  };

  if (!("Notification" in window)) {
    return null;
  }

  if (permission === "granted" && !showPrompt) {
    return null;
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5 text-primary" />
              Ativar Notificações
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={dismissPrompt}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Receba alertas sobre:
          </p>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Novos treinos atribuídos</li>
            <li>• Risco de bloqueio por baixa frequência</li>
            <li>• Lembretes importantes</li>
          </ul>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={subscribeToPushNotifications}
              disabled={loading}
              className="flex-1"
              size="sm"
            >
              {loading ? "Ativando..." : "Ativar"}
            </Button>
            <Button
              variant="outline"
              onClick={dismissPrompt}
              size="sm"
            >
              Agora não
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
