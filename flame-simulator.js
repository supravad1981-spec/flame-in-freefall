
/* FLAME IN FREEFALL - 3D THREE.JS VISUALISATION */

(() => {
    if (!window.THREE) {
        console.error("Three.js has not loaded.");
        return;
    }

    const THREE = window.THREE;

    const gravity = document.getElementById("ff-gravity");
    const oxygen = document.getElementById("ff-oxygen");
    const airflow = document.getElementById("ff-airflow");
    const fuel = document.getElementById("ff-fuel");
    const reset = document.getElementById("ff-reset");

    if (!gravity || !oxygen || !airflow || !fuel) return;

    const labels = {
        gravity: document.getElementById("ff-gravity-value"),
        oxygen: document.getElementById("ff-oxygen-value"),
        airflow: document.getElementById("ff-airflow-value"),
        resultGravity: document.getElementById("ff-result-gravity"),
        resultOxygen: document.getElementById("ff-result-oxygen"),
        resultFuel: document.getElementById("ff-result-fuel"),
        mode: document.getElementById("ff-simulation-mode")
    };

    const simulations = [];

    function createFlame(canvas, type) {
        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(
            42, 1, 0.1, 100
        );
        camera.position.set(0, 1.25, 5);
        camera.lookAt(0, 0.65, 0);

        const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true
        });

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setClearColor(0x000000, 0);

        scene.add(new THREE.AmbientLight(0x8dbbff, 1.5));

        const pointLight = new THREE.PointLight(
            type === "earth" ? 0xff963d : 0x43dfff,
            3, 10
        );
        pointLight.position.set(0, 1.4, 1);
        scene.add(pointLight);

        // Burner base
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.38, 0.16, 32),
            new THREE.MeshStandardMaterial({
                color: 0x708ba3,
                metalness: 0.8,
                roughness: 0.3
            })
        );
        base.position.y = -0.05;
        scene.add(base);

        const flameGroup = new THREE.Group();
        scene.add(flameGroup);

        // Layered 3D flame geometry
        const outerGeometry = type === "earth"
            ? new THREE.ConeGeometry(0.57, 2.0, 48, 20)
            : new THREE.SphereGeometry(0.82, 48, 32);

        const outerMaterial = new THREE.MeshPhongMaterial({
            color: type === "earth" ? 0xff7a19 : 0x24bfff,
            emissive: type === "earth" ? 0xff4b08 : 0x087dbb,
            emissiveIntensity: 1.1,
            transparent: true,
            opacity: 0.84,
            shininess: 90,
            side: THREE.DoubleSide
        });

        const outerFlame = new THREE.Mesh(
            outerGeometry,
            outerMaterial
        );

        outerFlame.position.y = type === "earth" ? 1.0 : 0.72;
        flameGroup.add(outerFlame);

        const innerGeometry = type === "earth"
            ? new THREE.ConeGeometry(0.29, 1.35, 40, 16)
            : new THREE.SphereGeometry(0.53, 40, 28);

        const innerMaterial = new THREE.MeshPhongMaterial({
            color: type === "earth" ? 0xffe3a0 : 0xa4f5ff,
            emissive: type === "earth" ? 0xff9a26 : 0x30cfff,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.9,
            shininess: 100
        });

        const innerFlame = new THREE.Mesh(
            innerGeometry,
            innerMaterial
        );

        innerFlame.position.y = type === "earth" ? 0.75 : 0.72;
        flameGroup.add(innerFlame);

        // Small glowing particles around the flame
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 70;
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 2.4;
            positions[i * 3 + 1] = Math.random() * 2.4;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
        }

        particleGeometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
        );

        const particles = new THREE.Points(
            particleGeometry,
            new THREE.PointsMaterial({
                color: type === "earth" ? 0xffbb67 : 0x63eaff,
                size: 0.035,
                transparent: true,
                opacity: 0.8
            })
        );

        scene.add(particles);

        const simulation = {
            canvas,
            type,
            scene,
            camera,
            renderer,
            flameGroup,
            outerFlame,
            innerFlame,
            particles,
            pointLight
        };

        simulations.push(simulation);
        resize(simulation);

        return simulation;
    }

    function resize(sim) {
        const width = Math.max(1, sim.canvas.clientWidth);
        const height = Math.max(1, sim.canvas.clientHeight);

        sim.renderer.setSize(width, height, false);
        sim.camera.aspect = width / height;
        sim.camera.updateProjectionMatrix();
    }

    const earth = createFlame(
        document.getElementById("flame-earth"), "earth"
    );

    const micro = createFlame(
        document.getElementById("flame-micro"), "micro"
    );

    const interactive = createFlame(
        document.getElementById("flame-simulator"), "simulator"
    );

    function getSettings(type) {
        if (type === "earth") {
            return { gravity: 9.8, oxygen: 21, airflow: 20 };
        }

        if (type === "micro") {
            return { gravity: 0, oxygen: 21, airflow: 0 };
        }

        return {
            gravity: Number(gravity.value),
            oxygen: Number(oxygen.value),
            airflow: Number(airflow.value)
        };
    }

    function updateFlame(sim, time, settings) {
        const g = Math.max(0, Math.min(1, settings.gravity / 9.8));
        const o = Math.max(0.35, Math.min(1.3, settings.oxygen / 21));
        const air = settings.airflow / 100;

        const earthLike = g > 0.5;
        const isEarthPanel = sim.type === "earth";
        const isMicroPanel = sim.type === "micro";

        const spherical = isMicroPanel ||
            (sim.type === "simulator" && !earthLike);

        const shape = spherical ? 1 : 0;

        // Smoothly change flame proportions
        const targetWidth = THREE.MathUtils.lerp(0.75, 1.0, shape);
        const targetHeight = THREE.MathUtils.lerp(1.8, 1.15, shape);

        const pulse = 1 + Math.sin(time * 3.5) * 0.035;
        const oxygenBrightness = Math.max(0.35, Math.min(1.2, o));

        sim.outerFlame.scale.set(
            targetWidth * pulse * (1 + air * 0.15),
            targetHeight * oxygenBrightness,
            targetWidth * pulse
        );

        sim.innerFlame.scale.set(
            targetWidth * 0.8 * pulse,
            targetHeight * 0.85 * oxygenBrightness,
            targetWidth * 0.8 * pulse
        );

        // Earth flame flickers and leans; microgravity flame stays rounded
        sim.flameGroup.rotation.z = spherical
            ? Math.sin(time * 1.5) * 0.025
            : Math.sin(time * 4) * 0.045 + air * 0.18;

        sim.flameGroup.rotation.y = Math.sin(time * 1.2) * 0.08;

        const isHotFuel = fuel.value === "heptane" &&
            sim.type === "simulator";

        const outerColor = spherical ? 0x24bfff :
            (isHotFuel ? 0xff5b24 : 0xff7a19);

        sim.outerFlame.material.color.setHex(
            sim.type === "simulator" ? outerColor :
            (isMicroPanel ? 0x24bfff : 0xff7a19)
        );

        sim.outerFlame.material.emissiveIntensity =
            0.7 + oxygenBrightness * 0.65;

        sim.innerFlame.material.emissiveIntensity =
            0.9 + oxygenBrightness * 0.7;

        sim.pointLight.intensity = 2 + oxygenBrightness;

        // Slow camera orbit gives the scene visible depth
        sim.camera.position.x = Math.sin(time * 0.35) * 0.16;
        sim.camera.position.y = 1.25 + Math.sin(time * 0.55) * 0.05;
        sim.camera.lookAt(0, 0.65, 0);

        // Animate particles
        const positions = sim.particles.geometry.attributes.position;
        const values = positions.array;

        for (let i = 0; i < values.length; i += 3) {
            values[i + 1] += 0.006 + air * 0.018;

            if (values[i + 1] > 2.5) {
                values[i + 1] = 0;
            }
        }

        positions.needsUpdate = true;

        sim.particles.rotation.y = time * 0.08;

        sim.renderer.render(sim.scene, sim.camera);
    }

    function updateLabels() {
        const g = Number(gravity.value);
        const o = Number(oxygen.value);
        const a = Number(airflow.value);

        labels.gravity.textContent = `${g.toFixed(1)} m/s²`;
        labels.oxygen.textContent = `${o}%`;
        labels.airflow.textContent = `${a}%`;

        labels.resultGravity.textContent =
            g < 0.5 ? "Near 0G" : `${(g / 9.8).toFixed(2)}G`;

        labels.resultOxygen.textContent = `${o}%`;
        labels.resultFuel.textContent = fuel.value.toUpperCase();

        labels.mode.textContent =
            g < 0.5 ? "MICROGRAVITY MODE" :
            g > 9.3 ? "EARTH GRAVITY MODE" :
            "PARTIAL GRAVITY MODE";
    }

    [gravity, oxygen, airflow, fuel].forEach(control => {
        control.addEventListener("input", updateLabels);
        control.addEventListener("change", updateLabels);
    });

    reset?.addEventListener("click", () => {
        gravity.value = 9.8;
        oxygen.value = 21;
        airflow.value = 20;
        fuel.value = "methanol";
        updateLabels();
    });

    let start = performance.now();

    function animate(now) {
        const time = (now - start) / 1000;

        updateFlame(earth, time, getSettings("earth"));
        updateFlame(micro, time, getSettings("micro"));
        updateFlame(interactive, time, getSettings("simulator"));

        requestAnimationFrame(animate);
    }

    window.addEventListener("resize", () => {
        simulations.forEach(resize);
    });

    updateLabels();
    requestAnimationFrame(animate);
})();
