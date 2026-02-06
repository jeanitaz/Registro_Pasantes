import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';
import {
    LayoutTemplate, Users, FileText,
    LogOut, Download, Briefcase,
    ShieldCheck, Clock, AlertTriangle, Key, UserPlus, Trash2, CheckCircle
} from 'lucide-react';
import '../styles/AdminHome.css';

// Updated interface to match the backend response
interface LogItem {
    id: number;
    nombre: string;      // Responsable (e.g., "Guardia1", "Sistema")
    rol: string;         // Acción (e.g., "Atraso Registrado")
    descripcion: string; // Detalle (e.g., "Juan Perez llegó tarde...")
    fecha: string;
}

const AdminHome = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<LogItem[]>([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                // Fetch latest 20 audit logs
                const response = await fetch('http://localhost:3001/auditoria?limit=20', { cache: 'no-store' });
                if (response.ok) {
                    const data = await response.json();
                    setLogs(data);
                }
            } catch (error) { console.error(error); }
        };
        
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000); // Live update
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
            let filename = '';
            let dataToExport: any[] = [];

            if (type === 'pasantes') {
                endpoint = '/pasantes';
                filename = 'Reporte_Pasantes';
            } else if (type === 'rrhh') {
                endpoint = '/usuarios';
                filename = 'Reporte_Personal';
            } else if (type === 'auditoria') {
                endpoint = '/auditoria?limit=1000';
                filename = 'Reporte_Auditoria_Completa';
            }

            const res = await fetch(`http://localhost:3001${endpoint}`);
            const rawData = await res.json();

            // Format data for Excel based on type
            if (type === 'auditoria') {
                dataToExport = rawData.map((log: LogItem) => ({
                    ID: log.id,
                    Accion: log.rol,
                    Detalle: log.descripcion,
                    Responsable: log.nombre,
                    Fecha: new Date(log.fecha).toLocaleString()
                }));
            } else {
                dataToExport = rawData; // Default for others
            }
            
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            
            // Auto-width columns (simple estimation)
            const wscols = Object.keys(dataToExport[0] || {}).map(() => ({ wch: 25 }));
            ws['!cols'] = wscols;

            XLSX.utils.book_append_sheet(wb, ws, "Reporte");
            XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
            
            setShowModal(false);
        } catch (e) { 
            alert("Error generando reporte. Verifique la conexión."); 
        }
    };

    // Helper: Select Icon based on Action Type
    const getActionIcon = (action: string) => {
        const lower = action.toLowerCase();
        if (lower.includes('atraso')) return <Clock size={18} color="#EF4444" />;
        if (lower.includes('retiro')) return <LogOut size={18} color="#F59E0B" />;
        if (lower.includes('clave') || lower.includes('contraseña')) return <Key size={18} color="#3B82F6" />;
        if (lower.includes('creación') || lower.includes('creacion')) return <UserPlus size={18} color="#10B981" />;
        if (lower.includes('eliminación')) return <Trash2 size={18} color="#6B7280" />;
        if (lower.includes('finalizado') || lower.includes('atención')) return <AlertTriangle size={18} color="#DC2626" />;
        if (lower.includes('documentación') || lower.includes('informe')) return <CheckCircle size={18} color="#8B5CF6" />;
        return <FileText size={18} color="#64748B" />;
    };

    // Helper: Badge Style based on Action Type
    const getBadgeStyle = (action: string) => {
        const lower = action.toLowerCase();
        if (lower.includes('atraso') || lower.includes('retiro')) return { bg: '#FEF2F2', text: '#EF4444' }; // Red
        if (lower.includes('creación') || lower.includes('documentación')) return { bg: '#ECFDF5', text: '#059669' }; // Green
        if (lower.includes('clave') || lower.includes('estado')) return { bg: '#EFF6FF', text: '#3B82F6' }; // Blue
        if (lower.includes('finalizado') || lower.includes('atención')) return { bg: '#FFF1F2', text: '#BE123C' }; // Dark Red
        return { bg: '#F3F4F6', text: '#4B5563' }; // Gray
    };

    return (
        <div className="admin-home-scope">
            <div className="modern-layout">

                {/* SIDEBAR FLOTANTE */}
                <aside className="sidebar-floating">
                    <div className="brand">
                        INAMHI <span>Pasantes</span>
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
                            <div>Admin</div>
                            <div>Diego Gonzalez</div>
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
                    </div>

                    {/* LISTA DE AUDITORÍA AVANZADA */}
                    <div className="audit-container">
                        <div className="audit-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3><ShieldCheck size={18} style={{ display: 'inline', marginBottom: '-3px' }} /> Actividad Reciente</h3>
                                <span style={{ fontSize: '0.8rem', color: '#8898aa' }}>Registro de eventos en tiempo real</span>
                            </div>
                            <button
                                onClick={() => handleDownload('auditoria')}
                                style={{
                                    border: 'none', background: '#f1f5f9', color: '#64748b',
                                    padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                                    fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px'
                                }}
                                title="Descargar Historial Completo"
                            >
                                <Download size={14} /> Exportar Todo
                            </button>
                        </div>

                        <div className="audit-list">
                            {logs.length > 0 ? logs.map((log, i) => {
                                const style = getBadgeStyle(log.rol);
                                return (
                                    <div key={i} className="log-stripe">
                                        <div className="log-info">
                                            {/* Icono Dinámico */}
                                            <div className="log-avatar" style={{ background: '#F8FAFC' }}>
                                                {getActionIcon(log.rol)}
                                            </div>
                                            
                                            <div className="log-details">
                                                <div style={{ fontWeight: '700', color: '#1e293b' }}>{log.rol}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                                                    {log.descripcion}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                                                    Responsable: <strong>{log.nombre}</strong>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="log-meta">
                                            <span 
                                                className="badge-pill" 
                                                style={{ 
                                                    backgroundColor: style.bg, 
                                                    color: style.text,
                                                    border: (style as any).border || 'none'
                                                }}
                                            >
                                                {log.rol.split(' ')[0]}
                                            </span>
                                            <span className="time-stamp">
                                                <Clock size={12} style={{ marginRight: '4px', marginBottom: '-2px' }} />
                                                {new Date(log.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                <br />
                                                <span style={{fontSize:'0.7em'}}>{new Date(log.fecha).toLocaleDateString()}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <p style={{ textAlign: 'center', color: '#8898aa', padding: '20px' }}>
                                    No hay actividad reciente registrada aún.
                                </p>
                            )}
                        </div>
                    </div>

                </main>

                {/* MODAL */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-white" onClick={e => e.stopPropagation()}>
                            <h2 style={{ margin: 0, color: '#32325d' }}>Descargar Datos</h2>
                            <p style={{ color: '#8898aa', marginBottom: '20px' }}>Seleccione formato de reporte</p>

                            <div className="modal-grid">
                                <div className="modal-option" onClick={() => handleDownload('pasantes')}>
                                    <Briefcase size={32} />
                                    <span>Pasantes</span>
                                </div>
                                <div className="modal-option" onClick={() => handleDownload('rrhh')}>
                                    <Users size={32} />
                                    <span>Personal</span>
                                </div>
                                <div className="modal-option" onClick={() => handleDownload('auditoria')} style={{gridColumn: 'span 2'}}>
                                    <ShieldCheck size={32} />
                                    <span>Auditoría Completa</span>
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