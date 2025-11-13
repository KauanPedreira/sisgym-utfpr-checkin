import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase-temp";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clipboard, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminWorkouts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
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
          variant: "destructive",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isAdmin={true} />
      
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Gerenciar Fichas de Treino
            </h2>
            <p className="text-muted-foreground">
              Cadastre e atribua fichas de treino aos alunos
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clipboard className="h-5 w-5" />
                  Fichas de Treino
                </span>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Ficha
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-12">
                <Clipboard className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Funcionalidade em desenvolvimento</p>
                <p className="text-sm mt-2">
                  Em breve você poderá criar e gerenciar fichas de treino
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminWorkouts;
