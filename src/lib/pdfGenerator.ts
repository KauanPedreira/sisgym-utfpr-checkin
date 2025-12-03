import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AttendanceRecord {
  id: string;
  data_hora: string;
  profiles: {
    nome: string;
    cpf: string;
    email: string | null;
    curso: string | null;
    vinculo: string | null;
  };
  alunos?: {
    ra: string | null;
    status: string;
    tipo_vinculo: string;
  };
}

interface StudentRecord {
  id: string;
  ra: string | null;
  tipo_vinculo: string;
  frequencia_esperada: number;
  frequencia_total: number;
  status: string;
  profiles: {
    nome: string;
    cpf: string;
    telefone: string | null;
  };
}

// Adicionar fonte UTFPR
const addHeader = (doc: jsPDF, title: string) => {
  // Logo placeholder (amarelo UTFPR)
  doc.setFillColor(255, 204, 0);
  doc.rect(20, 10, 15, 15, "F");
  
  // Título UTFPR
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text("SisGym - UTFPR", 40, 20);
  
  // Título do relatório
  doc.setFontSize(16);
  doc.text(title, 40, 28);
  
  // Data de geração
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const now = new Date();
  doc.text(
    `Gerado em: ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")}`,
    40,
    34
  );
  
  // Linha separadora
  doc.setDrawColor(255, 204, 0);
  doc.setLineWidth(0.5);
  doc.line(20, 40, 190, 40);
};

