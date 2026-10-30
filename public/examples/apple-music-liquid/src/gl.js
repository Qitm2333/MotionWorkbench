const VERTEX = (
  /* glsl */
  `#version 300 es
out vec2 vUv;
void main() {
  // one triangle covering the viewport
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`
);
function createContext(canvas, preserve = false) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: preserve,
    powerPreference: "high-performance"
  });
  if (!gl) throw new Error("WebGL2 is not available");
  if (!gl.getExtension("EXT_color_buffer_float"))
    throw new Error("EXT_color_buffer_float is not available");
  gl.getExtension("OES_texture_float_linear");
  return gl;
}
function compile(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "";
    const lines = src.split("\n").map((l, i) => `${String(i + 1).padStart(4)} ${l}`).join("\n");
    throw new Error(`shader compile failed:
${log}
${lines}`);
  }
  return shader;
}
function createPass(gl, fragment) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(`program link failed: ${gl.getProgramInfoLog(program)}`);
  const locations = /* @__PURE__ */ new Map();
  const types = /* @__PURE__ */ new Map();
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    const name = info.name.replace(/\[0\]$/, "");
    types.set(name, info.type);
    locations.set(name, gl.getUniformLocation(program, info.name));
  }
  return {
    program,
    draw(target, uniforms) {
      gl.useProgram(program);
      let unit = 0;
      for (const [name, value] of Object.entries(uniforms)) {
        const loc = locations.get(name);
        if (loc === void 0 || loc === null) continue;
        const type = types.get(name);
        if (typeof value === "object" && "tex" in value) {
          const u = value.unit ?? unit++;
          gl.activeTexture(gl.TEXTURE0 + u);
          gl.bindTexture(gl.TEXTURE_2D, value.tex);
          gl.uniform1i(loc, u);
        } else if (typeof value === "number" || typeof value === "boolean") {
          const v = Number(value);
          if (type === gl.INT || type === gl.BOOL) gl.uniform1i(loc, v);
          else gl.uniform1f(loc, v);
        } else {
          const v = value;
          if (type === gl.INT_VEC2) gl.uniform2i(loc, v[0], v[1]);
          else if (type === gl.INT_VEC3) gl.uniform3i(loc, v[0], v[1], v[2]);
          else if (type === gl.FLOAT_VEC2) gl.uniform2fv(loc, v);
          else if (type === gl.FLOAT_VEC3) gl.uniform3fv(loc, v);
          else if (type === gl.FLOAT_VEC4) gl.uniform4fv(loc, v);
          else gl.uniform1fv(loc, v);
        }
      }
      if (target) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.viewport(0, 0, target.width, target.height);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  };
}
function createTarget(gl, width, height, { format = "rgba32f", filter = "nearest" } = {}) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  const [internal, type] = format === "rgba32f" ? [gl.RGBA32F, gl.FLOAT] : format === "rgba16f" ? [gl.RGBA16F, gl.HALF_FLOAT] : [gl.RGBA8, gl.UNSIGNED_BYTE];
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    internal,
    width,
    height,
    0,
    gl.RGBA,
    type,
    null
  );
  const f = filter === "linear" ? gl.LINEAR : gl.NEAREST;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  );
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE)
    throw new Error(
      `framebuffer incomplete (${format}): 0x${status.toString(16)}`
    );
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fbo, tex, width, height };
}
function clearTarget(gl, target, rgba = [0, 0, 0, 0]) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
  gl.viewport(0, 0, target.width, target.height);
  gl.clearColor(rgba[0], rgba[1], rgba[2], rgba[3]);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function deleteTarget(gl, target) {
  gl.deleteFramebuffer(target.fbo);
  gl.deleteTexture(target.tex);
}
function createImageTexture(gl, source) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const ext = gl.getExtension("EXT_texture_filter_anisotropic");
  if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  return tex;
}
export {
  clearTarget,
  createContext,
  createImageTexture,
  createPass,
  createTarget,
  deleteTarget
};
