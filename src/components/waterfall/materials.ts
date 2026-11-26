import { Color, DoubleSide, ShaderMaterial, Vector2, Vector3, type Texture } from 'three'
import { CONFIG } from '../../config'
import { NOISE_GLSL } from './noise'

const W = CONFIG.waterfall
const sunDirection = () => new Vector3(...CONFIG.sunPosition).normalize()
/** How many pool rocks the water shader can ripple and foam around. */
export const MAX_POOL_ROCKS = 8

/**
 * Falling water. UVs must run top (v = 1) to bottom (v = 0).
 *
 * Real falls are mostly white, aerated water in clumped veils with darker gaps
 * where the rock shows through, and the water speeds up as it drops. So the
 * pattern is laid out in *fall time* (the square root of distance fallen),
 * which stretches the streaks towards the bottom, and its density drives both
 * the whiteness and the opacity.
 */
export function createFallMaterial(streakScale: [number, number], baseFoam: number, seed = 0, strength = 1) {
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
      /** Noise frequency across the fall and along fall time. */
      uScale: { value: new Vector2(...streakScale) },
      /** Fraction of the height, from the bottom, that dissolves into white mist. */
      uBaseFoam: { value: baseFoam },
      /** Offsets the pattern so stacked layers do not line up. */
      uSeed: { value: seed },
      /** Overall strength; the thin front veil uses less than the main sheet. */
      uStrength: { value: strength },
      uSunDir: { value: sunDirection() },
      uSunColor: { value: new Color(CONFIG.sunColor) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uWobble;
      uniform float uSeed;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      ${NOISE_GLSL}

      void main() {
        vUv = uv;
        float fallTime = sqrt(1.0 - uv.y + 0.02);
        float flow = fallTime * 9.0 - uTime * uSpeed * 1.4;
        float ripple = vnoise(vec2(uv.x * 9.0 + uSeed, flow)) - 0.5;
        // Calm at the lip, increasingly broken up as it falls.
        vec3 displaced = position + normal * ripple * uWobble * (0.25 + 0.75 * (1.0 - uv.y));
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
      uniform float uSeed;
      uniform float uStrength;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      ${NOISE_GLSL}

      float fbm(vec2 p) {
        return vnoise(p) * 0.55 + vnoise(p * 2.07 + 11.3) * 0.3 + vnoise(p * 4.3 + 4.7) * 0.15;
      }

      void main() {
        float fall = 1.0 - vUv.y;
        // Position in fall time: the pattern slides down and stretches as it speeds up.
        float t = sqrt(fall + 0.02) * uScale.y * 2.2 - uTime * uSpeed;
        float x = vUv.x * uScale.x + uSeed;

        // Slow sideways drift so the veils wander instead of running in rails.
        float drift = (vnoise(vec2(x * 0.18, t * 0.25 + uSeed)) - 0.5) * 2.4;
        float veil = fbm(vec2(x * 0.32 + drift, t * 0.5));          // broad curtains
        float strands = fbm(vec2(x + drift * 2.0, t * 1.15));       // individual streams
        float fine = vnoise(vec2(x * 3.6 + drift, t * 2.6));        // droplets and fringe

        // Thicker in the middle of the fall and where it has just left the lip.
        float across = 1.0 - pow(abs(vUv.x * 2.0 - 1.0), 3.0);
        float body = veil * 0.55 + strands * 0.33 + fine * 0.12;
        float density = smoothstep(0.4, 0.7, body + 0.12 * across + 0.16 * smoothstep(0.75, 1.0, vUv.y) + (uFoam - 0.5) * 0.3);

        // Aerated water is white; thin veils keep some of the water's own colour.
        vec3 thin = mix(uDeepColor, uColor, strands);
        vec3 color = mix(thin, vec3(0.96, 0.985, 1.0), density);

        // Soft self-shadowing between strands, and warm light where the sun catches them.
        float relief = strands - fbm(vec2(x + drift * 2.0 + 0.35, t * 1.15));
        float facing = clamp(dot(normalize(vWorldNormal), uSunDir) * 0.5 + 0.5, 0.0, 1.0);
        color *= 0.78 + 0.22 * facing + relief * 1.3;
        float glint = pow(fine, 9.0) * density * facing;
        color += uSunColor * glint * 1.6;

        // The lip: smooth, glassy, tinted water before it breaks up.
        float lip = smoothstep(0.9, 1.0, vUv.y);
        float fresnel = pow(1.0 - abs(dot(normalize(vWorldNormal), normalize(vViewDir))), 3.0);
        color = mix(color, uColor * (0.75 + 0.6 * fresnel) + 0.25, lip * 0.75);

        // The foot of the fall dissolves into white spray.
        float base = 1.0 - smoothstep(0.0, uBaseFoam, vUv.y + (fine - 0.5) * uBaseFoam);
        color = mix(color, vec3(1.0), base);

        // Ragged, see-through edges; gaps between veils let the rock show.
        float edge = smoothstep(0.0, 0.13, vUv.x + (veil - 0.5) * 0.09)
                   * smoothstep(0.0, 0.13, 1.0 - vUv.x + (strands - 0.5) * 0.09);
        float alpha = mix(uOpacity * 0.32, 0.97, density);
        alpha = max(alpha, max(lip * 0.85, base * 0.95));
        alpha *= mix(0.06, 1.0, edge) * uStrength;

        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}

/** Churning foam lying on the pool where the fall lands. */
export function createFoamMaterial(foamMask: Texture) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      /** Tileable black-and-white foam pattern (Flow texture). */
      uFoamMask: { value: foamMask },
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
      uniform sampler2D uFoamMask;
      varying vec2 vUv;
      ${NOISE_GLSL}

      void main() {
        float t = uTime * uSpeed * 0.35;
        // Foam drifts away from the fall (towards v = 0). Two copies of the
        // painted foam pattern slide at different speeds, broken up by noise.
        float painted = texture2D(uFoamMask, vec2(vUv.x * 4.0, vUv.y + t * 0.5)).r * 0.6
                      + texture2D(uFoamMask, vec2(vUv.x * 2.3 + 0.37, vUv.y * 0.6 + t * 0.28)).r * 0.4;
        float n = mix(vnoise(vec2(vUv.x * 26.0, vUv.y * 7.0 + t)), painted, 0.7);
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

/**
 * Plunge pool surface. Looking down you see into the water; at a glancing
 * angle it mirrors the sky (sampled straight from the sky panorama) and the
 * dark cliff. Ripples spread out from where the fall lands.
 */
export function createPoolMaterial(sky: Texture, fallLineZ: number, shoreZ: number, bankX: number, rocks: Vector3[]) {
  // Fixed-size list for the shader: (x, z, radius) of each rock standing in the pool.
  const rockList = Array.from({ length: MAX_POOL_ROCKS }, (_, i) => rocks[i] ?? new Vector3(0, 0, 0))
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uShallow: { value: new Color(CONFIG.pool.shallowColor) },
      uDeep: { value: new Color(CONFIG.pool.deepColor) },
      uCliff: { value: new Color(CONFIG.pool.cliffReflection) },
      uSky: { value: sky },
      uSunDir: { value: sunDirection() },
      uSunColor: { value: new Color(CONFIG.sunColor) },
      uRipple: { value: CONFIG.pool.rippleStrength },
      /** World Z of the foot of the fall and of the shore edge. */
      uFallZ: { value: fallLineZ },
      uShoreZ: { value: shoreZ },
      /** |x| of the rock banks at either side of the pool. */
      uBankX: { value: bankX },
      uRocks: { value: rockList },
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
      uniform vec3 uCliff;
      uniform sampler2D uSky;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uRipple;
      uniform float uFallZ;
      uniform float uShoreZ;
      uniform float uBankX;
      uniform vec3 uRocks[${MAX_POOL_ROCKS}];
      varying vec3 vWorld;
      ${NOISE_GLSL}

      float height(vec2 p) {
        // Wind chop at three scales, drifting in different directions.
        float h = vnoise(p * 0.8 + vec2(uTime * 0.22, uTime * 0.16))
                + 0.5 * vnoise(p * 2.1 - vec2(uTime * 0.3, -uTime * 0.21))
                + 0.22 * vnoise(p * 5.3 + vec2(-uTime * 0.5, uTime * 0.37));
        // Rings pushed out by the falling water, fading with distance.
        float fromFall = max(0.0, p.y - uFallZ);
        h += 0.35 * sin(fromFall * 4.2 - uTime * 3.2 + vnoise(p * 0.7) * 4.0) * exp(-fromFall * 0.45);
        // Rough, boiling water right where the fall lands.
        h += 0.9 * (vnoise(p * 3.1 + vec2(0.0, -uTime * 1.6)) - 0.5) * exp(-fromFall * 0.9);
        // Small rings lapping around every rock that breaks the surface.
        for (int i = 0; i < ${MAX_POOL_ROCKS}; i++) {
          vec3 rock = uRocks[i];
          if (rock.z <= 0.0) continue;
          float d = max(0.0, length(p - rock.xy) - rock.z);
          h += 0.16 * sin(d * 9.0 - uTime * 2.4) * exp(-d * 1.7);
        }
        return h;
      }

      vec3 skyColor(vec3 dir) {
        // The sky sphere is turned a quarter turn about Y; undo that for the lookup.
        vec3 d = vec3(-dir.z, dir.y, dir.x);
        vec2 uv = vec2(fract(atan(d.z, -d.x) / 6.2831853), asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5);
        return texture2D(uSky, uv).rgb;
      }

      void main() {
        vec2 p = vWorld.xz;
        float e = 0.07;
        float h = height(p);
        vec3 normal = normalize(vec3(
          (h - height(p + vec2(e, 0.0))) / e * uRipple,
          1.0,
          (h - height(p + vec2(0.0, e))) / e * uRipple
        ));
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float fresnel = 0.03 + 0.97 * pow(1.0 - max(dot(normal, viewDir), 0.0), 5.0);

        // Reflection: sky above, the dark cliff where the mirrored ray heads into it.
        vec3 r = reflect(-viewDir, normal);
        r.y = abs(r.y);
        vec3 reflection = skyColor(r);
        float towardsCliff = smoothstep(0.05, -0.35, r.z) * smoothstep(0.95, 0.25, r.y);
        reflection = mix(reflection, uCliff, towardsCliff * 0.85);
        // ...and the white column of the fall itself, where the ray lands on it.
        float hitX = vWorld.x + r.x * (uFallZ - vWorld.z) / min(r.z, -0.05);
        float fallMirror = towardsCliff * smoothstep(6.6, 4.6, abs(hitX + (h - 0.8) * 0.8));
        reflection = mix(reflection, vec3(0.82, 0.9, 0.93), fallMirror * 0.75);

        // Body colour: clearer and greener in the shallows by the shore, darker by the fall.
        float depth = smoothstep(uShoreZ, uFallZ, vWorld.z);
        vec3 body = mix(uShallow, uDeep, depth * 0.85 + 0.1);
        vec3 color = mix(body, reflection, fresnel);

        // Sun glitter.
        float glint = pow(max(dot(reflect(-uSunDir, normal), viewDir), 0.0), 180.0);
        color += uSunColor * glint * 2.2;

        // A thin, broken line of foam where the water laps the shore and the banks.
        float lap = 1.0 - smoothstep(0.0, 0.45, abs(vWorld.z - uShoreZ + 0.55 + (h - 0.8) * 0.25));
        lap = max(lap, 1.0 - smoothstep(0.0, 0.4, abs(uBankX - abs(vWorld.x) - 0.25 + (h - 0.8) * 0.25)));
        float breakup = vnoise(p * 2.6 + vec2(uTime * 0.2, 0.0));
        color = mix(color, vec3(1.0), lap * smoothstep(0.45, 0.8, breakup) * 0.6);

        // Foam collars around the rocks, and churned white water under the fall.
        float collar = 0.0;
        for (int i = 0; i < ${MAX_POOL_ROCKS}; i++) {
          vec3 rock = uRocks[i];
          if (rock.z <= 0.0) continue;
          float d = length(p - rock.xy) - rock.z;
          collar = max(collar, 1.0 - smoothstep(-0.1, 0.32, d + (breakup - 0.5) * 0.35));
        }
        float fromFallLine = max(0.0, vWorld.z - uFallZ);
        float churn = exp(-fromFallLine * 1.6) * smoothstep(0.45, 0.85, vnoise(p * 1.9 + vec2(0.0, -uTime * 0.9)) + exp(-fromFallLine * 2.2) * 0.6);
        float white = max(collar * smoothstep(0.3, 0.7, breakup + collar * 0.4), churn);
        color = mix(color, vec3(0.97, 0.99, 1.0), white * 0.9);

        // Straight down you see the bed through the water; edge-on it is a mirror.
        float alpha = max(mix(0.5 + 0.38 * depth, 0.98, fresnel), white * 0.95);
        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}

/** Soft round sprites with per-point size and alpha: mist puffs and spray droplets. */
export function createSpriteMaterial(color: string, opacity: number) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new Color(color) },
      uOpacity: { value: opacity },
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
