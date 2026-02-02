import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, User, AlertTriangle, CheckCircle, LogOut, Coffee, ArrowRight, ShieldCheck, XCircle } from 'lucide-react';
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
}

const SeguridadHome = () => {
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [pasantes, setPasantes] = useState<Pasante[]>([]);
    const [selectedPasante, setSelectedPasante] = useState<Pasante | null>(null);
    // Modificamos el estado para guardar el objeto completo del evento
    const [eventosHoy, setEventosHoy] = useState<{ tipo_evento: string, guardia_responsable?: string }[]>([]);
    const [mensajeSistema, setMensajeSistema] = useState<{ tipo: 'success' | 'error', texto: string } | null>(null);
    const [guardName, setGuardName] = useState('Guardia de Turno');

    // Cargar datos
    useEffect(() => {
        // Cargar nombre del guardia
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                // Intenta obtener nombre o usuario, o fallback. Se agrega user.name que viene del log in
                setGuardName(user.nombre || user.nombres || user.name || user.usuario || 'Guardia de Turno');
            }
        } catch (e) {
            console.error("Error leyendo usuario del localstorage", e);
        }

        fetch('http://localhost:3001/pasantes')
            .then(res => res.json())
            .then(data => setPasantes(data));
    }, []);

    // Buscar historial de hoy
    useEffect(() => {
        if (selectedPasante) {
            fetch(`http://localhost:3001/asistencia/hoy/${selectedPasante.id}`)
                .then(res => res.json())
                .then(data => {
                    // Guardamos todo el objeto evento
                    setEventosHoy(data);
                });
        } else {
            setEventosHoy([]);
        }
    }, [selectedPasante]);

    const filteredPasantes = pasantes.filter(p =>
        p.cedula.includes(searchTerm) ||
        p.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.apellidos.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleTimbrar = async (tipoEvento: string) => {
        if (!selectedPasante) return;
        if (!window.confirm(`¿Registrar evento: ${tipoEvento.replace('_', ' ').toUpperCase()}?`)) return;

        try {
            const response = await fetch('http://localhost:3001/timbrar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pasanteId: selectedPasante.id,
                    tipoEvento: tipoEvento,
                    guardia: guardName // Usa el nombre dinámico del guardia
                })
            });
            const result = await response.json();

            if (response.ok) {
                if (result.alerta) {
                    setMensajeSistema({ tipo: 'error', texto: `⚠️ ${result.message}: ${result.alerta}` });
                } else {
                    setMensajeSistema({ tipo: 'success', texto: result.message });
                }

                // Agregamos el nuevo evento con el nombre del guardia actual
                setEventosHoy(prev => [...prev, { tipo_evento: tipoEvento, guardia_responsable: guardName }]);

                // Actualizar contadores
                const resP = await fetch(`http://localhost:3001/pasantes/${selectedPasante.id}`);
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
        if (!selectedPasante?.estado.includes('Activo')) return true;

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

    // Función para cerrar sesión
    const handleLogout = () => {
        if (window.confirm("¿Seguro que desea cerrar el turno de guardia?")) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('role');
            navigate('/login');
        }
    };

    // Helper para buscar un evento específico
    const getEvento = (tipo: string) => eventosHoy.find(e => e.tipo_evento === tipo);

    return (
        <div className="security-layout">

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
                                <div className="avatar-large-box">
                                    {selectedPasante.fotoUrl ? (
                                        <img src={selectedPasante.fotoUrl} alt="Foto" />
                                    ) : <User size={48} />}
                                </div>
                                <div className="user-details">
                                    <h1>{selectedPasante.nombres} {selectedPasante.apellidos}</h1>
                                    <div className="user-meta">
                                        <span className="badge career">{selectedPasante.carrera}</span>
                                        <span className={`badge ${selectedPasante.estado.includes('Activo') ? 'status-ok' : 'status-bad'}`}>
                                            {selectedPasante.estado}
                                        </span>
                                    </div>
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
                            {/* COLUMNA IZQUIERDA: BOTONES */}
                            <div className="buttons-grid">
                                <button
                                    className="big-btn btn-entry"
                                    disabled={isButtonDisabled('entrada')}
                                    onClick={() => handleTimbrar('entrada')}
                                >
                                    <div className="btn-content">
                                        <div className="icon-box"><Clock size={28} /></div>
                                        <div className="btn-text">
                                            <h3>Entrada Jornada</h3>
                                            <p>Registro de inicio de labores</p>
                                        </div>
                                    </div>
                                    {getEvento('entrada') && <CheckCircle size={24} color="#10b981" />}
                                </button>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <button
                                        className="big-btn btn-lunch-out"
                                        disabled={isButtonDisabled('salida_almuerzo')}
                                        onClick={() => handleTimbrar('salida_almuerzo')}
                                    >
                                        <div className="btn-content" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                                            <div className="icon-box"><Coffee size={24} /></div>
                                            <div className="btn-text"><h3>Salida Almuerzo</h3></div>
                                        </div>
                                    </button>

                                    <button
                                        className="big-btn btn-lunch-in"
                                        disabled={isButtonDisabled('entrada_almuerzo')}
                                        onClick={() => handleTimbrar('entrada_almuerzo')}
                                    >
                                        <div className="btn-content" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                                            <div className="icon-box"><ArrowRight size={24} /></div>
                                            <div className="btn-text"><h3>Retorno Almuerzo</h3></div>
                                        </div>
                                    </button>
                                </div>

                                <button
                                    className="big-btn btn-exit"
                                    disabled={isButtonDisabled('salida')}
                                    onClick={() => handleTimbrar('salida')}
                                >
                                    <div className="btn-content">
                                        <div className="icon-box"><LogOut size={28} /></div>
                                        <div className="btn-text">
                                            <h3>Salida Final</h3>
                                            <p>Cierre de jornada laboral</p>
                                        </div>
                                    </div>
                                    {getEvento('salida') && <ShieldCheck size={24} color="#10b981" />}
                                </button>
                            </div>

                            {/* COLUMNA DERECHA: TIMELINE */}
                            <div className="timeline-section">
                                <span className="timeline-header">Resumen del Día</span>

                                <div className="timeline-item">
                                    <div className={`timeline-dot ${getEvento('entrada') ? 'done' : ''}`}></div>
                                    <div className="timeline-content">
                                        <h4>Entrada</h4>
                                        <span>{getEvento('entrada') ? 'Registrado' : 'Pendiente'}</span>
                                        {getEvento('entrada')?.guardia_responsable && (
                                            <div className="timeline-guard">Por: {getEvento('entrada')?.guardia_responsable}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="timeline-item">
                                    <div className={`timeline-dot ${getEvento('salida_almuerzo') ? 'done' : ''}`}></div>
                                    <div className="timeline-content">
                                        <h4>Inicio Almuerzo</h4>
                                        <span>{getEvento('salida_almuerzo') ? 'Registrado' : 'Pendiente'}</span>
                                        {getEvento('salida_almuerzo')?.guardia_responsable && (
                                            <div className="timeline-guard">Por: {getEvento('salida_almuerzo')?.guardia_responsable}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="timeline-item">
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

                        {!selectedPasante.estado.includes('Activo') && (
                            <div style={{ background: '#fef2f2', padding: '15px', textAlign: 'center', color: '#991b1b', fontWeight: 'bold', borderTop: '1px solid #fee2e2' }}>
                                <XCircle style={{ display: 'inline', marginBottom: '-4px', marginRight: '8px' }} />
                                USUARIO BLOQUEADO: No es posible registrar asistencia.
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
        </div>
    );
};

export default SeguridadHome;