const addFooter = (doc: jsPDF, pageNumber: number) => {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Página ${pageNumber} - SisGym UTFPR`,
    105,
    pageHeight - 10,
    { align: "center" }
  );
};

export const generateAttendanceReport = async (attendances: AttendanceRecord[]) => {
  const doc = new jsPDF();
  
  addHeader(doc, "Relatório de Presenças");
  
  // Estatísticas gerais
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Estatísticas Gerais", 20, 50);
  
  doc.setFontSize(10);
  doc.text(`Total de registros: ${attendances.length}`, 20, 58);
  
  // Agrupar por mês
  const byMonth: Record<string, number> = {};
  attendances.forEach((att) => {
    const date = new Date(att.data_hora);
    const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
    byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
  });
  
  let yPos = 66;
  Object.entries(byMonth).forEach(([month, count]) => {
    doc.text(`${month}: ${count} presenças`, 25, yPos);
    yPos += 6;
  });
  
  // Tabela de presenças
  autoTable(doc, {
    startY: yPos + 5,
    head: [["Data/Hora", "Nome", "CPF", "Email", "Curso", "Vínculo", "Status"]],
    body: attendances.map((att) => [
      new Date(att.data_hora).toLocaleString("pt-BR"),
      att.profiles.nome,
      att.profiles.cpf,
      att.profiles.email || "N/A",
      att.profiles.curso || "N/A",
      att.profiles.vinculo || "N/A",
      att.alunos?.status || "N/A",
    ]),
    styles: {
      fontSize: 7,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [255, 204, 0],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 35 },
      2: { cellWidth: 28 },
      3: { cellWidth: 38 },
      4: { cellWidth: 25 },
      5: { cellWidth: 18 },
      6: { cellWidth: 18 },
    },
  });
  
  addFooter(doc, 1);
  
  doc.save(`relatorio-presencas-${new Date().getTime()}.pdf`);
};

export const generateStudentsReport = async (students: StudentRecord[]) => {
  const doc = new jsPDF();
  
  addHeader(doc, "Relatório de Alunos");
  
  // Estatísticas gerais
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Estatísticas Gerais", 20, 50);
  
  doc.setFontSize(10);
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === "ativo").length;
  const avgFrequency = students.reduce((sum, s) => sum + s.frequencia_total, 0) / totalStudents;
  
  doc.text(`Total de alunos: ${totalStudents}`, 20, 58);
  doc.text(`Alunos ativos: ${activeStudents}`, 20, 64);
  doc.text(`Média de frequência: ${avgFrequency.toFixed(1)} presenças`, 20, 70);
  
  // Por vínculo
  const byVinculo: Record<string, number> = {};
  students.forEach((s) => {
    byVinculo[s.tipo_vinculo] = (byVinculo[s.tipo_vinculo] || 0) + 1;
  });
  
  let yPos = 78;
  doc.setFontSize(11);
  doc.text("Distribuição por vínculo:", 20, yPos);
  yPos += 6;
  doc.setFontSize(10);
  Object.entries(byVinculo).forEach(([vinculo, count]) => {
    const labels: Record<string, string> = {
      aluno: "Alunos",
      servidor: "Servidores",
      externo: "Terceiros/Externos",
    };
    doc.text(`${labels[vinculo] || vinculo}: ${count}`, 25, yPos);
    yPos += 6;
  });
  
  // Tabela de alunos
  autoTable(doc, {
    startY: yPos + 5,
    head: [["Nome", "CPF", "Vínculo", "Freq. Total", "Status"]],
    body: students.map((s) => [
      s.profiles.nome,
      s.profiles.cpf,
      s.tipo_vinculo === "aluno" ? "Aluno" : s.tipo_vinculo === "servidor" ? "Servidor" : "Terceiro",
      `${s.frequencia_total}`,
      s.status,
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [255, 204, 0],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
    },
  });
  
  addFooter(doc, 1);
  
  doc.save(`relatorio-alunos-${new Date().getTime()}.pdf`);
};

export const generateMonthlyReport = async (
  students: StudentRecord[],
  attendances: AttendanceRecord[]
) => {
  const doc = new jsPDF();
  
  addHeader(doc, "Relatório Mensal");
  
  const now = new Date();
  const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Período: ${monthName}`, 20, 50);
  
  // Filtrar presenças do mês atual
  const monthlyAttendances = attendances.filter((att) => {
    const date = new Date(att.data_hora);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  
  // Estatísticas
  doc.setFontSize(11);
  doc.text("Estatísticas do Mês", 20, 60);
  
  doc.setFontSize(10);
  doc.text(`Total de alunos: ${students.length}`, 20, 68);
  doc.text(`Presenças registradas: ${monthlyAttendances.length}`, 20, 74);
  doc.text(`Média por aluno: ${(monthlyAttendances.length / students.length).toFixed(1)}`, 20, 80);
  
  // Alunos mais frequentes
  const frequencyMap: Record<string, number> = {};
  monthlyAttendances.forEach((att) => {
    const key = att.profiles.nome;
    frequencyMap[key] = (frequencyMap[key] || 0) + 1;
  });
  
  const topStudents = Object.entries(frequencyMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  
  doc.setFontSize(11);
  doc.text("Top 10 Alunos Mais Frequentes", 20, 90);
  
  autoTable(doc, {
    startY: 95,
    head: [["Posição", "Nome", "Presenças"]],
    body: topStudents.map(([nome, freq], index) => [
      `${index + 1}º`,
      nome,
      freq.toString(),
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [255, 204, 0],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });
  
  addFooter(doc, 1);
  
  doc.save(`relatorio-mensal-${now.getMonth() + 1}-${now.getFullYear()}.pdf`);
};

export const generateLowFrequencyReport = async (
  students: StudentRecord[],
  attendances: AttendanceRecord[]
) => {
  const doc = new jsPDF();
  
  addHeader(doc, "Relatório de Baixa Frequência");
  
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Calcular alunos com baixa frequência
  const lowFrequencyStudents = students
    .map((student) => {
      // Contar presenças do mês
      const monthlyAttendances = attendances.filter((att) => {
        const date = new Date(att.data_hora);
        return (
          date >= firstDay &&
          att.profiles.cpf === student.profiles.cpf
        );
      }).length;
      
      // Calcular semanas no mês
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const weeksInMonth = Math.ceil((lastDay.getDate() - firstDay.getDate() + 1) / 7);
      const expectedMonthly = student.frequencia_esperada * weeksInMonth;
      const percentage = expectedMonthly > 0 ? (monthlyAttendances / expectedMonthly) * 100 : 0;
      
      return {
        ...student,
        monthlyAttendances,
        expectedMonthly,
        percentage: Math.round(percentage),
      };
    })
    .filter((s) => s.percentage < 70)
    .sort((a, b) => a.percentage - b.percentage);
  
  // Estatísticas
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Alunos com Frequência Abaixo de 70%", 20, 50);
  
  doc.setFontSize(10);
  doc.setTextColor(220, 38, 38); // vermelho
  doc.text(`⚠ Total de alunos em risco: ${lowFrequencyStudents.length}`, 20, 58);
  
  doc.setTextColor(0, 0, 0);
  doc.text(`Percentual do total: ${((lowFrequencyStudents.length / students.length) * 100).toFixed(1)}%`, 20, 64);
  
  // Tabela
  autoTable(doc, {
    startY: 72,
    head: [["Nome", "CPF", "Esperado", "Registrado", "Frequência", "Status"]],
    body: lowFrequencyStudents.map((s) => [
      s.profiles.nome,
      s.profiles.cpf,
      `${s.expectedMonthly}`,
      `${s.monthlyAttendances}`,
      `${s.percentage}%`,
      s.percentage < 50 ? "CRÍTICO" : "ATENÇÃO",
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [254, 242, 242],
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 35 },
      2: { cellWidth: 22 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
    },
    didParseCell: (data) => {
      if (data.column.index === 5 && data.cell.raw === "CRÍTICO") {
        data.cell.styles.textColor = [220, 38, 38];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  
  // Recomendações
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  doc.setFontSize(11);
  doc.text("Recomendações", 20, finalY + 10);
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const recommendations = [
    "• Entrar em contato com os alunos listados",
    "• Investigar motivos da baixa frequência",
    "• Aplicar bloqueio conforme política (3 meses para <70%)",
    "• Oferecer suporte e orientação aos alunos",
  ];
  
  let yPos = finalY + 16;
  recommendations.forEach((rec) => {
    doc.text(rec, 20, yPos);
    yPos += 6;
  });
  
  addFooter(doc, 1);
  
  doc.save(`relatorio-baixa-frequencia-${new Date().getTime()}.pdf`);
};
