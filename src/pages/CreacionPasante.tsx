import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, ArrowLeft, User, Briefcase, Lock, Save } from 'lucide-react';

const CreacionPasante = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        nombres: '',
        apellidos: '',
        cedula: '',
        fechaNacimiento: '',
        institucion: '',
        carrera: '',
        dependencia: '',
        delegado: '',
        horasRequeridas: '',
        discapacidad: 'No',
        tipoDiscapacidad: '',
        email: '',
        telefono: '',
        telefonoEmergencia: '',
        usuario: '',
        password: '',
        foto: null as File | null,
        fotoBase64: ''
    });

    const [errors, setErrors] = useState({
        cedula: '',
        email: '',
        telefono: '',
        telefonoEmergencia: '',
        password: ''
    });

    const [isConverting, setIsConverting] = useState(false);

    const dependencias = [
        "Dirección Ejecutiva",
        "Gestión Meteorológica",
        "Gestión Hidrológica",
        "Tecnologías de la Información",
        "Administrativo Financiero"
    ];

    // --- MANEJADORES ---
    const handleBrowseClick = () => fileInputRef.current?.click();

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    // Auto-generar usuario
    useEffect(() => {
        const generarUsuario = () => {
            const nombreLimpio = formData.nombres.trim().toLowerCase();
            const apellidoLimpio = formData.apellidos.trim().toLowerCase();
            if (nombreLimpio.length > 0 && apellidoLimpio.length > 0) {
                const primerNombre = nombreLimpio.split(' ')[0];
                const letraInicial = primerNombre.charAt(0);
                const primerApellido = apellidoLimpio.split(' ')[0];
                setFormData(prev => ({ ...prev, usuario: `${letraInicial}${primerApellido}` }));
            } else {
                setFormData(prev => ({ ...prev, usuario: '' }));
            }
        };
        const timer = setTimeout(generarUsuario, 500);
        return () => clearTimeout(timer);
    }, [formData.nombres, formData.apellidos]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // 3. ACTUALIZAR VALIDACIÓN NUMÉRICA PARA INCLUIR 'telefonoEmergencia'
        if (name === 'cedula' || name === 'telefono' || name === 'telefonoEmergencia') {
            const soloNumeros = value.replace(/\D/g, '');
            if (soloNumeros.length <= 10) {
                setFormData(prev => ({ ...prev, [name]: soloNumeros }));
                // Limpiar error si llega a 10 dígitos
                if (soloNumeros.length === 10) setErrors(prev => ({ ...prev, [name]: '' }));
            }
            return;
        }

        // Limpiar campo tipoDiscapacidad si cambia a "No"
        if (name === 'discapacidad' && value === 'No') {
            setFormData(prev => ({ ...prev, discapacidad: value, tipoDiscapacidad: '' }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'email' || name === 'password') setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) {
                alert(`⚠️ La imagen es muy pesada. Máximo 10 MB.`);
                if (fileInputRef.current) fileInputRef.current.value = '';
                setFormData(prev => ({ ...prev, foto: null, fotoBase64: '' }));
                return;
            }
            setIsConverting(true);
            try {
                const base64 = await convertToBase64(file);
                setFormData(prev => ({ ...prev, foto: file, fotoBase64: base64 }));
            } catch (error) {
                alert("Hubo un error al leer la imagen.");
            } finally {
                setIsConverting(false);
            }
        }
    };

    const validarFormulario = () => {
        let esValido = true;
        // Reiniciamos errores incluyendo el nuevo
        const nuevosErrores = { cedula: '', email: '', telefono: '', telefonoEmergencia: '', password: '' };

        if (formData.cedula.length !== 10) { nuevosErrores.cedula = 'Requerido 10 dígitos'; esValido = false; }
        if (formData.telefono.length !== 10) { nuevosErrores.telefono = 'Requerido 10 dígitos'; esValido = false; }
        if (formData.telefonoEmergencia.length !== 10) { nuevosErrores.telefonoEmergencia = 'Requerido 10 dígitos'; esValido = false; }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) { nuevosErrores.email = 'Email inválido'; esValido = false; }

        if (formData.password.length < 6) { nuevosErrores.password = 'Mínimo 6 caracteres'; esValido = false; }

        setErrors(nuevosErrores);
        return esValido;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validarFormulario()) return alert("⚠️ Por favor corrija los errores marcados.");

        if (formData.discapacidad === 'Sí' && !formData.tipoDiscapacidad.trim()) {
            return alert("⚠️ Por favor especifique el tipo de discapacidad.");
        }

        const rrhhUser = JSON.parse(localStorage.getItem('user') || '{}');

        const nuevoPasante = {
            ...formData,
            detalleDiscapacidad: formData.tipoDiscapacidad,
            horasRequeridas: Number(formData.horasRequeridas),
            fotoUrl: formData.fotoBase64 || "",
            estado: "No habilitado",
            fechaRegistro: new Date().toISOString(),
            creadoPor: rrhhUser.usuario || 'RRHH'
        };

        delete (nuevoPasante as any).foto;
        delete (nuevoPasante as any).fotoBase64;
        delete (nuevoPasante as any).tipoDiscapacidad;

        try {
            const response = await fetch('http://localhost:3001/pasantes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoPasante),
            });
            if (response.ok) {
                alert(`¡Éxito! Pasante registrado.`);
                navigate('/historialP');
            } else { alert("Error al guardar en base de datos."); }
        } catch (error) { console.error(error); alert("Error de conexión."); }
    };

    // --- ESTILOS EN LÍNEA ---
    const styles = {
        container: { height: '100vh', overflowY: 'auto' as const, boxSizing: 'border-box' as const, backgroundColor: '#F3F4F6', fontFamily: "'Inter', sans-serif", padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' },
        card: { backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '100%', maxWidth: '900px', padding: '40px', border: '1px solid #E5E7EB' },
        header: { marginBottom: '30px', borderBottom: '1px solid #E5E7EB', paddingBottom: '20px' },
        title: { fontSize: '1.875rem', fontWeight: '800', color: '#111827', margin: '0 0 5px 0' },
        subtitle: { color: '#6B7280', margin: 0 },
        sectionTitle: { fontSize: '1.1rem', fontWeight: '700', color: '#374151', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '30px' },
        inputGroup: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
        label: { fontSize: '0.875rem', fontWeight: '600', color: '#374151' },
        input: { padding: '12px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.95rem', outline: 'none', width: '100%', boxSizing: 'border-box' as const, backgroundColor: '#F9FAFB' },
        select: { padding: '12px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.95rem', outline: 'none', width: '100%', backgroundColor: 'white', cursor: 'pointer' },
        uploadBox: { border: '2px dashed #D1D5DB', borderRadius: '12px', padding: '30px', textAlign: 'center' as const, cursor: 'pointer', backgroundColor: '#F9FAFB' },
        buttonContainer: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' },
        btnPrimary: { backgroundColor: '#2563EB', color: 'white', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
        btnSecondary: { backgroundColor: 'white', color: '#374151', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', border: '1px solid #D1D5DB', cursor: 'pointer' }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#6B7280', marginBottom: '15px', fontWeight: '600' }}>
                        <ArrowLeft size={18} /> Volver
                    </button>
                    <h1 style={styles.title}>Nuevo Pasante</h1>
                    <p style={styles.subtitle}>Complete el formulario para registrar un nuevo ingreso.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* SECCIÓN 1: DATOS PERSONALES */}
                    <div style={styles.sectionTitle}>
                        <div style={{ background: '#DBEAFE', padding: '8px', borderRadius: '6px', color: '#2563EB' }}><User size={20} /></div> Información Personal
                    </div>

                    <div style={styles.grid}>
                        <div style={styles.inputGroup}><label style={styles.label}>Nombres</label><input style={styles.input} type="text" name="nombres" value={formData.nombres} onChange={handleChange} placeholder="Ej: Juan Carlos" required /></div>
                        <div style={styles.inputGroup}><label style={styles.label}>Apellidos</label><input style={styles.input} type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} placeholder="Ej: Pérez Loor" required /></div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Cédula</label>
                            <input style={{ ...styles.input, borderColor: errors.cedula ? '#EF4444' : '#D1D5DB' }} type="text" name="cedula" maxLength={10} value={formData.cedula} onChange={handleChange} required />
                            {errors.cedula && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{errors.cedula}</span>}
                        </div>

                        <div style={styles.inputGroup}><label style={styles.label}>Fecha Nacimiento</label><input style={styles.input} type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} required /></div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Correo</label>
                            <input style={{ ...styles.input, borderColor: errors.email ? '#EF4444' : '#D1D5DB' }} type="email" name="email" value={formData.email} onChange={handleChange} required />
                            {errors.email && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{errors.email}</span>}
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Teléfono Personal</label>
                            <input style={{ ...styles.input, borderColor: errors.telefono ? '#EF4444' : '#D1D5DB' }} type="tel" name="telefono" maxLength={10} value={formData.telefono} onChange={handleChange} required />
                            {errors.telefono && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{errors.telefono}</span>}
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Teléfono Emergencia</label>
                            <input style={{ ...styles.input, borderColor: errors.telefonoEmergencia ? '#EF4444' : '#D1D5DB' }} type="tel" name="telefonoEmergencia" maxLength={10} value={formData.telefonoEmergencia} onChange={handleChange} required />
                            {errors.telefonoEmergencia && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{errors.telefonoEmergencia}</span>}
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Discapacidad</label>
                            <select style={styles.select} name="discapacidad" value={formData.discapacidad} onChange={handleChange}>
                                <option value="No">No</option>
                                <option value="Sí">Sí</option>
                            </select>
                        </div>

                        {formData.discapacidad === 'Sí' && (
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Especifique Discapacidad</label>
                                <input
                                    style={{ ...styles.input, borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }}
                                    type="text"
                                    name="tipoDiscapacidad"
                                    value={formData.tipoDiscapacidad}
                                    onChange={handleChange}
                                    placeholder="Ej: Visual 30%, Motriz..."
                                    autoFocus
                                    required
                                />
                            </div>
                        )}

                        {/* FOTO */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={styles.label}>Fotografía</label>
                            <div style={styles.uploadBox} onClick={handleBrowseClick}>
                                <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'none' }} />
                                {formData.fotoBase64 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                        <img src={formData.fotoBase64} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%', border: '4px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                        <span style={{ color: '#2563EB', fontWeight: '600' }}>Cambiar imagen</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <UploadCloud size={40} color="#9CA3AF" />
                                        <span style={{ color: '#4B5563', fontWeight: '500' }}>Subir foto (Máx 10MB)</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: ACADÉMICO */}
                    <div style={styles.sectionTitle}>
                        <div style={{ background: '#FCE7F3', padding: '8px', borderRadius: '6px', color: '#DB2777' }}><Briefcase size={20} /></div> Datos Académicos
                    </div>
                    <div style={styles.grid}>
                        <div style={styles.inputGroup}><label style={styles.label}>Institución</label><input style={styles.input} type="text" name="institucion" value={formData.institucion} onChange={handleChange} required /></div>
                        <div style={styles.inputGroup}><label style={styles.label}>Carrera</label><input style={styles.input} type="text" name="carrera" value={formData.carrera} onChange={handleChange} required /></div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Dependencia</label>
                            <select style={styles.select} name="dependencia" value={formData.dependencia} onChange={handleChange} required>
                                <option value="">Seleccione...</option>
                                {dependencias.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Delegado Responsable</label>
                            <input
                                style={styles.input}
                                type="text"
                                name="delegado"
                                value={formData.delegado}
                                onChange={handleChange}
                                placeholder="Ej: Ing. María López"
                                required
                            />
                        </div>

                        <div style={styles.inputGroup}><label style={styles.label}>Horas Requeridas</label><input style={styles.input} type="number" name="horasRequeridas" value={formData.horasRequeridas} onChange={handleChange} required /></div>
                    </div>

                    {/* SECCIÓN 3: CREDENCIALES */}
                    <div style={styles.sectionTitle}>
                        <div style={{ background: '#FEF3C7', padding: '8px', borderRadius: '6px', color: '#D97706' }}><Lock size={20} /></div> Credenciales
                    </div>
                    <div style={styles.grid}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Usuario (Auto)</label>
                            <div style={{ position: 'relative' }}>
                                <input style={{ ...styles.input, backgroundColor: '#F3F4F6', fontWeight: 'bold', color: '#4B5563' }} type="text" value={formData.usuario} readOnly />
                                <User size={16} style={{ position: 'absolute', right: '12px', top: '16px', color: '#9CA3AF' }} />
                            </div>
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Contraseña Temporal</label>
                            <div style={{ position: 'relative' }}>
                                <input style={{ ...styles.input, borderColor: errors.password ? '#EF4444' : '#D1D5DB' }} type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••" required />
                                <Lock size={16} style={{ position: 'absolute', right: '12px', top: '16px', color: '#9CA3AF' }} />
                            </div>
                            {errors.password && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{errors.password}</span>}
                        </div>
                    </div>

                    <div style={styles.buttonContainer}>
                        <button type="button" style={styles.btnSecondary} onClick={() => navigate(-1)}>Cancelar</button>
                        <button type="submit" style={{ ...styles.btnPrimary, opacity: isConverting ? 0.7 : 1 }} disabled={isConverting}>
                            <Save size={18} /> {isConverting ? 'Procesando...' : 'Registrar Pasante'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreacionPasante;