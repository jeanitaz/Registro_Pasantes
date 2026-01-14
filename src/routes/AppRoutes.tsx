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
import SeguridadHome from "../pages/SeguridadHome";
import ProtectedRoute from "../components/ProtectedRoute";

const AppRoutes = () => {
    return (
        <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/Registro" element={<CreacionPasante />} />

            {/* Rutas Protegidas - Administrador */}
            <Route element={<ProtectedRoute allowedRoles={['Administrador']} />}>
                <Route path="/admin" element={<AdminHome />} />
                <Route path="/usuarios" element={<CreacionUsuarios />} />
                <Route path="/historial" element={<HistorialUsuarios />} />
                <Route path="/historialAlertas" element={<HistorialAlertas />} />
            </Route>

            {/* Rutas Protegidas - RR.HH. / Talento Humano */}
            <Route element={<ProtectedRoute allowedRoles={['Administrador', 'RR.HH.', 'Talento Humano']} />}>
                <Route path="/rrhh" element={<RRHHHome />} />
                <Route path="/historialP" element={<HistorialPasantes />} />
                <Route path="/documentacion/:idPasante" element={<Documentacion />} />
            </Route>

            {/* Rutas Protegidas - Seguridad */}
            <Route element={<ProtectedRoute allowedRoles={['Administrador', 'Seguridad']} />}>
                <Route path="/seguridad" element={<SeguridadHome />} />
            </Route>

            {/* Rutas Protegidas - Pasante */}
            <Route element={<ProtectedRoute allowedRoles={['Pasante']} />}>
                <Route path="/pasante" element={<PasanteHome />} />
                <Route path="/horas" element={<RegistroHoras />} />
            </Route>
        </Routes>
    )
}

export default AppRoutes;

