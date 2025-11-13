import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout?: any;
  onSuccess: () => void;
}

export const WorkoutDialog = ({ open, onOpenChange, workout, onSuccess }: WorkoutDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    titulo: "",
    objetivo: "",
    aluno_user_id: "",
  });

  useEffect(() => {
    if (open) {
      fetchStudents();
      if (workout) {
        setFormData({
          titulo: workout.titulo || "",
          objetivo: workout.objetivo || "",
          aluno_user_id: workout.aluno_user_id || "",
        });
      } else {
        setFormData({
          titulo: "",
          objetivo: "",
          aluno_user_id: "",
        });
      }
    }
  }, [open, workout]);

  const fetchStudents = async () => {
    try {
      const { data: alunosData } = await supabase
        .from("alunos")
        .select("user_id, profiles(nome)");

      if (alunosData) {
        setStudents(alunosData);
      }
    } catch (error: any) {
      console.error("Error fetching students:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const workoutData = {
        ...formData,
        funcionario_user_id: user?.id,
      };

      if (workout) {
        const { error } = await supabase
          .from("treinos")
          .update(workoutData)
          .eq("id", workout.id);

        if (error) throw error;

        toast({
          title: "Ficha atualizada com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from("treinos")
          .insert([workoutData]);

        if (error) throw error;

        toast({
          title: "Ficha criada com sucesso!",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar ficha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {workout ? "Editar Ficha de Treino" : "Nova Ficha de Treino"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: Treino A - Peito e Tríceps"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objetivo">Objetivo</Label>
            <Input
              id="objetivo"
              value={formData.objetivo}
              onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
              placeholder="Ex: Hipertrofia, Força, Condicionamento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aluno">Aluno *</Label>
            <Select
              value={formData.aluno_user_id}
              onValueChange={(value) => setFormData({ ...formData, aluno_user_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um aluno" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student: any) => (
                  <SelectItem key={student.user_id} value={student.user_id}>
                    {student.profiles?.nome || "Sem nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : workout ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
