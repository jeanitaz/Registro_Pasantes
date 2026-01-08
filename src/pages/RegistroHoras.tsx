import { useState, useEffect } from 'react';
import { Search, Calendar, Clock, User, FileText, ArrowUpCircle, ArrowDownCircle, Coffee } from 'lucide-react';
import '../styles/RegistroHoras.css';

interface Registro {
    id: number;
    fecha_hora: string; 
    tipo_evento: 'entrada' | 'salida' | 'salida_almuerzo' | 'entrada_almuerzo';
    guardia: string;
    pasante: { 
        nombres: string;
        apellidos: string;
        cedula: string;
        carrera: string;
    } | null; // Cambiado a null para manejar registros huérfanos
}

const RegistroHoras = () => {
    const [registros, setRegistros] = useState<Registro[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userSession = JSON.parse(localStorage.getItem('user') || '{}');
        const usuarioActual = userSession.usuario; 

        if (usuarioActual) {
            setLoading(true);
            fetch(`http://localhost:3001/asistencia/${usuarioActual}`)
                .then(res => res.json())
                .then(data => {
                    if(Array.isArray(data)) {
                        // Ordenamos por fecha (el más reciente primero)
                        const sorted = data.sort((a, b) => 
                            new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()
                        );
                        setRegistros(sorted);
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error cargando historial", err);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    // FILTRADO SEGURO: Evita el error "Cannot read properties of null"
    const filteredRegistros = registros.filter(r => {
        const search = searchTerm.toLowerCase();
        const nombres = r.pasante?.nombres?.toLowerCase() || '';
        const apellidos = r.pasante?.apellidos?.toLowerCase() || '';
        const cedula = r.pasante?.cedula || '';

        return nombres.includes(search) || 
               apellidos.includes(search) || 
               cedula.includes(search);
    });

    const getEventConfig = (tipo: string) => {
        switch (tipo) {
            case 'entrada':
                return { label: 'Entrada Jornada', color: 'text-green-600 bg-green-100', icon: <ArrowUpCircle size={18} /> };
            case 'salida':
                return { label: 'Salida Jornada', color: 'text-red-600 bg-red-100', icon: <ArrowDownCircle size={18} /> };
            case 'salida_almuerzo':
                return { label: 'Salida Almuerzo', color: 'text-orange-600 bg-orange-100', icon: <Coffee size={18} /> };
            case 'entrada_almuerzo':
                return { label: 'Retorno Almuerzo', color: 'text-blue-600 bg-blue-100', icon: <Clock size={18} /> };
            default:
                return { label: tipo, color: 'text-gray-600 bg-gray-100', icon: <FileText size={18} /> };
        }
    };

    const formatDate = (isoString: string) => {
        if (!isoString) return '---';
        const date = new Date(isoString);
        return date.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const formatTime = (isoString: string) => {
        if (!isoString) return '---';
        const date = new Date(isoString);
        return date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="historial-layout">
            <div className="historial-header">
                <div>
                    <h1>Historial de Registros</h1>
                    <p className="subtitle">Monitoreo de actividades registradas en tu turno actual.</p>
                </div>
                
                <div className="search-bar">
                    <Search className="search-icon" size={20} />
                    <input 
                        type="text" 
                        placeholder="Buscar por pasante o cédula..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="loading-state">Cargando registros...</div>
                ) : (
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Pasante</th>
                                <th>Evento</th>
                                <th>Fecha</th>
                                <th>Hora</th>
                                <th>Registrado por</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRegistros.length > 0 ? filteredRegistros.map((reg) => {
                                const config = getEventConfig(reg.tipo_evento);
                                return (
                                    <tr key={reg.id}>
                                        <td>
                                            <div className="pasante-cell">
                                                <div className="avatar-circle">
                                                    <User size={16} />
                                                </div>
                                                <div className="pasante-info">
                                                    <span className="name">
                                                        {reg.pasante ? `${reg.pasante.nombres} ${reg.pasante.apellidos}` : 'Pasante no encontrado'}
                                                    </span>
                                                    <span className="cedula">{reg.pasante?.cedula || '---'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge-event ${config.color}`}>
                                                {config.icon}
                                                {config.label}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="date-cell">
                                                <Calendar size={14} />
                                                {formatDate(reg.fecha_hora)}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="time-cell">
                                                <Clock size={14} />
                                                {formatTime(reg.fecha_hora)}
                                            </div>
                                        </td>
                                        <td className="guard-cell">
                                            <span className="guard-badge">{reg.guardia}</span>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5} className="empty-row">
                                        No se encontraron registros de asistencia para tu usuario.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default RegistroHoras;