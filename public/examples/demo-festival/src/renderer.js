(() => {
  const vertexSource = `
    attribute vec2 aPosition;
    attribute vec2 aUv;
    varying vec2 vUv;
    void main() {
      vUv = aUv;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const warpSource = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uXAnchor;
    uniform float uXHandleOffset;
    uniform float uYAnchor;
    uniform float uYHandleOffset;

    float cubicBezierY(float t, float p1, float p2) {
      float u = 1.0 - t;
      return 3.0 * u * u * t * p1 + 3.0 * u * t * t * p2 + t * t * t;
    }
    float solveBezierX(float x, float p1, float p2) {
      float t = x;
      for (int i = 0; i < 8; i++) {
        float u = 1.0 - t;
        float current = 3.0 * u * u * t * p1 + 3.0 * u * t * t * p2 + t * t * t;
        float derivative = 3.0 * u * u * p1 + 6.0 * u * t * (p2 - p1) + 3.0 * t * t * (1.0 - p2);
        if (abs(derivative) < 0.0001) break;
        t = clamp(t - (current - x) / derivative, 0.0, 1.0);
      }
      return t;
    }
    float warp(float value, float anchor, float rawOffset) {
      float limit = min(anchor, 1.0 - anchor);
      float offset = clamp(rawOffset, -limit, limit);
      float p1y = anchor - offset;
      float p2y = anchor + offset;
      float t = solveBezierX(value, 1.0 - p1y, 1.0 - p2y);
      return cubicBezierY(t, p1y, p2y);
    }
    void main() {
      vec2 uv = vec2(
        warp(vUv.x, uXAnchor, uXHandleOffset),
        warp(vUv.y, uYAnchor, uYHandleOffset)
      );
      gl_FragColor = texture2D(uTexture, uv);
    }
  `;

  const scaleTextureSource = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec2 uCenter;
    uniform float uScale;
    void main() {
      vec2 uv = (vUv - uCenter) / max(uScale, 0.0001) + uCenter;
      vec4 color = texture2D(uTexture, uv);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) color.a = 0.0;
      gl_FragColor = color;
    }
  `;

  const levelsSource = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uInMin;
    uniform float uMidpoint;
    uniform float uInMax;
    uniform float uOutMin;
    uniform float uOutMax;
    uniform vec3 uForeground;
    uniform vec3 uBackground;
    void main() {
      vec4 source = texture2D(uTexture, vUv);
      vec3 recolored = mix(uBackground, uForeground, source.rgb);
      vec3 inputRange = min(
        max(recolored - vec3(uInMin), vec3(0.0)) / vec3(max(0.0001, uInMax - uInMin)),
        vec3(uOutMax)
      );
      inputRange = pow(inputRange, vec3(1.0 / max(0.0001, 1.5 - uMidpoint)));
      gl_FragColor = vec4(mix(vec3(uOutMin), vec3(1.0), inputRange), source.a);
    }
  `;

  const fxaaSource = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec2 uResolution;
    uniform float uEnabled;
    void main() {
      if (uEnabled < 0.5) {
        gl_FragColor = texture2D(uTexture, vUv);
        return;
      }
      vec2 inverseSize = 1.0 / uResolution;
      vec3 rgbNW = texture2D(uTexture, vUv + vec2(-1.0, -1.0) * inverseSize).xyz;
      vec3 rgbNE = texture2D(uTexture, vUv + vec2(1.0, -1.0) * inverseSize).xyz;
      vec3 rgbSW = texture2D(uTexture, vUv + vec2(-1.0, 1.0) * inverseSize).xyz;
      vec3 rgbSE = texture2D(uTexture, vUv + vec2(1.0, 1.0) * inverseSize).xyz;
      vec3 rgbM = texture2D(uTexture, vUv).xyz;
      vec3 luma = vec3(0.299, 0.587, 0.114);
      float lumaNW = dot(rgbNW, luma);
      float lumaNE = dot(rgbNE, luma);
      float lumaSW = dot(rgbSW, luma);
      float lumaSE = dot(rgbSE, luma);
      float lumaM = dot(rgbM, luma);
      float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
      float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));
      vec2 direction;
      direction.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
      direction.y = (lumaNW + lumaSW) - (lumaNE + lumaSE);
      float reduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 / 8.0), 1.0 / 128.0);
      float reciprocal = 1.0 / (min(abs(direction.x), abs(direction.y)) + reduce);
      direction = clamp(direction * reciprocal, vec2(-8.0), vec2(8.0)) * inverseSize;
      vec3 rgbA = 0.5 * (
        texture2D(uTexture, vUv + direction * (1.0 / 3.0 - 0.5)).xyz
        + texture2D(uTexture, vUv + direction * (2.0 / 3.0 - 0.5)).xyz
      );
      vec3 rgbB = rgbA * 0.5 + 0.25 * (
        texture2D(uTexture, vUv + direction * (0.0 / 3.0 - 0.5)).xyz
        + texture2D(uTexture, vUv + direction * (3.0 / 3.0 - 0.5)).xyz
      );
      float lumaB = dot(rgbB, luma);
      gl_FragColor = vec4((lumaB < lumaMin || lumaB > lumaMax) ? rgbA : rgbB, 1.0);
    }
  `;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed');
    return shader;
  }

  function makeProgram(gl, fragment) {
    const value = gl.createProgram();
    gl.attachShader(value, compile(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(value, compile(gl, gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(value);
    if (!gl.getProgramParameter(value, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(value) || 'Shader link failed');
    return value;
  }

  function parseColor(color) {
    const value = String(color).replace('#', '');
    return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
  }

  function createRenderer(canvas, images) {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL is unavailable in this browser');
    const programs = {
      warp: makeProgram(gl, warpSource),
      scaleTexture: makeProgram(gl, scaleTextureSource),
      levels: makeProgram(gl, levelsSource),
      fxaa: makeProgram(gl, fxaaSource),
    };
    const buffer = gl.createBuffer();
    const imageTextures = {};
    const targets = [
      { filter: gl.NEAREST },
      { filter: gl.LINEAR },
      { filter: gl.LINEAR },
      { filter: gl.LINEAR },
    ];
    let width = 0;
    let height = 0;

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    for (const [name, image] of Object.entries(images)) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      imageTextures[name] = texture;
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    function allocate(target) {
      if (!target.texture) target.texture = gl.createTexture();
      if (!target.framebuffer) target.framebuffer = gl.createFramebuffer();
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, target.filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, target.filter);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Render framebuffer is incomplete');
    }

    function resize(nextWidth, nextHeight) {
      if (width === nextWidth && height === nextHeight) return;
      width = nextWidth;
      height = nextHeight;
      canvas.width = width;
      canvas.height = height;
      targets.forEach(allocate);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function bindTarget(target, clear = false) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer || null);
      gl.viewport(0, 0, width, height);
      if (clear) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    }

    function draw(program, texture, rect, uniforms = {}) {
      const [x0, y0, x1, y1] = rect;
      if (x1 - x0 < 0.0001 || y1 - y0 < 0.0001) return;
      const vertices = new Float32Array([
        x0 * 2 - 1, 1 - y0 * 2, 0, 1,
        x1 * 2 - 1, 1 - y0 * 2, 1, 1,
        x0 * 2 - 1, 1 - y1 * 2, 0, 0,
        x0 * 2 - 1, 1 - y1 * 2, 0, 0,
        x1 * 2 - 1, 1 - y0 * 2, 1, 1,
        x1 * 2 - 1, 1 - y1 * 2, 1, 0,
      ]);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
      const position = gl.getAttribLocation(program, 'aPosition');
      const uv = gl.getAttribLocation(program, 'aUv');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(uv);
      gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0);
      for (const [name, value] of Object.entries(uniforms)) {
        const location = gl.getUniformLocation(program, name);
        if (location === null) continue;
        if (Array.isArray(value) && value.length === 2) gl.uniform2fv(location, value);
        else if (Array.isArray(value) && value.length === 3) gl.uniform3fv(location, value);
        else gl.uniform1f(location, value);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function drawWarp(texture, anchors, offsets) {
      draw(programs.warp, texture, [0, 0, 1, 1], {
        uXAnchor: anchors.x,
        uXHandleOffset: offsets.x,
        uYAnchor: anchors.y,
        uYHandleOffset: offsets.y,
      });
    }

    function render(frame, options) {
      const gapX = Number(options.gap) / Math.max(1, width);
      const gapY = Number(options.gap) / Math.max(1, height);
      const horizontalSplit = 1 - frame.splitY;
      const rects = {
        d: [0, 0, frame.splitTop - gapX, horizontalSplit - gapY],
        e: [frame.splitTop + gapX, 0, 1, horizontalSplit - gapY],
        m: [0, horizontalSplit + gapY, frame.splitBottom - gapX, 1],
        o: [frame.splitBottom + gapX, horizontalSplit + gapY, 1, 1],
      };
      const pivots = { d: [0, 1], e: [1, 1], m: [0, 0], o: [1, 0] };
      bindTarget(targets[1], true);
      for (const letter of ['d', 'e', 'm', 'o']) {
        bindTarget(targets[0], true);
        drawWarp(imageTextures[letter], frame.anchors[letter], { x: 0, y: 0 });
        bindTarget(targets[1]);
        // ScaleTexture clears alpha outside the scaled glyph. Composite that
        // alpha as DrawImage does upstream, rather than copying clamped RGB.
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        draw(programs.scaleTexture, targets[0].texture, rects[letter], {
          uCenter: pivots[letter],
          uScale: frame.scale,
        });
        gl.disable(gl.BLEND);
      }
      bindTarget(targets[2], true);
      drawWarp(targets[1].texture, { x: 0.5, y: 0.5 }, { x: frame.globalX, y: frame.globalY });
      bindTarget(targets[3], true);
      draw(programs.levels, targets[2].texture, [0, 0, 1, 1], {
        uInMin: Number(options.inputMin),
        uMidpoint: Number(options.midpoint),
        uInMax: Number(options.inputMax),
        uOutMin: Number(options.outputMin),
        uOutMax: Number(options.outputMax),
        uForeground: parseColor(options.foreground),
        uBackground: parseColor(options.background),
      });
      bindTarget(null, true);
      draw(programs.fxaa, targets[3].texture, [0, 0, 1, 1], {
        uResolution: [width, height],
        uEnabled: options.antialiasing ? 1 : 0,
      });
    }

    function dispose() {
      Object.values(imageTextures).forEach((texture) => gl.deleteTexture(texture));
      targets.forEach((target) => {
        gl.deleteTexture(target.texture);
        gl.deleteFramebuffer(target.framebuffer);
      });
      Object.values(programs).forEach((value) => gl.deleteProgram(value));
      gl.deleteBuffer(buffer);
    }

    return { gl, resize, render, dispose };
  }

  window.DemoFestivalRenderer = { createRenderer };
})();
