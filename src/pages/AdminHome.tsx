import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';
import {
    LayoutTemplate, Users, FileText,
    Settings, LogOut, Download, Briefcase,
    ShieldCheck, Clock
} from 'lucide-react';
import '../styles/AdminHome.css';

interface LogItem {
    id: number;
    nombre: string;
    rol: string;
    fecha: string;
}

const AdminHome = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<LogItem[]>([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch('http://localhost:3001/auditoria', { cache: 'no-store' });
                if (response.ok) {
                    const data = await response.json();
                    setLogs(data);
                }
            } catch (error) { console.error(error); }
        };
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        if (window.confirm("¿Salir del sistema?")) {
            localStorage.removeItem('token');
            navigate('/login');
        }
    };

    const handleDownload = async (type: 'pasantes' | 'rrhh' | 'auditoria') => {
        try {
            let endpoint = '';
            if (type === 'pasantes') endpoint = '/pasantes';
            else if (type === 'rrhh') endpoint = '/usuarios';
            else if (type === 'auditoria') endpoint = '/auditoria?limit=1000';

            const res = await fetch(`http://localhost:3001${endpoint}`);
            const data = await res.json();
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, "Reporte");
            XLSX.writeFile(wb, `Reporte_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
            setShowModal(false);
        } catch (e) { alert("Error generando reporte"); }
    };

    return (
        /* CLASE CONTENEDORA QUE PROTEGE EL ESTILO */
        <div className="admin-home-scope">
            <div className="modern-layout">

                {/* SIDEBAR FLOTANTE */}
                <aside className="sidebar-floating">
                    <div className="brand">
                        INAMHI <span>APP</span>
                    </div>
                    <nav className="menu-list">
                        <button className="menu-link active"><LayoutTemplate size={18} /> Panel Principal</button>
                        <button className="menu-link" onClick={() => navigate('/historial')}><Users size={18} /> Funcionarios</button>
                        <button className="menu-link" onClick={() => navigate('/historialP')}><Briefcase size={18} /> Pasantes</button>
                        <button className="menu-link" onClick={() => setShowModal(true)}><FileText size={18} /> Reportes</button>
                    </nav>
                    <div className="user-mini">
                        <div className="user-avatar">AD</div>
                        <div className="user-data">
                            <div>Admin User</div>
                            <div>Super Admin</div>
                        </div>
                    </div>
                </aside>

                {/* CONTENIDO PRINCIPAL */}
                <main className="main-wrapper">

                    <header className="header-simple">
                        <div>
                            <h1>Dashboard</h1>
                            <p>Resumen general del sistema de control.</p>
                        </div>
                        <button className="logout-btn-top" onClick={handleLogout}>
                            <LogOut size={18} /> Cerrar Sesión
                        </button>
                    </header>

                    {/* FILA DE TARJETAS */}
                    <div className="cards-row">
                        <div className="fancy-card users" onClick={() => navigate('/usuarios')}>
                            <div className="card-text">
                                <h3>Gestión</h3>
                                <h2>Usuarios</h2>
                                <p>Crear, editar, eliminar roles</p>
                            </div>
                            <div className="card-icon-float icon-indigo"><Users size={24} /></div>
                        </div>

                        <div className="fancy-card interns" onClick={() => navigate('/historialP')}>
                            <div className="card-text">
                                <h3>Académico</h3>
                                <h2>Pasantes</h2>
                                <p>Registro y seguimiento</p>
                            </div>
                            <div className="card-icon-float icon-blue"><Briefcase size={24} /></div>
                        </div>

                        <div className="fancy-card reports" onClick={() => setShowModal(true)}>
                            <div className="card-text">
                                <h3>Datos</h3>
                                <h2>Reportes</h2>
                                <p>Descarga en Excel</p>
                            </div>
                            <div className="card-icon-float icon-green"><Download size={24} /></div>
                        </div>

                        <div className="fancy-card config">
                            <div className="card-text">
                                <h3>Sistema</h3>
                                <h2>Ajustes</h2>
                                <p>Configuración global</p>
                            </div>
                            <div className="card-icon-float icon-orange"><Settings size={24} /></div>
                        </div>
                    </div>

                    {/* LISTA DE AUDITORÍA */}
                    <div className="audit-container">
                        <div className="audit-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3><ShieldCheck size={18} style={{ display: 'inline', marginBottom: '-3px' }} /> Actividad Reciente</h3>
                                <span style={{ fontSize: '0.8rem', color: '#8898aa' }}>Últimos 5 movimientos</span>
                            </div>
                            <button
                                onClick={() => handleDownload('auditoria')}
                                style={{
                                    border: 'none',
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                                title="Descargar Historial Completo"
                            >
                                <Download size={14} /> Exportar
                            </button>
                        </div>

                        <div className="audit-list">
                            {logs.length > 0 ? logs.map((log, i) => (
                                <div key={i} className="log-stripe">
                                    <div className="log-info">
                                        <div className="log-avatar">{log.nombre.charAt(0)}</div>
                                        <div className="log-details">
                                            <div>{log.nombre}</div>
                                            <div>Acción: {log.rol}</div>
                                        </div>
                                    </div>
                                    <div className="log-meta">
                                        <span className={`badge-pill ${log.rol.toLowerCase().includes('admin') ? 'admin' : 'security'}`}>
                                            {log.rol.split(' ')[0]}
                                        </span>
                                        <span className="time-stamp">
                                            <Clock size={12} style={{ marginRight: '4px', marginBottom: '-2px' }} />
                                            {new Date(log.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            )) : <p style={{ textAlign: 'center', color: '#8898aa' }}>No hay actividad reciente.</p>}
                        </div>
                    </div>

                </main>

                {/* MODAL */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-white" onClick={e => e.stopPropagation()}>
                            <h2 style={{ margin: 0, color: '#32325d' }}>Descargar Datos</h2>
                            <p style={{ color: '#8898aa' }}>Seleccione formato de reporte</p>

                            <div className="modal-grid">
                                <div className="modal-option" onClick={() => handleDownload('pasantes')}>
                                    <Briefcase size={32} />
                                    <span>Pasantes</span>
                                </div>
                                <div className="modal-option" onClick={() => handleDownload('rrhh')}>
                                    <Users size={32} />
                                    <span>Personal</span>
                                </div>
                            </div>

                            <button onClick={() => setShowModal(false)} style={{ marginTop: '25px', background: 'none', border: 'none', color: '#f5365c', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminHome;