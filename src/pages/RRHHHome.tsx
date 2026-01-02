import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, FileCheck, Upload,
    Users, AlertTriangle, Clock, Ban,
    LogOut, // Icono salir
    LayoutGrid, Settings, Bell,
    CheckCircle2, ChevronRight, FileText
} from 'lucide-react';
import '../styles/RRHHHome.css';

interface Documento {
    id: string;
    nombre: string;
    validado: boolean;
}

interface Pasante {
    id: number;
    nombre: string;
    cedula: string;
    carrera: string;
    estado: string;
    progresoHoras: number;
    faltas: number;
    atrasos: number;
    llamadosAtencion: number;
    fechasFaltas: string[];
    documentos: Documento[];
    informeFinalSubido: boolean;
}

const RRHHModern = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPasante, setSelectedPasante] = useState<Pasante | null>(null);

    // --- DATOS MOCK ---
    const [pasantes, setPasantes] = useState<Pasante[]>([
        {
            id: 1, nombre: "Juan Pérez", cedula: "1712345678", carrera: "Desarrollo de Software",
            estado: "Pendiente Doc.", progresoHoras: 20, faltas: 2, atrasos: 3, llamadosAtencion: 1,
            fechasFaltas: ["2024-01-10", "2024-01-15"],
            documentos: [
                { id: 'd1', nombre: 'Hoja de Vida', validado: true },
                { id: 'd2', nombre: 'Carta de Solicitud', validado: true },
                { id: 'd3', nombre: 'Acuerdo de Confidencialidad', validado: false },
                { id: 'd4', nombre: 'Copia de Cédula', validado: true },
            ], informeFinalSubido: false
        },
        {
            id: 2, nombre: "Maria Garcia", cedula: "1798765432", carrera: "Diseño Gráfico",
            estado: "Habilitado", progresoHoras: 80, faltas: 0, atrasos: 0, llamadosAtencion: 0,
            fechasFaltas: [],
            documentos: [
                { id: 'd1', nombre: 'Hoja de Vida', validado: true },
                { id: 'd2', nombre: 'Carta de Solicitud', validado: true },
                { id: 'd3', nombre: 'Acuerdo de Confidencialidad', validado: true },
                { id: 'd4', nombre: 'Copia de Cédula', validado: true },
            ], informeFinalSubido: true
        }
    ]);

    const filteredPasantes = pasantes.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula.includes(searchTerm)
    );

    const toggleDocumento = (docId: string) => {
        if (!selectedPasante) return;
        const updatedPasante = {
            ...selectedPasante,
            documentos: selectedPasante.documentos.map(doc =>
                doc.id === docId ? { ...doc, validado: !doc.validado } : doc
            )
        };
        const todosValidados = updatedPasante.documentos.every(doc => doc.validado);
        updatedPasante.estado = todosValidados ? "Habilitado" : "Pendiente Doc.";
        setSelectedPasante(updatedPasante);
        setPasantes(pasantes.map(p => p.id === updatedPasante.id ? updatedPasante : p));
    };

    const calcularProgresoDocs = () => {
        if (!selectedPasante) return 0;
        const validados = selectedPasante.documentos.filter(d => d.validado).length;
        return (validados / selectedPasante.documentos.length) * 100;
    };

    const handleLogout = () => {
        if(window.confirm("¿Cerrar sesión de administrador?")) {
            localStorage.removeItem('token');
            navigate('/login');
        }
    };

    return (
        <div className="layout-wrapper">
            
            {/* COLUMNA 1: MINI SIDEBAR */}
            <aside className="modern-sidebar">
                <div className="sidebar-header">
                    <div className="logo-box">
                        <Users size={24} />
                    </div>
                    {/* Texto visible al expandir */}
                    <span className="logo-text">HR Portal</span>
                </div>

                <div className="nav-links">
                    <button className="nav-item active">
                        <div className="nav-icon"><LayoutGrid size={20}/></div>
                        <span>Dashboard</span>
                    </button>
                    <button className="nav-item">
                        <div className="nav-icon"><Bell size={20}/></div>
                        <span>Alertas</span>
                    </button>
                    <button className="nav-item">
                        <div className="nav-icon"><Settings size={20}/></div>
                        <span>Ajustes</span>
                    </button>

                    {/* SEPARADOR VISUAL */}
                    <div className="nav-separator"></div>

                    {/* BOTÓN SALIR (Ahora arriba junto a los otros) */}
                    <button onClick={handleLogout} className="nav-item logout-item">
                        <div className="nav-icon"><LogOut size={20}/></div>
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* COLUMNA 2: LISTA DE ESTUDIANTES */}
            <section className={`list-panel ${selectedPasante ? 'hidden-mobile' : ''}`}>
                <div className="list-header">
                    <h2>Estudiantes</h2>
                    <span className="badge-count">{filteredPasantes.length} Activos</span>
                </div>

                <div className="search-wrapper">
                    <Search size={16} className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="student-list">
                    {filteredPasantes.map(pasante => (
                        <div 
                            key={pasante.id}
                            onClick={() => setSelectedPasante(pasante)}
                            className={`student-item ${selectedPasante?.id === pasante.id ? 'active' : ''}`}
                        >
                            <div className="avatar-small">{pasante.nombre.charAt(0)}</div>
                            <div className="student-info">
                                <span className="s-name">{pasante.nombre}</span>
                                <span className="s-career">{pasante.carrera}</span>
                            </div>
                            <ChevronRight size={14} className="chevron" />
                        </div>
                    ))}
                </div>
            </section>

            {/* COLUMNA 3: DETALLE (Visible si hay selección) */}
            <main className={`main-area ${!selectedPasante ? 'hidden-mobile' : ''}`}>
                {selectedPasante ? (
                    <div className="fade-in">
                        {/* Botón volver solo para móvil */}
                        <button className="mobile-back-btn" onClick={() => setSelectedPasante(null)}>
                           ← Volver a la lista
                        </button>

                        <header className="top-header">
                            <div>
                                <h1>{selectedPasante.nombre}</h1>
                                <p className="subtitle">Expediente Digital • C.I. {selectedPasante.cedula}</p>
                            </div>
                            <div className="profile-pill">
                                <div className={`status-dot ${selectedPasante.estado === 'Habilitado' ? 'dot-green' : 'dot-orange'}`}></div>
                                <span>{selectedPasante.estado}</span>
                            </div>
                        </header>

                        <div className="dashboard-grid">
                            
                            {/* KPIs */}
                            <div className="kpi-column">
                                <div className="card kpi-card">
                                    <div className="kpi-icon-bg bg-blue">
                                        <FileCheck size={20} />
                                    </div>
                                    <div>
                                        <span className="kpi-label">Documentación</span>
                                        <div className="kpi-value-row">
                                            <span className="kpi-number">{calcularProgresoDocs().toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`card kpi-card ${selectedPasante.llamadosAtencion > 0 ? 'danger-theme' : ''}`}>
                                    <div className="kpi-icon-bg bg-orange">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <span className="kpi-label">Sanciones</span>
                                        <div className="kpi-value-row">
                                            <span className="kpi-number">{selectedPasante.llamadosAtencion}</span>
                                            <span className="kpi-total">/ 3</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="card kpi-card">
                                    <div className="kpi-icon-bg bg-purple">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <span className="kpi-label">Faltas / Atrasos</span>
                                        <div className="kpi-value-row">
                                            <span className="kpi-number">{selectedPasante.faltas}</span>
                                            <span className="kpi-total">| {selectedPasante.atrasos}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* DOCUMENTOS */}
                            <div className="card list-card">
                                <div className="card-header-row">
                                    <h3>Checklist Documental</h3>
                                    <button className="btn-link">Gestionar</button>
                                </div>
                                <div className="activity-list">
                                    {selectedPasante.documentos.map(doc => (
                                        <div key={doc.id} className="activity-item hover-trigger">
                                            <div className="check-trigger" onClick={() => toggleDocumento(doc.id)}>
                                                {doc.validado 
                                                    ? <CheckCircle2 size={20} className="text-green" /> 
                                                    : <div className="circle-empty" />}
                                            </div>
                                            <div className="activity-info">
                                                <span className={`act-type ${doc.validado ? 'text-strikethrough' : ''}`}>{doc.nombre}</span>
                                                <span className="act-detail">{doc.validado ? 'Verificado' : 'Pendiente de validación'}</span>
                                            </div>
                                            {!doc.validado && (
                                                <button className="icon-btn" title="Subir documento">
                                                    <Upload size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ACCIONES */}
                            <div className="card actions-card">
                                <div className="card-header-row">
                                    <h3>Cierre de Pasantía</h3>
                                </div>
                                
                                <div className="file-status-modern">
                                    <div className={`status-icon-box ${selectedPasante.informeFinalSubido ? 'bg-green-light' : 'bg-gray-light'}`}>
                                        <FileText size={20} />
                                    </div>
                                    <div className="text-box">
                                        <span className="btn-title">Informe Final</span>
                                        <span className="btn-desc">{selectedPasante.informeFinalSubido ? 'Listo para revisión' : 'No entregado'}</span>
                                    </div>
                                    {selectedPasante.informeFinalSubido && <button className="btn-pill">Descargar</button>}
                                </div>

                                <div className="danger-zone-modern">
                                    <span className="danger-label"><Ban size={14}/> Zona de Riesgo</span>
                                    <button className="btn-danger-outline">Dar de Baja</button>
                                </div>
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="empty-state-modern hidden-mobile">
                        <Users size={40} className="empty-icon" />
                        <h3>Selecciona un estudiante</h3>
                        <p>Usa el directorio para ver detalles.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default RRHHModern;