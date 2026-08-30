import * as THREE from 'three';

export function initThreeScene() {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) return;

  // ==========================================================================
  // SCENE, CAMERA & RENDERER SETUP
  // ==========================================================================
  const scene = new THREE.Scene();
  
  // Create camera with wide field of view
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 8;
  camera.position.y = 0;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // ==========================================================================
  // LIGHTING
  // ==========================================================================
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0x00f0ff, 2.5, 30);
  pointLight1.position.set(5, 5, 5);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0xbd00ff, 2.5, 30);
  pointLight2.position.set(-5, -5, 5);
  scene.add(pointLight2);

  // ==========================================================================
  // CUSTOM CANVAS GLOW TEXTURE GENERATOR
  // ==========================================================================
  function createParticleTexture() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Create glowing radial gradient
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.15, 'rgba(0, 240, 255, 0.9)');
    gradient.addColorStop(0.4, 'rgba(189, 0, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
  }

  const particleTexture = createParticleTexture();

  // ==========================================================================
  // 1. STARFIELD / GALAXY PARTICLES
  // ==========================================================================
  const particlesCount = 2000;
  const particlesGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particlesCount * 3);
  const randomSpeeds = new Float32Array(particlesCount);
  const angles = new Float32Array(particlesCount);
  const radii = new Float32Array(particlesCount);

  for (let i = 0; i < particlesCount; i++) {
    // Distribute particles in a flat galaxy disc pattern
    const radius = 2.5 + Math.random() * 40;
    const angle = Math.random() * Math.PI * 2;
    
    // Disk positions with vertical dispersion
    const x = Math.cos(angle) * radius;
    const y = (Math.random() - 0.5) * 12 * (1 / (radius * 0.15 + 1)); // flatter far away
    const z = Math.sin(angle) * radius;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Speeds and rotations
    randomSpeeds[i] = 0.05 + Math.random() * 0.15;
    angles[i] = angle;
    radii[i] = radius;
  }

  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.18,
    map: particleTexture || undefined,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.85
  });

  const starfield = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(starfield);

  // ==========================================================================
  // 2. CENTRAL MORPHING WIREFRAME CORE
  // ==========================================================================
  const coreGroup = new THREE.Group();
  
  // Core structure: A wireframe icosahedron
  const coreGeometry = new THREE.IcosahedronGeometry(2.0, 3); // Detailed geometry
  
  // Clone original positions for wave morph computations
  const originalPositions = coreGeometry.attributes.position.clone();
  
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending
  });

  const coreWireframe = new THREE.Mesh(coreGeometry, coreMaterial);
  coreGroup.add(coreWireframe);

  // Inner solid core points
  const innerGeometry = new THREE.IcosahedronGeometry(1.2, 2);
  const innerMaterial = new THREE.PointsMaterial({
    color: 0xff007a,
    size: 0.08,
    map: particleTexture || undefined,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });
  
  const innerPoints = new THREE.Points(innerGeometry, innerMaterial);
  coreGroup.add(innerPoints);

  scene.add(coreGroup);

  // ==========================================================================
  // INTERACTIVE STATE (MOUSE & SCROLL)
  // ==========================================================================
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  // Track cursor position
  window.addEventListener('mousemove', (event) => {
    targetMouseX = (event.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
    targetMouseY = (event.clientY / window.innerHeight - 0.5) * 2; // -1 to 1
  });

  // Track scroll position
  let scrollPercent = 0;
  window.addEventListener('scroll', () => {
    const docElement = document.documentElement;
    const scrollTop = window.scrollY;
    const docHeight = docElement.scrollHeight - window.innerHeight;
    scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;
  });

  // ==========================================================================
  // RESIZE HANDLER
  // ==========================================================================
  window.addEventListener('resize', () => {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  // ==========================================================================
  // ANIMATION LOOP
  // ==========================================================================
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // 1. Rotate Starfield slowly
    starfield.rotation.y = elapsedTime * 0.015;

    // 2. Rotate core nodes
    coreGroup.rotation.y = -elapsedTime * 0.12;
    coreGroup.rotation.x = elapsedTime * 0.08;

    // 3. Morph Central Wireframe Core vertices
    const positionsArray = coreGeometry.attributes.position;
    for (let i = 0; i < positionsArray.count; i++) {
      const x = originalPositions.getX(i);
      const y = originalPositions.getY(i);
      const z = originalPositions.getZ(i);

      // Spherical wave deformation
      const distance = Math.sqrt(x*x + y*y + z*z);
      const wave = Math.sin(distance * 3.5 - elapsedTime * 3.0) * 0.14;

      positionsArray.setXYZ(
        i, 
        x + (x / distance) * wave,
        y + (y / distance) * wave,
        z + (z / distance) * wave
      );
    }
    positionsArray.needsUpdate = true;

    // 4. Smooth Mouse Parallax (Lerp mouse coordinates)
    mouseX += (targetMouseX - mouseX) * 0.08;
    mouseY += (targetMouseY - mouseY) * 0.08;

    // 5. Scroll fly-through camera interpolation
    // Base camera height and depth mapped to scroll percentage
    // Z starts at 8 (hero), goes deep to -15
    const targetCameraZ = 8 - scrollPercent * 24;
    // Y goes down slightly, creating an upward movement relative to the scene
    const targetCameraY = -scrollPercent * 6;

    // Camera targets with mouse parallax offsets applied
    camera.position.z += (targetCameraZ - camera.position.z) * 0.08;
    camera.position.y += (targetCameraY - camera.position.y) * 0.08;
    
    // Parallax mouse movement offset
    camera.position.x += (mouseX * 2.0 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 2.0 - camera.position.y - (scrollPercent * 6)) * 0.05;

    // Make the camera look slightly towards the center core group with scroll offsets
    camera.lookAt(new THREE.Vector3(0, -scrollPercent * 4, 0));

    // Dynamic color shifting of point lights over time
    pointLight1.color.setHSL((elapsedTime * 0.02) % 1, 1, 0.5);
    pointLight2.color.setHSL(((elapsedTime * 0.02) + 0.5) % 1, 1, 0.5);

    // Render scene
    renderer.render(scene, camera);
  }

  animate();
}
