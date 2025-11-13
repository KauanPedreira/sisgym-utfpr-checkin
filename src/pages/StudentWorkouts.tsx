import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/Sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const StudentWorkouts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchWorkouts();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }
    } catch (error: any) {
      console.error("Error:", error);
      navigate("/auth");
    }
  };

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data: treinosData, error } = await supabase
        .from("treinos")
        .select(`
          *,
          exercicios(*)
        `)
        .eq("aluno_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (treinosData) {
        setWorkouts(treinosData);
      }
    } catch (error: any) {
      console.error("Error fetching workouts:", error);
      toast({
        title: "Erro ao carregar fichas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDescanso = (segundos: number) => {
    if (segundos >= 60) {
      const minutos = Math.floor(segundos / 60);
      const segs = segundos % 60;
      return segs > 0 ? `${minutos}min ${segs}s` : `${minutos}min`;
    }
    return `${segundos}s`;
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar isAdmin={false} />
        
        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 flex h-14 items-center border-b border-border bg-background px-4">
            <SidebarTrigger />
          </div>
          <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Minhas Fichas de Treino
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Acompanhe seus exercícios e rotinas de treino
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Dumbbell className="h-12 w-12 mx-auto mb-4 animate-pulse opacity-50" />
              <p>Carregando suas fichas...</p>
            </div>
          ) : workouts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Dumbbell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-lg font-medium mb-2">Nenhuma ficha encontrada</p>
                <p className="text-sm text-muted-foreground">
                  Entre em contato com seu instrutor para receber sua ficha de treino
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {workouts.map((workout) => (
                <Card key={workout.id} className="border-l-4 border-l-primary shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                          <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          {workout.titulo}
                        </CardTitle>
                        {workout.exercicios && (
                          <Badge variant="secondary" className="shrink-0">
                            {workout.exercicios.length} exercícios
                          </Badge>
                        )}
                      </div>
                      {workout.objetivo && (
                        <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground">
                          <Target className="h-4 w-4" />
                          <span>{workout.objetivo}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    {workout.exercicios && workout.exercicios.length > 0 ? (
                      <div className="space-y-4">
                        {/* Mobile View */}
                        <div className="block sm:hidden space-y-3">
                          {workout.exercicios.map((exercise: any, index: number) => (
                            <Card key={exercise.id} className="border-l-2 border-l-primary/50">
                              <CardContent className="pt-4 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-semibold text-base">
                                    {index + 1}. {exercise.nome_exercicio}
                                  </h4>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground block text-xs">Séries</span>
                                    <span className="font-medium">{exercise.series || "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground block text-xs">Reps</span>
                                    <span className="font-medium">{exercise.repeticoes || "-"}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground block text-xs">Descanso</span>
                                    <span className="font-medium">
                                      {exercise.descanso_segundos ? formatDescanso(exercise.descanso_segundos) : "-"}
                                    </span>
                                  </div>
                                </div>

                                {exercise.observacoes && (
                                  <div className="pt-2 border-t">
                                    <p className="text-xs text-muted-foreground italic">
                                      {exercise.observacoes}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* Desktop View */}
                        <div className="hidden sm:block rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Exercício</TableHead>
                                <TableHead className="w-24 text-center">Séries</TableHead>
                                <TableHead className="w-32 text-center">Repetições</TableHead>
                                <TableHead className="w-28 text-center">Descanso</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {workout.exercicios.map((exercise: any, index: number) => (
                                <TableRow key={exercise.id}>
                                  <TableCell className="font-medium text-muted-foreground">
                                    {index + 1}
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-semibold">{exercise.nome_exercicio}</p>
                                      {exercise.observacoes && (
                                        <p className="text-sm text-muted-foreground mt-1 italic">
                                          {exercise.observacoes}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center font-medium">
                                    {exercise.series || "-"}
                                  </TableCell>
                                  <TableCell className="text-center font-medium">
                                    {exercise.repeticoes || "-"}
                                  </TableCell>
                                  <TableCell className="text-center font-medium">
                                    {exercise.descanso_segundos 
                                      ? formatDescanso(exercise.descanso_segundos)
                                      : "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">Nenhum exercício cadastrado nesta ficha</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
    </SidebarProvider>
  );
};

export default StudentWorkouts;
