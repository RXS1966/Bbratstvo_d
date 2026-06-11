import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { CasePage } from "@/pages/CasePage";
import { DiagnosticPage } from "@/pages/DiagnosticPage";
import { ExamPage } from "@/pages/ExamPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { ManagerPage } from "@/pages/ManagerPage";
import { ResultPage } from "@/pages/ResultPage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="diagnostic" element={<DiagnosticPage />} />
              <Route path="case" element={<CasePage />} />
              <Route path="result" element={<ResultPage />} />
              <Route path="exam" element={<ExamPage />} />
              <Route path="manager" element={<ManagerPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
