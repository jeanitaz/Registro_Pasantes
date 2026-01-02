import { useNavigate } from 'react-router-dom';
import '../styles/AdminHome.css';

const AdminHome = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        console.log("Cerrando sesión...");
        navigate('/login');
    };

    return (
        <div className="sophisticated-wrapper">
            
            {/* LUCES AMBIENTALES (Ahora se mueven y son visibles) */}
            <div className="ambient-light light-1"></div>
            <div className="ambient-light light-2"></div>

            {/* --- SIDEBAR --- */}
            <aside className="glass-sidebar">
                <div className="sidebar-brand">
                    <div className="brand-logo">I</div>
                    <span className="brand-text">INAMHI <small>Manager</small></span>
                </div>

                {/* GRUPO 1 */}
                <div className="menu-group">
                    <p className="menu-label">Main</p>
                    <a href="#" className="menu-item active">Dashboard</a>
                    <a href="#" className="menu-item">Analíticas</a>
                    <a href="#" className="menu-item">Reportes</a>
                </div>

                {/* GRUPO 2 */}
                <div className="menu-group">
                    <p className="menu-label">Administración</p>
                    <a href="/historial" className="menu-item">Usuarios</a>
                    <a href="/historialP" className="menu-item">Pasantes</a>
                    <a href="#" className="menu-item warning">Edición Directa</a>
                </div>

                {/* BOTÓN DE LOGOUT */}
                <div className="menu-group session-group">
                    <p className="menu-label">Sesión</p>
                    <button className="btn-logout" onClick={handleLogout}>
                        <span>⏻</span> Cerrar Sesión
                    </button>
                </div>

                {/* PERFIL */}
                <div className="sidebar-profile-wrapper">
                    <div className="sidebar-profile">
                        <div className="profile-pic">AD</div>
                        <div className="profile-info">
                            <span className="name">Admin. Principal</span>
                            <span className="status">● Conectado</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* --- CONTENIDO PRINCIPAL --- */}
            <main className="main-view">
                <header className="glass-header">
                    <div className="header-title">
                        <h1>Vista General</h1>
                        <p>Bienvenido al sistema de control centralizado.</p>
                    </div>
                    <div className="header-actions">
                        <span className="system-status">Estado: <strong>Óptimo</strong></span>
                        <button className="btn-glow">Exportar Datos</button>
                    </div>
                </header>

                <div className="sophisticated-grid">
                    
                    {/* Tarjeta Usuarios */}
                    <div className="glass-card wide-card users-module" onClick={() => navigate('/usuarios')}>
                        <div className="card-content">
                            <div className="icon-box blue">👥</div>
                            <div className="text-content">
                                <h3>Gestión de Usuarios</h3>
                                <p>Administración total de roles y accesos.</p>
                            </div>
                            <button className="action-arrow">→</button>
                        </div>
                    </div>

                    {/* Tarjeta Configuración */}
                    <div className="glass-card config-module">
                        <div className="card-top">
                            <div className="icon-box purple">⚙️</div>
                            <button className="dots">•••</button>
                        </div>
                        <h3>Configuración</h3>
                        <p>Parámetros y reglas.</p>
                    </div>

                    {/* Tarjeta Reportes */}
                    <div className="glass-card reports-module">
                        <div className="card-top">
                            <div className="icon-box cyan">📊</div>
                            <span className="tag">PDF</span>
                        </div>
                        <h3>Reportes</h3>
                        <p>Auditoría de asistencia.</p>
                    </div>

                    {/* Tarjeta Peligro */}
                    <div className="glass-card danger-module">
                        <div className="card-content">
                            <div className="icon-box red">⚠️</div>
                            <div className="text-content">
                                <h3>Modificación Directa</h3>
                                <p>Edición excepcional de base de datos.</p>
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta LOGS con INDICADOR EN VIVO */}
                    <div className="glass-card log-module">
                        <div className="module-header">
                            <h3>Log de Auditoría</h3>
                            <div className="live-status">En vivo</div>
                        </div>
                        <ul className="log-list">
                            <li><span className="time">10:42</span><span className="msg">Nuevo usuario registrado [ID: 849].</span></li>
                            <li><span className="time">10:15</span><span className="msg">Actualización de reglas de firewall.</span></li>
                            <li><span className="time">09:50</span><span className="msg">Exportación masiva iniciada por Admin.</span></li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminHome;