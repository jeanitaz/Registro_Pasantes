import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, FileCheck,
    Users,
    LogOut, LayoutGrid, Bell,
    CheckCircle2, ChevronRight, 
    KeyRound, X // Nuevos iconos
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

// Nueva interfaz para Alertas
interface Alerta {
    id: number;
    usuario: string;
    fecha: string;
    tipo: string;
    leido: boolean;
}

const RRHHModern = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPasante, setSelectedPasante] = useState<Pasante | null>(null);
    const [pasantes, setPasantes] = useState<Pasante[]>([]);
    
    // --- ESTADO DE ALERTAS ---
    const [alertas, setAlertas] = useState<Alerta[]>([]);

    // 1. CARGA DE PASANTES (Tu lógica existente)
    useEffect(() => {
        const fetchPasantes = async () => {
            try {
                const response = await fetch('http://localhost:3001/pasantes');
                if (response.ok) {
                    const data = await response.json();
                    const pasantesAdaptados = data.map((p: any) => ({
                        id: p.id || Math.random(),
                        nombre: p.nombre || `${p.nombres} ${p.apellidos}`, 
                        cedula: p.cedula,
                        carrera: p.carrera,
                        estado: p.estado || "Pendiente Doc.",
                        progresoHoras: p.progresoHoras || 0,
                        faltas: p.faltas || 0,
                        atrasos: p.atrasos || 0,
                        llamadosAtencion: p.llamadosAtencion || 0,
                        fechasFaltas: p.fechasFaltas || [],
                        documentos: p.documentos || [
                            { id: 'd1', nombre: 'Hoja de Vida', validado: false },
                            { id: 'd2', nombre: 'Carta de Solicitud', validado: false },
                            { id: 'd3', nombre: 'Acuerdo de Confidencialidad', validado: false },
                            { id: 'd4', nombre: 'Copia de Cédula', validado: false },
                        ],
                        informeFinalSubido: p.informeFinalSubido || false
                    }));
                    setPasantes(pasantesAdaptados);
                }
            } catch (error) {
                console.error("Error loading interns:", error);
            }
        };
        fetchPasantes();
    }, []);

    // 2. SISTEMA DE MONITORIZACIÓN DE ALERTAS (POLLING)
    useEffect(() => {
        const revisarBuzon = () => {
            const buzón = localStorage.getItem('alertasRRHH');
            if (buzón) {
                const listaAlertas: Alerta[] = JSON.parse(buzón);
                // Solo mostramos las que existen. Si quieres persistencia, no las borres del state
                setAlertas(listaAlertas);
            }
        };

        // Revisar inmediatamente y luego cada 2 segundos
        revisarBuzon();
        const intervalo = setInterval(revisarBuzon, 2000);

        return () => clearInterval(intervalo);
    }, []);

    // 3. DESCARTAR ALERTA
    const cerrarAlerta = (id: number) => {
        const nuevasAlertas = alertas.filter(a => a.id !== id);
        setAlertas(nuevasAlertas);
        // Actualizamos el localStorage para que no vuelva a aparecer
        localStorage.setItem('alertasRRHH', JSON.stringify(nuevasAlertas));
    };

    const filteredPasantes = pasantes.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula.includes(searchTerm)
    );

    const toggleDocumento = (docId: string) => {
        // ... (Tu lógica existente)
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
            
            {/* SIDEBAR */}
            <aside className="modern-sidebar">
                <div className="sidebar-header">
                    <div className="logo-box"><Users size={24} /></div>
                    <span className="logo-text">HR Portal</span>
                </div>

                <div className="nav-links">
                    <button className="nav-item active">
                        <div className="nav-icon"><LayoutGrid size={20}/></div>
                        <span>Dashboard</span>
                    </button>
                    
                    {/* Botón Alertas con indicador rojo si hay pendientes */}
                    <button className="nav-item" onClick={() => navigate('/historialAlertas')}>
                        <div className="nav-icon" style={{position: 'relative'}}>
                            <Bell size={20}/>
                            {alertas.length > 0 && <span className="notification-dot"></span>}
                        </div>
                        <span>Alertas</span>
                    </button>

                    <button className="nav-item" onClick={() => navigate('/Registro')}>
                        <div className="nav-icon"><Users size={20}/></div>
                        <span>Creacion Pasante</span>
                    </button>
                    <button className="nav-item" onClick={() => navigate('/historialP')}>
                        <div className="nav-icon"><Users size={20}/></div>
                        <span>Historial Pasante</span>
                    </button>

                    <div className="nav-separator"></div>

                    <button onClick={handleLogout} className="nav-item logout-item">
                        <div className="nav-icon"><LogOut size={20}/></div>
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* LISTA (Tu código existente) */}
            <section className={`list-panel ${selectedPasante ? 'hidden-mobile' : ''}`}>
                <div className="list-header">
                    <h2>Estudiantes</h2>
                    <span className="badge-count">{filteredPasantes.length} Activos</span>
                </div>
                <div className="search-wrapper">
                    <Search size={16} className="search-icon" />
                    <input type="text" placeholder="Buscar por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="student-list">
                    {filteredPasantes.map(pasante => (
                        <div key={pasante.id} onClick={() => setSelectedPasante(pasante)} className={`student-item ${selectedPasante?.id === pasante.id ? 'active' : ''}`}>
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

            {/* DETALLE PRINCIPAL */}
            <main className={`main-area ${!selectedPasante ? 'hidden-mobile' : ''}`}>
                
                {/* --- CONTENEDOR DE ALERTAS FLOTANTES (TOASTS) --- */}
                <div className="toast-container">
                    {alertas.map(alerta => (
                        <div key={alerta.id} className="toast-alert">
                            <div className="toast-icon">
                                <KeyRound size={20} />
                            </div>
                            <div className="toast-content">
                                <h4>Solicitud de Acceso</h4>
                                <p><strong>{alerta.usuario}</strong> solicitó recuperar contraseña.</p>
                                <span className="toast-time">{alerta.fecha}</span>
                            </div>
                            <button className="toast-close" onClick={() => cerrarAlerta(alerta.id)}>
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                {selectedPasante ? (
                    /* Tu contenido de detalle existente */
                    <div className="fade-in">
                        <button className="mobile-back-btn" onClick={() => setSelectedPasante(null)}>← Volver a la lista</button>
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
                            <div className="kpi-column">
                                <div className="card kpi-card">
                                    <div className="kpi-icon-bg bg-blue"><FileCheck size={20} /></div>
                                    <div><span className="kpi-label">Documentación</span><div className="kpi-value-row"><span className="kpi-number">{calcularProgresoDocs().toFixed(0)}%</span></div></div>
                                </div>
                                {/* Resto de tus KPIs... */}
                            </div>
                            <div className="card list-card">
                                {/* Checklist... */}
                                <div className="card-header-row"><h3>Checklist Documental</h3></div>
                                <div className="activity-list">
                                    {selectedPasante.documentos.map(doc => (
                                        <div key={doc.id} className="activity-item hover-trigger">
                                            <div className="check-trigger" onClick={() => toggleDocumento(doc.id)}>
                                                {doc.validado ? <CheckCircle2 size={20} className="text-green" /> : <div className="circle-empty" />}
                                            </div>
                                            <div className="activity-info">
                                                <span className={`act-type ${doc.validado ? 'text-strikethrough' : ''}`}>{doc.nombre}</span>
                                                <span className="act-detail">{doc.validado ? 'Verificado' : 'Pendiente de validación'}</span>
                                            </div>
                                        </div>
                                    ))}
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