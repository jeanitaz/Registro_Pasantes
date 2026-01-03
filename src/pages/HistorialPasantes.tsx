import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// 1. IMPORTAMOS LA LIBRERÍA XLSX
import * as XLSX from 'xlsx'; 
import { 
    Search, GraduationCap, Building, 
    MapPin, Edit2, 
    Trash2, Save, X, Key, User,
    FileSpreadsheet // Nuevo icono para Excel
} from 'lucide-react';
import '../styles/HistorialPasantes.css';

interface Pasante {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    carrera: string;
    institucion: string;
    dependencia: string;
    horasRequeridas: number;
    horasCompletadas?: number;
    estado: string;
    usuario: string;
    password?: string;
    // 2. AGREGAMOS EL CAMPO DE FECHA
    fechaRegistro?: string; 
}

const HistorialPasantes = () => {
    const navigate = useNavigate();
    const [pasantes, setPasantes] = useState<Pasante[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPasante, setEditingPasante] = useState<Pasante | null>(null);

    useEffect(() => {
        const fetchPasantes = async () => {
            try {
                const response = await fetch('http://localhost:3001/pasantes');
                if (response.ok) {
                    const data = await response.json();
                    setPasantes(data);
                }
            } catch (error) {
                console.error("Error cargando pasantes:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPasantes();
    }, []);

    const filteredPasantes = pasantes.filter(p => 
        p.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula.includes(searchTerm) ||
        p.usuario?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- 3. FUNCIÓN PARA EXPORTAR A EXCEL ---
    const handleExportExcel = () => {
        // A. Formateamos los datos para que se vean bonitos en el Excel
        const datosParaExcel = filteredPasantes.map(p => {
            // Lógica para formatear la fecha correctamente a Hora Ecuador
            let fechaFormateada = 'No registrado';
            
            if (p.fechaRegistro) {
                const fechaObj = new Date(p.fechaRegistro);
                // Forzamos la zona horaria a Guayaquil/Ecuador
                fechaFormateada = fechaObj.toLocaleString('es-EC', {
                    timeZone: 'America/Guayaquil', 
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false // Formato 24 horas
                });
            }

            return {
                "Cédula": p.cedula,
                "Nombres": p.nombres,
                "Apellidos": p.apellidos,
                "Usuario": p.usuario,
                "Institución": p.institucion,
                "Carrera": p.carrera,
                "Dependencia": p.dependencia,
                "Estado": p.estado,
                "Avance Horas": `${p.horasCompletadas || 0} / ${p.horasRequeridas}`,
                "Fecha de Creación": fechaFormateada
            };
        });

        // B. Crear una hoja de trabajo (Worksheet)
        const hoja = XLSX.utils.json_to_sheet(datosParaExcel);

        // C. Ajustar ancho de columnas automáticamente
        const wscols = [
            {wch: 15}, // Cédula
            {wch: 20}, // Nombres
            {wch: 20}, // Apellidos
            {wch: 15}, // Usuario
            {wch: 25}, // Institución
            {wch: 20}, // Carrera
            {wch: 25}, // Dependencia
            {wch: 12}, // Estado
            {wch: 15}, // Horas
            {wch: 22}  // Fecha
        ];
        hoja['!cols'] = wscols;

        // D. Crear un libro de trabajo (Workbook)
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hoja, "Historial Pasantes");

        // E. Descargar el archivo
        const fechaHoy = new Date().toISOString().split('T')[0];
        XLSX.writeFile(libro, `Reporte_Pasantes_${fechaHoy}.xlsx`);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("¿Estás seguro de eliminar este pasante y todo su registro?")) {
            try {
                await fetch(`http://localhost:3001/pasantes/${id}`, { method: 'DELETE' });
                setPasantes(pasantes.filter(p => p.id !== id));
            } catch (error) {
                alert("Error al eliminar");
            }
        }
    };

    const handleOpenEdit = (pasante: Pasante) => {
        setEditingPasante({
            ...pasante,
            horasCompletadas: pasante.horasCompletadas || 0,
            password: pasante.password || ''
        });
        setIsModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingPasante) return;

        try {
            const response = await fetch(`http://localhost:3001/pasantes/${editingPasante.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingPasante)
            });

            if (response.ok) {
                setPasantes(pasantes.map(p => p.id === editingPasante.id ? editingPasante : p));
                setIsModalOpen(false);
                setEditingPasante(null);
                alert("Registro actualizado correctamente.");
            }
        } catch (error) {
            alert("Error al guardar cambios.");
        }
    };

    const getProgress = (current: number = 0, total: number) => {
        return Math.min((current / total) * 100, 100);
    };

    return (
        <div className="sophisticated-wrapper">
            <div className="ambient-light light-1"></div>
            <div className="ambient-light light-2"></div>

            <main className="main-view full-width">
                <header className="glass-header">
                    <div className="header-title">
                        <button className="btn-back" onClick={() => navigate(-1)}>← Volver</button>
                        <h1>Historial de Pasantes</h1>
                        <p>Gestión académica y seguimiento de horas.</p>
                    </div>
                    <div className="header-actions">
                        <div className="search-pill">
                            <Search size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar por nombre, CI, usuario..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        {/* 4. BOTÓN DE EXCEL INTEGRADO */}
                        <button 
                            className="btn-glow small" 
                            style={{ 
                                backgroundColor: '#10b981', 
                                borderColor: '#059669', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                color: 'white' 
                            }} 
                            onClick={handleExportExcel}
                            title="Descargar reporte en Excel"
                        >
                            <FileSpreadsheet size={18} />
                            <span>Excel</span>
                        </button>

                        <button className="btn-glow small" onClick={() => navigate('/registro')}>
                            + Nuevo Ingreso
                        </button>
                    </div>
                </header>

                <div className="cards-grid">
                    {loading ? (
                        <p className="loading-text">Cargando base de datos...</p>
                    ) : filteredPasantes.length === 0 ? (
                        <div className="empty-state-card">
                            <GraduationCap size={48} />
                            <p>No se encontraron pasantes registrados.</p>
                        </div>
                    ) : (
                        filteredPasantes.map((pasante) => {
                            const progress = getProgress(pasante.horasCompletadas, pasante.horasRequeridas);
                            
                            return (
                                <div key={pasante.id} className="student-card">
                                    <div className="card-header-flex">
                                        <span className={`status-badge-pill ${pasante.estado === 'Activo' ? 'pill-green' : 'pill-gray'}`}>
                                            {pasante.estado}
                                        </span>
                                        <div className="card-actions">
                                            <button className="icon-btn-mini edit" onClick={() => handleOpenEdit(pasante)}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="icon-btn-mini delete" onClick={() => handleDelete(pasante.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="student-profile">
                                        <div className="avatar-student">
                                            {pasante.nombres.charAt(0)}{pasante.apellidos.charAt(0)}
                                        </div>
                                        <h3>{pasante.nombres} {pasante.apellidos.split(' ')[0]}</h3>
                                        <p className="career-text"><GraduationCap size={14}/> {pasante.carrera}</p>
                                    </div>

                                    <div className="student-details">
                                        <div className="detail-item">
                                            <Building size={14} className="icon-subtle"/>
                                            <span>{pasante.institucion}</span>
                                        </div>
                                        <div className="detail-item">
                                            <MapPin size={14} className="icon-subtle"/>
                                            <span>{pasante.dependencia}</span>
                                        </div>
                                        <div className="detail-item">
                                            <User size={14} className="icon-subtle"/>
                                            <span className="mono-text">{pasante.usuario}</span>
                                        </div>
                                    </div>

                                    <div className="progress-section">
                                        <div className="progress-labels">
                                            <span>Avance</span>
                                            <span>{pasante.horasCompletadas || 0} / {pasante.horasRequeridas} h</span>
                                        </div>
                                        <div className="progress-track">
                                            <div 
                                                className="progress-fill" 
                                                style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#10b981' : '#3b82f6' }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* MODAL DE EDICIÓN */}
            {isModalOpen && editingPasante && (
                <div className="modal-overlay">
                    <div className="modal-glass">
                        <div className="modal-header">
                            <h3>Actualizar Pasante</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <p className="student-name-modal">{editingPasante.nombres} {editingPasante.apellidos}</p>
                            
                            <div className="credentials-box-modal">
                                <div className="input-group">
                                    <label><User size={14}/> Usuario</label>
                                    <input 
                                        type="text" 
                                        value={editingPasante.usuario}
                                        readOnly 
                                        className="input-readonly"
                                    />
                                </div>
                                <div className="input-group">
                                    <label><Key size={14}/> Contraseña</label>
                                    <input 
                                        type="text" 
                                        value={editingPasante.password}
                                        onChange={(e) => setEditingPasante({...editingPasante, password: e.target.value})}
                                        placeholder="Nueva contraseña..."
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Estado Actual</label>
                                <select 
                                    value={editingPasante.estado}
                                    onChange={(e) => setEditingPasante({...editingPasante, estado: e.target.value})}
                                >
                                    <option value="No habilitado">No habilitado</option>
                                    <option value="Activo">Activo</option>
                                    <option value="Finalizado">Finalizado</option>
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Horas Completadas</label>
                                <div className="hours-input-wrapper">
                                    <input 
                                        type="number" 
                                        value={editingPasante.horasCompletadas}
                                        onChange={(e) => setEditingPasante({...editingPasante, horasCompletadas: Number(e.target.value)})}
                                        max={editingPasante.horasRequeridas}
                                    />
                                    <span className="suffix">/ {editingPasante.horasRequeridas} h</span>
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Dependencia Asignada</label>
                                <select 
                                    value={editingPasante.dependencia}
                                    onChange={(e) => setEditingPasante({...editingPasante, dependencia: e.target.value})}
                                >
                                    <option value="Dirección Ejecutiva">Dirección Ejecutiva</option>
                                    <option value="Gestión Meteorológica">Gestión Meteorológica</option>
                                    <option value="Gestión Hidrológica">Gestión Hidrológica</option>
                                    <option value="Tecnologías de la Información">Tecnologías de la Información</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            <button className="btn-save" onClick={handleSaveEdit}><Save size={16}/> Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistorialPasantes;