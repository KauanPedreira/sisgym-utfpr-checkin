import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Search, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
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

interface Student {
  id: string;
  user_id: string;
  ra: string | null;
  status: string;
  tipo_vinculo: string;
  frequencia_esperada: number;
  frequencia_total: number;
  profiles: {
    nome: string;
    cpf: string;
    telefone: string | null;
  };
}

const AdminStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [editingRA, setEditingRA] = useState<string | null>(null);
  const [editRAValue, setEditRAValue] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndFetchStudents();
  }, []);

  // Set up realtime subscription for students
  useEffect(() => {
    const channel = supabase
      .channel('students-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alunos'
        },
        async (payload) => {
          console.log('Student data changed:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Fetch the complete new student record with profile info
            const { data, error } = await supabase
              .from('alunos')
              .select(`
                *,
                profiles!alunos_user_id_fkey(nome, cpf, telefone)
              `)
              .eq('id', payload.new.id)
              .single();

            if (!error && data) {
              setStudents(prev => [data as any, ...prev]);
              toast({
                title: "Novo aluno cadastrado!",
                description: `${(data as any).profiles?.nome || 'Aluno'} foi adicionado ao sistema.`,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            // Update the existing student in the list
            const { data, error } = await supabase
              .from('alunos')
              .select(`
                *,
                profiles!alunos_user_id_fkey(nome, cpf, telefone)
              `)
              .eq('id', payload.new.id)
              .single();

            if (!error && data) {
              setStudents(prev => 
                prev.map(student => 
                  student.id === (data as any).id ? data as any : student
                )
              );
            }
          } else if (payload.eventType === 'DELETE') {
            // Remove the deleted student from the list
            setStudents(prev => prev.filter(student => student.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
          console.log('Students realtime connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeConnected(false);
          console.log('Students realtime disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsRealtimeConnected(false);
    };
  }, [toast]);

  const checkAdminAndFetchStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!roleData || roleData.role !== "admin") {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      // Fetch all students
      const { data, error } = await supabase
        .from("alunos")
        .select(`
          *,
          profiles!alunos_user_id_fkey(nome, cpf, telefone)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setStudents(data as any || []);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os alunos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.profiles.nome.toLowerCase().includes(searchLower) ||
      student.profiles.cpf.includes(searchTerm) ||
      student.ra?.includes(searchTerm)
    );
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      ativo: "default",
      inativo: "secondary",
      banido: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getVinculoBadge = (vinculo: string) => {
    const labels: Record<string, string> = {
      aluno: "Aluno",
      servidor: "Servidor",
      externo: "Terceiro",
    };
    return <Badge variant="outline">{labels[vinculo] || vinculo}</Badge>;
  };

  const handleEditRA = (studentId: string, currentRA: string | null) => {
    setEditingRA(studentId);
    setEditRAValue(currentRA || "");
  };

  const handleSaveRA = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from("alunos")
        .update({ ra: editRAValue || null })
        .eq("id", studentId);

      if (error) throw error;

      setStudents(prev =>
        prev.map(student =>
          student.id === studentId ? { ...student, ra: editRAValue || null } : student
        )
      );

      toast({
        title: "RA atualizado!",
        description: "O RA foi atualizado com sucesso.",
      });

      setEditingRA(null);
      setEditRAValue("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o RA.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingRA(null);
    setEditRAValue("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            onClick={() => navigate("/dashboard")}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gerenciar Alunos</h1>
              <p className="text-sm text-muted-foreground">
                Visualize e gerencie todos os alunos cadastrados
              </p>
            </div>
            <Badge variant={isRealtimeConnected ? "default" : "secondary"} className="h-6">
              <span className={`mr-1.5 h-2 w-2 rounded-full ${isRealtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
              {isRealtimeConnected ? 'Tempo Real Ativo' : 'Carregando...'}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alunos Cadastrados ({filteredStudents.length})
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou RA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead className="w-[180px]">RA</TableHead>
                    <TableHead>Vínculo</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum aluno encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                     filteredStudents.map((student) => (
                      <TableRow key={student.id} className="group">
                        <TableCell className="font-medium">
                          {student.profiles.nome}
                        </TableCell>
                        <TableCell>{student.profiles.cpf}</TableCell>
                        <TableCell>
                          {editingRA === student.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editRAValue}
                                onChange={(e) => setEditRAValue(e.target.value.slice(0, 8))}
                                className="w-32"
                                placeholder="RA (máx. 8)"
                                maxLength={8}
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleSaveRA(student.id)}
                              >
                                <Check className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{student.ra || "-"}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleEditRA(student.id, student.ra)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getVinculoBadge(student.tipo_vinculo)}</TableCell>
                        <TableCell>
                          {student.frequencia_total} / {student.frequencia_esperada}x semana
                        </TableCell>
                        <TableCell>{getStatusBadge(student.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminStudents;
