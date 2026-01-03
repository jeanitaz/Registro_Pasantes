import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, FileCheck,
    Users,
    LogOut, LayoutGrid, Bell,
    CheckCircle2,
    KeyRound, X, 
    History,
    AlertTriangle, Clock, FileText, Download, UploadCloud, CalendarX, Eye, ExternalLink 
} from 'lucide-react';
import '../styles/RRHHHome.css'; 

const DOCUMENTOS_REQUERIDOS = [
    "Hoja de Vida",
    "Carta de Solicitud",
    "Acuerdo de Confidencialidad",
    "Copia de Cédula"
];

interface Documento { id: string; nombre: string; validado: boolean; }

interface Pasante { 
    id: number; nombre: string; cedula: string; carrera: string; estado: string; 
    progresoHoras: number; faltas: number; atrasos: number; llamadosAtencion: number; 
    fechasFaltas: string[]; documentos: Documento[]; 
    informeFinalSubido: boolean; 
    informeUrl?: string;
}

interface Alerta { id: number; usuario: string; fecha: string; tipo: string; leido: boolean; }

const ToastItem = ({ alerta, onClose }: { alerta: Alerta; onClose: (id: number) => void }) => {
    useEffect(() => {
        const timer = setTimeout(() => onClose(alerta.id), 10000);
        return () => clearTimeout(timer);
    }, [alerta.id, onClose]);
    return (
        <div className="clean-toast">
            <div className="clean-toast-icon"><KeyRound size={18} /></div>
            <div className="clean-toast-content">
                <h4>Recuperación de Clave</h4>
                <p><strong>{alerta.usuario}</strong> solicitó acceso.</p>
                <span>{alerta.fecha}</span>
            </div>
            <button onClick={() => onClose(alerta.id)}><X size={16} /></button>
        </div>
    );
};

