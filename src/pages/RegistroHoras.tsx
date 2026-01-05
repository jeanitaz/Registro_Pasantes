import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Clock, LogIn, LogOut, Coffee, 
    AlertTriangle, Ban, CheckCircle, ArrowLeft 
} from 'lucide-react';
import '../styles/RegistroHoras.css';

// Constantes
const HORARIO_ENTRADA = "08:00"; 
const HORARIO_REGRESO_ALMUERZO = "13:00"; 
const LIMITE_ATRASOS_ENTRADA = 5;
const LIMITE_ATRASOS_ALMUERZO = 5;
const LIMITE_FALTAS = 3;

interface EventoTimbrado {
    id: number;
    tipo: 'Entrada' | 'Salida Almuerzo' | 'Entrada Almuerzo' | 'Salida Final';
    hora: string;
    fecha: string;
    timestamp: number; // Necesario para el cálculo
    esAtraso: boolean;
}

const RegistroHoras = () => {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    const [eventosHoy, setEventosHoy] = useState<EventoTimbrado[]>([]);
    const [contadores, setContadores] = useState({
        atrasosEntrada: 0,
        atrasosAlmuerzo: 0,
        faltas: 0
    });
    const [estadoUsuario, setEstadoUsuario] = useState("Activo");

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const ultimoEvento = eventosHoy.length > 0 ? eventosHoy[eventosHoy.length - 1].tipo : null;
    const estaBloqueado = estadoUsuario.includes("Finalizado") || estadoUsuario.includes("Bloqueado");

    const getButtonState = (tipoBoton: string) => {
        if (estaBloqueado) return true; 
        if (ultimoEvento === 'Salida Final') return true;

        switch (tipoBoton) {
            case 'Entrada': return ultimoEvento !== null; 
            case 'Salida Almuerzo': return ultimoEvento !== 'Entrada'; 
            case 'Entrada Almuerzo': return ultimoEvento !== 'Salida Almuerzo'; 
            case 'Salida Final': return !(ultimoEvento === 'Entrada' || ultimoEvento === 'Entrada Almuerzo');
            default: return true;
        }
    };

    const verificarAtraso = (tipo: string, fechaActual: Date): boolean => {
        const horaActual = fechaActual.getHours() * 60 + fechaActual.getMinutes();
        if (tipo === 'Entrada') {
            const [h, m] = HORARIO_ENTRADA.split(':').map(Number);
            return horaActual > (h * 60 + m + 15);
        }
        if (tipo === 'Entrada Almuerzo') {
            const [h, m] = HORARIO_REGRESO_ALMUERZO.split(':').map(Number);
            return horaActual > (h * 60 + m + 10);
        }
        return false;
    };

    // --- NUEVO: FUNCIÓN PARA GUARDAR EN BASE DE DATOS ---
    const guardarHorasEnBD = async (horaSalidaFinal: number, eventos: EventoTimbrado[]) => {
        try {
            // 1. Buscamos los eventos clave del día
            const eventoEntrada = eventos.find(e => e.tipo === 'Entrada');
            const eventoSalidaAlmuerzo = eventos.find(e => e.tipo === 'Salida Almuerzo');
            const eventoEntradaAlmuerzo = eventos.find(e => e.tipo === 'Entrada Almuerzo');

            if (!eventoEntrada) return; 

            // 2. Calculamos tiempo total bruto (Salida - Entrada)
            let tiempoTrabajadoMs = horaSalidaFinal - eventoEntrada.timestamp;

            // 3. Restamos el tiempo de almuerzo si existe
            if (eventoSalidaAlmuerzo && eventoEntradaAlmuerzo) {
                const tiempoAlmuerzoMs = eventoEntradaAlmuerzo.timestamp - eventoSalidaAlmuerzo.timestamp;
                tiempoTrabajadoMs -= tiempoAlmuerzoMs;
            }

            // 4. Convertimos a horas
            const horasGanadas = tiempoTrabajadoMs / (1000 * 60 * 60);
            const horasGanadasRedondeadas = Math.round(horasGanadas * 100) / 100;

            console.log(`Horas calculadas hoy: ${horasGanadasRedondeadas}`);

            // 5. Actualizamos LocalStorage y Base de Datos
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                const nuevasHorasTotales = (Number(user.horasCompletadas) || 0) + horasGanadasRedondeadas;
                
                // A. Actualizar navegador (para el pasante)
                user.horasCompletadas = nuevasHorasTotales;
                localStorage.setItem('user', JSON.stringify(user));

                // B. Actualizar Base de Datos (para que RRHH lo vea)
                await fetch(`http://localhost:3001/pasantes/${user.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        horasCompletadas: nuevasHorasTotales 
                    })
                });

                alert(`🏁 ¡Día finalizado! Se han sumado +${horasGanadasRedondeadas} horas. Total: ${nuevasHorasTotales.toFixed(2)}h`);
            }

        } catch (error) {
            console.error("Error guardando horas en BD:", error);
            alert("Hubo un error de conexión al guardar las horas.");
        }
    };
    // ----------------------------------------------------

    const handleTimbrar = (tipo: 'Entrada' | 'Salida Almuerzo' | 'Entrada Almuerzo' | 'Salida Final') => {
        const now = new Date();
        const timestamp = now.getTime(); 
        const horaStr = now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
        const fechaStr = now.toLocaleDateString('es-EC');

        let esAtraso = false;
        const nuevosContadores = { ...contadores };
        let nuevoEstado = estadoUsuario;

        if (tipo === 'Entrada' && verificarAtraso('Entrada', now)) {
            esAtraso = true;
            nuevosContadores.atrasosEntrada += 1;
        } else if (tipo === 'Entrada Almuerzo' && verificarAtraso('Entrada Almuerzo', now)) {
            esAtraso = true;
            nuevosContadores.atrasosAlmuerzo += 1;
        }

        if (nuevosContadores.atrasosEntrada > LIMITE_ATRASOS_ENTRADA || nuevosContadores.atrasosAlmuerzo > LIMITE_ATRASOS_ALMUERZO) {
            nuevoEstado = "Bloqueado por exceso de atrasos";
        }

        const nuevoEvento: EventoTimbrado = {
            id: Date.now(),
            tipo,
            hora: horaStr,
            fecha: fechaStr,
            timestamp, 
            esAtraso
        };

        // Guardamos en el estado local
        const nuevosEventos = [...eventosHoy, nuevoEvento];
        setEventosHoy(nuevosEventos);
        setContadores(nuevosContadores);
        setEstadoUsuario(nuevoEstado);

        // Si es Salida Final, llamamos a la función de guardado
        if (tipo === 'Salida Final') {
             // Usamos un pequeño timeout para asegurar que la UI responda antes del cálculo
             setTimeout(() => guardarHorasEnBD(timestamp, nuevosEventos), 100);
        }
    };

    return (
        <div className="registro-container">
            <button className="btn-volver" onClick={() => navigate(-1)}>
                <ArrowLeft size={20} />
                <span>Volver al Panel</span>
            </button>

            <header className="clock-header">
                <div className="clock-display">
                    <Clock size={40} className="clock-icon" />
                    <div className="time-text">
                        <h1>{currentTime.toLocaleTimeString()}</h1>
                        <span>{currentTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    </div>
                </div>
                <div className={`status-badge ${estaBloqueado ? 'status-blocked' : 'status-active'}`}>
                    {estaBloqueado ? <Ban size={16} /> : <CheckCircle size={16} />}
                    {estadoUsuario}
                </div>
            </header>

            <div className="counters-grid">
                <div className="counter-card warning">
                    <div className="counter-icon"><AlertTriangle size={20} /></div>
                    <div className="counter-info">
                        <span>Atrasos Entrada</span>
                        <strong>{contadores.atrasosEntrada} / {LIMITE_ATRASOS_ENTRADA}</strong>
                    </div>
                </div>
                <div className="counter-card warning">
                    <div className="counter-icon"><Coffee size={20} /></div>
                    <div className="counter-info">
                        <span>Atrasos Almuerzo</span>
                        <strong>{contadores.atrasosAlmuerzo} / {LIMITE_ATRASOS_ALMUERZO}</strong>
                    </div>
                </div>
                <div className="counter-card danger">
                    <div className="counter-icon"><Ban size={20} /></div>
                    <div className="counter-info">
                        <span>Faltas Totales</span>
                        <strong>{contadores.faltas} / {LIMITE_FALTAS}</strong>
                    </div>
                </div>
            </div>

            <div className="actions-panel">
                <h2>Registrar Evento</h2>
                <div className="buttons-grid">
                    <button 
                        className="timbrar-btn btn-entrada"
                        disabled={getButtonState('Entrada')}
                        onClick={() => handleTimbrar('Entrada')}
                    >
                        <LogIn size={24} />
                        <span>Entrada</span>
                    </button>

                    <button 
                        className="timbrar-btn btn-almuerzo-out"
                        disabled={getButtonState('Salida Almuerzo')}
                        onClick={() => handleTimbrar('Salida Almuerzo')}
                    >
                        <Coffee size={24} />
                        <span>Salida Almuerzo</span>
                    </button>

                    <button 
                        className="timbrar-btn btn-almuerzo-in"
                        disabled={getButtonState('Entrada Almuerzo')}
                        onClick={() => handleTimbrar('Entrada Almuerzo')}
                    >
                        <Coffee size={24} />
                        <span>Regreso Almuerzo</span>
                    </button>

                    <button 
                        className="timbrar-btn btn-salida"
                        disabled={getButtonState('Salida Final')}
                        onClick={() => handleTimbrar('Salida Final')}
                    >
                        <LogOut size={24} />
                        <span>Salida Final</span>
                    </button>
                </div>
                <p className="helper-text">
                    * Al marcar Salida Final, se calcularán tus horas y se sincronizarán con el sistema.
                </p>
            </div>

            <div className="history-list">
                <h3>Historial de Hoy</h3>
                <div className="timeline">
                    {eventosHoy.map((evt) => (
                        <div key={evt.id} className={`timeline-item ${evt.esAtraso ? 'item-atraso' : ''}`}>
                            <div className="timeline-time">{evt.hora}</div>
                            <div className="timeline-marker"></div>
                            <div className="timeline-content">
                                <span className="evt-type">{evt.tipo}</span>
                                {evt.esAtraso && <span className="tag-atraso">Atraso</span>}
                            </div>
                        </div>
                    ))}
                    {eventosHoy.length === 0 && <div className="empty-state">No hay registros hoy</div>}
                </div>
            </div>
        </div>
    );
};

export default RegistroHoras;