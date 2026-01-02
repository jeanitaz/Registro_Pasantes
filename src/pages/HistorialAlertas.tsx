import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, Bell, Trash2, ArrowLeft, 
    CheckCircle2, Clock, KeyRound, AlertTriangle 
} from 'lucide-react';
import '../styles/HistorialAlertas.css';

interface Alerta {
    id: number;
    usuario: string;
    fecha: string;
    tipo: string;
    leido: boolean;
}

const HistorialAlertas = () => {
    const navigate = useNavigate();
    const [alertas, setAlertas] = useState<Alerta[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // --- CARGAR ALERTAS ---
    useEffect(() => {
        const cargarAlertas = () => {
            const data = localStorage.getItem('alertasRRHH');
            if (data) {
                // Ordenar: Las más recientes primero
                const parsedData = JSON.parse(data).sort((a: Alerta, b: Alerta) => b.id - a.id);
                setAlertas(parsedData);
            }
        };
        cargarAlertas();
    }, []);

    // --- FILTRADO ---
    const filteredAlertas = alertas.filter(a => 
        a.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- ACCIONES ---
    const handleDelete = (id: number) => {
        if(window.confirm("¿Eliminar este registro?")) {
            const updated = alertas.filter(a => a.id !== id);
            setAlertas(updated);
            localStorage.setItem('alertasRRHH', JSON.stringify(updated));
        }
    };

    const handleClearAll = () => {
        if(window.confirm("¿Estás seguro de vaciar todo el historial de alertas?")) {
            setAlertas([]);
            localStorage.removeItem('alertasRRHH');
        }
    };

    const toggleLeido = (id: number) => {
        const updated = alertas.map(a => 
            a.id === id ? { ...a, leido: !a.leido } : a
        );
        setAlertas(updated);
        localStorage.setItem('alertasRRHH', JSON.stringify(updated));
    };

    return (
        <div className="history-wrapper">
            <div className="ambient-light-history"></div>

            <main className="history-container">
                {/* HEADER */}
                <header className="history-header">
                    <div className="header-left">
                        <button className="btn-back-circle" onClick={() => navigate(-1)}>
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1>Centro de Notificaciones</h1>
                            <p>Gestión de solicitudes de acceso y seguridad.</p>
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="stat-pill">
                            <span className="stat-num">{alertas.length}</span>
                            <span className="stat-label">Total</span>
                        </div>
                        <div className="stat-pill warning">
                            <span className="stat-num">{alertas.filter(a => !a.leido).length}</span>
                            <span className="stat-label">Pendientes</span>
                        </div>
                    </div>
                </header>

                {/* CONTROLES */}
                <div className="controls-bar">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Buscar por usuario o tipo..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {alertas.length > 0 && (
                        <button className="btn-clear-all" onClick={handleClearAll}>
                            <Trash2 size={16} /> Vaciar Historial
                        </button>
                    )}
                </div>

                {/* LISTA DE ALERTAS */}
                <div className="alerts-grid">
                    {filteredAlertas.length === 0 ? (
                        <div className="empty-history">
                            <Bell size={48} className="empty-icon" />
                            <h3>No hay alertas registradas</h3>
                            <p>Las solicitudes de recuperación de contraseña aparecerán aquí.</p>
                        </div>
                    ) : (
                        filteredAlertas.map((alerta) => (
                            <div key={alerta.id} className={`alert-card ${alerta.leido ? 'read' : 'unread'}`}>
                                <div className="alert-icon-box">
                                    {alerta.tipo.includes('Contraseña') ? <KeyRound size={20}/> : <AlertTriangle size={20}/>}
                                </div>
                                
                                <div className="alert-content">
                                    <div className="alert-top">
                                        <span className="alert-type">{alerta.tipo}</span>
                                        <span className="alert-date"><Clock size={12}/> {alerta.fecha}</span>
                                    </div>
                                    <h4 className="alert-user">{alerta.usuario}</h4>
                                    <p className="alert-desc">
                                        {alerta.leido ? 'Solicitud atendida / revisada.' : 'Solicita restablecimiento de credenciales.'}
                                    </p>
                                </div>

                                <div className="alert-actions">
                                    <button 
                                        className={`btn-action ${alerta.leido ? 'btn-undo' : 'btn-check'}`}
                                        onClick={() => toggleLeido(alerta.id)}
                                        title={alerta.leido ? "Marcar como pendiente" : "Marcar como atendido"}
                                    >
                                        <CheckCircle2 size={18} />
                                        {alerta.leido ? 'Revisado' : 'Atender'}
                                    </button>
                                    <button 
                                        className="btn-action btn-delete"
                                        onClick={() => handleDelete(alerta.id)}
                                        title="Eliminar registro"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};

export default HistorialAlertas;