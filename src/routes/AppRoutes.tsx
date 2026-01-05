import { Route, Routes } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import AdminHome from "../pages/AdminHome";
import PasanteHome from "../pages/PasanteHome";
import RRHHHome from "../pages/RRHHHome";
import CreacionPasante from "../pages/CreacionPasante";
import CreacionUsuarios from "../pages/CreacionUsuarios";
import HistorialUsuarios from "../pages/HistorialUsuarios";
import HistorialPasantes from "../pages/HistorialPasantes";
import HistorialAlertas from "../pages/HistorialAlertas";
import Documentacion from "../pages/Documentacion";
import RegistroHoras from "../pages/RegistroHoras";
const AppRoutes = () => {
    return (
        <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/Registro" element={<CreacionPasante />} />
            <Route path="/historialP" element={<HistorialPasantes/>} />
            <Route path="/usuarios" element={<CreacionUsuarios />} />
            <Route path="/historial" element={<HistorialUsuarios />} />
            <Route path="/historialAlertas" element={<HistorialAlertas />} />
            <Route path="/horas" element={<RegistroHoras />} />
            <Route path="/admin" element={<AdminHome />} />
            <Route path="/rrhh" element={<RRHHHome />} />
            <Route path="/pasante" element={<PasanteHome />} />
            <Route path="/documentacion/:idPasante" element={<Documentacion />} />
        </Routes>
    )
}

export default AppRoutes;