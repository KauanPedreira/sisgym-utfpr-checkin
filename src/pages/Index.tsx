import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-temp";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center space-y-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
            <Dumbbell className="h-32 w-32 text-primary relative z-10" />
          </div>
          
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-6xl font-bold text-foreground">
              SisGym
            </h1>
            <p className="text-2xl text-primary font-semibold">
              Sistema de Controle de Presença
            </p>
            <p className="text-xl text-muted-foreground">
              UTFPR - Universidade Tecnológica Federal do Paraná
            </p>
          </div>

          <div className="space-y-4 pt-8">
            <p className="text-lg text-foreground/80 max-w-2xl">
              Gerencie a presença dos alunos na academia universitária através de QR Code dinâmico,
              controle de frequência e fichas de treino personalizadas.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              onClick={() => navigate("/auth")}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8"
            >
              Acessar Sistema
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
