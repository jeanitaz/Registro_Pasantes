import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style'; 

import { 
    Search, Building, 
    MapPin, Edit2, 
    Trash2, Save, X, Key, User,
    FileSpreadsheet, ArrowLeft, Plus
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
    fechaRegistro?: string;
    fotoUrl?: string; 
}

const HistorialPasantes = () => {
    const navigate = useNavigate();
    const [pasantes, setPasantes] = useState<Pasante[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPasante, setEditingPasante] = useState<Pasante | null>(null);

    // Fetch inicial
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

    useEffect(() => {
        fetchPasantes();
    }, []);

    const filteredPasantes = pasantes.filter(p => 
        p.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula.includes(searchTerm) ||
        p.usuario?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExportExcel = () => {
        if (filteredPasantes.length === 0) return;
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(filteredPasantes.map(p => ({
            Cédula: p.cedula,
            Nombres: p.nombres,
            Apellidos: p.apellidos,
            Carrera: p.carrera,
            Estado: p.estado,
            Horas: `${p.horasCompletadas}/${p.horasRequeridas}`
        })));
        XLSX.utils.book_append_sheet(wb, ws, "Pasantes");
        XLSX.writeFile(wb, "Reporte_Pasantes.xlsx");
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("¿Eliminar este registro?")) {
            try {
                await fetch(`http://localhost:3001/pasantes/${id}`, { method: 'DELETE' });
                setPasantes(pasantes.filter(p => p.id !== id));
            } catch (error) { alert("Error al eliminar"); }
        }
    };

    const handleOpenEdit = (pasante: Pasante) => {
        // Aseguramos que los valores no sean undefined para los inputs
        setEditingPasante({ 
            ...pasante, 
            horasCompletadas: pasante.horasCompletadas || 0, 
        });
        setIsModalOpen(true);
    };

    // --- FUNCIÓN DE GUARDADO CORREGIDA Y ROBUSTA ---
    const handleSaveEdit = async () => {
        if (!editingPasante) return;

        // 1. Preparamos el objeto con SOLO los campos que el backend espera actualizar
        const datosParaEnviar: any = {
            horasCompletadas: Number(editingPasante.horasCompletadas),
            estado: editingPasante.estado
        };

        // Solo enviamos password si el usuario escribió algo (no enviar string vacío)
        if (editingPasante.password && editingPasante.password.trim().length > 0) {
            datosParaEnviar.password = editingPasante.password;
        }

        try {
            const response = await fetch(`http://localhost:3001/pasantes/${editingPasante.id}`, {
                method: 'PATCH', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosParaEnviar)
            });

            if (response.ok) {
                // 2. ACTUALIZACIÓN OPTIMISTA DE LA UI
                setPasantes(prevPasantes => prevPasantes.map(p => {
                    if (p.id === editingPasante.id) {
                        return { 
                            ...p, 
                            horasCompletadas: datosParaEnviar.horasCompletadas,
                            estado: datosParaEnviar.estado
                        };
                    }
                    return p;
                }));
                
                setIsModalOpen(false);
                setEditingPasante(null);
                alert("Pasante actualizado correctamente.");
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || "Error al actualizar en el servidor");
            }
        } catch (error) { 
            console.error(error);
            alert("Error al conectar con el servidor."); 
        }
    };

    return (
        <div className="history-page-wrapper">
            <header className="page-header-modern">
                <div className="header-info">
                    <button className="back-btn-modern" onClick={() => navigate(-1)}><ArrowLeft size={20}/></button>
                    <div>
                        <h1>Historial de Pasantes</h1>
                        <p>{filteredPasantes.length} estudiantes registrados</p>
                    </div>
                </div>

                <div className="header-actions-modern">
                    <div className="search-box-modern">
                        <Search size={18} />
                        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="btn-modern excel" onClick={handleExportExcel}>
                        <FileSpreadsheet size={18} /> <span>Reporte</span>
                    </button>
                    <button className="btn-modern primary" onClick={() => navigate('/registro')}>
                        <Plus size={18} /> <span>Nuevo</span>
                    </button>
                </div>
            </header>

            <section className="cards-grid-modern">
                {loading ? (
                    <div className="loader-full">Cargando pasantes...</div>
                ) : (
                    filteredPasantes.map((p) => {
                        const horasC = Number(p.horasCompletadas) || 0;
                        const horasR = Number(p.horasRequeridas) || 1;
                        const progress = Math.min((horasC / horasR) * 100, 100);
                        const tieneFoto = p.fotoUrl && p.fotoUrl.startsWith('http');
                        const estadoClass = (p.estado || 'pendiente').toLowerCase().replace(/\s+/g, '-');

                        return (
                            <div key={p.id} className="modern-student-card">
                                <div className="card-top-tag">
                                    <span className={`badge ${estadoClass}`}>{p.estado || 'Pendiente'}</span>
                                    <div className="card-quick-actions">
                                        <button onClick={() => handleOpenEdit(p)} className="action-icon edit"><Edit2 size={14}/></button>
                                        <button onClick={() => handleDelete(p.id)} className="action-icon delete"><Trash2 size={14}/></button>
                                    </div>
                                </div>

                                <div className="student-hero">
                                    <div className="avatar-large">
                                        {tieneFoto ? <img src={p.fotoUrl} alt="p" /> : p.nombres.charAt(0)}
                                    </div>
                                    <h3>{p.nombres} {p.apellidos}</h3>
                                    <span className="student-career">{p.carrera}</span>
                                </div>

                                <div className="student-meta-info">
                                    <div className="meta-row"><Building size={14}/> <span>{p.institucion}</span></div>
                                    <div className="meta-row"><MapPin size={14}/> <span>{p.dependencia}</span></div>
                                    <div className="meta-row"><User size={14}/> <span className="user-text">{p.usuario}</span></div>
                                </div>

                                <div className="student-progress-box">
                                    <div className="progress-labels">
                                        <span>Progreso</span>
                                        <span>{horasC} / {horasR}h</span>
                                    </div>
                                    <div className="progress-rail">
                                        <div className="progress-bar" style={{width: `${progress}%`, backgroundColor: progress >= 100 ? '#10b981' : '#2563eb'}}></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </section>

            {/* MODAL DE EDICIÓN */}
            {isModalOpen && editingPasante && (
                <div className="modal-overlay">
                    <div className="modal-glass">
                        <div className="modal-header">
                            <h3>Actualizar Pasante</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20}/></button>
                        </div>
                        <div className="modal-body">
                            <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'20px'}}>
                                <div className="avatar-student-modal" style={{width:'50px', height:'50px', borderRadius:'50%', background:'#2563eb', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', fontWeight:'bold', overflow:'hidden'}}>
                                     {editingPasante.fotoUrl && editingPasante.fotoUrl.startsWith('http') ? (
                                        <img src={editingPasante.fotoUrl} alt="Foto" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                                     ) : (
                                        <span>{editingPasante.nombres.charAt(0)}</span>
                                     )}
                                </div>
                                <p className="student-name-modal" style={{margin:0, fontWeight:'bold'}}>{editingPasante.nombres} {editingPasante.apellidos}</p>
                            </div>
                            
                            <div className="credentials-box-modal">
                                <div className="input-group">
                                    <label><User size={14}/> Usuario</label>
                                    <input type="text" value={editingPasante.usuario} readOnly className="input-readonly"/>
                                </div>
                                <div className="input-group">
                                    <label><Key size={14}/> Contraseña</label>
                                    <input 
                                        type="text" 
                                        value={editingPasante.password} 
                                        onChange={(e) => setEditingPasante({...editingPasante, password: e.target.value})} 
                                        placeholder="Nueva contraseña (opcional)..."
                                    />
                                </div>
                            </div>

                            <div className="input-group"><label>Horas Completadas</label>
                                <div className="hours-input-wrapper">
                                    <input 
                                        type="number" 
                                        value={editingPasante.horasCompletadas} 
                                        onChange={(e) => setEditingPasante({...editingPasante, horasCompletadas: Number(e.target.value)})} 
                                    />
                                </div>
                            </div>
                            <div className="input-group"><label>Estado</label>
                                <select value={editingPasante.estado} onChange={(e) => setEditingPasante({...editingPasante, estado: e.target.value})}>
                                    <option value="No habilitado">No habilitado</option>
                                    <option value="Activo">Activo</option>
                                    <option value="Retiro anticipado">Retiro anticipado</option>
                                    <option value="Finalizado por faltas excedidas">Finalizado por faltas excedidas</option>
                                    <option value="Finalizado por atrasos excedidos">Finalizado por atrasos excedidos</option>
                                    <option value="Finalizado por llamado de atención">Finalizado por llamado de atención</option>
                                    <option value="Finalizado">Finalizado</option>
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