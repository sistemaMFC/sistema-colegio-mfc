const pool = require('../db');

const obtenerEstadisticasCursos = async (req, res) => {
    try {
        // Consultamos los cursos y contamos los estudiantes activos en cada uno
        const [rows] = await pool.query(`
            SELECT 
                curso, 
                COUNT(id) as total_matriculados,
                CASE 
                    WHEN curso LIKE 'Inicial%' THEN 'inicial'
                    WHEN curso LIKE '%Grado%' THEN 'basica'
                    ELSE 'superior'
                END as categoria
            FROM estudiantes 
            WHERE estado = 'ACTIVO'
            GROUP BY curso
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener cursos" });
    }
};

module.exports = { obtenerEstadisticasCursos };