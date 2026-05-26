/* ========================================================
   MÓDULO DE REPORTES - COLEGIO MIGUEL FEBRES CORDERO
   ✅ ACTUALIZADO:
      - Foto carnet del alumno en esquina superior derecha
      - Firma: solo Rectora MSc. Jessica Vera
      - Año lectivo fijo: 2026 - 2027
      - Funciones guardarFotoEstudiante / cargarFotoEstudiante
   ======================================================== */

function formatearNombreCursoOficial(nombre) {
    const cursosMap = {
        "Inicial 1":      "PRIMER AÑO DE EDUCACIÓN INICIAL",
        "Inicial I":      "PRIMER AÑO DE EDUCACIÓN INICIAL",
        "Inicial 2":      "SEGUNDO AÑO DE EDUCACIÓN INICIAL",
        "Inicial II":     "SEGUNDO AÑO DE EDUCACIÓN INICIAL",
        "1ro EGB":        "PRIMER AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "1ero de básica": "PRIMER AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "Primero EGB":    "PRIMER AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "2do EGB":        "SEGUNDO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "2do de básica":  "SEGUNDO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "Segundo EGB":    "SEGUNDO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "3ro EGB":        "TERCER AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "3ero de básica": "TERCER AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "Tercero EGB":    "TERCER AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "4to EGB":        "CUARTO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "4to de básica":  "CUARTO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "Cuarto EGB":     "CUARTO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "5to EGB":        "QUINTO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "5to de básica":  "QUINTO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "Quinto EGB":     "QUINTO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "6to EGB":        "SEXTO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "6to de básica":  "SEXTO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "Sexto EGB":      "SEXTO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "7mo EGB":        "SÉPTIMO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "7mo de básica":  "SÉPTIMO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "Séptimo EGB":    "SÉPTIMO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "8vo EGB":        "OCTAVO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "8vo de básica":  "OCTAVO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "Octavo EGB":     "OCTAVO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "9no EGB":        "NOVENO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "9no de básica":  "NOVENO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "Noveno EGB":     "NOVENO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "10mo EGB":       "DÉCIMO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "10mo de básica": "DÉCIMO AÑO DE EDUCACIÓN GENERAL BÁSICA",
        "Décimo EGB":     "DÉCIMO AÑO DE EDUCACIÓN GENERAL BÁSICA",
    };
    return cursosMap[nombre] || nombre.toUpperCase();
}

function corregirCedula(cedula) {
    let c = String(cedula).trim();
    return c.length === 9 ? "0" + c : c;
}

// Guarda la foto carnet en localStorage con clave: foto_alumno_<id>
// Llama esta función cuando el usuario confirme la matrícula con foto.
function guardarFotoEstudiante(idEstudiante, fotoBase64) {
    try {
        if (fotoBase64) localStorage.setItem(`foto_alumno_${idEstudiante}`, fotoBase64);
    } catch (e) {
        console.warn("No se pudo guardar la foto:", e);
    }
}

// Recupera la foto desde localStorage. Devuelve base64 o null.
function cargarFotoEstudiante(idEstudiante) {
    try {
        return localStorage.getItem(`foto_alumno_${idEstudiante}`) || null;
    } catch {
        return null;
    }
}

