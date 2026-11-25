import { Color, DoubleSide, ShaderMaterial, Vector2, Vector3 } from 'three'
import { CONFIG } from '../../config'
import { NOISE_GLSL } from './noise'

const W = CONFIG.waterfall

/**
 * Falling water. UVs must run top (v = 1) to bottom (v = 0); the noise scrolls
 * down them. Used for the main sheet and for the heavy water columns.
 */
export function createFallMaterial(streakScale: [number, number], baseFoam: number) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: W.speed },
      uColor: { value: new Color(W.color) },
      uDeepColor: { value: new Color(W.deepColor) },
      uFoam: { value: W.foam },
      uOpacity: { value: W.opacity },
      uWobble: { value: W.wobble },
      /** Noise frequency across and down the fall; high x, low y gives streaks. */
      uScale: { value: new Vector2(...streakScale) },
      /** Fraction of the height, from the bottom, that turns to white foam. */
      uBaseFoam: { value: baseFoam },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uWobble;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      ${NOISE_GLSL}

      void main() {
        vUv = uv;
        // Ripples travel down with the flow and grow as the water falls.
        float flow = uv.y * 7.0 + uTime * uSpeed * 1.4;
        float ripple = vnoise(vec2(uv.x * 9.0, flow)) - 0.5;
        vec3 displaced = position + normal * ripple * uWobble * (0.35 + 0.65 * (1.0 - uv.y));
        vec4 world = modelMatrix * vec4(displaced, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform vec3 uColor;
      uniform vec3 uDeepColor;
      uniform float uFoam;
      uniform float uOpacity;
      uniform vec2 uScale;
      uniform float uBaseFoam;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      ${NOISE_GLSL}

      void main() {
        float t = uTime * uSpeed;
        // Two noise layers at different scales and speeds, both moving down.
        float n1 = vnoise(vec2(vUv.x * uScale.x, vUv.y * uScale.y + t));
        float n2 = vnoise(vec2(vUv.x * uScale.x * 2.7 + 13.0, vUv.y * uScale.y * 2.2 + t * 1.8));
        float n = n1 * 0.6 + n2 * 0.4;

        float streak = smoothstep(0.48, 0.82, n);
        vec3 color = mix(uDeepColor, uColor, n);
        color = mix(color, vec3(1.0), streak * uFoam);

        // Bright lip where the water rolls over the top edge.
        color += smoothstep(0.93, 1.0, vUv.y) * 0.35;

        // Ragged white foam where the fall meets the pool or a ledge.
        float base = 1.0 - smoothstep(0.0, uBaseFoam, vUv.y + (n2 - 0.5) * uBaseFoam * 0.9);
        color = mix(color, vec3(1.0), base * min(1.0, uFoam * 1.5));

        // Fresnel: glancing angles pick up more sky.
        float fresnel = pow(1.0 - abs(dot(normalize(vWorldNormal), normalize(vViewDir))), 3.0);
        color += fresnel * 0.3;

        // Thin, see-through, uneven edges.
        float edge = smoothstep(0.0, 0.11, vUv.x + (n1 - 0.5) * 0.06)
                   * smoothstep(0.0, 0.11, 1.0 - vUv.x + (n2 - 0.5) * 0.06);
        float alpha = uOpacity * (0.7 + 0.3 * n);
        alpha = max(alpha, max(streak * uFoam * 0.9, base));
        alpha *= mix(0.12, 1.0, edge);

        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}

/** Churning foam lying on the pool where the fall lands. */
export function createFoamMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: W.speed },
      uFoam: { value: W.foam },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uFoam;
      varying vec2 vUv;
      ${NOISE_GLSL}

      void main() {
        float t = uTime * uSpeed * 0.35;
        // Foam drifts away from the fall (towards v = 0).
        float n = vnoise(vec2(vUv.x * 26.0, vUv.y * 7.0 + t)) * 0.6
                + vnoise(vec2(vUv.x * 60.0 + 7.0, vUv.y * 16.0 + t * 1.7)) * 0.4;
        // Densest against the fall, breaking up towards the open pool and the ends.
        float density = smoothstep(0.0, 1.0, vUv.y) * smoothstep(0.0, 0.12, vUv.x) * smoothstep(0.0, 0.12, 1.0 - vUv.x);
        float foam = smoothstep(1.0 - density * (0.55 + uFoam * 0.45), 1.0 - density * 0.3, n);
        gl_FragColor = vec4(vec3(1.0), foam * 0.92);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}

/** Plunge pool surface: procedural animated normals, fresnel sky tint, sun glint. */
export function createPoolMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uShallow: { value: new Color(CONFIG.pool.shallowColor) },
      uDeep: { value: new Color(CONFIG.pool.deepColor) },
      uSky: { value: new Color(CONFIG.pool.skyColor) },
      uSunDir: { value: new Vector3(...CONFIG.sunPosition).normalize() },
      uRipple: { value: CONFIG.pool.rippleStrength },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uShallow;
      uniform vec3 uDeep;
      uniform vec3 uSky;
      uniform vec3 uSunDir;
      uniform float uRipple;
      varying vec3 vWorld;
      ${NOISE_GLSL}

      float height(vec2 p) {
        return vnoise(p * 0.9 + vec2(uTime * 0.25, uTime * 0.18))
             + 0.5 * vnoise(p * 2.3 - vec2(uTime * 0.3, -uTime * 0.22));
      }

      void main() {
        vec2 p = vWorld.xz;
        float e = 0.08;
        float h = height(p);
        vec3 normal = normalize(vec3(
          (h - height(p + vec2(e, 0.0))) / e * uRipple,
          1.0,
          (h - height(p + vec2(0.0, e))) / e * uRipple
        ));
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
        vec3 color = mix(uDeep, uShallow, 0.35 + 0.3 * h);
        color = mix(color, uSky, fresnel * 0.6);
        float glint = pow(max(dot(reflect(-uSunDir, normal), viewDir), 0.0), 90.0);
        color += glint * 0.9;
        gl_FragColor = vec4(color, mix(0.8, 0.97, fresnel));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}

/** Soft round sprites for drifting mist. Per-point size and alpha. */
export function createMistMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new Color(CONFIG.mist.color) },
      uOpacity: { value: CONFIG.mist.opacity },
      /** Pixels per world unit at one metre; set from the viewport each frame. */
      uPixelScale: { value: 600 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aAlpha;
      uniform float uPixelScale;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelScale / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float soft = smoothstep(1.0, 0.0, d);
        gl_FragColor = vec4(uColor, soft * soft * vAlpha * uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}
