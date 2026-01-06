import { useState, useEffect, useRef, type ChangeEvent } from 'react'; 
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style'; 

import {
  Clock, LogOut,
  Briefcase, FileText,
  Upload, CheckCircle,
  Activity, Lock, Download, Loader2,
  ClipboardList,
  FileSpreadsheet
} from 'lucide-react';
import '../styles/PasanteHome.css';

interface HistorialItem {
  fecha: string;
  tipo: string;
  detalle: string;
  estado: string;
}

interface PasanteData {
  id: string; 
  nombre: string;
  nombres: string;
  apellidos: string;
  carrera: string;
  estado: string;
  horasRequeridas: number;
  horasCompletadas: number;
  faltas: number;
  atrasos: number;
  llamadosAtencion: number;
  historialReciente: HistorialItem[];
  informeSubido?: boolean;
  informeUrl?: string;
  fotoUrl?: string; 
}

const PasanteHome = () => {
  const navigate = useNavigate();
  const [pasante, setPasante] = useState<PasanteData | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null); 

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      // Aseguramos que informeUrl venga completo si existe
      setPasante({
        ...userData,
        id: userData.id, 
        nombre: userData.nombre || `${userData.nombres} ${userData.apellidos}`,
        horasCompletadas: userData.horasCompletadas || 0,
        horasRequeridas: Number(userData.horasRequeridas) || 0,
        faltas: userData.faltas || 0,
        atrasos: userData.atrasos || 0,
        llamadosAtencion: userData.llamadosAtencion || 0,
        historialReciente: userData.historialReciente || [
          { fecha: '2024-01-20', tipo: 'Sistema', detalle: 'Cuenta creada exitosamente', estado: 'ok' }
        ],
        // Verificamos si tiene URL de informe
        informeSubido: !!userData.informeUrl,
        informeUrl: userData.informeUrl,
        fotoUrl: userData.fotoUrl
      });
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    if (window.confirm("¿Deseas cerrar tu sesión?")) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      navigate('/login');
    }
  };

  const handleRegistroHoras = () => {
    navigate('/horas'); 
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadExcel = () => {
    if (!pasante) return;

    const tituloStyle = { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2563EB" } }, alignment: { horizontal: "center", vertical: "center" } };
    const labelStyle = { font: { bold: true, color: { rgb: "334155" } } };
    const headerTablaStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "3B82F6" } }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "FFFFFF" } }, bottom: { style: "thin", color: { rgb: "FFFFFF" } }, right: { style: "thin", color: { rgb: "FFFFFF" } } } };
    const celdaStyle = { alignment: { horizontal: "left", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };
    const celdaCentradaStyle = { alignment: { horizontal: "center", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } } };
    const resumenHeaderStyle = { font: { bold: true, sz: 12, color: { rgb: "1E293B" } }, fill: { fgColor: { rgb: "F1F5F9" } }, border: { bottom: { style: "thin", color: { rgb: "CBD5E1" } } } };

    const wsData: any[] = [];
    wsData.push([{ v: "REPORTE DE ACTIVIDADES - PASANTÍAS", s: tituloStyle }, { v: "", s: tituloStyle }, { v: "", s: tituloStyle }, { v: "", s: tituloStyle }]);
    wsData.push([]);
    wsData.push([{ v: "Estudiante:", s: labelStyle }, { v: pasante.nombre }]);
    wsData.push([{ v: "Carrera:", s: labelStyle }, { v: pasante.carrera }]);
    wsData.push([{ v: "Estado:", s: labelStyle }, { v: pasante.estado }]);
    wsData.push([{ v: "Fecha de Reporte:", s: labelStyle }, { v: new Date().toLocaleDateString() }]);
    wsData.push([]);
    wsData.push([{ v: "FECHA", s: headerTablaStyle }, { v: "TIPO", s: headerTablaStyle }, { v: "DETALLE DE ACTIVIDAD", s: headerTablaStyle }, { v: "ESTADO", s: headerTablaStyle }]);

    if (pasante.historialReciente.length > 0) {
        pasante.historialReciente.forEach((item) => {
            wsData.push([{ v: item.fecha, s: celdaCentradaStyle }, { v: item.tipo, s: celdaCentradaStyle }, { v: item.detalle, s: celdaStyle }, { v: item.estado, s: celdaCentradaStyle }]);
        });
    } else {
        wsData.push([{ v: "No hay registros disponibles", s: celdaStyle }]);
    }

    wsData.push([]);
    const rowIndexResumen = wsData.length; 
    wsData.push([{ v: "RESUMEN FINAL DE HORAS", s: resumenHeaderStyle }, { v: "", s: resumenHeaderStyle }]);
    wsData.push([{ v: "Meta Requerida:", s: labelStyle }, { v: `${pasante.horasRequeridas} hrs` }]);
    wsData.push([{ v: "Horas Completadas:", s: labelStyle }, { v: `${pasante.horasCompletadas} hrs` }]);
    wsData.push([{ v: "Porcentaje:", s: labelStyle }, { v: `${((pasante.horasCompletadas / pasante.horasRequeridas) * 100).toFixed(1)}%` }]);
    wsData.push([{ v: "Total Atrasos:", s: labelStyle }, { v: pasante.atrasos }]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 50 }, { wch: 15 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, { s: { r: rowIndexResumen, c: 0 }, e: { r: rowIndexResumen, c: 1 } }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Reporte_InternApp_${pasante.nombre.replace(/\s+/g, '_')}.xlsx`);
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file && pasante) {
      if (file.type !== 'application/pdf') {
        alert("❌ Error: Solo se permiten archivos PDF.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert("❌ El archivo es muy pesado (Máx 2MB para esta demo).");
        return;
      }

      setIsUploading(true);

      try {
        const base64Pdf = await convertToBase64(file);

        // Enviamos el PDF al servidor
        const response = await fetch(`http://localhost:3001/pasantes/${pasante.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                informeFinalSubido: true, // Bandera para frontend (opcional)
                informeUrl: base64Pdf     // El contenido real
            })
        });

        if (response.ok) {
            alert(`✅ Archivo "${file.name}" subido correctamente.`);
            
            // Recargar datos desde el servidor para obtener la URL correcta
            // (El servidor guardó el archivo y nos devolverá la URL http://... no el base64)
            const refreshResponse = await fetch(`http://localhost:3001/pasantes/${pasante.id}`);
            if (refreshResponse.ok) {
                const freshData = await refreshResponse.json();
                
                setPasante(prev => prev ? ({ 
                    ...prev, 
                    informeSubido: true,
                    informeUrl: freshData.informeUrl 
                }) : null);
                
                // Actualizar localStorage para persistencia
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({
                    ...currentUser,
                    informeUrl: freshData.informeUrl
                }));
            }

        } else {
            throw new Error("No se pudo guardar en la base de datos.");
        }

      } catch (error) {
        console.error(error);
        alert("❌ Error al subir. Intenta de nuevo.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  if (!pasante) return <div className="loading-screen">Cargando perfil...</div>;

  const porcentaje = pasante.horasRequeridas > 0
    ? Math.min((pasante.horasCompletadas / pasante.horasRequeridas) * 100, 100)
    : 0;

  const esCompletado = porcentaje >= 100;
  const limiteLlamados = 3;
  const esCritico = pasante.llamadosAtencion >= limiteLlamados;
  const tieneFoto = pasante.fotoUrl && pasante.fotoUrl.startsWith('http');

  return (
    <div className="layout-wrapper">
      <aside className="modern-sidebar">
        <div className="sidebar-header">
          <div className="logo-box"><Briefcase size={24} /></div>
          <span className="logo-text">InternApp</span>
        </div>
        <div className="nav-links">
          <button className="nav-item active">
            <div className="nav-icon"><Activity size={20} /></div>
            <span>Dashboard</span>
          </button>
          <button onClick={handleRegistroHoras} className="nav-item">
            <div className="nav-icon"><ClipboardList size={20} /></div>
            <span>Registro de Horas</span>
          </button>
          <button onClick={handleLogout} className="nav-item logout-item">
            <div className="nav-icon"><LogOut size={20} /></div>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="top-header">
          <div>
            <h1>Hola, {pasante.nombre.split(' ')[0]} 👋</h1>
            <p className="subtitle">Resumen de tu pasantía en {pasante.carrera}</p>
          </div>
          <div className="profile-pill">
            <div className={`status-dot ${esCritico ? 'dot-red' : 'dot-green'}`}></div>
            <span>{pasante.estado || "Activo"}</span>
            <div className="avatar-circle" style={{ overflow: 'hidden', padding: tieneFoto ? 0 : '' }}>
                {tieneFoto ? (
                    <img src={pasante.fotoUrl} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    pasante.nombre.charAt(0)
                )}
            </div>
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="card hero-card">
            <div className="hero-content">
              <h3>Progreso General</h3>
              <p>Has completado el <strong>{porcentaje.toFixed(1)}%</strong> de tus horas.</p>
              <div className="stats-row">
                <div className="stat-item"><span className="label">Completadas</span><span className="value">{pasante.horasCompletadas}h</span></div>
                <div className="stat-separator">/</div>
                <div className="stat-item"><span className="label">Meta</span><span className="value">{pasante.horasRequeridas}h</span></div>
              </div>
            </div>
            <div className="circular-chart-wrapper">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="circle" strokeDasharray={`${porcentaje}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="percentage-text">
                {esCompletado ? <CheckCircle size={32} color="#10b981" /> : <Clock size={32} color="#6366f1" />}
              </div>
            </div>
          </div>

          <div className="kpi-column">
             <div className="card kpi-card">
               <div className="kpi-icon-bg bg-blue"><Clock size={20} /></div>
               <div><span className="kpi-label">Atrasos</span><div className="kpi-value-row"><span className="kpi-number">{pasante.atrasos}</span></div></div>
             </div>
             <div className="card kpi-card">
               <div className="kpi-icon-bg bg-red"><Clock size={20} /></div>
               <div><span className="kpi-label">Faltas</span><div className="kpi-value-row"><span className="kpi-number">{pasante.faltas}</span></div></div>
             </div>
          </div>

          <div className="card list-card">
             <div className="card-header-row"><h3>Actividad Reciente</h3></div>
             <div className="activity-list">
               {pasante.historialReciente.map((item, idx) => (
                 <div key={idx} className="activity-item">
                   <div className={`activity-dot ${item.estado}`}></div>
                   <div className="activity-info"><span className="act-type">{item.tipo}</span><span className="act-detail">{item.detalle}</span></div>
                 </div>
               ))}
             </div>
          </div>

          <div className="card actions-card-modern">
            <div className="card-header-row"><h3>Gestión de Cierre</h3></div>
            <div className="modern-actions-container">
              <div className="action-panel" onClick={handleDownloadExcel} style={{ cursor: 'pointer', border: '1px solid #22c55e', backgroundColor: '#f0fdf4' }}>
                <div className="panel-icon"><FileSpreadsheet size={24} className="text-green-600" style={{ color: '#16a34a' }} /></div>
                <div className="panel-content"><h4 style={{ color: '#15803d' }}>Reporte de Horas</h4><p>Descargar Excel detallado.</p></div>
                <button className="panel-btn-icon"><Download size={20} style={{ color: '#16a34a' }} /></button>
              </div>

              <div className="action-panel secondary-panel">
                <div className="panel-icon"><FileText size={24} className="text-blue-500" /></div>
                <div className="panel-content"><h4>Plantilla de Informe</h4><p>Descarga el formato oficial.</p></div>
                <button className="panel-btn-icon"><Download size={20} /></button>
              </div>

              <div className={`action-panel ${esCompletado ? 'primary-panel' : 'locked-panel'}`}>
                <div className="panel-icon">{esCompletado ? <Upload size={24} className="text-green-500" /> : <Lock size={24} className="text-gray-400" />}</div>
                <div className="panel-content"><h4>Subir Informe Final</h4><p>{pasante.informeSubido ? "¡Informe enviado!" : esCompletado ? "Sube tu informe." : "Completa tus horas."}</p></div>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".pdf" onChange={handleFileChange} />
                {esCompletado && !pasante.informeSubido ? (
                  <button className="panel-btn-text" onClick={handleUploadClick} disabled={isUploading}>
                    {isUploading ? <><Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} /> Subiendo...</> : "Subir PDF"}
                  </button>
                ) : pasante.informeSubido ? (
                  <div className="panel-status-badge" style={{ color: '#10b981', background: '#ecfdf5' }}>Enviado</div>
                ) : (
                  <div className="panel-status-badge">Bloqueado</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PasanteHome;