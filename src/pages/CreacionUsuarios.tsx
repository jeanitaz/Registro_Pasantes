import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, UserCog, Save, X } from 'lucide-react';
import '../styles/CreacionUsuarios.css';

const CreacionUsuarios = () => {
    const navigate = useNavigate();

    // Estado del formulario
    const [formData, setFormData] = useState({
        nombres: '',
        apellidos: '',
        cedula: '',
        rol: '',
        usuario: '',
        password: '',
        estado: 'Activo' // Por defecto
    });

    const rolesDisponibles = [
        "Talento Humano"
    ];

    // --- LÓGICA DE GENERACIÓN DE USUARIO ---
    useEffect(() => {
        const generarUsuario = () => {
            const nombreLimpio = formData.nombres.trim().toLowerCase();
            const apellidoLimpio = formData.apellidos.trim().toLowerCase();

            if (nombreLimpio.length > 0 && apellidoLimpio.length > 0) {
                // 1. Primera letra del PRIMER nombre
                const primerNombre = nombreLimpio.split(' ')[0];
                const letraInicial = primerNombre.charAt(0);

                // 2. PRIMER apellido completo
                const primerApellido = apellidoLimpio.split(' ')[0];

                // 3. Concatenar
                setFormData(prev => ({ 
                    ...prev, 
                    usuario: `${letraInicial}${primerApellido}` 
                }));
            } else {
                setFormData(prev => ({ ...prev, usuario: '' }));
            }
        };

        const timer = setTimeout(generarUsuario, 300);
        return () => clearTimeout(timer);
        
    }, [formData.nombres, formData.apellidos]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        // NO enviamos fechaCreacion desde aquí, dejamos que MySQL use DEFAULT CURRENT_TIMESTAMP
        const nuevoUsuario = { ...formData };

        try {
            // Nota: Este endpoint espera JSON, no FormData, porque no hay imágenes
            const response = await fetch('http://localhost:3001/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoUsuario),
            });

            if (response.ok) {
                alert(`Usuario ${formData.usuario} creado exitosamente.`);
                navigate(-1); // Volver
            } else {
                const errorData = await response.json();
                console.error("Error del servidor:", errorData);
                alert("Error al guardar el usuario en la base de datos.");
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión con el servidor.");
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
                        <h1>Gestión de Usuarios</h1>
                        <p>Alta de personal administrativo y seguridad.</p>
                    </div>
                    <div className="role-icon-preview">
                        {formData.rol === 'Seguridad' ? <Shield size={32} className="text-blue"/> : <UserCog size={32} className="text-purple"/>}
                    </div>
                </header>

                <div className="form-container-compact">
                    <form className="glass-card form-content" onSubmit={handleSubmit}>
                        
                        <div className="form-section-title">
                            <h3>Datos del Funcionario</h3>
                            <span className="divider"></span>
                        </div>

                        <div className="form-grid">
                            <div className="input-group">
                                <label>Nombres</label>
                                <input 
                                    type="text" name="nombres" 
                                    placeholder="Ej: María José" 
                                    value={formData.nombres} onChange={handleChange} required 
                                />
                            </div>

                            <div className="input-group">
                                <label>Apellidos</label>
                                <input 
                                    type="text" name="apellidos" 
                                    placeholder="Ej: López Torres" 
                                    value={formData.apellidos} onChange={handleChange} required 
                                />
                            </div>

                            <div className="input-group">
                                <label>Número de Cédula</label>
                                <input 
                                    type="text" name="cedula" 
                                    placeholder="1700000000" maxLength={10}
                                    value={formData.cedula} onChange={handleChange} required 
                                />
                            </div>

                            <div className="input-group">
                                <label>Rol Asignado</label>
                                <select name="rol" value={formData.rol} onChange={handleChange} required>
                                    <option value="">Seleccione un rol...</option>
                                    {rolesDisponibles.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="input-group">
                                <label>Estado Inicial</label>
                                <select name="estado" value={formData.estado} onChange={handleChange}>
                                    <option value="Activo">Activo</option>
                                    <option value="Inactivo">Inactivo</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-section-title">
                            <h3>Credenciales de Sistema</h3>
                            <span className="divider"></span>
                        </div>

                        <div className="form-grid">
                            <div className="input-group">
                                <label>Usuario (Auto-generado)</label>
                                <input 
                                    type="text" name="usuario" 
                                    value={formData.usuario} readOnly 
                                    className="input-readonly"
                                />
                                <small className="helper-text">
                                    {formData.usuario ? `Acceso: ${formData.usuario}@inamhi.gob.ec` : "Formato: letra nombre + apellido"}
                                </small>
                            </div>

                            <div className="input-group">
                                <label>Contraseña Temporal</label>
                                <input 
                                    type="password" name="password" 
                                    placeholder="••••••••" 
                                    value={formData.password} onChange={handleChange} required 
                                />
                            </div>
                        </div>

                        <div className="form-actions-footer">
                            <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>
                                <X size={18} /> Cancelar
                            </button>
                            <button type="submit" className="btn-save">
                                <Save size={18} /> Crear Usuario
                            </button>
                        </div>

                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreacionUsuarios;