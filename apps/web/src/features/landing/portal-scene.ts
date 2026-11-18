const vertexSource = `
precision mediump float;
attribute vec3 aSample;
uniform float uTime;
uniform float uAspect;
uniform float uScrollProgress;
uniform vec2 uMouse;
uniform bool uParticles;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vWeight;

vec3 knot(float t) {
  float radius = 1.0 + .43 * cos(3.0 * t);
  return vec3(radius * cos(2.0 * t), radius * sin(2.0 * t), .44 * sin(3.0 * t));
}

mat2 turn(float angle) {
  float c = cos(angle), s = sin(angle);
  return mat2(c, s, -s, c);
}

void main() {
  float time = uTime;
  vec3 point;
  vec3 normal = vec3(0.0, 0.0, 1.0);
  if (uParticles) {
    point = aSample;
    float seed = aSample.x + aSample.z;
    point.xy *= turn(.045 * time + sin(seed) * .3);
    point.y += .13 * sin(time * .6 + seed * 2.0);
    vWeight = .27 + .48 * pow(.5 + .5 * sin(seed * 8.0 + time * .5), 2.0);
  } else {
    float t = aSample.x;
    float ring = aSample.y;
    vec3 center = knot(t);
    vec3 tangent = normalize(knot(t + .002) - knot(t - .002));
    vec3 across = normalize(cross(tangent, vec3(0.0, 0.0, 1.0)));
    vec3 up = normalize(cross(across, tangent));
    normal = cos(ring) * across + sin(ring) * up;
    float radius = .145 + .045 * sin(t * 6.0 - time * 1.45) + .022 * cos(3.0 * ring + t * 9.0);
    point = center + normal * radius;
    point.z += .10 * sin(t * 4.0 - time * .8);
    vWeight = .5 + .5 * cos(t * 5.0 + ring * 2.0 - time * 1.25);
  }
  float pitch = .48 + uMouse.y * .13 + uScrollProgress * .42;
  float yaw = -.33 + sin(time * .22) * .26 + uMouse.x * .17;
  point.yz *= turn(pitch);
  normal.yz *= turn(pitch);
  point.xz *= turn(yaw);
  normal.xz *= turn(yaw);
  point.xy *= turn(-.33 + time * .071 + uScrollProgress * .7);
  normal.xy *= turn(-.33 + time * .071 + uScrollProgress * .7);
  vPosition = point;
  vNormal = normal;
  float depth = 5.8 - point.z;
  float scale = min(3.3, 3.5 / uAspect);
  vec2 xy = point.xy * vec2(scale, scale * uAspect);
  xy += uMouse * .31 + vec2(0.0, uScrollProgress * -.32);
  gl_Position = vec4(xy, depth * .75 - 3.7, depth);
  gl_PointSize = 1.0 + 2.4 * vWeight * clamp(6.0 / depth, .6, 1.4);
}
`;

const fragmentSource = `
precision mediump float;
uniform bool uParticles;
uniform vec3 uStateColor;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vWeight;

void main() {
  vec3 sapphire = vec3(.31, .42, .96);
  if (uParticles) {
    float glow = 1.0 - smoothstep(.05, .5, length(gl_PointCoord - .5));
    gl_FragColor = vec4(mix(sapphire, uStateColor, vWeight), glow * vWeight * .76);
    return;
  }
  vec3 normal = normalize(vNormal);
  vec3 eye = normalize(vec3(0.0, 0.0, 5.8) - vPosition);
  vec3 light = normalize(vec3(-.6, .83, .85));
  float diffuse = max(dot(normal, light), 0.0);
  float rim = pow(1.0 - max(dot(normal, eye), 0.0), 2.1);
  float reflectance = pow(max(dot(reflect(-light, normal), eye), 0.0), 23.0);
  vec3 tint = mix(sapphire, uStateColor, vWeight);
  vec3 color = vec3(.037, .057, .19) + tint * (.23 + .61 * diffuse + .5 * rim);
  color += vec3(.76, .81, 1.0) * reflectance * .9;
  gl_FragColor = vec4(color, .96);
}
`;

