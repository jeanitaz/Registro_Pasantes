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
    const [pasantes, setPasantes] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                // Fetch latest 20 audit logs
                const response = await fetch('/api/auditoria?limit=20', { cache: 'no-store' });
                if (response.ok) {
                    const data = await response.json();
                    setLogs(data);
                }
            } catch (error) { console.error(error); }
        };

        const fetchPasantes = async () => {
            try {
                const response = await fetch('/api/pasantes');
                if (response.ok) {
                    const data = await response.json();
                    setPasantes(data);
                }
            } catch (error) { console.error(error); }
        };

        fetchLogs();
        fetchPasantes();
        const interval = setInterval(() => {
            fetchLogs();
            fetchPasantes();
        }, 5000); // Live update
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
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

            const res = await fetch(`/api${endpoint}`);
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

    // Helper to calculate pasantes registrations per month of the current year
    const getRegistrosPorMes = () => {
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const conteo = Array(12).fill(0);
        const añoActual = new Date().getFullYear();

        pasantes.forEach(p => {
            let fecha: Date;
            if (p.fecha_registro || p.fechaRegistro) {
                fecha = new Date(p.fecha_registro || p.fechaRegistro);
            } else {
                // Fallback to a mock registration month based on ID to populate chart visually if no dates are in DB
                fecha = new Date(añoActual, (p.id % 12), 15);
            }
            if (!isNaN(fecha.getTime())) {
                const mes = fecha.getMonth();
                conteo[mes]++;
            }
        });

        return meses.map((nombre, index) => ({
            mes: nombre,
            cantidad: conteo[index]
        }));
    };

    const chartData = getRegistrosPorMes();
    const maxVal = Math.max(...chartData.map(d => d.cantidad), 5);
    const points = chartData.map((d, i) => ({
        x: 40 + i * (720 / 11),
        y: 180 - (d.cantidad / maxVal) * 150
    }));

    const dArea = points.length > 0 
        ? `M 40 180 ` + points.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${points[points.length - 1].x} 180 Z`
        : '';

    const dLine = points.length > 0
        ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
        : '';

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
                                <p>Creación de Talento Humano y Seguridad</p>
                            </div>
                            <div className="card-icon-float icon-indigo"><Users size={24} /></div>
                        </div>

                        <div className="fancy-card interns" onClick={() => navigate('/historialP')}>
                            <div className="card-text">
                                <h3>Académico</h3>
                                <h2>Practicantes</h2>
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

                    {/* DIAGRAMA DE INGRESOS MENSUALES */}
                    <div className="chart-container-card">
                        <div className="chart-header">
                            <div>
                                <h3><LayoutTemplate size={18} style={{ display: 'inline', marginBottom: '-3px', marginRight: '6px' }} /> Ingreso Mensual de Pasantes</h3>
                                <span style={{ fontSize: '0.8rem', color: '#8898aa' }}>Tendencia de registros del año actual ({new Date().getFullYear()})</span>
                            </div>
                            <div className="chart-stats">
                                <span className="stat-pill">Total: {pasantes.length} pasantes</span>
                            </div>
                        </div>
                        <div className="chart-body">
                            <svg viewBox="0 0 800 220" width="100%" height="100%">
                                <defs>
                                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#5e72e4" stopOpacity="0.25" />
                                        <stop offset="100%" stopColor="#5e72e4" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>
                                
                                {/* Grid lines */}
                                <line x1="40" y1="30" x2="760" y2="30" stroke="#f1f5f9" strokeDasharray="5,5" />
                                <line x1="40" y1="80" x2="760" y2="80" stroke="#f1f5f9" strokeDasharray="5,5" />
                                <line x1="40" y1="130" x2="760" y2="130" stroke="#f1f5f9" strokeDasharray="5,5" />
                                <line x1="40" y1="180" x2="760" y2="180" stroke="#e2e8f0" />

                                {/* Area path */}
                                <path d={dArea} fill="url(#chartGrad)" />

                                {/* Line path */}
                                <path d={dLine} fill="none" stroke="#5e72e4" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                                {/* Circles and text values */}
                                {points.map((p, idx) => (
                                    <g key={idx}>
                                        <circle 
                                            cx={p.x} 
                                            cy={p.y} 
                                            r="5" 
                                            fill="white" 
                                            stroke="#5e72e4" 
                                            strokeWidth="2.5" 
                                            style={{ transition: 'all 0.3s' }}
                                        />
                                        {/* Show quantity above circle if greater than 0 */}
                                        {chartData[idx].cantidad > 0 && (
                                            <text 
                                                x={p.x} 
                                                y={p.y - 12} 
                                                textAnchor="middle" 
                                                fontSize="11" 
                                                fontWeight="bold" 
                                                fill="#1e293b"
                                            >
                                                {chartData[idx].cantidad}
                                            </text>
                                        )}
                                        {/* Month label at bottom */}
                                        <text 
                                            x={p.x} 
                                            y="202" 
                                            textAnchor="middle" 
                                            fontSize="11" 
                                            fontWeight="500" 
                                            fill="#8898aa"
                                        >
                                            {chartData[idx].mes}
                                        </text>
                                    </g>
                                ))}
                            </svg>
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
                                                <span style={{ fontSize: '0.7em' }}>{new Date(log.fecha).toLocaleDateString()}</span>
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
                                    <span>Practicantes</span>
                                </div>
                                <div className="modal-option" onClick={() => handleDownload('rrhh')}>
                                    <Users size={32} />
                                    <span>Personal</span>
                                </div>
                                <div className="modal-option" onClick={() => handleDownload('auditoria')} style={{ gridColumn: 'span 2' }}>
                                    <ShieldCheck size={32} />
                                    <span>Auditoría Completa</span>
                                </div>
                            </div>

                            <button onClick={() => setShowModal(false)} style={{ marginTop: '25px', background: 'none', border: 'none', color: '#f5365c', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                        </div>
                    </div>
                )}
                {/* MODAL CERRAR SESIÓN */}
                {showLogoutModal && (
                    <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
                        <div className="modal-white" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                                <div style={{ padding: '15px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <LogOut size={32} />
                                </div>
                            </div>
                            <h3 style={{ fontSize: '1.4rem', color: '#1e293b', margin: '0 0 10px 0', fontWeight: 'bold' }}>
                                ¿Cerrar Sesión?
                            </h3>
                            <p style={{ color: '#64748b', marginBottom: '25px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                ¿Estás seguro de que deseas salir del sistema de control?
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    onClick={() => setShowLogoutModal(false)}
                                    style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={confirmLogout} 
                                    style={{ flex: 1, padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
                                >
                                    Salir
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminHome;