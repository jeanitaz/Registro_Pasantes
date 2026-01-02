import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, User, Key, 
    Fingerprint, Trash2, X, Save 
} from 'lucide-react';
import '../styles/HistorialUsuarios.css';

interface Usuario {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    rol: string;
    usuario: string;
    password?: string;
    estado: string;
}

const HistorialUsuarios = () => {
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // --- MODAL STATE ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [newStatus, setNewStatus] = useState('');

    // --- CARGAR DATOS ---
    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                const response = await fetch('http://localhost:3001/usuarios');
                if (response.ok) {
                    const data = await response.json();
                    setUsuarios(data);
                }
            } catch (error) {
                console.error("Error cargando usuarios:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsuarios();
    }, []);

    const filteredUsuarios = usuarios.filter(u => 
        u.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.cedula.includes(searchTerm) ||
        u.usuario.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (window.confirm("¿Eliminar este usuario permanentemente?")) {
            try {
                await fetch(`http://localhost:3001/usuarios/${id}`, { method: 'DELETE' });
                setUsuarios(usuarios.filter(u => u.id !== id));
            } catch (error) {
                alert("Error al eliminar");
            }
        }
    };

    // --- EDIT HANDLERS ---
    const openEditModal = (user: Usuario) => {
        setEditingUser(user);
        setNewPassword(user.password || '');
        setNewStatus(user.estado);
        setIsModalOpen(true);
    };

    const handleSaveChanges = async () => {
        if (!editingUser) return;

        const updatedUser = { 
            ...editingUser, 
            password: newPassword, 
            estado: newStatus 
        };

        try {
            const response = await fetch(`http://localhost:3001/usuarios/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedUser)
            });

            if (response.ok) {
                // Update local state
                setUsuarios(usuarios.map(u => u.id === editingUser.id ? updatedUser : u));
                setIsModalOpen(false);
                setEditingUser(null);
                alert("Usuario actualizado correctamente.");
            } else {
                alert("Error al actualizar.");
            }
        } catch (error) {
            console.error("Error updating user:", error);
            alert("Error de conexión.");
        }
    };

    return (
        <div className="sophisticated-wrapper">
            <div className="ambient-light light-1"></div>
            <div className="ambient-light light-2"></div>

            <main className="main-view full-width">
                <header className="glass-header">
                    <div className="header-title">
                        <button className="btn-back" onClick={() => navigate(-1)}>← Volver</button>
                        <h1>Equipo de Trabajo</h1>
                        <p>Directorio de personal administrativo y seguridad.</p>
                    </div>
                    <div className="header-actions">
                        <div className="search-pill">
                            <Search size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar funcionario..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </header>

                {/* --- GRID DE TARJETAS --- */}
                <div className="cards-grid">
                    {loading ? (
                        <p className="loading-text">Cargando perfiles...</p>
                    ) : filteredUsuarios.length === 0 ? (
                        <p className="empty-text">No se encontraron usuarios.</p>
                    ) : (
                        filteredUsuarios.map((user) => (
                            <div key={user.id} className="user-card-glass">
                                
                                <div className="card-top">
                                    <div className={`role-badge ${user.rol === 'Seguridad' ? 'badge-blue' : 'badge-purple'}`}>
                                        {user.rol}
                                    </div>
                                    <div className="card-actions">
                                        <button className="icon-btn-mini" onClick={() => handleDelete(user.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="card-profile">
                                    <div className="avatar-large">
                                        {user.nombres.charAt(0)}{user.apellidos.charAt(0)}
                                    </div>
                                    <h3>{user.nombres}</h3>
                                    <p className="lastname">{user.apellidos}</p>
                                    <span className={`status-dot-text ${user.estado === 'Activo' ? 'text-green' : 'text-red'}`}>
                                        ● {user.estado}
                                    </span>
                                </div>

                                <div className="card-details">
                                    <div className="detail-row">
                                        <Fingerprint size={16} className="icon-gray"/>
                                        <span>{user.cedula}</span>
                                    </div>
                                    
                                    <div className="credentials-container">
                                        <div className="cred-row">
                                            <User size={14} /> 
                                            <span className="mono">{user.usuario}</span>
                                        </div>
                                        <div className="cred-row">
                                            <Key size={14} /> 
                                            <span className="mono pass">••••••••</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-footer">
                                    <button className="btn-edit-full" onClick={() => openEditModal(user)}>
                                        Editar Perfil
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* --- MODAL DE EDICIÓN --- */}
            {isModalOpen && editingUser && (
                <div className="modal-overlay">
                    <div className="modal-glass">
                        <div className="modal-header">
                            <h3>Editar Usuario</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="user-summary">
                                <strong>{editingUser.nombres} {editingUser.apellidos}</strong>
                                <span>{editingUser.rol}</span>
                            </div>

                            <div className="input-group">
                                <label>Nueva Contraseña</label>
                                <input 
                                    type="text" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Escriba nueva clave..."
                                />
                            </div>

                            <div className="input-group">
                                <label>Estado</label>
                                <select 
                                    value={newStatus} 
                                    onChange={(e) => setNewStatus(e.target.value)}
                                >
                                    <option value="Activo">Activo</option>
                                    <option value="Inactivo">Inactivo</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                                Cancelar
                            </button>
                            <button className="btn-save" onClick={handleSaveChanges}>
                                <Save size={16} /> Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistorialUsuarios;