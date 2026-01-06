const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// AUMENTAR EL LÍMITE DEL BODY PARSER
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '0993643838Jc', 
    database: 'sistema_inamhi'
});

db.connect(err => {
    if (err) console.error('Error MySQL:', err);
    else console.log('✅ Conectado a MySQL exitosamente');
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = './uploads/';
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const saveBase64ToFile = (base64String, prefix) => {
    if (!base64String) return null;
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `${prefix}-${Date.now()}.pdf`;
    const filePath = path.join(__dirname, 'uploads', filename);
    try {
        fs.writeFileSync(filePath, buffer);
        return filename; 
    } catch (e) {
        console.error("Error guardando archivo:", e);
        return null;
    }
};

// --- RUTAS DE PASANTES ---

// 1. OBTENER TODOS LOS PASANTES (CORREGIDO: AHORA ENVÍA DATOS DE DISCIPLINA)
app.get('/pasantes', (req, res) => {
    const { usuario, password } = req.query;
    let sql = 'SELECT * FROM pasantes';
    let params = [];

    if (usuario && password) {
        sql += ' WHERE (usuario = ? OR email = ?) AND password = ?';
        params = [usuario, usuario, password];
    }

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json(err);
        
        const pasantesFormateados = results.map(p => ({
            id: p.id,
            nombres: p.nombres,
            apellidos: p.apellidos,
            cedula: p.cedula,
            carrera: p.carrera,
            institucion: p.institucion,
            dependencia: p.dependencia,
            horasRequeridas: p.horas_requeridas,
            horasCompletadas: p.horas_completadas,
            usuario: p.usuario,
            password: p.password,
            estado: p.estado,
            fechaRegistro: p.fecha_registro,
            
            // --- AQUÍ ESTABA EL ERROR: FALTABAN ESTOS CAMPOS ---
            faltas: p.faltas || 0,
            atrasos: p.atrasos || 0,
            llamadosAtencion: p.llamados_atencion || 0, // Mapeamos snake_case a camelCase
            // ---------------------------------------------------

            fotoUrl: p.foto_url ? `http://localhost:3001/uploads/${p.foto_url}` : null,
            docHojaVida: p.doc_hoja_vida ? `http://localhost:3001/uploads/${p.doc_hoja_vida}` : null,
            docCartaSolicitud: p.doc_carta_solicitud ? `http://localhost:3001/uploads/${p.doc_carta_solicitud}` : null,
            docAcuerdoConfidencialidad: p.doc_acuerdo_confidencialidad ? `http://localhost:3001/uploads/${p.doc_acuerdo_confidencialidad}` : null,
            docCopiaCedula: p.doc_copia_cedula ? `http://localhost:3001/uploads/${p.doc_copia_cedula}` : null,
            informeUrl: p.informe_url ? `http://localhost:3001/uploads/${p.informe_url}` : null,
            informeFinalSubido: !!p.informe_url
        }));
        
        res.json(pasantesFormateados);
    });
});

app.get('/pasantes/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM pasantes WHERE id = ?';
    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ message: 'Pasante no encontrado' });
        const p = results[0];
        const pasante = {
            ...p,
            llamadosAtencion: p.llamados_atencion || 0,
            docHojaVida: p.doc_hoja_vida ? `http://localhost:3001/uploads/${p.doc_hoja_vida}` : null,
            docCartaSolicitud: p.doc_carta_solicitud ? `http://localhost:3001/uploads/${p.doc_carta_solicitud}` : null,
            docAcuerdoConfidencialidad: p.doc_acuerdo_confidencialidad ? `http://localhost:3001/uploads/${p.doc_acuerdo_confidencialidad}` : null,
            docCopiaCedula: p.doc_copia_cedula ? `http://localhost:3001/uploads/${p.doc_copia_cedula}` : null,
            informeUrl: p.informe_url ? `http://localhost:3001/uploads/${p.informe_url}` : null,
            fotoUrl: p.foto_url ? `http://localhost:3001/uploads/${p.foto_url}` : null
        };
        res.json(pasante);
    });
});

