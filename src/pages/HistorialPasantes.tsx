import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style'; 

import { 
    Search, GraduationCap, Building, 
    MapPin, Edit2, 
    Trash2, Save, X, Key, User,
    FileSpreadsheet 
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

    const handleExportExcel = () => {
        if (filteredPasantes.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }

        const titleStyle = { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2563EB" } }, alignment: { horizontal: "center", vertical: "center" } };
        const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "3B82F6" } }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "FFFFFF" } }, bottom: { style: "thin", color: { rgb: "FFFFFF" } }, right: { style: "thin", color: { rgb: "FFFFFF" } } } };
        const cellStyle = { alignment: { horizontal: "left", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };
        const cellCentered = { alignment: { horizontal: "center", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };
        const cellProgress = { alignment: { horizontal: "center", vertical: "center" }, font: { bold: true, color: { rgb: "059669" } }, border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };

        const wsData: any[] = [];
        wsData.push([{ v: "HISTORIAL DE AVANCE - PASANTES INAMHI", s: titleStyle }, { v: "", s: titleStyle }, { v: "", s: titleStyle }, { v: "", s: titleStyle }, { v: "", s: titleStyle }, { v: "", s: titleStyle }, { v: "", s: titleStyle }, { v: "", s: titleStyle }, { v: "", s: titleStyle }]);
        wsData.push([]); 
        const headers = ["CÉDULA", "NOMBRES", "APELLIDOS", "INSTITUCIÓN", "CARRERA", "DEPENDENCIA", "ESTADO", "HORAS (Avance)", "% PROGRESO"];
        wsData.push(headers.map(h => ({ v: h, s: headerStyle })));

        filteredPasantes.forEach(p => {
            const horasCompletadas = Number(p.horasCompletadas) || 0;
            const horasRequeridas = Number(p.horasRequeridas) || 1;
            const porcentaje = ((horasCompletadas / horasRequeridas) * 100).toFixed(1);

            wsData.push([
                { v: p.cedula, s: cellCentered }, { v: p.nombres, s: cellStyle }, { v: p.apellidos, s: cellStyle },
                { v: p.institucion, s: cellStyle }, { v: p.carrera, s: cellStyle }, { v: p.dependencia, s: cellStyle },
                { v: p.estado, s: cellCentered }, { v: `${horasCompletadas} / ${p.horasRequeridas}`, s: cellCentered },
                { v: `${porcentaje}%`, s: cellProgress }
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Avance Horas");
        XLSX.writeFile(wb, `Reporte_Pasantes_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("¿Eliminar registro?")) {
            try {
                await fetch(`http://localhost:3001/pasantes/${id}`, { method: 'DELETE' });
                setPasantes(pasantes.filter(p => p.id !== id));
            } catch (error) { alert("Error al eliminar"); }
        }
    };

    const handleOpenEdit = (pasante: Pasante) => {
        setEditingPasante({ ...pasante, horasCompletadas: pasante.horasCompletadas || 0, password: pasante.password || '' });
        setIsModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingPasante) return;
        try {
            // CORRECCIÓN IMPORTANTE: Cambiado PUT a PATCH para coincidir con server.js
            const response = await fetch(`http://localhost:3001/pasantes/${editingPasante.id}`, {
                method: 'PATCH', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingPasante)
            });
            if (response.ok) {
                setPasantes(pasantes.map(p => p.id === editingPasante.id ? editingPasante : p));
                setIsModalOpen(false);
                setEditingPasante(null);
                alert("Actualizado correctamente.");
            } else {
                alert("No se pudo actualizar.");
            }
        } catch (error) { alert("Error al conectar con el servidor."); }
    };

    const getProgress = (current?: number | string, total?: number | string) => {
        const c = Number(current) || 0;
        const t = Number(total) || 1; 
        if (t <= 0) return 0;
        return Math.min((c / t) * 100, 100);
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
                            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <button className="btn-glow small" style={{ backgroundColor: '#10b981', borderColor: '#059669', color: 'white', display:'flex', gap:'5px', alignItems:'center' }} onClick={handleExportExcel}>
                            <FileSpreadsheet size={18} /> Excel
                        </button>
                        <button className="btn-glow small" onClick={() => navigate('/registro')}>+ Nuevo</button>
                    </div>
                </header>

                <div className="cards-grid">
                    {loading ? <p className="loading-text">Cargando...</p> : filteredPasantes.length === 0 ? (
                        <div className="empty-state-card"><GraduationCap size={48} /><p>No hay registros.</p></div>
                    ) : (
                        filteredPasantes.map((pasante) => {
                            const horasC = Number(pasante.horasCompletadas) || 0;
                            const horasR = Number(pasante.horasRequeridas) || 200;
                            const progress = getProgress(horasC, horasR);
                            const tieneFoto = pasante.fotoUrl && pasante.fotoUrl.startsWith('http'); // Ajustado para URLs del backend

                            return (
                                <div key={pasante.id} className="student-card">
                                    <div className="card-header-flex">
                                        <span className={`status-badge-pill ${pasante.estado === 'Activo' ? 'pill-green' : 'pill-gray'}`}>{pasante.estado}</span>
                                        <div className="card-actions">
                                            <button className="icon-btn-mini edit" onClick={() => handleOpenEdit(pasante)}><Edit2 size={16} /></button>
                                            <button className="icon-btn-mini delete" onClick={() => handleDelete(pasante.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </div>

                                    <div className="student-profile">
                                        <div className="avatar-student" style={{ overflow: 'hidden', padding: tieneFoto ? 0 : '' }}>
                                            {tieneFoto ? <img src={pasante.fotoUrl} alt="p" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <span>{pasante.nombres.charAt(0)}</span>}
                                        </div>
                                        <h3>{pasante.nombres} {pasante.apellidos.split(' ')[0]}</h3>
                                        <p className="career-text"><GraduationCap size={14}/> {pasante.carrera}</p>
                                    </div>

                                    <div className="student-details">
                                        <div className="detail-item"><Building size={14} className="icon-subtle"/><span>{pasante.institucion}</span></div>
                                        <div className="detail-item"><MapPin size={14} className="icon-subtle"/><span>{pasante.dependencia}</span></div>
                                        <div className="detail-item"><User size={14} className="icon-subtle"/><span className="mono-text">{pasante.usuario}</span></div>
                                    </div>

                                    <div className="progress-section">
                                        <div className="progress-labels">
                                            <span>Avance</span>
                                            <span>{horasC} / {horasR} h</span>
                                        </div>
                                        <div className="progress-track">
                                            <div 
                                                className="progress-fill" 
                                                style={{ width: `${progress}%`, backgroundColor: progress >= 100 ? '#10b981' : '#3b82f6' }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {isModalOpen && editingPasante && (
                <div className="modal-overlay">
                    <div className="modal-glass">
                        <div className="modal-header">
                            <h3>Actualizar Pasante</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{display:'flex', alignItems:'center', gap:'15px', marginBottom:'20px'}}>
                                <div className="avatar-student" style={{width:'50px', height:'50px', fontSize:'1rem', overflow:'hidden', padding:0}}>
                                     {editingPasante.fotoUrl && editingPasante.fotoUrl.startsWith('http') ? (
                                        <img src={editingPasante.fotoUrl} alt="Foto" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                                     ) : (
                                        <span>{editingPasante.nombres.charAt(0)}</span>
                                     )}
                                </div>
                                <p className="student-name-modal" style={{margin:0}}>{editingPasante.nombres} {editingPasante.apellidos}</p>
                            </div>
                            
                            <div className="credentials-box-modal">
                                <div className="input-group">
                                    <label><User size={14}/> Usuario</label>
                                    <input type="text" value={editingPasante.usuario} readOnly className="input-readonly"/>
                                </div>
                                <div className="input-group">
                                    <label><Key size={14}/> Contraseña</label>
                                    <input type="text" value={editingPasante.password} onChange={(e) => setEditingPasante({...editingPasante, password: e.target.value})} placeholder="Nueva contraseña..."/>
                                </div>
                            </div>

                            <div className="input-group"><label>Horas Completadas</label>
                                <div className="hours-input-wrapper">
                                    <input type="number" value={editingPasante.horasCompletadas} onChange={(e) => setEditingPasante({...editingPasante, horasCompletadas: Number(e.target.value)})} />
                                </div>
                            </div>
                            <div className="input-group"><label>Estado</label>
                                <select value={editingPasante.estado} onChange={(e) => setEditingPasante({...editingPasante, estado: e.target.value})}>
                                    <option value="No habilitado">No habilitado</option>
                                    <option value="Activo">Activo</option>
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