import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Search, UserPlus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AttendanceRecord {
  id: string;
  data_hora: string;
  created_at: string;
  aluno_user_id: string;
  qrcode_id: string | null;
  profiles: {
    nome: string;
    cpf: string;
  };
  alunos: {
    ra: string | null;
    status: string;
  };
}

const AdminAttendanceRecords = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndFetchRecords();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, startDate, endDate, records]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'presencas'
        },
        async (payload) => {
          console.log('New attendance registered:', payload);
          
          // Fetch the complete record with student info
          const { data, error } = await supabase
            .from('presencas')
            .select(`
              *,
              profiles:aluno_user_id (nome, cpf),
              alunos:aluno_user_id (ra, status)
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            const transformedData = {
              ...data,
              profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
              alunos: Array.isArray(data.alunos) ? data.alunos[0] : data.alunos,
            };

            // Add the new record to the top of the list
            setRecords(prev => [transformedData, ...prev]);
            
            toast({
              title: "Nova presença registrada!",
              description: `${transformedData.profiles?.nome || 'Aluno'} registrou presença.`,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
          console.log('Realtime connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeConnected(false);
          console.log('Realtime disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsRealtimeConnected(false);
    };
  }, [toast]);

  const checkAdminAndFetchRecords = async () => {
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

      // Fetch all attendance records with student info
      const { data, error } = await supabase
        .from("presencas")
        .select(`
          *,
          profiles:aluno_user_id (nome, cpf),
          alunos:aluno_user_id (ra, status)
        `)
        .order("data_hora", { ascending: false });

      if (error) throw error;

      // Transform data to match interface
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
        alunos: Array.isArray(item.alunos) ? item.alunos[0] : item.alunos,
      }));

      setRecords(transformedData);
      setFilteredRecords(transformedData);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os registros.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((record) =>
        record.profiles?.nome.toLowerCase().includes(searchLower) ||
        record.profiles?.cpf.includes(searchTerm) ||
        record.alunos?.ra?.includes(searchTerm)
      );
    }

    // Date filters
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.data_hora);
        return recordDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.data_hora);
        return recordDate <= end;
      });
    }

    setFilteredRecords(filtered);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportToCSV = () => {
    const headers = ["Data/Hora", "Nome", "CPF", "RA", "Status"];
    const rows = filteredRecords.map((record) => [
      formatDateTime(record.data_hora),
      record.profiles?.nome || "N/A",
      record.profiles?.cpf || "N/A",
      record.alunos?.ra || "N/A",
      record.alunos?.status || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `presencas_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exportado com sucesso!",
      description: "O arquivo CSV foi baixado.",
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar isAdmin={true} />
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar isAdmin={true} />
        
        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 flex h-14 items-center border-b border-border bg-background px-4">
            <SidebarTrigger />
          </div>
          <div className="container mx-auto px-6 py-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-foreground">
                    Registros de Presença
                  </h2>
                  <Badge variant={isRealtimeConnected ? "default" : "secondary"} className="h-6">
                    <span className={`mr-1.5 h-2 w-2 rounded-full ${isRealtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                    {isRealtimeConnected ? 'Tempo Real Ativo' : 'Carregando...'}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Visualize e gerencie todos os registros de presença
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate("/admin/attendance")}
                  variant="outline"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Registrar Presença
                </Button>
                <Button onClick={exportToCSV} disabled={filteredRecords.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </div>

            {/* Filters Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="search">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Nome, CPF ou RA..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data Inicial</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data Final</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {(searchTerm || startDate || endDate) && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {filteredRecords.length} de {records.length} registros
                    </p>
                    <Button onClick={clearFilters} variant="ghost" size="sm">
                      Limpar Filtros
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Records Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Registros ({filteredRecords.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>RA</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Origem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhum registro encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {formatDateTime(record.data_hora)}
                            </TableCell>
                            <TableCell>{record.profiles?.nome || "N/A"}</TableCell>
                            <TableCell>{record.profiles?.cpf || "N/A"}</TableCell>
                            <TableCell>{record.alunos?.ra || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  record.alunos?.status === "ativo"
                                    ? "default"
                                    : record.alunos?.status === "bloqueado"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {record.alunos?.status || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {record.qrcode_id ? "QR Code" : "Manual"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminAttendanceRecords;
