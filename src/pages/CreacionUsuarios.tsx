import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X, ArrowLeft } from 'lucide-react';
import '../styles/CreacionUsuarios.css';

const CreacionUsuarios = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        nombres: '',
        apellidos: '',
        cedula: '',
        rol: '',
        usuario: '',
        password: '',
        estado: 'Activo'
    });

    const rolesDisponibles = [
        "Talento Humano",
        "Seguridad" 
    ];

    useEffect(() => {
        const generarUsuario = () => {
            const nombreLimpio = formData.nombres.trim().toLowerCase();
            const apellidoLimpio = formData.apellidos.trim().toLowerCase();

            if (nombreLimpio.length > 0 && apellidoLimpio.length > 0) {
                const primerNombre = nombreLimpio.split(' ')[0];
                const letraInicial = primerNombre.charAt(0);
                const primerApellido = apellidoLimpio.split(' ')[0];
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
        
        if (!formData.rol) {
            alert("Por favor selecciona un rol.");
            return;
        }

        const nuevoUsuario = { ...formData };

        try {
            const response = await fetch('http://localhost:3001/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoUsuario),
            });

            if (response.ok) {
                alert(`Usuario ${formData.usuario} creado exitosamente.`);
                navigate(-1); 
            } else {
                const errorData = await response.json();
                console.error("Server Error:", errorData);
                alert(`Error al guardar: ${errorData.error || errorData.message || 'Desconocido'}`);
            }
        } catch (error) {
            console.error("Network Error:", error);
            alert("Error de conexión con el servidor.");
        }
    };

    return (
        <div className="creacion-usuarios-scope">
            
            <main className="cu-main-view">
                
                <header className="cu-header">
                    <button className="cu-btn-back" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} /> Volver
                    </button>
                    <div className="cu-title">
                        <h1>Gestión de Usuarios</h1>
                        <p>Directorio de personal administrativo y seguridad.</p>
                    </div>
                </header>

                <div className="cu-form-card">
                    <form onSubmit={handleSubmit}>
                        
                        {/* SECCIÓN 1 */}
                        <div className="cu-section-title">
                            <h3>Datos del Funcionario</h3>
                            <span className="cu-divider"></span>
                        </div>

                        <div className="cu-grid">
                            <div className="cu-input-group">
                                <label className="cu-label">Nombres</label>
                                <input 
                                    className="cu-input"
                                    type="text" name="nombres" 
                                    placeholder="Ej: Juan Carlos" 
                                    value={formData.nombres} onChange={handleChange} required 
                                />
                            </div>

                            <div className="cu-input-group">
                                <label className="cu-label">Apellidos</label>
                                <input 
                                    className="cu-input"
                                    type="text" name="apellidos" 
                                    placeholder="Ej: Pérez Gómez" 
                                    value={formData.apellidos} onChange={handleChange} required 
                                />
                            </div>

                            <div className="cu-input-group">
                                <label className="cu-label">Número de Cédula</label>
                                <input 
                                    className="cu-input"
                                    type="text" name="cedula" 
                                    placeholder="1700000000" maxLength={10}
                                    value={formData.cedula} onChange={handleChange} required 
                                />
                            </div>

                            <div className="cu-input-group">
                                <label className="cu-label">Rol Asignado</label>
                                <select className="cu-select" name="rol" value={formData.rol} onChange={handleChange} required>
                                    <option value="">Seleccione un rol...</option>
                                    {rolesDisponibles.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="cu-input-group">
                                <label className="cu-label">Estado Inicial</label>
                                <select className="cu-select" name="estado" value={formData.estado} onChange={handleChange}>
                                    <option value="Activo">Activo</option>
                                    <option value="Inactivo">Inactivo</option>
                                </select>
                            </div>
                        </div>

                        {/* SECCIÓN 2 */}
                        <div className="cu-section-title">
                            <h3>Credenciales de Sistema</h3>
                            <span className="cu-divider"></span>
                        </div>

                        <div className="cu-grid">
                            <div className="cu-input-group">
                                <label className="cu-label">Usuario (Auto-generado)</label>
                                <input 
                                    className="cu-input cu-readonly"
                                    type="text" name="usuario" 
                                    value={formData.usuario} 
                                    readOnly 
                                />
                                <small className="cu-helper-text">
                                    {formData.usuario ? `Acceso: ${formData.usuario}` : "Formato: letra nombre + apellido"}
                                </small>
                            </div>

                            <div className="cu-input-group">
                                <label className="cu-label">Contraseña Temporal</label>
                                <input 
                                    className="cu-input"
                                    type="password" name="password" 
                                    placeholder="••••••••" 
                                    value={formData.password} onChange={handleChange} required 
                                />
                            </div>
                        </div>

                        <div className="cu-footer">
                            <button type="button" className="cu-btn-cancel" onClick={() => navigate(-1)}>
                                <X size={18} /> Cancelar
                            </button>
                            <button type="submit" className="cu-btn-save">
                                <Save size={18} /> Guardar Usuario
                            </button>
                        </div>

                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreacionUsuarios;