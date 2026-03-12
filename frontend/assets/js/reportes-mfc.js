/* ========================================================
    MÓDULO DE REPORTES - COLEGIO MIGUEL FEBRES CORDERO
    Versión: Certificado de Matrícula Oficial con Folder
   ======================================================== */

// 1. Traducción de cursos a formato extenso oficial
function formatearNombreCursoOficial(nombre) {
    const cursosMap = {
        "Inicial I": "PRIMER AÑO DE EDUCACIÓN INICIAL",
        "Inicial II": "SEGUNDO AÑO DE EDUCACIÓN INICIAL",
        "Primero EGB": "PRIMER AÑO DE EDUCACIÓN BÁSICA",
        "Segundo EGB": "SEGUNDO AÑO DE EDUCACIÓN BÁSICA",
        "Tercero EGB": "TERCER AÑO DE EDUCACIÓN BÁSICA",
        "Cuarto EGB": "CUARTO AÑO DE EDUCACIÓN BÁSICA",
        "Quinto EGB": "QUINTO AÑO DE EDUCACIÓN BÁSICA",
        "Sexto EGB": "SEXTO AÑO DE EDUCACIÓN BÁSICA",
        "Séptimo EGB": "SÉPTIMO AÑO DE EDUCACIÓN BÁSICA",
        "Octavo EGB": "OCTAVO AÑO DE EDUCACIÓN BÁSICA",
        "Noveno EGB": "NOVENO AÑO DE EDUCACIÓN BÁSICA",
        "Décimo EGB": "DÉCIMO AÑO DE EDUCACIÓN BÁSICA"
    };
    return cursosMap[nombre] || nombre.toUpperCase();
}

// 2. Asegurar 10 dígitos en la cédula (Añade el 0 si falta)
function corregirCedula(cedula) {
    let c = String(cedula).trim();
    return c.length === 9 ? "0" + c : c;
}

async function generarCertificadoMatricula(idEstudiante, nombreCursoCorto) {
    try {
        // --- SOLICITUD DE DATOS MANUALES ---
        const anioLectivo = prompt("📅 Ingrese el AÑO LECTIVO:", "2026 - 2027");
        if (!anioLectivo) return;

        const numFolder = prompt("📁 Ingrese el NÚMERO DE FOLDER:", "001");
        if (!numFolder) return;

        // Obtener datos del estudiante
        const est = await api(`/api/students/${idEstudiante}`);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const centro = 105;

        // --- CARGA DE IMÁGENES (Ministerio izq, Logo der) ---
        const cargarImagen = (url) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });

        const imgMin = await cargarImagen('/img/Ministerio.png');
        const imgLogo = await cargarImagen('/img/LOGO.jpeg');

        if (imgMin) doc.addImage(imgMin, 'PNG', 15, 12, 45, 15);
        if (imgLogo) doc.addImage(imgLogo, 'JPEG', 170, 10, 22, 22);

        // --- ENCABEZADO ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("UNIDAD EDUCATIVA", centro, 25, { align: "center" });
        doc.text("EDUCACIÓN GENERAL BÁSICA", centro, 31, { align: "center" });
        doc.setFontSize(16);
        doc.text('"MIGUEL FEBRES CORDERO"', centro, 40, { align: "center" });
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`AÑO LECTIVO: ${anioLectivo}`, centro, 48, { align: "center" });
        doc.text("JORNADA MATUTINA", centro, 54, { align: "center" });

        // --- TÍTULO ---
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("CERTIFICADO DE MATRÍCULA", centro, 75, { align: "center" });

        // --- CUERPO ---
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        const cuerpo = `La suscrita Secretaría de la Unidad Educativa "MIGUEL FEBRES CORDERO", certifica que el/la estudiante:`;
        doc.text(doc.splitTextToSize(cuerpo, 165), 22, 95);

        // NOMBRE ESTUDIANTE
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.text(`${est.apellidos_est} ${est.nombres_est}`.toUpperCase(), centro, 115, { align: "center" });

        // DATOS DE MATRÍCULA
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Cédula de Identidad: ${corregirCedula(est.cedula_est)}`, 22, 135);
        doc.text(`Se encuentra legalmente matriculado/a en:`, 22, 145);
        
        doc.setFont("helvetica", "bold");
        doc.text(formatearNombreCursoOficial(nombreCursoCorto), centro, 155, { align: "center" });

        // FECHA Y FOLDER
        const hoy = new Date();
        const fechaTxt = `Guayaquil, ${hoy.getDate()} de ${hoy.toLocaleString('es-ES', { month: 'long' })} del ${hoy.getFullYear()}`;
        doc.setFont("helvetica", "italic");
        doc.text(fechaTxt, 22, 180);
        
        doc.setFont("helvetica", "bold");
        doc.text(`Nro. Folder: ${numFolder}`, 22, 190);

        // --- FIRMAS ---
        doc.line(35, 240, 95, 240);
        doc.text("MSc. JESSICA VERA", 65, 245, { align: "center" });
        doc.text("RECTORA", 65, 250, { align: "center" });

        doc.line(115, 240, 175, 240);
        doc.text("JUAN PERALTA", 145, 245, { align: "center" });
        doc.text("SECRETARIO GENERAL", 145, 250, { align: "center" });

        // Borde de la hoja
        doc.setLineWidth(0.4);
        doc.rect(10, 10, 190, 277);

        window.open(doc.output('bloburl'), '_blank');

    } catch (err) {
        console.error(err);
        alert("Error al generar certificado. Verifique los datos del estudiante.");
    }
}

window.generarCertificadoMatricula = generarCertificadoMatricula;