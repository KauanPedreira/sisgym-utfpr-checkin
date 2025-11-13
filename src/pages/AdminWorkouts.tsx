import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clipboard, Plus, Pencil, Trash2, Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WorkoutDialog } from "@/components/WorkoutDialog";
import { ExerciseDialog } from "@/components/ExerciseDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AdminWorkouts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "workout" | "exercise"; id: string } | null>(null);

  useEffect(() => {
    checkAdmin();
    fetchWorkouts();
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

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const { data: treinosData } = await supabase
        .from("treinos")
        .select(`
          *,
          aluno:alunos!treinos_aluno_user_id_fkey(
            profiles(nome)
          ),
          exercicios(*)
        `)
        .order("created_at", { ascending: false });

      if (treinosData) {
        setWorkouts(treinosData);
      }
    } catch (error: any) {
      console.error("Error fetching workouts:", error);
      toast({
        title: "Erro ao carregar fichas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditWorkout = (workout: any) => {
    setSelectedWorkout(workout);
    setWorkoutDialogOpen(true);
  };

  const handleAddExercise = (workout: any) => {
    setSelectedWorkout(workout);
    setSelectedExercise(null);
    setExerciseDialogOpen(true);
  };

  const handleEditExercise = (workout: any, exercise: any) => {
    setSelectedWorkout(workout);
    setSelectedExercise(exercise);
    setExerciseDialogOpen(true);
  };

  const handleDeleteWorkout = (workoutId: string) => {
    setItemToDelete({ type: "workout", id: workoutId });
    setDeleteDialogOpen(true);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    setItemToDelete({ type: "exercise", id: exerciseId });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === "workout") {
        const { error } = await supabase
          .from("treinos")
          .delete()
          .eq("id", itemToDelete.id);

        if (error) throw error;

        toast({
          title: "Ficha excluída com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from("exercicios")
          .delete()
          .eq("id", itemToDelete.id);

        if (error) throw error;

        toast({
          title: "Exercício excluído com sucesso!",
        });
      }

      fetchWorkouts();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
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
                <Button size="sm" onClick={() => { setSelectedWorkout(null); setWorkoutDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Ficha
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Carregando fichas...
                </div>
              ) : workouts.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Clipboard className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhuma ficha cadastrada</p>
                  <p className="text-sm mt-2">
                    Clique em "Nova Ficha" para começar
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {workouts.map((workout) => (
                    <Card key={workout.id} className="border-l-4 border-l-primary">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-xl">{workout.titulo}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Aluno: {workout.aluno?.profiles?.nome || "Não atribuído"}
                            </p>
                            {workout.objetivo && (
                              <p className="text-sm text-muted-foreground">
                                Objetivo: {workout.objetivo}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddExercise(workout)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Exercício
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditWorkout(workout)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteWorkout(workout.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {workout.exercicios && workout.exercicios.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Exercício</TableHead>
                                <TableHead className="w-20">Séries</TableHead>
                                <TableHead className="w-28">Repetições</TableHead>
                                <TableHead className="w-28">Descanso</TableHead>
                                <TableHead className="w-20"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {workout.exercicios.map((exercise: any) => (
                                <TableRow key={exercise.id}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{exercise.nome_exercicio}</p>
                                      {exercise.observacoes && (
                                        <p className="text-sm text-muted-foreground">
                                          {exercise.observacoes}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>{exercise.series || "-"}</TableCell>
                                  <TableCell>{exercise.repeticoes || "-"}</TableCell>
                                  <TableCell>
                                    {exercise.descanso_segundos ? `${exercise.descanso_segundos}s` : "-"}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditExercise(workout, exercise)}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteExercise(exercise.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Nenhum exercício adicionado</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <WorkoutDialog
            open={workoutDialogOpen}
            onOpenChange={setWorkoutDialogOpen}
            workout={selectedWorkout}
            onSuccess={fetchWorkouts}
          />

          <ExerciseDialog
            open={exerciseDialogOpen}
            onOpenChange={setExerciseDialogOpen}
            treinoId={selectedWorkout?.id}
            exercise={selectedExercise}
            onSuccess={fetchWorkouts}
          />

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este {itemToDelete?.type === "workout" ? "treino" : "exercício"}?
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
};

export default AdminWorkouts;
