const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

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

// --- RUTAS ---

app.get('/pasantes', (req, res) => {
    const sql = 'SELECT * FROM pasantes';
    db.query(sql, (err, results) => {
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
    const sql = `INSERT INTO pasantes (nombres, apellidos, cedula, fecha_nacimiento, institucion, carrera, dependencia, horas_requeridas, discapacidad, email, telefono, usuario, password, foto_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [nombres, apellidos, cedula, fechaNacimiento, institucion, carrera, dependencia, horasRequeridas, discapacidad, email, telefono, usuario, password, filename];
    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al crear pasante', details: err });
        res.json({ message: 'Pasante creado', id: result.insertId });
    });
});

// 4. ACTUALIZAR PASANTE (PATCH) - CORREGIDO
app.patch('/pasantes/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body;

    console.log(`[PATCH] Actualizando ID ${id}`);

    // CASO A: Actualización de Documentos Iniciales
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

    // CASO B: Subida de INFORME FINAL (Solo si es un archivo nuevo Base64)
    // CORRECCIÓN: Si informeUrl no es string o no es base64, PASAMOS AL CASO C
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

    // CASO C: Actualización General (Horas, Password, Estado, etc.)
    const dbMap = {
        horasCompletadas: 'horas_completadas',
        horasRequeridas: 'horas_requeridas',
        fechaNacimiento: 'fecha_nacimiento', 
        fotoUrl: 'foto_url'
    };

    // Campos que debemos ignorar porque son archivos o metadatos
    const camposIgnorados = [
        'id', 'fechaRegistro', 'informeFinalSubido', 
        'docHojaVida', 'docCartaSolicitud', 'docAcuerdoConfidencialidad', 'docCopiaCedula'
    ];

    const updates = [];
    const values = [];

    Object.keys(body).forEach(key => {
        // 1. Ignorar campos prohibidos
        if (camposIgnorados.includes(key) || body[key] === undefined) return;
        
        // 2. CORRECCIÓN VITAL: Si es informeUrl y no es base64, lo ignoramos
        if (key === 'informeUrl') {
            if (!body[key] || typeof body[key] !== 'string' || !body[key].startsWith('data:')) return;
        }

        // 3. Ignorar fotoUrl si es un link viejo
        if (key === 'fotoUrl' && (!body[key] || !body[key].startsWith('data:'))) return;

        let value = body[key];
        
        // 4. Formatear fechas
        if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
            value = value.slice(0, 19).replace('T', ' ');
        }

        const dbCol = dbMap[key] || key;
        
        // 5. Agregar a la query si es un valor simple
        if (typeof value !== 'object' && value !== null) {
            updates.push(`${dbCol} = ?`);
            values.push(value);
        }
    });

    if (updates.length === 0) {
        console.log("No hay campos válidos para actualizar");
        return res.status(400).json({ message: 'Nada que actualizar' });
    }

    const sql = `UPDATE pasantes SET ${updates.join(', ')} WHERE id = ?`;
    values.push(id);

    console.log("SQL Generado:", sql); // Para debug

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

// Admin Users
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
    const sql = `INSERT INTO usuarios_admin (nombres, apellidos, cedula, rol, usuario, password, estado) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [nombres, apellidos, cedula, rol, usuario, password, estado], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Usuario creado', id: result.insertId });
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Servidor MySQL corriendo en http://localhost:${PORT}`);
});