function geometry() {
  const length = 144;
  const sides = 14;
  const vertices: number[] = [];
  const turn = Math.PI * 2;
  for (let along = 0; along < length; along++) {
    const a = (along / length) * turn;
    const b = ((along + 1) / length) * turn;
    for (let around = 0; around < sides; around++) {
      const c = (around / sides) * turn;
      const d = ((around + 1) / sides) * turn;
      vertices.push(a, c, 0, b, c, 0, a, d, 0, a, d, 0, b, c, 0, b, d, 0);
    }
  }
  const meshCount = vertices.length / 3;
  for (let index = 1; index <= 420; index++) {
    const angle = index * 2.399963;
    const radius = 1.42 + (index % 53) / 23;
    vertices.push(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.75,
      ((index * 193) % 439) / 94 - 2.3,
    );
  }
  return {
    data: new Float32Array(vertices),
    meshCount,
    pointCount: vertices.length / 3 - meshCount,
  };
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

export function createPortalScene(
  canvas: HTMLCanvasElement,
  onRender: (rendered: boolean) => void,
) {
  let gl: WebGLRenderingContext | null;
  try {
    gl = canvas.getContext("webgl", { alpha: true, antialias: true, powerPreference: "low-power" });
  } catch {
    return null;
  }
  if (!gl || !("ResizeObserver" in window)) return null;
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  if (!vertex || !fragment || !program || !buffer) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    return null;
  }

  const { data, meshCount, pointCount } = geometry();
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const attribute = gl.getAttribLocation(program, "aSample");
  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, 3, gl.FLOAT, false, 0, 0);
  const uniforms = {
    time: gl.getUniformLocation(program, "uTime"),
    mouse: gl.getUniformLocation(program, "uMouse"),
    scroll: gl.getUniformLocation(program, "uScrollProgress"),
    color: gl.getUniformLocation(program, "uStateColor"),
    aspect: gl.getUniformLocation(program, "uAspect"),
    particles: gl.getUniformLocation(program, "uParticles"),
  };
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  let frame = 0;
  let lastDraw = -Infinity;
  let time = 0;
  let active = false;
  let rendered = false;
  let lost = false;
  let mouseX = 0;
  let mouseY = 0;
  let currentX = 0;
  let currentY = 0;
  let scroll = 0;
  let width = 0;
  let height = 0;

  const onResize = new ResizeObserver(([entry]) => {
    if (!entry) return;
    width = entry.contentRect.width;
    height = entry.contentRect.height;
  });
  onResize.observe(canvas);
  const onPointer = (event: PointerEvent) => {
    if (!active || event.pointerType !== "mouse") return;
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = 1 - (event.clientY / window.innerHeight) * 2;
  };
  const onScroll = () => {
    scroll = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const draw = (now: number) => {
    if (!active || lost) return;
    frame = requestAnimationFrame(draw);
    if (!gl || !width || !height || now - lastDraw < 1000 / 30) return;
    time += Math.min(70, now - lastDraw) / 1000;
    lastDraw = now;
    const scale = Math.min(
      window.devicePixelRatio || 1,
      1.5,
      Math.sqrt(850_000 / (width * height)),
    );
    const pixelWidth = Math.max(1, Math.round(width * scale));
    const pixelHeight = Math.max(1, Math.round(height * scale));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      gl.viewport(0, 0, pixelWidth, pixelHeight);
    }
    currentX += (mouseX - currentX) * 0.085;
    currentY += (mouseY - currentY) * 0.085;
    gl.uniform1f(uniforms.aspect, width / height);
    gl.uniform1f(uniforms.time, time);
    gl.uniform1f(uniforms.scroll, scroll);
    gl.uniform2f(uniforms.mouse, currentX, currentY);
    gl.uniform3f(uniforms.color, 0.72 - scroll * 0.16, 0.58 - scroll * 0.12, 0.98);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.uniform1i(uniforms.particles, 1);
    gl.drawArrays(gl.POINTS, meshCount, pointCount);
    gl.enable(gl.DEPTH_TEST);
    gl.uniform1i(uniforms.particles, 0);
    gl.drawArrays(gl.TRIANGLES, 0, meshCount);
    if (!rendered) {
      if (gl.getError() !== gl.NO_ERROR) {
        active = false;
        cancelAnimationFrame(frame);
        onRender(false);
        return;
      }
      rendered = true;
      onRender(true);
    }
  };
  const handleLostContext = () => {
    lost = true;
    cancelAnimationFrame(frame);
    onRender(false);
  };
  canvas.addEventListener("webglcontextlost", handleLostContext);

  return {
    setActive(next: boolean) {
      if (next === active || lost) return;
      active = next;
      if (next) frame = requestAnimationFrame(draw);
      else cancelAnimationFrame(frame);
    },
    dispose() {
      active = false;
      cancelAnimationFrame(frame);
      onResize.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      canvas.removeEventListener("webglcontextlost", handleLostContext);
      gl?.deleteBuffer(buffer);
      gl?.deleteProgram(program);
    },
  };
}
