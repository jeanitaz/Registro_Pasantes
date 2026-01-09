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
    const [eventosHoy, setEventosHoy] = useState<string[]>([]);
    const [mensajeSistema, setMensajeSistema] = useState<{ tipo: 'success' | 'error', texto: string } | null>(null);

    // Cargar datos
    useEffect(() => {
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
                    setEventosHoy(data.map((e: any) => e.tipo_evento));
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
                    guardia: 'Guardia Turno'
                })
            });
            const result = await response.json();

            if (response.ok) {
                setMensajeSistema({ tipo: 'success', texto: result.message });
                setEventosHoy(prev => [...prev, tipoEvento]);

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
        if (eventosHoy.includes(btnType)) return true;

        if (btnType === 'entrada') return false;
        if (!eventosHoy.includes('entrada')) return true;

        if (btnType === 'salida_almuerzo') return eventosHoy.includes('salida');
        if (btnType === 'entrada_almuerzo') return !eventosHoy.includes('salida_almuerzo') || eventosHoy.includes('salida');

        if (btnType === 'salida') {
            if (eventosHoy.includes('salida_almuerzo') && !eventosHoy.includes('entrada_almuerzo')) return true;
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

    return (
        <div className="security-layout">

            {/* SIDEBAR DE BÚSQUEDA */}
            <aside className="security-sidebar">
                <div className="sidebar-header">
                    <h2>Control de Acceso</h2>
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
                                    {eventosHoy.includes('entrada') && <CheckCircle size={24} color="#10b981" />}
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
                                    {eventosHoy.includes('salida') && <ShieldCheck size={24} color="#10b981" />}
                                </button>
                            </div>

                            {/* COLUMNA DERECHA: TIMELINE */}
                            <div className="timeline-section">
                                <span className="timeline-header">Resumen del Día</span>

                                <div className="timeline-item">
                                    <div className={`timeline-dot ${eventosHoy.includes('entrada') ? 'done' : ''}`}></div>
                                    <div className="timeline-content">
                                        <h4>Entrada</h4>
                                        <span>{eventosHoy.includes('entrada') ? 'Registrado' : 'Pendiente'}</span>
                                    </div>
                                </div>
                                <div className="timeline-item">
                                    <div className={`timeline-dot ${eventosHoy.includes('salida_almuerzo') ? 'done' : ''}`}></div>
                                    <div className="timeline-content">
                                        <h4>Inicio Almuerzo</h4>
                                        <span>{eventosHoy.includes('salida_almuerzo') ? 'Registrado' : 'Pendiente'}</span>
                                    </div>
                                </div>
                                <div className="timeline-item">
                                    <div className={`timeline-dot ${eventosHoy.includes('entrada_almuerzo') ? 'done' : ''}`}></div>
                                    <div className="timeline-content">
                                        <h4>Fin Almuerzo</h4>
                                        <span>{eventosHoy.includes('entrada_almuerzo') ? 'Registrado' : 'Pendiente'}</span>
                                    </div>
                                </div>
                                <div className="timeline-item">
                                    <div className={`timeline-dot ${eventosHoy.includes('salida') ? 'done' : ''}`}></div>
                                    <div className="timeline-content">
                                        <h4>Salida</h4>
                                        <span>{eventosHoy.includes('salida') ? 'Registrado' : 'Pendiente'}</span>
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