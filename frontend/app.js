/* ========================================================
    DIRECCIÓN DEL ARCHIVO: ./app.js (Raíz del proyecto)
    Controla el login y el fondo animado.
   ======================================================== */

// FECHA AUTOMÁTICA PARA EL FOOTER
if(document.getElementById("year")) {
    document.getElementById("year").textContent = new Date().getFullYear();
}

/* =========================
    CONFIGURACIÓN DE API
   ========================= */
const API_URL = "https://sistema-colegio-mfc.onrender.com/auth/login";

/* =========================
    TOGGLE CONTRASEÑA
   ========================= */
const passInput = document.getElementById("password");
const toggleBtn = document.getElementById("togglePass");

if (toggleBtn && passInput) {
    toggleBtn.addEventListener("click", () => {
        const isHidden = passInput.type === "password";
        passInput.type = isHidden ? "text" : "password";
        toggleBtn.textContent = isHidden ? "🙈" : "👁️";
    });
}

/* =========================
    VALIDAR CÉDULA (solo números)
   ========================= */
const cedulaInput = document.getElementById("cedula");
if (cedulaInput) {
    cedulaInput.addEventListener("input", () => {
        cedulaInput.value = cedulaInput.value.replace(/\D/g, "").slice(0, 10);
    });
}

/* =========================
    LOGIN - CONEXIÓN CON EL BACKEND
   ========================= */
const form = document.getElementById("loginForm");
const statusEl = document.getElementById("status");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        statusEl.className = "status";
        statusEl.textContent = "Verificando credenciales...";

        const cedula = cedulaInput.value.trim();
        const password = passInput.value;

        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cedula, password })
            });

            const data = await res.json();

            if (!res.ok) {
                statusEl.className = "status error";
                statusEl.textContent = data.error || "Acceso denegado";
                return;
            }

            // GUARDAR SESIÓN (Sincronizado con app.html y assets/app.js)
            localStorage.setItem("mfc_token", data.token);
            localStorage.setItem("mfc_user", JSON.stringify(data.user));

            statusEl.className = "status ok";
            statusEl.textContent = `¡Bienvenido/a ${data.user.nombres}! ✅`;

            // Redirección suave al Dashboard
            setTimeout(() => {
                window.location.href = "./app.html";
            }, 1200);

        } catch (err) {
            console.error("Error de conexión:", err);
            statusEl.className = "status error";
            statusEl.textContent = "Error: El servidor no responde.";
        }
    });
}

/* =========================
    FONDO FUTURISTA ANIMADO (Canvas)
   ========================= */
const canvas = document.getElementById("bg");
if (canvas) {
    const ctx = canvas.getContext("2d");
    let w, h, dpi;

    function resize() {
        dpi = Math.min(window.devicePixelRatio || 1, 2);
        w = canvas.clientWidth = window.innerWidth;
        h = canvas.clientHeight = window.innerHeight;
        canvas.width = Math.floor(w * dpi);
        canvas.height = Math.floor(h * dpi);
        ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
    }

    window.addEventListener("resize", resize);
    resize();

    function rand(min, max) { return Math.random() * (max - min) + min; }

    const trails = [];
    const TRAIL_COUNT = 18;

    function makeTrail() {
        return {
            x: rand(-w, w),
            y: rand(0, h),
            speed: rand(0.6, 1.6),
            width: rand(1.2, 2.8),
            amp: rand(10, 40),
            freq: rand(0.002, 0.006),
            phase: rand(0, Math.PI * 2),
            glow: rand(10, 28),
            hue: Math.random() < 0.8 ? "green" : "gold",
            life: rand(0.35, 0.9),
        };
    }

    for (let i = 0; i < TRAIL_COUNT; i++) trails.push(makeTrail());

    let t = 0;
    function draw() {
        t += 1;
        ctx.clearRect(0, 0, w, h);

        const grad = ctx.createRadialGradient(w * 0.7, h * 0.25, 50, w * 0.5, h * 0.5, Math.max(w, h));
        grad.addColorStop(0, "rgba(25,255,154,0.08)");
        grad.addColorStop(0.45, "rgba(216,178,76,0.06)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 60; i++) {
            const px = (i * 97 + (t * 0.6)) % w;
            const py = (i * 53 + (t * 0.3)) % h;
            ctx.fillStyle = "rgba(255,255,255,0.05)";
            ctx.fillRect(px, py, 1, 1);
        }
        ctx.globalAlpha = 1;

        trails.forEach((tr) => {
            tr.x += tr.speed * 2.2;
            if (tr.x > w + 200) {
                Object.assign(tr, makeTrail(), { x: rand(-400, -50) });
            }

            const baseColor = tr.hue === "green"
                ? { c1: "rgba(25,255,154,0.75)", c2: "rgba(0,201,123,0.15)" }
                : { c1: "rgba(216,178,76,0.65)", c2: "rgba(184,139,34,0.14)" };

            ctx.save();
            ctx.lineWidth = tr.width;
            ctx.lineCap = "round";
            ctx.shadowBlur = tr.glow;
            ctx.shadowColor = baseColor.c1;

            const g = ctx.createLinearGradient(tr.x - 220, tr.y, tr.x + 220, tr.y);
            g.addColorStop(0, baseColor.c2);
            g.addColorStop(0.35, baseColor.c1);
            g.addColorStop(1, "rgba(255,255,255,0)");

            ctx.strokeStyle = g;
            ctx.globalAlpha = tr.life;

            ctx.beginPath();
            const len = 520;
            const steps = 28;
            for (let s = 0; s <= steps; s++) {
                const p = s / steps;
                const x = tr.x - len * (1 - p);
                const y = tr.y + Math.sin((x * tr.freq) + tr.phase + t * 0.02) * tr.amp;
                if (s === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        });

        requestAnimationFrame(draw);
    }
    draw();
}