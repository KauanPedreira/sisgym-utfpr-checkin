import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treinoId: string;
  exercise?: any;
  onSuccess: () => void;
}

export const ExerciseDialog = ({ open, onOpenChange, treinoId, exercise, onSuccess }: ExerciseDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_exercicio: "",
    series: "",
    repeticoes: "",
    descanso_segundos: "",
    observacoes: "",
  });

  useEffect(() => {
    if (open) {
      if (exercise) {
        setFormData({
          nome_exercicio: exercise.nome_exercicio || "",
          series: exercise.series?.toString() || "",
          repeticoes: exercise.repeticoes || "",
          descanso_segundos: exercise.descanso_segundos?.toString() || "",
          observacoes: exercise.observacoes || "",
        });
      } else {
        setFormData({
          nome_exercicio: "",
          series: "",
          repeticoes: "",
          descanso_segundos: "",
          observacoes: "",
        });
      }
    }
  }, [open, exercise]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const exerciseData = {
        nome_exercicio: formData.nome_exercicio,
        series: formData.series ? parseInt(formData.series) : null,
        repeticoes: formData.repeticoes,
        descanso_segundos: formData.descanso_segundos ? parseInt(formData.descanso_segundos) : null,
        observacoes: formData.observacoes || null,
        treino_id: treinoId,
      };

      if (exercise) {
        const { error } = await supabase
          .from("exercicios")
          .update(exerciseData)
          .eq("id", exercise.id);

        if (error) throw error;

        toast({
          title: "Exercício atualizado!",
        });
      } else {
        const { error } = await supabase
          .from("exercicios")
          .insert([exerciseData]);

        if (error) throw error;

        toast({
          title: "Exercício adicionado!",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar exercício",
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
            {exercise ? "Editar Exercício" : "Adicionar Exercício"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_exercicio">Nome do Exercício *</Label>
            <Input
              id="nome_exercicio"
              value={formData.nome_exercicio}
              onChange={(e) => setFormData({ ...formData, nome_exercicio: e.target.value })}
              placeholder="Ex: Supino Reto"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="series">Séries</Label>
              <Input
                id="series"
                type="number"
                value={formData.series}
                onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                placeholder="3"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="repeticoes">Repetições</Label>
              <Input
                id="repeticoes"
                value={formData.repeticoes}
                onChange={(e) => setFormData({ ...formData, repeticoes: e.target.value })}
                placeholder="10-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descanso">Descanso (s)</Label>
              <Input
                id="descanso"
                type="number"
                value={formData.descanso_segundos}
                onChange={(e) => setFormData({ ...formData, descanso_segundos: e.target.value })}
                placeholder="60"
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Ex: Executar movimento lentamente, focar na contração"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : exercise ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