app.post('/pasantes', upload.single('foto'), (req, res) => {
    const { nombres, apellidos, cedula, fechaNacimiento, institucion, carrera, dependencia, horasRequeridas, discapacidad, email, telefono, usuario, password } = req.body;
    const filename = req.file ? req.file.filename : null;
    const fechaRegistro = new Date(); // Generamos fecha actual

    const sql = `INSERT INTO pasantes (nombres, apellidos, cedula, fecha_nacimiento, institucion, carrera, dependencia, horas_requeridas, discapacidad, email, telefono, usuario, password, foto_url, fecha_registro) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [nombres, apellidos, cedula, fechaNacimiento, institucion, carrera, dependencia, horasRequeridas, discapacidad, email, telefono, usuario, password, filename, fechaRegistro];
    
    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al crear pasante', details: err });
        res.json({ message: 'Pasante creado', id: result.insertId });
    });
});

// 4. ACTUALIZAR PASANTE (PATCH)
app.patch('/pasantes/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body;

    console.log(`[PATCH] Actualizando ID ${id}, Datos:`, Object.keys(body));

    // CASO A: Actualización de Documentación
    if (body.documentacionCompleta) {
        try {
            const doc1 = saveBase64ToFile(body.docHojaVida, 'hv');
            const doc2 = saveBase64ToFile(body.docCartaSolicitud, 'carta');
            const doc3 = saveBase64ToFile(body.docAcuerdoConfidencialidad, 'acuerdo');
            const doc4 = saveBase64ToFile(body.docCopiaCedula, 'cedula');

            let sql = "UPDATE pasantes SET estado = 'Activo', documentacion_completa = 1";
            const params = [];
            if (doc1) { sql += ", doc_hoja_vida = ?"; params.push(doc1); }
            if (doc2) { sql += ", doc_carta_solicitud = ?"; params.push(doc2); }
            if (doc3) { sql += ", doc_acuerdo_confidencialidad = ?"; params.push(doc3); }
            if (doc4) { sql += ", doc_copia_cedula = ?"; params.push(doc4); }
            sql += " WHERE id = ?";
            params.push(id);

            db.query(sql, params, (err, result) => {
                if (err) return res.status(500).json({ error: 'Error SQL docs' });
                res.json({ message: 'Documentación guardada' });
            });
        } catch (error) {
            res.status(500).json({ error: 'Error procesando archivos' });
        }
        return; 
    }

    // CASO B: Subida de INFORME FINAL
    else if (body.informeUrl && typeof body.informeUrl === 'string' && body.informeUrl.startsWith('data:')) {
        try {
            const filename = saveBase64ToFile(body.informeUrl, 'informe_final');
            if (!filename) return res.status(400).json({ error: 'PDF inválido' });

            const sql = "UPDATE pasantes SET informe_url = ? WHERE id = ?";
            db.query(sql, [filename, id], (err, result) => {
                if (err) return res.status(500).json({ error: 'Error SQL informe' });
                res.json({ message: 'Informe final subido' });
            });
        } catch (error) {
            res.status(500).json({ error: 'Error interno informe' });
        }
        return;
    }

    // CASO C: Actualización General
    const dbMap = {
        horasCompletadas: 'horas_completadas',
        horasRequeridas: 'horas_requeridas',
        fechaNacimiento: 'fecha_nacimiento', 
        fotoUrl: 'foto_url',
        llamadosAtencion: 'llamados_atencion' // MAPEO CRÍTICO
    };

    const camposIgnorados = [
        'id', 'fechaRegistro', 'informeFinalSubido', 
        'docHojaVida', 'docCartaSolicitud', 'docAcuerdoConfidencialidad', 'docCopiaCedula'
    ];

    const updates = [];
    const values = [];

    Object.keys(body).forEach(key => {
        if (camposIgnorados.includes(key) || body[key] === undefined) return;
        
        if (key === 'informeUrl') {
            if (!body[key] || typeof body[key] !== 'string' || !body[key].startsWith('data:')) return;
        }
        if (key === 'fotoUrl' && (!body[key] || typeof body[key] !== 'string' || !body[key].startsWith('data:'))) return;

        let value = body[key];
        if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
            value = value.slice(0, 19).replace('T', ' ');
        }

        const dbCol = dbMap[key] || key;
        
        if (typeof value !== 'object' && value !== null) {
            updates.push(`${dbCol} = ?`);
            values.push(value);
        }
    });

    if (updates.length === 0) {
        return res.status(400).json({ message: 'Nada que actualizar' });
    }

    const sql = `UPDATE pasantes SET ${updates.join(', ')} WHERE id = ?`;
    values.push(id);

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error SQL Update:", err);
            return res.status(500).json(err);
        }
        res.json({ message: 'Datos actualizados correctamente' });
    });
});

app.delete('/pasantes/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM pasantes WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Pasante eliminado' });
    });
});

// --- RUTA DE AUDITORÍA (Logs combinados) ---
app.get('/auditoria', (req, res) => {
    const sql = `
        (SELECT id, CONCAT(nombres, ' ', apellidos) as nombre, 'Pasante' as rol, fecha_registro as fecha FROM pasantes)
        UNION
        (SELECT id, CONCAT(nombres, ' ', apellidos) as nombre, rol, fecha_registro as fecha FROM usuarios_admin)
        ORDER BY fecha DESC
        LIMIT 5
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error en auditoría:", err);
            return res.status(500).json({ error: 'Error obteniendo logs' });
        }
        res.json(results);
    });
});

// Rutas Usuarios Admin
app.get('/usuarios', (req, res) => {
    const { usuario, password } = req.query;
    if (usuario && password) {
        const sql = 'SELECT * FROM usuarios_admin WHERE usuario = ? AND password = ?';
        db.query(sql, [usuario, password], (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        });
    } else {
        db.query('SELECT * FROM usuarios_admin', (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        });
    }
});

app.post('/usuarios', (req, res) => {
    const { nombres, apellidos, cedula, rol, usuario, password, estado } = req.body;
    const fechaRegistro = new Date();
    const sql = `INSERT INTO usuarios_admin (nombres, apellidos, cedula, rol, usuario, password, estado, fecha_registro) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [nombres, apellidos, cedula, rol, usuario, password, estado, fechaRegistro], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Usuario creado', id: result.insertId });
    });
});

app.patch('/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body;
    const updates = [];
    const values = [];

    if (body.password) { updates.push("password = ?"); values.push(body.password); }
    if (body.estado) { updates.push("estado = ?"); values.push(body.estado); }

    if (updates.length === 0) return res.status(400).json({ message: 'Nada que actualizar' });

    const sql = `UPDATE usuarios_admin SET ${updates.join(', ')} WHERE id = ?`;
    values.push(id);

    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Usuario actualizado correctamente' });
    });
});

app.delete('/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM usuarios_admin WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Usuario eliminado' });
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Servidor MySQL corriendo en http://localhost:${PORT}`);
});