async function generarCertificadoMatricula(idEstudiante, nombreCursoCorto) {
    try {
        const anioLectivo = "2026 - 2027";
        const numFolder = prompt("Ingrese el número de folder:", "001");
        if (numFolder === null) return;

        const est = await api(`/api/students/${idEstudiante}`);
        const fotoBase64 = cargarFotoEstudiante(idEstudiante);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const centro = 105;

        const cargarImagen = (url) => new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload  = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });

        const imgMin  = await cargarImagen('/img/Ministerio.png');
        const imgLogo = await cargarImagen('./LOGO.jpeg');

        // ── BORDE EXTERIOR ──────────────────────────────────────
        doc.setDrawColor(20, 60, 130);
        doc.setLineWidth(1.2);
        doc.rect(8, 8, 194, 281);
        doc.setLineWidth(0.3);
        doc.rect(11, 11, 188, 275);

        // ── LOGOS ───────────────────────────────────────────────
        if (imgMin)  doc.addImage(imgMin,  'PNG',  14, 14, 48, 17);
        if (imgLogo) doc.addImage(imgLogo, 'JPEG', 79, 13, 22, 22);

        // ── FOTO CARNET (esquina superior derecha, 28×37 mm) ────
        const FX = 162, FY = 13, FW = 28, FH = 37;
        if (fotoBase64) {
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.4);
            doc.rect(FX - 1, FY - 1, FW + 2, FH + 2);
            doc.addImage(fotoBase64, 'JPEG', FX, FY, FW, FH);
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(120, 120, 120);
            doc.text("FOTO CARNET", FX + FW / 2, FY + FH + 4, { align: "center" });
            doc.setTextColor(0, 0, 0);
        } else {
            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(245, 245, 245);
            doc.setLineWidth(0.4);
            doc.roundedRect(FX - 1, FY - 1, FW + 2, FH + 2, 2, 2, 'FD');
            doc.setFontSize(7);
            doc.setTextColor(160, 160, 160);
            doc.text("FOTO",   FX + FW / 2, FY + FH / 2 - 3, { align: "center" });
            doc.text("CARNET", FX + FW / 2, FY + FH / 2 + 3, { align: "center" });
            doc.setTextColor(0, 0, 0);
        }

        // ── ENCABEZADO ──────────────────────────────────────────
        doc.setTextColor(20, 60, 130);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("UNIDAD EDUCATIVA", centro, 22, { align: "center" });
        doc.setFontSize(9);
        doc.text("EDUCACIÓN GENERAL BÁSICA", centro, 28, { align: "center" });
        doc.setFontSize(14);
        doc.text('"MIGUEL FEBRES CORDERO"', centro, 36, { align: "center" });

        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`AÑO LECTIVO: ${anioLectivo}`, centro, 43, { align: "center" });
        doc.text("JORNADA MATUTINA", centro, 49, { align: "center" });

        doc.setDrawColor(20, 60, 130);
        doc.setLineWidth(0.6);
        doc.line(14, 55, 196, 55);
        doc.setLineWidth(0.2);
        doc.line(14, 57, 196, 57);

        // ── TÍTULO ──────────────────────────────────────────────
        doc.setTextColor(20, 60, 130);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        doc.text("CERTIFICADO DE MATRÍCULA", centro, 72, { align: "center" });
        const tw = doc.getTextWidth("CERTIFICADO DE MATRÍCULA");
        doc.setLineWidth(0.5);
        doc.line(centro - tw / 2, 74.5, centro + tw / 2, 74.5);

        // ── CUERPO ──────────────────────────────────────────────
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        const textoCuerpo = `La suscrita Secretaría de la Unidad Educativa "MIGUEL FEBRES CORDERO", certifica que el/la estudiante:`;
        doc.text(doc.splitTextToSize(textoCuerpo, 168), 20, 90);

        // Nombre en caja azul
        const nombreCompleto = `${est.apellidos_est} ${est.nombres_est}`.toUpperCase();
        doc.setFillColor(235, 241, 251);
        doc.setDrawColor(20, 60, 130);
        doc.setLineWidth(0.3);
        doc.roundedRect(20, 104, 170, 14, 2, 2, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(20, 60, 130);
        doc.text(nombreCompleto, centro, 113, { align: "center" });

        // Datos legales
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text(`Portador/a de la Cédula de Identidad Nro.: ${corregirCedula(est.cedula_est)}`, 20, 130);
        doc.text("Se encuentra legalmente matriculado/a en:", 20, 142);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(20, 60, 130);
        doc.text(formatearNombreCursoOficial(nombreCursoCorto), centro, 154, { align: "center" });

        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text("Jornada: MATUTINA", centro, 164, { align: "center" });

        const textoLegal = `durante el año lectivo ${anioLectivo}, conforme consta en los registros de esta institución.`;
        doc.text(doc.splitTextToSize(textoLegal, 168), 20, 175);

        // ── FECHA Y FOLDER ──────────────────────────────────────
        const hoy = new Date();
        const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
        const fechaTxt = `Guayaquil, ${hoy.getDate()} de ${meses[hoy.getMonth()]} del ${hoy.getFullYear()}`;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        doc.text(fechaTxt, 20, 193);
        doc.setFont("helvetica", "bold");
        doc.text(`Nro. de Folder: ${String(numFolder).padStart(3, '0')}`, 20, 201);

        // ── FIRMA ÚNICA: RECTORA (centrada) ─────────────────────
        const firmaX = centro, firmaY = 248;
        doc.setDrawColor(60, 60, 60);
        doc.setLineWidth(0.5);
        doc.line(firmaX - 38, firmaY, firmaX + 38, firmaY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text("MSc. JESSICA VERA", firmaX, firmaY + 6,  { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("RECTORA", firmaX, firmaY + 12, { align: "center" });
        doc.text('UNIDAD EDUCATIVA "MIGUEL FEBRES CORDERO"', firmaX, firmaY + 18, { align: "center" });

        // ── PIE DE PÁGINA ───────────────────────────────────────
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 140);
        doc.text("Documento generado electrónicamente por el Sistema de Gestión Escolar MFC.", centro, 278, { align: "center" });

        window.open(doc.output('bloburl'), '_blank');

    } catch (err) {
        console.error("Error al generar certificado:", err);
        alert("Error al generar el certificado. Verifica que el alumno tenga todos sus datos completos.");
    }
}

window.generarCertificadoMatricula = generarCertificadoMatricula;
window.guardarFotoEstudiante       = guardarFotoEstudiante;
window.cargarFotoEstudiante        = cargarFotoEstudiante;
window.formatearNombreCursoOficial = formatearNombreCursoOficial;
