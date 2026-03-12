/* ========================================================
    MÓDULO DE REPORTES - COLEGIO MIGUEL FEBRES CORDERO
   ======================================================== */

function formatearNombreCursoOficial(nombre) {
    // Aquí está el secreto: agregué todas las formas posibles 
    // en las que el curso puede venir desde la base de datos
    const cursosMap = {
        // INICIALES
        "Inicial 1": "PRIMER AÑO DE EDUCACIÓN INICIAL",
        "Inicial I": "PRIMER AÑO DE EDUCACIÓN INICIAL",
        "Inicial 2": "SEGUNDO AÑO DE EDUCACIÓN INICIAL",
        "Inicial II": "SEGUNDO AÑO DE EDUCACIÓN INICIAL",
        
        // BÁSICA (Ajustado a como sale en tus etiquetas)
        "1ero de básica": "PRIMER AÑO DE EDUCACIÓN BÁSICA",
        "Primero EGB": "PRIMER AÑO DE EDUCACIÓN BÁSICA",
        
        "2do de básica": "SEGUNDO AÑO DE EDUCACIÓN BÁSICA",
        "Segundo EGB": "SEGUNDO AÑO DE EDUCACIÓN BÁSICA",
        
        "3ero de básica": "TERCER AÑO DE EDUCACIÓN BÁSICA",
        "Tercero EGB": "TERCER AÑO DE EDUCACIÓN BÁSICA",
        
        "4to de básica": "CUARTO AÑO DE EDUCACIÓN BÁSICA",
        "Cuarto EGB": "CUARTO AÑO DE EDUCACIÓN BÁSICA",
        
        "5to de básica": "QUINTO AÑO DE EDUCACIÓN BÁSICA",
        "Quinto EGB": "QUINTO AÑO DE EDUCACIÓN BÁSICA",
        
        "6to de básica": "SEXTO AÑO DE EDUCACIÓN BÁSICA",
        "Sexto EGB": "SEXTO AÑO DE EDUCACIÓN BÁSICA",
        
        "7mo de básica": "SÉPTIMO AÑO DE EDUCACIÓN BÁSICA",
        "Séptimo EGB": "SÉPTIMO AÑO DE EDUCACIÓN BÁSICA",
        
        "8vo de básica": "OCTAVO AÑO DE EDUCACIÓN BÁSICA",
        "Octavo EGB": "OCTAVO AÑO DE EDUCACIÓN BÁSICA",
        
        "9no de básica": "NOVENO AÑO DE EDUCACIÓN BÁSICA",
        "Noveno EGB": "NOVENO AÑO DE EDUCACIÓN BÁSICA",
        
        "10mo de básica": "DÉCIMO AÑO DE EDUCACIÓN BÁSICA",
        "Décimo EGB": "DÉCIMO AÑO DE EDUCACIÓN BÁSICA"
    };
    
    // Si no lo encuentra, lo devuelve en mayúsculas para que no salga vacío
    return cursosMap[nombre] || nombre.toUpperCase();
}

function corregirCedula(cedula) {
    let c = String(cedula).trim();
    // Forzar siempre 10 dígitos (añade el cero si el sistema lo borró)
    return c.length === 9 ? "0" + c : c;
}

async function generarCertificadoMatricula(idEstudiante, nombreCursoCorto) {
    try {
        // 1. SOLICITUD DE DATOS (REEMPLAZA AL ALERT QUE TE SALÍA)
        const anioLectivo = prompt("📅 Ingrese el AÑO LECTIVO:", "2026 - 2027");
        if (!anioLectivo) return;

        const numFolder = prompt("📁 Ingrese el NÚMERO DE FOLDER:", "001");
        if (!numFolder) return;

        // 2. Obtener datos del servidor
        const est = await api(`/api/students/${idEstudiante}`);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const centro = 105;

        // --- CARGA DE IMÁGENES ---
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
        doc.setFontSize(12);
        const cuerpo = `La suscrita Secretaría de la Unidad Educativa "MIGUEL FEBRES CORDERO", certifica que el/la estudiante:`;
        doc.text(doc.splitTextToSize(cuerpo, 165), 22, 95);

        // NOMBRE EN MAYÚSCULAS
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.text(`${est.apellidos_est} ${est.nombres_est}`.toUpperCase(), centro, 115, { align: "center" });

        // DATOS LEGALES
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Cédula de Identidad: ${corregirCedula(est.cedula_est)}`, 22, 135);
        doc.text(`Se encuentra legalmente matriculado/a en:`, 22, 145);
        
        // AQUÍ SE HACE EL CAMBIO DE NOMBRE LARGO
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

        // BORDE
        doc.setLineWidth(0.4);
        doc.rect(10, 10, 190, 277);

        window.open(doc.output('bloburl'), '_blank');

    } catch (err) {
        console.error(err);
        alert("Error al generar certificado.");
    }
}
window.generarCertificadoMatricula = generarCertificadoMatricula;