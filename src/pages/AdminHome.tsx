import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminHome.css';

// Interfaz para los datos que vienen del backend
interface LogItem {
    id: number;
    nombre: string;
    rol: string;
    fecha: string;
}

const AdminHome = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<LogItem[]>([]);

    // Cargar logs al inicio y cada 5 segundos
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch('http://localhost:3001/auditoria');
                if (response.ok) {
                    const data = await response.json();
                    setLogs(data);
                }
            } catch (error) {
                console.error("Error cargando auditoría:", error);
            }
        };

        fetchLogs(); // Primera carga
        
        // Polling para efecto "En vivo"
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        if (window.confirm("¿Deseas cerrar tu sesión?")) {
            navigate('/login');
        }
    };

    // Formatear la hora (ej: 10:42)
    const formatearHora = (fechaISO: string) => {
        if (!fechaISO) return '--:--';
        const fecha = new Date(fechaISO);
        return fecha.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="sophisticated-wrapper">
            
            {/* LUCES AMBIENTALES */}
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
                    <button onClick={() => navigate('/historial')} className="menu-item link-btn">Usuarios</button>
                    <button onClick={() => navigate('/historialP')} className="menu-item link-btn">Pasantes</button>
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
                    <div className="glass-card wide-card users-module" onClick={() => navigate('/historial')} style={{cursor: 'pointer'}}>
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

                    {/* Tarjeta LOGS con DATOS REALES */}
                    <div className="glass-card log-module">
                        <div className="module-header">
                            <h3>Log de Auditoría</h3>
                            <div className="live-status">
                                <span className="blink-dot">●</span> En vivo
                            </div>
                        </div>
                        <ul className="log-list">
                            {logs.length > 0 ? (
                                logs.map((log, index) => (
                                    <li key={`${log.id}-${index}`}>
                                        <span className="time">{formatearHora(log.fecha)}</span>
                                        <span className="msg">
                                            Nuevo <strong>{log.rol}</strong>: {log.nombre}
                                        </span>
                                    </li>
                                ))
                            ) : (
                                <li style={{padding: '10px', color: '#9ca3af', fontSize: '0.85rem'}}>
                                    Esperando registros recientes...
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminHome;