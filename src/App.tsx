import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Scanner from "./pages/Scanner";
import AttendanceHistory from "./pages/AttendanceHistory";
import StudentWorkouts from "./pages/StudentWorkouts";
import AdminStudents from "./pages/AdminStudents";
import AdminQRCode from "./pages/AdminQRCode";
import AdminAttendance from "./pages/AdminAttendance";
import AdminAttendanceRecords from "./pages/AdminAttendanceRecords";
import AdminWorkouts from "./pages/AdminWorkouts";
import AdminReports from "./pages/AdminReports";
import AdminBlocking from "./pages/AdminBlocking";
import InstallPWA from "./pages/InstallPWA";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/attendance" element={<AttendanceHistory />} />
          <Route path="/workouts" element={<StudentWorkouts />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/install" element={<InstallPWA />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/qrcode" element={<AdminQRCode />} />
          <Route path="/admin/attendance" element={<AdminAttendance />} />
          <Route path="/admin/attendance-records" element={<AdminAttendanceRecords />} />
          <Route path="/admin/workouts" element={<AdminWorkouts />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/blocking" element={<AdminBlocking />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
