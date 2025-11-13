import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, UserPlus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Student {
  user_id: string;
  profiles: {
    nome: string;
    cpf: string;
  };
}

const AdminAttendance = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndFetchStudents();
  }, []);

  const checkAdminAndFetchStudents = async () => {
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
        return;
      }

      // Fetch students
      const { data, error } = await supabase
        .from("alunos")
        .select(`
          user_id,
          profiles!alunos_user_id_fkey (nome, cpf)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform data to match interface
      const transformedData = (data || []).map((item: any) => ({
        user_id: item.user_id,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      }));
      
      setStudents(transformedData);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    }
  };

  const handleRegisterAttendance = async () => {
    if (!selectedStudent) {
      toast({
        title: "Selecione um aluno",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get active QR code or create a manual one
      let qrCodeId = null;
      const { data: qrCode } = await supabase
        .from("qrcodes")
        .select("id")
        .eq("ativo", true)
        .single();

      if (qrCode) {
        qrCodeId = qrCode.id;
      }

      // Register attendance
      const { error } = await supabase
        .from("presencas")
        .insert({
          aluno_user_id: selectedStudent,
          qrcode_id: qrCodeId,
        });

      if (error) throw error;

      toast({
        title: "Presença registrada!",
        description: "A presença foi registrada com sucesso.",
      });

      setSelectedStudent("");
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a presença.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    student.profiles.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.profiles.cpf.includes(searchTerm)
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isAdmin={true} />
      
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Registro Manual de Presença
            </h2>
            <p className="text-muted-foreground">
              Registre presença manualmente para alunos
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Registrar Presença
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar Aluno</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Buscar por nome ou CPF..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="student">Selecione o Aluno</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um aluno" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStudents.map((student) => (
                        <SelectItem key={student.user_id} value={student.user_id}>
                          {student.profiles.nome} - {student.profiles.cpf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleRegisterAttendance}
                  className="w-full"
                  disabled={loading || !selectedStudent}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {loading ? "Registrando..." : "Registrar Presença"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAttendance;
