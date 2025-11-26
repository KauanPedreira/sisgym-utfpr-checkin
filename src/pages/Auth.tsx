import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [ra, setRa] = useState("");
  const [tipoVinculo, setTipoVinculo] = useState("aluno");
  const [frequenciaEsperada, setFrequenciaEsperada] = useState("3");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao SisGym",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            cpf,
            nome,
            telefone,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      // Create aluno entry after signup
      if (data.user) {
        console.log("Creating aluno with RA:", ra, "tipo_vinculo:", tipoVinculo);
        
        const { error: alunoError } = await supabase
          .from("alunos")
          .insert({
            user_id: data.user.id,
            ra: ra || null,
            tipo_vinculo: tipoVinculo,
            frequencia_esperada: parseInt(frequenciaEsperada),
            status: "ativo",
          } as any);

        if (alunoError) {
          console.error("Error creating aluno:", alunoError);
          toast({
            title: "Erro ao criar registro de aluno",
            description: alunoError.message,
            variant: "destructive",
          });
        } else {
          console.log("Aluno created successfully with RA:", ra);
        }
      }

      toast({
        title: "Cadastro realizado!",
        description: "Você já pode fazer login no sistema.",
      });
      setIsLogin(true);
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 items-center justify-center p-12">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Dumbbell className="h-24 w-24 text-primary-foreground" />
          </div>
          <h1 className="text-6xl font-bold text-primary-foreground mb-4">SisGym</h1>
          <p className="text-2xl text-primary-foreground/90">Sistema de Controle de Presença</p>
          <p className="text-xl text-primary-foreground/80 mt-2">UTFPR</p>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="space-y-1">
            <div className="flex justify-center lg:hidden mb-4">
              <Dumbbell className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">
              {isLogin ? "Login" : "Criar Conta"}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin 
                ? "Entre com suas credenciais para acessar o sistema"
                : "Preencha os dados para criar sua conta"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      placeholder="Seu nome completo"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      placeholder="(00) 00000-0000"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipoVinculo">Tipo de Vínculo</Label>
                    <Select value={tipoVinculo} onValueChange={setTipoVinculo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione seu vínculo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aluno">Aluno</SelectItem>
                        <SelectItem value="externo">Terceiro/Externo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {tipoVinculo === "aluno" && (
                    <div className="space-y-2">
                      <Label htmlFor="ra">RA (Registro Acadêmico)</Label>
                      <Input
                        id="ra"
                        placeholder="Digite seu RA"
                        value={ra}
                        onChange={(e) => setRa(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="frequenciaEsperada">Quantos dias por semana vai treinar?</Label>
                    <Select value={frequenciaEsperada} onValueChange={setFrequenciaEsperada}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 dia por semana</SelectItem>
                        <SelectItem value="2">2 dias por semana</SelectItem>
                        <SelectItem value="3">3 dias por semana</SelectItem>
                        <SelectItem value="4">4 dias por semana</SelectItem>
                        <SelectItem value="5">5 dias por semana</SelectItem>
                        <SelectItem value="6">6 dias por semana</SelectItem>
                        <SelectItem value="7">Todos os dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={loading}
              >
                {loading ? "Carregando..." : (isLogin ? "Entrar" : "Criar Conta")}
              </Button>
            </form>
            
            <div className="mt-4 text-center text-sm">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline"
              >
                {isLogin 
                  ? "Não tem uma conta? Criar conta" 
                  : "Já tem uma conta? Fazer login"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
