
(function () {
  if (!window.THREE || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.getElementById('dna-canvas');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();

  const scene    = new THREE.Scene();
  scene.fog      = new THREE.FogExp2(0x020810, 0.030);

  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  const camera = new THREE.PerspectiveCamera(62, W() / H(), 0.1, 200);
  camera.position.set(0, 0, 15);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (error) {
    canvas.hidden = true;
    return; // Decorative effect is optional on devices without WebGL.
  }
  renderer.setSize(W(), H());
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  window.addEventListener('resize', () => {
    resize();
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
    updatePositions();
  });

  scene.add(new THREE.AmbientLight(0x1a2a3a, 2.2));
  function addLight(color, intensity, x, y, z) {
    const l = new THREE.PointLight(color, intensity, 70);
    l.position.set(x, y, z);
    scene.add(l);
    return l;
  }
  const lLeft   = addLight(0x22d3ee, 7,  -8,  2, 6);
  const lRight  = addLight(0x0ea5e9, 7,   8,  2, 6);
  const lTop    = addLight(0xffffff, 2,   0,  7, 4);
  const lPurple = addLight(0x818cf8, 3,   0, -4, 5);

  const TURNS=4.0, HEIGHT=11.0, RADIUS=1.5, ZSCALE=0.55, STEPS=200, BPSTEP=6;

  const backboneMat = new THREE.MeshPhongMaterial({
    color:0x22d3ee, emissive:0x083040, emissiveIntensity:0.45,
    shininess:180, transparent:true, opacity:0.90
  });

  const baseMats = [
    {color:0xff4d6d, emissive:0x8b0020},
    {color:0x4ade80, emissive:0x064020},
    {color:0x60a5fa, emissive:0x082060},
    {color:0xfbbf24, emissive:0x6b4700},
  ].map(c => new THREE.MeshPhongMaterial({
    color:c.color, emissive:c.emissive, emissiveIntensity:0.5,
    shininess:140, transparent:true, opacity:0.95
  }));

  function helixPoint(step, offset) {
    const t=step/STEPS, angle=t*Math.PI*2*TURNS+offset, y=(t-0.5)*HEIGHT;
    return new THREE.Vector3(Math.cos(angle)*RADIUS, y, Math.sin(angle)*RADIUS*ZSCALE);
  }

  function buildDNA(group) {
    function buildStrand(offset) {
      const pts = [];
      for (let i=0; i<=STEPS; i++) pts.push(helixPoint(i, offset));
      group.add(new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), STEPS*2, 0.08, 10, false),
        backboneMat
      ));
    }
    function makeCylinder(p1, p2, radius, mat) {
      const dir=new THREE.Vector3().subVectors(p2,p1), len=dir.length();
      if (len<0.001) return;
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,len,10,1), mat);
      mesh.position.copy(p1).addScaledVector(dir.clone().normalize(), len*0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
      group.add(mesh);
    }
    buildStrand(0);
    buildStrand(Math.PI);
    const sphereGeo = new THREE.SphereGeometry(0.15, 16, 16);
    for (let i=0; i<=STEPS; i+=BPSTEP) {
      const mat=baseMats[Math.floor(i/BPSTEP)%4], p1=helixPoint(i,0), p2=helixPoint(i,Math.PI);
      const s1=new THREE.Mesh(sphereGeo,mat); s1.position.copy(p1); group.add(s1);
      const s2=new THREE.Mesh(sphereGeo,mat); s2.position.copy(p2); group.add(s2);
      makeCylinder(p1,p2,0.042,mat);
    }
  }

  const leftGroup  = new THREE.Group();
  const rightGroup = new THREE.Group();
  scene.add(leftGroup);
  scene.add(rightGroup);

  buildDNA(leftGroup);
  buildDNA(rightGroup);

  function makeParticles(count, spread, color, size, opacity) {
    const pos=new Float32Array(count*3);
    for (let i=0;i<pos.length;i++) pos[i]=(Math.random()-0.5)*spread;
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color,size,transparent:true,opacity})));
  }
  makeParticles(500, 28, 0x22d3ee, 0.04, 0.25);
  makeParticles(200, 32, 0x67e8f9, 0.022, 0.15);

  function getDNAOffset() {
    const aspect = window.innerWidth / window.innerHeight;
    const distance = Math.abs(camera.position.z);
    const visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * distance;
    const visibleW = visibleH * aspect;
    const mobile = window.innerWidth < 700;
    const tablet = window.innerWidth < 1050;

    if (mobile) {
      return { leftX:0, rightX:visibleW*0.43, scale:.72, opacity:.30, showLeft:false, showRight:true };
    }
    if (tablet) {
      return { leftX:-visibleW*.46, rightX:visibleW*.46, scale:.84, opacity:.42, showLeft:true, showRight:true };
    }
    return { leftX:-visibleW*.475, rightX:visibleW*.475, scale:.96, opacity:.48, showLeft:true, showRight:true };
  }

  function updatePositions() {
    const cfg = getDNAOffset();
    leftGroup.visible = cfg.showLeft;
    rightGroup.visible = cfg.showRight;
    leftGroup.position.x = cfg.leftX;
    rightGroup.position.x = cfg.rightX;
    leftGroup.scale.setScalar(cfg.scale);
    rightGroup.scale.setScalar(cfg.scale);
    backboneMat.opacity = cfg.opacity;
    baseMats.forEach(function(m){m.opacity=Math.min(.72,cfg.opacity+.16);});
  }

  updatePositions();

  (function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return;
    const t = Date.now() * 0.001;
    leftGroup.rotation.y  =  t * 0.12;
    rightGroup.rotation.y = -t * 0.12;
    leftGroup.position.y  =  Math.sin(t * 0.18) * 0.16;
    rightGroup.position.y = -Math.sin(t * 0.18) * 0.16;
    const cfg = getDNAOffset();
    lLeft.position.set(cfg.leftX + Math.sin(t*.28)*1.6, 2+Math.cos(t*.18)*1.2, 6);
    lRight.position.set(cfg.rightX + Math.cos(t*.24)*1.6, 2+Math.sin(t*.16)*1.2, 6);
    renderer.render(scene, camera);
  })();
})();
