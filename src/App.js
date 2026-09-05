import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/layout/Header.jsx";
import Footer from "./components/layout/Footer.jsx";
import Home from "./pages/public/Home.jsx";
import Services from "./pages/public/Services.jsx";
import Contact from "./pages/public/Contact.jsx";
import Login from "./pages/public/Login.jsx";
import AdminDashboard from "./pages/admin/Admin_Dashboard.jsx";
import RegistrarDashboard from "./pages/registrar/RegistrarDashboard.jsx";
import EditUser from "./pages/admin/EditUser.jsx";
import EditDepartment from "./pages/admin/EditDepartment.jsx";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import HeadDashboard from "./pages/head/HeadDashboard.jsx";
import StudentRegistration from "./pages/registrar/StudentRegistration.jsx";
import AssignHead from "./pages/admin/AssignHead.jsx";
import MissingScoresForm from "./pages/registrar/MissingScoresForm.jsx";

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
