import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import AdminDashboard from "./pages/Admin_Dashboard";
import RegistrarDashboard from "./pages/RegistrarDashboard";
import EditUser from "./pages/EditUser";
import EditDepartment from "./components/EditDepartment";
import StudentDashboard from "./pages/StudentDashboard";
import HeadDashboard from "./pages/HeadDashboard";
import StudentRegistration from "./pages/StudentRegistration";
import AssignHead from "./components/AssignHead";
import MissingScoresForm from "./components/MissingScoresForm";
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost/placment_backend/', // ያንተ Path
  withCredentials: true // ይህ በጣም አስፈላጊ ነው ሴሽኑ እንዲሰራ
});
function AppRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin-dashboard') || location.pathname.startsWith('/registrar-dashboard') || location.pathname.startsWith('/head-dashboard') || location.pathname.startsWith('/student-dashboard') || location.pathname.startsWith('/edit-user') || location.pathname.startsWith('/edit-department') || location.pathname.startsWith('/admin/assign-head');

  return (
    <>
      <Header />
      <main className={`app-main ${isAdmin ? 'dashboard-main' : 'container pt-0'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/registrar-dashboard" element={<RegistrarDashboard />} />
          <Route path="/student-registration" element={<StudentRegistration />} />
          <Route path="/student-score-form/:studentId" element={<MissingScoresForm />} />
          <Route path="/head-dashboard" element={<HeadDashboard />} />
          <Route path="/admin/assign-head" element={<AssignHead />} />
          <Route path="/edit-user/:id" element={<EditUser />} />
          <Route path="/edit-department/:id" element={<EditDepartment />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
