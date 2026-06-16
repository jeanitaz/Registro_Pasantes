import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, Clock, User, AlertTriangle, CheckCircle, LogOut, 
    Coffee, ArrowRight, ShieldCheck, XCircle, ArrowLeft,
    CreditCard, Calendar, Phone, Activity, Mail, 
    GraduationCap, Briefcase, UserCheck 
} from 'lucide-react';
import '../styles/SeguridadHome.css';

interface Pasante {
    id: number;
    nombres: string;
    apellidos: string;
    cedula: string;
    carrera: string;
    fotoUrl?: string;
    estado: string;
    horasCompletadas: number;
    horasRequeridas: number;
    atrasos: number;
    faltas: number;
    horaEntrada?: string;
    horaSalida?: string;
    institucion?: string;
    dependencia?: string;
    telefono_emergencia?: string;
    fecha_nacimiento?: string;
    delegado?: string;
    discapacidad?: string;
    email?: string;
    telefono?: string;
}



const SeguridadHome = () => {
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [pasantes, setPasantes] = useState<Pasante[]>([]);
    const [selectedPasante, setSelectedPasante] = useState<Pasante | null>(null);
    const [eventosHoy, setEventosHoy] = useState<{ tipo_evento: string, guardia_responsable?: string }[]>([]);
    const [mensajeSistema, setMensajeSistema] = useState<{ tipo: 'success' | 'error', texto: string } | null>(null);
    const [guardName, setGuardName] = useState('Guardia de Turno');
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // --- FUNCIÓN DE CARGA SEPARADA PARA PODER REUTILIZARLA ---
    const fetchPasantes = async () => {
        try {
            const response = await fetch('/api/pasantes');
            if (response.ok) {
                const data = await response.json();
                setPasantes(data);
            }
        } catch (error) {
            console.error("Error cargando pasantes:", error);
        }
    };

    // --- CARGA INICIAL Y POLLING (RECARGA AUTOMÁTICA) ---
    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                setGuardName(user.nombre || user.nombres || user.name || user.usuario || 'Guardia de Turno');
            }
        } catch (e) {
            console.error("Error leyendo usuario del localstorage", e);
        }

        // Carga inicial
        fetchPasantes();

        // Recarga automática cada 5 segundos para obtener cambios de RRHH
        const interval = setInterval(() => {
            fetchPasantes();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // --- SINCRONIZAR PERFIL SELECCIONADO SI RRHH HACE CAMBIOS ---
    useEffect(() => {
        if (selectedPasante) {
            const actualizado = pasantes.find(p => p.id === selectedPasante.id);
            if (actualizado && JSON.stringify(actualizado) !== JSON.stringify(selectedPasante)) {
                setSelectedPasante(actualizado);
            }
        }
    }, [pasantes, selectedPasante]);

    // Buscar historial de hoy
    useEffect(() => {
        if (selectedPasante) {
            fetch(`/api/asistencia/hoy/${selectedPasante.id}`)
                .then(res => res.json())
                .then(data => {
                    setEventosHoy(data);
                });
        } else {
            setEventosHoy([]);
        }
    }, [selectedPasante]);

    const filteredPasantes = pasantes.filter(p =>
        (p.cedula || '').includes(searchTerm) ||
        (p.nombres || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.apellidos || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleTimbrar = async (tipoEvento: string) => {
        if (!selectedPasante) return;
        if (!window.confirm(`¿Registrar evento: ${tipoEvento.replace('_', ' ').toUpperCase()}?`)) return;

        try {
            const response = await fetch('/api/timbrar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pasanteId: selectedPasante.id,
                    tipoEvento: tipoEvento,
                    guardia: guardName
                })
            });
            const result = await response.json();

            if (response.ok) {
                if (result.alerta) {
                    setMensajeSistema({ tipo: 'error', texto: `⚠️ ${result.message}: ${result.alerta}` });
                } else {
                    setMensajeSistema({ tipo: 'success', texto: result.message });
                }

                setEventosHoy(prev => [...prev, { tipo_evento: tipoEvento, guardia_responsable: guardName }]);

                const resP = await fetch(`/api/pasantes/${selectedPasante.id}`);
                const dataP = await resP.json();
                setSelectedPasante(dataP);
            } else {
                setMensajeSistema({ tipo: 'error', texto: result.error });
            }
        } catch (error) {
            setMensajeSistema({ tipo: 'error', texto: "Error de conexión con el servidor" });
        }
        setTimeout(() => setMensajeSistema(null), 4000);
    };

    const isButtonDisabled = (btnType: string) => {
        if (!selectedPasante?.estado?.includes('Activo')) return true;

        const tieneEvento = (tipo: string) => eventosHoy.some(e => e.tipo_evento === tipo);

        if (tieneEvento(btnType)) return true;

        if (btnType === 'entrada') return false;
        if (!tieneEvento('entrada')) return true;

        if (btnType === 'salida_almuerzo') return tieneEvento('salida');
        if (btnType === 'entrada_almuerzo') return !tieneEvento('salida_almuerzo') || tieneEvento('salida');

        if (btnType === 'salida') {
            if (tieneEvento('salida_almuerzo') && !tieneEvento('entrada_almuerzo')) return true;
            return false;
        }
        return false;
    };

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        navigate('/login');
    };

    const getEvento = (tipo: string) => eventosHoy.find(e => e.tipo_evento === tipo);

    return (
        <div className={`security-layout ${selectedPasante ? 'has-selected' : ''}`}>

            {/* SIDEBAR DE BÚSQUEDA */}
            <aside className="security-sidebar">
                <div className="sidebar-header">
                    <h2>Control de Acceso</h2>
                    <div className="guard-info" style={{ marginBottom: '15px', color: '#94a3b8', fontSize: '0.9rem' }}>
                        <ShieldCheck size={16} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
                        Guardia: <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{guardName}</span>
                    </div>
                    <div className="search-wrapper">
                        <Search className="search-icon" />
                        <input
                            className="search-input"
                            type="text"
                            placeholder="Buscar por cédula o nombre..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setSelectedPasante(null); }}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="results-list">
                    {searchTerm && filteredPasantes.map(p => (
                        <div
                            key={p.id}
                            className={`result-card ${selectedPasante?.id === p.id ? 'active' : ''}`}
                            onClick={() => setSelectedPasante(p)}
                        >
                            <div className="avatar-small">
                                {p.nombres.charAt(0)}
                            </div>
                            <div className="info-col">
                                <h4 className="info-name">{p.nombres} {p.apellidos}</h4>
                                <p className="info-cedula">{p.cedula}</p>
                            </div>
                            <div className={`status-indicator ${(p.estado && p.estado.includes('Activo')) ? 'active' : 'blocked'}`}></div>
                        </div>
                    ))}
                </div>

                {/* FOOTER DEL SIDEBAR CON BOTÓN DE SALIDA */}
                <div className="sidebar-footer">
                    <button className="btn-logout-sidebar" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Cerrar Turno</span>
                    </button>
                </div>
            </aside>

            {/* ÁREA PRINCIPAL */}
            <main className="security-main">
                {mensajeSistema && (
                    <div className={`toast-alert ${mensajeSistema.tipo}`}>
                        {mensajeSistema.tipo === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                        {mensajeSistema.texto}
                    </div>
                )}

                {selectedPasante ? (
                    <div className="control-panel">
                        <header className="panel-header">
                            <div className="user-profile-large">
                                <button className="btn-back-sidebar" onClick={() => setSelectedPasante(null)} title="Volver a la lista">
                                    <ArrowLeft size={20} />
                                    <span>Volver</span>
                                </button>
                                <div className="avatar-large-box">
                                    {selectedPasante.fotoUrl ? (
                                        <img src={selectedPasante.fotoUrl} alt="Foto" />
                                    ) : <User size={48} />}
                                </div>
                                <div className="user-details">
                                    <h1>{selectedPasante.nombres} {selectedPasante.apellidos}</h1>
                                    <div className="user-meta">
                                        <span className="badge career">{selectedPasante.carrera}</span>
                                        <span className={`badge ${selectedPasante.estado?.includes('Activo') ? 'status-ok' : 'status-bad'}`}>
                                            {selectedPasante.estado || 'Sin Estado'}
                                        </span>
                                    </div>
                                    {/* --- MOSTRAR HORARIO PARA EL GUARDIA --- */}
                                    {selectedPasante.horaEntrada && selectedPasante.horaSalida && (
                                        <div className="schedule-info">
                                            <Clock size={15} />
                                            <span><strong>Horario:</strong> {selectedPasante.horaEntrada} - {selectedPasante.horaSalida}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="stats-row">
                                <div className="stat-pill">
                                    <span className="stat-label">Atrasos</span>
                                    <span className={`stat-value ${selectedPasante.atrasos > 3 ? 'danger' : ''}`}>{selectedPasante.atrasos}</span>
                                </div>
                                <div className="stat-pill">
                                    <span className="stat-label">Faltas</span>
                                    <span className="stat-value">{selectedPasante.faltas}</span>
                                </div>
                            </div>
                        </header>

                        <div className="panel-body">
                            {/* COLUMNA IZQUIERDA: BOTONES Y DETALLES */}
                            <div className="panel-left-col">
                                <div className="buttons-grid">
                                    <button
                                        className="big-btn btn-entry"
                                        disabled={isButtonDisabled('entrada')}
                                        onClick={() => handleTimbrar('entrada')}
                                    >
                                        <div className="btn-content">
                                            <div className="icon-box"><Clock size={24} /></div>
                                            <div className="btn-text">
                                                <h3>Entrada Jornada</h3>
                                                <p>Registro de inicio de labores</p>
                                            </div>
                                        </div>
                                        {getEvento('entrada') && <CheckCircle size={22} color="#10b981" />}
                                    </button>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <button
                                            className="big-btn btn-lunch-out"
                                            disabled={isButtonDisabled('salida_almuerzo')}
                                            onClick={() => handleTimbrar('salida_almuerzo')}
                                        >
                                            <div className="btn-content">
                                                <div className="icon-box"><Coffee size={20} /></div>
                                                <div className="btn-text">
                                                    <h3>Salida Almuerzo</h3>
                                                    <p>Inicio de receso</p>
                                                </div>
                                            </div>
                                            {getEvento('salida_almuerzo') && <CheckCircle size={20} color="#10b981" />}
                                        </button>

                                        <button
                                            className="big-btn btn-lunch-in"
                                            disabled={isButtonDisabled('entrada_almuerzo')}
                                            onClick={() => handleTimbrar('entrada_almuerzo')}
                                        >
                                            <div className="btn-content">
                                                <div className="icon-box"><ArrowRight size={20} /></div>
                                                <div className="btn-text">
                                                    <h3>Retorno Almuerzo</h3>
                                                    <p>Fin de receso</p>
                                                </div>
                                            </div>
                                            {getEvento('entrada_almuerzo') && <CheckCircle size={20} color="#10b981" />}
                                        </button>
                                    </div>

                                    <button
                                        className="big-btn btn-exit"
                                        disabled={isButtonDisabled('salida')}
                                        onClick={() => handleTimbrar('salida')}
                                    >
                                        <div className="btn-content">
                                            <div className="icon-box"><LogOut size={24} /></div>
                                            <div className="btn-text">
                                                <h3>Salida Final</h3>
                                                <p>Cierre de jornada laboral</p>
                                            </div>
                                        </div>
                                        {getEvento('salida') && <ShieldCheck size={22} color="#10b981" />}
                                    </button>
                                </div>

                                {/* TARJETA DE DETALLES DEL PASANTE */}
                                <div className="intern-details-card">
                                    <h3>Información Completa</h3>
                                    <div className="details-container">
                                        <div className="details-section">
                                            <h4>Datos Personales</h4>
                                            <div className="details-grid">
                                                <div className="detail-item">
                                                    <span className="detail-label-wrapper">
                                                        <CreditCard size={14} /> Cédula
                                                    </span>
                                                    <span className="detail-value">{selectedPasante.cedula}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label-wrapper">
                                                        <Calendar size={14} /> F. Nacimiento
                                                    </span>
                                                    <span className="detail-value">
                                                        {selectedPasante.fecha_nacimiento 
                                                            ? new Date(selectedPasante.fecha_nacimiento).toLocaleDateString('es-EC', { timeZone: 'UTC' }) 
                                                            : 'No registrada'}
                                                    </span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label-wrapper">
                                                        <Phone size={14} /> Teléfono
                                                    </span>
                                                    <span className="detail-value">{selectedPasante.telefono || 'No registrado'}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="detail-label-wrapper">
                                                        <Activity size={14} /> Discapacidad
                                                    </span>
                                                    <span className="detail-value">{selectedPasante.discapacidad || 'No'}</span>
                                                </div>
                                                <div className="detail-item full-width">
                                                    <span className="detail-label-wrapper">
                                                        <Mail size={14} /> Correo Electrónico
                                                    </span>
                                                    <span className="detail-value">{selectedPasante.email || 'No registrado'}</span>
                                                </div>
                                                <div className="detail-item full-width">
                                                    <span className="detail-label-wrapper">
                                                        <AlertTriangle size={14} className="text-danger" /> Teléfono Emergencia
                                                    </span>
                                                    <span className="detail-value text-danger font-bold">{selectedPasante.telefono_emergencia || 'No registrado'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="details-section">
                                            <h4>Datos Académicos</h4>
                                            <div className="details-grid">
                                                <div className="detail-item full-width">
                                                    <span className="detail-label-wrapper">
                                                        <GraduationCap size={14} /> Institución
                                                    </span>
                                                    <span className="detail-value">{selectedPasante.institucion || 'No registrada'}</span>
                                                </div>
                                                <div className="detail-item full-width">
                                                    <span className="detail-label-wrapper">
                                                        <Briefcase size={14} /> Dependencia
                                                    </span>
                                                    <span className="detail-value">{selectedPasante.dependencia || 'No registrada'}</span>
                                                </div>
                                                <div className="detail-item full-width">
                                                    <span className="detail-label-wrapper">
                                                        <UserCheck size={14} /> Tutor / Delegado
                                                    </span>
                                                    <span className="detail-value">{selectedPasante.delegado || 'No asignado'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COLUMNA DERECHA: TIMELINE */}
                            <div className="timeline-section">
                                <span className="timeline-header">Resumen del Día</span>

                                <div className="timeline-list">
                                    <div className={`timeline-item ${getEvento('entrada') ? 'active-path' : ''}`}>
                                        <div className={`timeline-dot ${getEvento('entrada') ? 'done' : ''}`}></div>
                                        <div className="timeline-content">
                                            <h4>Entrada</h4>
                                            <span>{getEvento('entrada') ? 'Registrado' : 'Pendiente'}</span>
                                            {getEvento('entrada')?.guardia_responsable && (
                                                <div className="timeline-guard">Por: {getEvento('entrada')?.guardia_responsable}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`timeline-item ${getEvento('salida_almuerzo') ? 'active-path' : ''}`}>
                                        <div className={`timeline-dot ${getEvento('salida_almuerzo') ? 'done' : ''}`}></div>
                                        <div className="timeline-content">
                                            <h4>Inicio Almuerzo</h4>
                                            <span>{getEvento('salida_almuerzo') ? 'Registrado' : 'Pendiente'}</span>
                                            {getEvento('salida_almuerzo')?.guardia_responsable && (
                                                <div className="timeline-guard">Por: {getEvento('salida_almuerzo')?.guardia_responsable}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`timeline-item ${getEvento('entrada_almuerzo') ? 'active-path' : ''}`}>
                                        <div className={`timeline-dot ${getEvento('entrada_almuerzo') ? 'done' : ''}`}></div>
                                        <div className="timeline-content">
                                            <h4>Fin Almuerzo</h4>
                                            <span>{getEvento('entrada_almuerzo') ? 'Registrado' : 'Pendiente'}</span>
                                            {getEvento('entrada_almuerzo')?.guardia_responsable && (
                                                <div className="timeline-guard">Por: {getEvento('entrada_almuerzo')?.guardia_responsable}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="timeline-item">
                                        <div className={`timeline-dot ${getEvento('salida') ? 'done' : ''}`}></div>
                                        <div className="timeline-content">
                                            <h4>Salida</h4>
                                            <span>{getEvento('salida') ? 'Registrado' : 'Pendiente'}</span>
                                            {getEvento('salida')?.guardia_responsable && (
                                                <div className="timeline-guard">Por: {getEvento('salida')?.guardia_responsable}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!selectedPasante.estado?.includes('Activo') && (
                            <div className="blocked-banner">
                                <XCircle size={18} />
                                <span>USUARIO BLOQUEADO: No es posible registrar asistencia.</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="empty-state-box">
                        <User size={64} style={{ marginBottom: '20px', color: '#cbd5e1' }} />
                        <h2>Panel de Guardia</h2>
                        <p>Busque un pasante en el panel izquierdo para comenzar el registro.</p>
                    </div>
                )}
            </main>
            {showLogoutModal && (
                <div className="modal-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.6)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
                    <div className="modal-glass" style={{ textAlign: 'center', maxWidth: '400px', padding: '30px', borderTop: '5px solid #ef4444', background: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
                        <div style={{ margin: '0 auto 15px auto', width: '60px', height: '60px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <LogOut size={30} />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', color: '#1e293b', margin: '0 0 10px 0', fontWeight: 'bold' }}>
                            ¿Cerrar Turno?
                        </h3>
                        <p style={{ color: '#64748b', marginBottom: '25px', lineHeight: '1.5' }}>
                            ¿Estás seguro de que deseas cerrar el turno de guardia y salir?
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setShowLogoutModal(false)}
                                style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmLogout} 
                                style={{ flex: 1, padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
                            >
                                Cerrar Turno
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SeguridadHome;