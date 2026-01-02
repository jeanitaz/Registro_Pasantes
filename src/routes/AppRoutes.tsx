import { Route, Routes } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import AdminHome from "../pages/AdminHome";
import PasanteHome from "../pages/PasanteHome";
import RRHHHome from "../pages/RRHHHome";
const AppRoutes = () => {
    return (
        <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            <Route path="/admin" element={<AdminHome />} />
            <Route path="/rrhh" element={<RRHHHome />} />
            <Route path="/pasante" element={<PasanteHome />} />
        </Routes>
    )
}

export default AppRoutes;