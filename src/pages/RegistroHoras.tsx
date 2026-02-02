import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';
import {
    Clock, Calendar, ArrowLeft,
    LogIn, LogOut, Coffee, FileSpreadsheet,
    UserCheck, Shield
} from 'lucide-react';
import '../styles/RegistroHoras.css';

interface Registro {
    id: number;
    fecha_hora: string;
    tipo_evento: 'entrada' | 'salida' | 'entrada_almuerzo' | 'salida_almuerzo';
    guardia: string; // Aquí llegará el nombre real (ej: "Carlos Lopez")
}

const RegistroHoras = () => {
    const navigate = useNavigate();
    const [registros, setRegistros] = useState<Registro[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userStr = localStorage.getItem('user');
                if (!userStr) {
                    navigate('/login');
                    return;
                }
                const user = JSON.parse(userStr);
                setUserName(user.name || 'Pasante');

                const response = await fetch(`http://localhost:3001/asistencia?pasante_id=${user.id}`);

                if (response.ok) {
                    const data = await response.json();
                    setRegistros(data);
                }
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    // ... (Helpers formatFecha, formatHora, getEventoBadge, handleExportExcel se mantienen igual) ...
    // Solo copia las funciones helper de tu código anterior aquí si las borraste

    const formatFecha = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatHora = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    const getEventoBadge = (tipo: string) => {
        switch (tipo) {
            case 'entrada': return <span className="badge-event entrada"><LogIn size={14} /> Entrada</span>;
            case 'salida': return <span className="badge-event salida"><LogOut size={14} /> Salida</span>;
            case 'salida_almuerzo': return <span className="badge-event almuerzo"><Coffee size={14} /> Inicio Almuerzo</span>;
            case 'entrada_almuerzo': return <span className="badge-event almuerzo"><Coffee size={14} /> Fin Almuerzo</span>;
            default: return <span className="badge-event">{tipo}</span>;
        }
    };

    const handleExportExcel = () => {
        if (registros.length === 0) return alert("No hay datos");
        const dataToExport = registros.map(reg => ({
            Fecha: new Date(reg.fecha_hora).toLocaleDateString(),
            Hora: new Date(reg.fecha_hora).toLocaleTimeString(),
            Evento: reg.tipo_evento.toUpperCase(),
            'Registrado Por': reg.guardia // Exportará el nombre real
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
        XLSX.writeFile(wb, `Asistencia_${userName}.xlsx`);
    };

    return (
        <div className="registro-horas-scope">
            <div className="container">
                <header>
                    <div className="header-actions">
                        <button className="btn-back" onClick={() => navigate(-1)}>
                            <ArrowLeft size={18} style={{ marginRight: '5px' }} /> Volver
                        </button>
                        <button className="btn-export" onClick={handleExportExcel}>
                            <FileSpreadsheet size={18} style={{ marginRight: '8px' }} /> Excel
                        </button>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h1>Historial de Marcaciones</h1>
                        <p className="subtitle">Registro de {userName}</p>
                    </div>
                </header>

                <div className="card">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando...</div>
                    ) : registros.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Sin registros.</div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Hora</th>
                                        <th>Evento</th>
                                        <th>Guardia / Responsable</th> {/* Columna actualizada */}
                                    </tr>
                                </thead>
                                <tbody>
                                    {registros.map((reg) => (
                                        <tr key={reg.id}>
                                            <td className="date-cell">
                                                <Calendar size={14} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                                                {formatFecha(reg.fecha_hora)}
                                            </td>
                                            <td style={{ fontWeight: 'bold', color: '#0f172a' }}>
                                                <Clock size={14} style={{ marginRight: '8px', verticalAlign: 'text-bottom', color: '#2563eb' }} />
                                                {formatHora(reg.fecha_hora)}
                                            </td>
                                            <td>{getEventoBadge(reg.tipo_evento)}</td>
                                            <td className="guardia-text">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {reg.guardia && reg.guardia !== 'Sistema' ? (
                                                        <>
                                                            <UserCheck size={16} color="#2563eb" />
                                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                                                {reg.guardia}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Shield size={16} color="#94a3b8" />
                                                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sistema</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RegistroHoras;