const RRHHModern = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPasante, setSelectedPasante] = useState<Pasante | null>(null);
    const [pasantes, setPasantes] = useState<Pasante[]>([]);
    const [alertas, setAlertas] = useState<Alerta[]>([]);
    const [dismissedIds, setDismissedIds] = useState<number[]>([]);
    
    const [showPdfModal, setShowPdfModal] = useState(false);

    useEffect(() => {
        const fetchPasantes = async () => {
            try {
                const response = await fetch('http://localhost:3001/pasantes');
                if (response.ok) {
                    const data = await response.json();
                    const pasantesAdaptados = data.map((p: any) => ({
                        id: p.id,
                        nombre: p.nombre || `${p.nombres} ${p.apellidos}`, 
                        cedula: p.cedula,
                        carrera: p.carrera,
                        estado: p.estado || "No habilitado", 
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
                        informeFinalSubido: p.informeFinalSubido || false,
                        informeUrl: p.informeUrl 
                    }));
                    setPasantes(pasantesAdaptados);
                }
            } catch (error) { console.error("Error loading interns:", error); }
        };
        fetchPasantes();
    }, []);

    useEffect(() => {
        const revisarBuzon = () => {
            const buzón = localStorage.getItem('alertasRRHH');
            if (buzón) {
                const listaAlertas: Alerta[] = JSON.parse(buzón);
                setAlertas(prev => (JSON.stringify(prev) !== JSON.stringify(listaAlertas)) ? listaAlertas : prev);
            }
        };
        revisarBuzon();
        const intervalo = setInterval(revisarBuzon, 2000);
        return () => clearInterval(intervalo);
    }, []);

    const ocultarToast = (id: number) => setDismissedIds(prev => [...prev, id]);

    const filteredPasantes = pasantes.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula.includes(searchTerm)
    );

    const toggleDocumento = async (docId: string) => {
        if (!selectedPasante) return;

        // --- CAMBIO 1: BLOQUEO DE LÓGICA ---
        // Si el estado es "Activo", impedimos modificar los checks
        if (selectedPasante.estado === 'Activo') {
            return; 
        }
        // ------------------------------------

        const nuevosDocumentos = selectedPasante.documentos.map(doc =>
            doc.id === docId ? { ...doc, validado: !doc.validado } : doc
        );
        
        const faltanRequisitos = DOCUMENTOS_REQUERIDOS.some(reqName => {
            const doc = nuevosDocumentos.find(d => d.nombre === reqName);
            return !doc || !doc.validado;
        });
        
        const nuevoEstado = !faltanRequisitos ? "Activo" : "No habilitado";
        const pasanteActualizado = { ...selectedPasante, documentos: nuevosDocumentos, estado: nuevoEstado };

        setSelectedPasante(pasanteActualizado);
        setPasantes(prev => prev.map(p => p.id === pasanteActualizado.id ? pasanteActualizado : p));

        try {
            await fetch(`http://localhost:3001/pasantes/${selectedPasante.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentos: nuevosDocumentos, estado: nuevoEstado })
            });
        } catch (error) { console.error("Error al guardar en BD:", error); }
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

    const handleJustificarFalta = () => alert("Lógica para justificar falta...");
    const handleGenerarReporteRetiro = () => alert("Lógica para reporte de retiro...");
    
    const handleDescargarInforme = () => {
        if (selectedPasante?.informeUrl) {
            const link = document.createElement('a');
            link.href = selectedPasante.informeUrl;
            link.download = `Informe_${selectedPasante.nombre.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            alert("No hay documento disponible.");
        }
    };

    const handleVerInforme = () => {
        if (selectedPasante?.informeUrl) {
            setShowPdfModal(true);
        }
    };

    // Helper para saber si está bloqueado
    const isLocked = selectedPasante?.estado === 'Activo';

    return (
        <div className="layout-wrapper">
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
                    <button className="nav-item" onClick={() => navigate('/historialAlertas')}>
                        <div className="nav-icon" style={{position: 'relative'}}>
                            <Bell size={20}/>
                            {alertas.some(a => !a.leido) && <span className="notification-dot"></span>}
                        </div>
                        <span>Alertas</span>
                    </button>
                    <button className="nav-item" onClick={() => navigate('/Registro')}>
                        <div className="nav-icon"><Users size={20}/></div>
                        <span>Creacion Pasante</span>
                    </button>
                    <button className="nav-item" onClick={() => navigate('/historialP')}>
                        <div className="nav-icon"><History size={20}/></div>
                        <span>Historial Pasante</span>
                    </button>
                    <div className="nav-separator"></div>
                    <button onClick={handleLogout} className="nav-item logout-item">
                        <div className="nav-icon"><LogOut size={20}/></div>
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            <section className={`clean-list-panel ${selectedPasante ? 'mobile-hidden' : ''}`}>
                <div className="clean-search-area">
                    <div className="search-input-wrapper">
                        <Search size={16} className="text-gray-400" />
                        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className="clean-list-content">
                    <h3 className="list-title">Estudiantes ({filteredPasantes.length})</h3>
                    <div className="list-scroll">
                        {filteredPasantes.map(pasante => (
                            <div key={pasante.id} onClick={() => setSelectedPasante(pasante)} className={`clean-list-item ${selectedPasante?.id === pasante.id ? 'selected' : ''}`}>
                                <div className="item-avatar">{pasante.nombre.charAt(0)}</div>
                                <div className="item-info">
                                    <span className="item-name">{pasante.nombre}</span>
                                    <span className="item-cedula">{pasante.cedula}</span>
                                </div>
                                <div className={`item-dot ${pasante.estado === 'Activo' ? 'bg-emerald' : 'bg-amber'}`}></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <main className={`clean-main-area ${!selectedPasante ? 'mobile-hidden' : ''}`}>
                <div className="toast-wrapper">
                    {alertas.filter(a => !a.leido && !dismissedIds.includes(a.id)).map(alerta => (
                        <ToastItem key={alerta.id} alerta={alerta} onClose={ocultarToast} />
                    ))}
                </div>

                {selectedPasante ? (
                    <div className="clean-content-fade">
                        <header className="clean-header">
                            <button className="back-btn-mobile" onClick={() => setSelectedPasante(null)}>←</button>
                            <div className="header-profile">
                                <h1>{selectedPasante.nombre}</h1>
                                <div className="header-badges">
                                    <span className="badge-pill">{selectedPasante.carrera}</span>
                                    <span className={`badge-pill ${selectedPasante.estado === 'Activo' ? 'pill-success' : 'pill-warning'}`}>
                                        {selectedPasante.estado}
                                    </span>
                                </div>
                            </div>
                        </header>

                        <div className="clean-dashboard-grid">
                            <div className="grid-left">
                                <div className="clean-card">
                                    <div 
                                        className="card-top interactive-header" 
                                        onClick={() => navigate(`/documentacion/${selectedPasante.id}`)}
                                        style={{ cursor: 'pointer' }}
                                        title="Ir al gestor de documentación"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="card-label" style={{ color: '#2563eb' }}>Documentación</span>
                                            <ExternalLink size={14} className="text-blue-500" />
                                        </div>
                                        <FileCheck size={18} className="text-blue-500"/>
                                    </div>
                                    
                                    <div className="progress-circular">
                                        <div className="progress-text">{calcularProgresoDocs().toFixed(0)}%</div>
                                        <svg viewBox="0 0 36 36" className="circular-chart">
                                            <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            <path className="circle" strokeDasharray={`${calcularProgresoDocs()}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        </svg>
                                    </div>
                                    <div className="checklist-mini">
                                        {selectedPasante.documentos.map(doc => (
                                            <div 
                                                key={doc.id} 
                                                className="check-row" 
                                                onClick={() => toggleDocumento(doc.id)}
                                                // --- CAMBIO 2: ESTILO VISUAL DE BLOQUEO ---
                                                style={{
                                                    cursor: isLocked ? 'not-allowed' : 'pointer',
                                                    opacity: isLocked ? 0.6 : 1
                                                }}
                                                title={isLocked ? "Documentación completa y bloqueada" : "Clic para validar/invalidar"}
                                                // ------------------------------------------
                                            >
                                                <div className={`check-box ${doc.validado ? 'checked' : ''}`}>{doc.validado && <CheckCircle2 size={12} color="white"/>}</div>
                                                <span className={doc.validado ? 'text-strike' : ''}>{doc.nombre}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="clean-card">
                                    <div className="card-top"><span className="card-label">Asistencia</span><Clock size={18} className="text-orange-500"/></div>
                                    <div className="stats-row">
                                        <div className="stat-item"><span className="stat-num text-red-500">{selectedPasante.faltas}</span><span className="stat-desc">Faltas</span></div>
                                        <div className="stat-separator"></div>
                                        <div className="stat-item"><span className="stat-num text-orange-500">{selectedPasante.atrasos}</span><span className="stat-desc">Atrasos</span></div>
                                    </div>
                                    {selectedPasante.faltas > 0 && <button className="btn-clean btn-outline" onClick={handleJustificarFalta}><CalendarX size={14}/> Justificar Falta</button>}
                                </div>
                                
                                <div className="clean-card">
                                    <div className="card-top"><span className="card-label">Disciplina</span><AlertTriangle size={18} className="text-red-500"/></div>
                                    <div className="discipline-display"><div className="discipline-count">{selectedPasante.llamadosAtencion}</div><span>Llamados de Atención</span></div>
                                    {selectedPasante.llamadosAtencion > 0 && <button className="btn-clean btn-danger" onClick={handleGenerarReporteRetiro}>Generar Informe Retiro</button>}
                                </div>
                            </div>

                            <div className="grid-right">
                                <div className="clean-card card-full-height">
                                    <div className="card-top"><span className="card-label">Cierre de Pasantías</span></div>
                                    <div className="informe-status-area">
                                        {selectedPasante.informeFinalSubido ? (
                                            <>
                                                <div className="pdf-preview-container" onClick={handleVerInforme}>
                                                    <div className="pdf-icon-overlay">
                                                        <Eye size={32} className="text-white"/>
                                                        <span>Ver Documento</span>
                                                    </div>
                                                    <div className="pdf-mockup">
                                                        <FileText size={64} className="text-gray-300"/>
                                                    </div>
                                                </div>
                                                <h3 className="mt-4">Informe Cargado</h3>
                                                <p className="text-sm text-gray mb-4">Listo para revisión y cierre.</p>
                                                <div className="flex gap-2 w-full">
                                                    <button className="btn-clean btn-outline flex-1" onClick={handleVerInforme}><Eye size={16}/> Ver</button>
                                                    <button className="btn-clean btn-primary flex-1" onClick={handleDescargarInforme}><Download size={16}/> Bajar</button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="status-icon-large"><UploadCloud size={40} className="text-gray-300"/></div>
                                                <h3>Informe Pendiente</h3>
                                                <p>El estudiante debe cargar su informe final para proceder con el cierre.</p>
                                            </>
                                        )}
                                    </div>
                                    <div className="divider"></div>
                                    <div className="info-notes">
                                        <h4>Notas del sistema:</h4>
                                        <ul><li>El estado cambiará automáticamente a "Finalizado" tras validar el informe.</li><li>Recuerde verificar las horas totales.</li></ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="clean-empty-state">
                        <div className="empty-circle"><Users size={48}/></div>
                        <h3>Selecciona un perfil</h3>
                        <p>Navega por la lista de la izquierda para ver los detalles del estudiante.</p>
                    </div>
                )}
            </main>

            {/* MODAL DE PDF */}
            {showPdfModal && selectedPasante?.informeUrl && (
                <div className="modal-overlay-pdf">
                    <div className="modal-pdf-content">
                        <div className="modal-pdf-header">
                            <h3>Informe Final - {selectedPasante.nombre}</h3>
                            <button onClick={() => setShowPdfModal(false)}><X size={24}/></button>
                        </div>
                        <div className="modal-pdf-body">
                            <iframe 
                                src={selectedPasante.informeUrl} 
                                title="Visor PDF"
                                width="100%" 
                                height="100%" 
                                style={{border: 'none'}}
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RRHHModern;