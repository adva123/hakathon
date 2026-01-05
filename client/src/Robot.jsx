/* eslint-disable react/no-unknown-property */
/* eslint-disable react-hooks/immutability */
import { useEffect, useMemo, forwardRef, useImperativeHandle, useRef } from "react";
import PropTypes from 'prop-types';
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

// מוסיף forwardRef כדי ש-ThreeDemo יוכל לשלוט עליו
const Robot = forwardRef((props, ref) => {
  const gltf = useGLTF("/models/RobotExpressive.glb");
  const { scene, animations } = gltf;

  const { faceTextureUrl, laptopCanvas, ...rest } = props;

  const groupRef = useRef(null);
  useImperativeHandle(ref, () => groupRef.current);

  // Eye gaze + greeting refs.
  const leftEyeGlowRef = useRef(null);
  const rightEyeGlowRef = useRef(null);
  const leftPupilRef = useRef(null);
  const rightPupilRef = useRef(null);

  const gazeTmp = useRef(new THREE.Vector3());
  const gazeDir = useRef(new THREE.Vector3());
  const winkState = useRef({ lastWinkAt: 0, activeUntil: 0 });

  const waveRig = useRef({
    ready: false,
    inner: null,
    shell: null,
    base: null,
  });

  // Two clones: inner (core) + outer (glass shell)
  const innerScene = useMemo(() => clone(scene), [scene]);
  const shellScene = useMemo(() => clone(scene), [scene]);

  const { actions, names } = useAnimations(animations, innerScene);

  // === Face "screen" material (user avatar) ===
  const faceMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0a0e1a'),
        emissive: new THREE.Color('#00ffff'),
        emissiveIntensity: 0.85,
        roughness: 0.22,
        metalness: 0.25,
        side: THREE.DoubleSide,
      }),
    []
  );
  const faceTextureRef = useRef(null);
  const faceShaderRef = useRef(null);

  // === Laptop screen (route map) ===
  const laptopTexRef = useRef(null);
  const laptopMatRef = useRef(null);

  const defaultTabletCanvas = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#061221';
    ctx.fillRect(0, 0, size, size);

    // Tablet screen (bright cyan glow)
    const sx = size * 0.16;
    const sy = size * 0.20;
    const sw = size * 0.68;
    const sh = size * 0.58;
    const rr = 34;
    const roundRect = (x, y, ww, hh, r) => {
      const r2 = Math.max(0, Math.min(r, Math.min(ww, hh) / 2));
      ctx.beginPath();
      ctx.moveTo(x + r2, y);
      ctx.lineTo(x + ww - r2, y);
      ctx.quadraticCurveTo(x + ww, y, x + ww, y + r2);
      ctx.lineTo(x + ww, y + hh - r2);
      ctx.quadraticCurveTo(x + ww, y + hh, x + ww - r2, y + hh);
      ctx.lineTo(x + r2, y + hh);
      ctx.quadraticCurveTo(x, y + hh, x, y + hh - r2);
      ctx.lineTo(x, y + r2);
      ctx.quadraticCurveTo(x, y, x + r2, y);
      ctx.closePath();
    };

    // Outer device frame hint
    ctx.save();
    ctx.strokeStyle = 'rgba(26,26,46,0.9)';
    ctx.lineWidth = 10;
    roundRect(sx - 10, sy - 10, sw + 20, sh + 20, rr + 10);
    ctx.stroke();
    ctx.restore();

    // Screen glow field
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 30;
    const glow = ctx.createRadialGradient(size * 0.5, size * 0.5, 10, size * 0.5, size * 0.5, size * 0.52);
    glow.addColorStop(0, 'rgba(255,255,255,0.55)');
    glow.addColorStop(0.55, 'rgba(0,229,255,0.55)');
    glow.addColorStop(1, 'rgba(0,229,255,0.0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Screen surface
    ctx.save();
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 30;
    const sg = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
    sg.addColorStop(0, 'rgba(255,255,255,0.25)');
    sg.addColorStop(0.35, 'rgba(0,229,255,0.85)');
    sg.addColorStop(1, 'rgba(0,229,255,0.25)');
    ctx.fillStyle = sg;
    roundRect(sx, sy, sw, sh, rr);
    ctx.fill();
    ctx.restore();

    // Interface blocks
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(26,26,46,0.55)';
    roundRect(sx + 26, sy + 26, sw * 0.62, 22, 10);
    ctx.fill();
    roundRect(sx + 26, sy + 62, sw * 0.42, 18, 10);
    ctx.fill();
    roundRect(sx + 26, sy + 94, sw * 0.52, 18, 10);
    ctx.fill();
    roundRect(sx + 26, sy + 128, sw * 0.30, 18, 10);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    roundRect(sx + sw * 0.72, sy + 26, sw * 0.18, 18, 8);
    ctx.fill();
    ctx.restore();

    // Scanlines
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let y = 0; y < size; y += 6) ctx.fillRect(0, y, size, 1);
    ctx.globalAlpha = 1;

    return canvas;
  }, []);

  useEffect(() => {
    // Dispose old texture when canvas changes.
    if (laptopTexRef.current) {
      try {
        laptopTexRef.current.dispose();
      } catch {
        // ignore
      }
      laptopTexRef.current = null;
    }

    const canvas = laptopCanvas || defaultTabletCanvas;
    if (!canvas) return;

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    laptopTexRef.current = tex;

    if (laptopMatRef.current) {
      laptopMatRef.current.map = tex;
      laptopMatRef.current.needsUpdate = true;
    }

    return () => {
      if (tex) {
        try {
          tex.dispose();
        } catch {
          // ignore
        }
      }
    };
  }, [laptopCanvas, defaultTabletCanvas]);

  useEffect(() => {
    // Candy toon-ish filter: posterize + soft vignette (keeps photo readable).
    faceMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uPosterize = { value: 5.0 };
      shader.uniforms.uVignette = { value: 0.22 };
      faceShaderRef.current = shader;

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>\nuniform float uTime;\nuniform float uPosterize;\nuniform float uVignette;`
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>\n\n// Posterize for a toon-like screen look.\nfloat steps = max(2.0, uPosterize);\ndiffuseColor.rgb = floor(diffuseColor.rgb * steps) / steps;\n\n// Soft vignette for readability (works even if no map is set).\nvec2 uv = vec2(0.5);\n#ifdef USE_MAP\n  uv = vMapUv;\n#endif\nfloat v = smoothstep(0.9, 0.1, distance(uv, vec2(0.5)));\ndiffuseColor.rgb = mix(diffuseColor.rgb * (1.0 - uVignette), diffuseColor.rgb, v);`
        );
    };
    faceMaterial.toneMapped = false;
    faceMaterial.needsUpdate = true;

    return () => {
      faceShaderRef.current = null;
    };
  }, [faceMaterial]);

  const faceParent = useMemo(() => {
    let found = null;
    // Try to find a head/face-related node in the cloned rig.
    innerScene.traverse((obj) => {
      if (found) return;
      const name = (obj.name || '').toLowerCase();
      if (!name) return;
      if (name.includes('head') || name.includes('face')) found = obj;
    });
    return found;
  }, [innerScene]);

  useEffect(() => {
    // Clear previous
    if (!faceTextureUrl) {
      if (faceMaterial.map) {
        faceMaterial.map = null;
        faceMaterial.needsUpdate = true;
      }
      if (faceTextureRef.current) {
        try {
          faceTextureRef.current.dispose();
        } catch {
          // ignore
        }
        faceTextureRef.current = null;
      }
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      faceTextureUrl,
      (tex) => {
        // Dispose old texture (if any)
        if (faceTextureRef.current && faceTextureRef.current !== tex) {
          try {
            faceTextureRef.current.dispose();
          } catch {
            // ignore
          }
        }
        faceTextureRef.current = tex;

        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.anisotropy = 8;

        // Center + crop to fit a "screen" aspect (cover).
        const img = tex.image;
        const iw = img?.videoWidth || img?.width;
        const ih = img?.videoHeight || img?.height;
        const imgAspect = iw && ih ? iw / ih : 1;

        const screenAspect = 1.3; // width / height
        let rx = 1;
        let ry = 1;
        let ox = 0;
        let oy = 0;
        if (imgAspect > screenAspect) {
          // too wide: crop left/right
          rx = screenAspect / imgAspect;
          ox = (1 - rx) * 0.5;
        } else if (imgAspect < screenAspect) {
          // too tall: crop top/bottom
          ry = imgAspect / screenAspect;
          oy = (1 - ry) * 0.5;
        }
        tex.repeat.set(rx, ry);
        tex.offset.set(ox, oy);
        tex.needsUpdate = true;

        faceMaterial.map = tex;
        faceMaterial.needsUpdate = true;
      },
      undefined,
      () => {
        // ignore load errors
      }
    );
  }, [faceTextureUrl, faceMaterial]);

  // חומרים בסגנון Toon
  const toonMaterial = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: new THREE.Color("#ffd6ff"), // פסטלי-ורדרד
        skinning: true,
      }),
    []
  );

  // Inner/core look: keep original shading, boost emissive to feel like energy inside.
  useEffect(() => {
    let referenceBodyColor = null;

    innerScene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const skinned = obj.isSkinnedMesh;

      const name = (obj.name || '').toLowerCase();
      const isHeadLike = name.includes('head') || name.includes('face');

      const src = obj.material;
      const srcMat = Array.isArray(src) ? src[0] : src;
      const baseColor = srcMat?.color ? srcMat.color.clone() : new THREE.Color('#ffd6ff');

      const orange = new THREE.Color('#FF6B35');
      const m = new THREE.MeshPhysicalMaterial({
        color: baseColor.multiply(orange),
        roughness: 0.38,
        metalness: 0.35,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        emissive: new THREE.Color('#1A1A2E'),
        emissiveIntensity: 0.08,
      });

      // Capture a reference body color from the first non-head mesh.
      if (!referenceBodyColor && !isHeadLike) {
        referenceBodyColor = m.color.clone();
      }

      // Force head/face meshes to match the body color.
      if (referenceBodyColor && isHeadLike) {
        m.color.copy(referenceBodyColor);
      }

      // Preserve normal/roughness for shading, but keep a strong orange tint.
      if (srcMat?.normalMap) m.normalMap = srcMat.normalMap;
      if (srcMat?.roughnessMap) m.roughnessMap = srcMat.roughnessMap;
      m.envMapIntensity = 1.15;

      if (skinned) m.skinning = true;
      obj.material = m;
    });
  }, [innerScene, toonMaterial]);

  // Outer shell: glass-morphism surface over the same silhouette.
  useEffect(() => {
    // Try to derive a stable "body" tint so the head can match it.
    let bodyTint = null;
    const orange = new THREE.Color('#FF6B35');
    shellScene.traverse((obj) => {
      if (bodyTint || !obj.isMesh) return;
      const name = (obj.name || '').toLowerCase();
      const isHeadLike = name.includes('head') || name.includes('face');
      if (isHeadLike) return;

      const src = obj.material;
      const srcMat = Array.isArray(src) ? src[0] : src;
      const base = srcMat?.color ? srcMat.color.clone() : new THREE.Color('#ffd6ff');
      bodyTint = base.multiply(orange);
    });

    const glass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ffffff'),
      transparent: true,
      opacity: 0.18,
      transmission: 0.95,
      thickness: 0.85,
      roughness: 0.08,
      metalness: 0.05,
      ior: 1.45,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });

    const solidHead = new THREE.MeshPhysicalMaterial({
      color: bodyTint ? bodyTint.clone() : new THREE.Color('#8b5a2b'),
      transparent: false,
      opacity: 1,
      transmission: 0,
      thickness: 0,
      roughness: 0.42,
      metalness: 0.30,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    });

    shellScene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const skinned = obj.isSkinnedMesh;

      obj.visible = true;
      const name = (obj.name || '').toLowerCase();
      const isHeadLike = name.includes('head') || name.includes('face');

      const m = (isHeadLike ? solidHead : glass).clone();
      if (skinned) m.skinning = true;
      obj.material = m;
    });
  }, [shellScene]);

  // Cache bones for a simple wave gesture (right arm/forearm/hand) on both rigs.
  useEffect(() => {
    const pickRightBones = (root) => {
      const out = { arm: null, forearm: null, hand: null };
      root.traverse((obj) => {
        if (!obj?.isBone) return;
        const n = (obj.name || '').toLowerCase();
        const isRight = n.includes('right') || n.includes('r_') || n.endsWith('_r') || n.endsWith('.r');
        if (!isRight) return;
        if (!out.hand && n.includes('hand')) out.hand = obj;
        if (!out.forearm && (n.includes('forearm') || n.includes('lowerarm'))) out.forearm = obj;
        if (!out.arm && (n.includes('upperarm') || (n.includes('arm') && !n.includes('fore') && !n.includes('hand')))) out.arm = obj;
      });
      return out;
    };

    const inner = pickRightBones(innerScene);
    const shell = pickRightBones(shellScene);
    const ok = inner.arm && inner.forearm && inner.hand && shell.arm && shell.forearm && shell.hand;

    if (ok) {
      waveRig.current.ready = true;
      waveRig.current.inner = inner;
      waveRig.current.shell = shell;
      waveRig.current.base = {
        inner: {
          arm: inner.arm.rotation.clone(),
          forearm: inner.forearm.rotation.clone(),
          hand: inner.hand.rotation.clone(),
        },
        shell: {
          arm: shell.arm.rotation.clone(),
          forearm: shell.forearm.rotation.clone(),
          hand: shell.hand.rotation.clone(),
        },
      };
    } else {
      waveRig.current.ready = false;
      waveRig.current.inner = null;
      waveRig.current.shell = null;
      waveRig.current.base = null;
    }
  }, [innerScene, shellScene]);

  // === שליטה באנימציות (Idle / Walking) ===
  useEffect(() => {
    if (actions && names.length > 0) {
      let currentAction = null;
      let currentActionName = '';

      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const getWalkLikeActions = () =>
        Object.entries(actions)
          .filter(([n, a]) => a && typeof n === 'string' && /(walk|run)/i.test(n))
          .map(([, a]) => a);

      const applySpeedScale = (scale) => {
        const s = clamp(Number.isFinite(scale) ? scale : 1, 0.15, 2.75);
        const walkLike = getWalkLikeActions();
        const targets = walkLike.length ? walkLike : Object.values(actions).filter(Boolean);
        targets.forEach((a) => {
          try {
            a.setEffectiveTimeScale(s);
          } catch {
            // ignore
          }
        });
      };

      // פונקציה לשינוי מצב האנימציה
      const setAction = (name) => {
        const next =
          actions[name] ||
          actions[
            names.find((n) => n.toLowerCase().includes(name.toLowerCase()))
          ];

        if (next && next !== currentAction) {
          if (currentAction) currentAction.fadeOut(0.3);
          next.reset().fadeIn(0.3).play();
          currentAction = next;
          currentActionName = String(name || '');

          // Re-apply speed scale when switching back into walk/run.
          if (/(walk|run)/i.test(currentActionName)) {
            applySpeedScale(innerScene.userData?.speedScale ?? 1);
          }
        }
      };

      // Expose speed scaling so the controller (ThreeDemo) can sync leg cadence to movement speed.
      innerScene.userData.speedScale = innerScene.userData.speedScale ?? 1;
      innerScene.userData.setSpeedScale = (s) => {
        innerScene.userData.speedScale = s;
        // Only affect cadence for walk/run; keep idle calm.
        if (/(walk|run)/i.test(currentActionName || '')) applySpeedScale(s);
        else applySpeedScale(1);
      };

      // שומר את הפונקציה ב־userData כדי ש-ThreeDemo תוכל להפעיל אותה
      innerScene.userData.setAction = setAction;
      shellScene.userData.setAction = setAction;
      if (groupRef.current) groupRef.current.userData.setAction = setAction;

      // Forward the same API on the group root.
      if (groupRef.current) {
        groupRef.current.userData.setSpeedScale = innerScene.userData.setSpeedScale;
      }

      // ברירת מחדל: Idle
      setAction("Idle");
    }
  }, [actions, names, innerScene, shellScene]);

  // חיוך + מצמוץ עדין (כמו קודם)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    const robot = groupRef.current;
    const greetActive = !!robot?.userData?.greetActive;
    const lookAt = robot?.userData?.lookAtVec;

    // Schedule a wink while greeting.
    if (greetActive) {
      if (t - winkState.current.lastWinkAt > 2.8) {
        winkState.current.lastWinkAt = t;
        winkState.current.activeUntil = t + 0.16;
      }
    } else {
      winkState.current.activeUntil = 0;
    }
    const isWinkingNow = t < winkState.current.activeUntil;

    // Eye gaze: move pupils toward camera in face-local space.
    if (lookAt && faceParent) {
      gazeTmp.current.copy(lookAt);
      faceParent.worldToLocal(gazeTmp.current);

      const setPupil = (ref, baseX) => {
        const p = ref.current;
        if (!p) return;
        const eyeCenterX = baseX;
        const eyeCenterY = 0.10;
        const eyeCenterZ = 0.22;
        gazeDir.current.copy(gazeTmp.current);
        gazeDir.current.x -= eyeCenterX;
        gazeDir.current.y -= eyeCenterY;
        gazeDir.current.z -= eyeCenterZ;
        const len = gazeDir.current.length() || 1;
        gazeDir.current.multiplyScalar(1 / len);

        const ox = Math.max(-0.035, Math.min(0.035, gazeDir.current.x * 0.028));
        const oy = Math.max(-0.022, Math.min(0.022, gazeDir.current.y * 0.022));
        p.position.set(baseX + ox, eyeCenterY + oy, 0.255);
      };

      setPupil(leftPupilRef, -0.12);
      setPupil(rightPupilRef, 0.12);
    }

    // Visual wink (works even if the GLB has no blink morph targets).
    if (rightEyeGlowRef.current) {
      const y = isWinkingNow ? 0.18 : 1;
      rightEyeGlowRef.current.scale.y = y;
    }
    if (leftEyeGlowRef.current) {
      leftEyeGlowRef.current.scale.y = 1;
    }

    // Wave gesture: raise right arm and wave forearm/hand.
    if (waveRig.current.ready && waveRig.current.base) {
      const wave = Math.sin(t * 6.0);
      const raise = greetActive ? 1 : 0;
      const a = 1 - Math.exp(-0.12 * 60);

      const apply = (rig, base) => {
        if (!rig) return;
        const targetArmX = base.arm.x + (-0.95) * raise;
        const targetArmZ = base.arm.z + (0.25) * raise;
        const targetForeZ = base.forearm.z + (0.30 * raise) + (0.55 * raise) * wave;
        const targetHandY = base.hand.y + (0.18 * raise) * wave;

        rig.arm.rotation.x = rig.arm.rotation.x + (targetArmX - rig.arm.rotation.x) * a;
        rig.arm.rotation.z = rig.arm.rotation.z + (targetArmZ - rig.arm.rotation.z) * a;
        rig.forearm.rotation.z = rig.forearm.rotation.z + (targetForeZ - rig.forearm.rotation.z) * a;
        rig.hand.rotation.y = rig.hand.rotation.y + (targetHandY - rig.hand.rotation.y) * a;
      };

      apply(waveRig.current.inner, waveRig.current.base.inner);
      apply(waveRig.current.shell, waveRig.current.base.shell);
    }

    innerScene.traverse((obj) => {
      if (!obj.morphTargetInfluences || !obj.morphTargetDictionary) return;
      const dict = obj.morphTargetDictionary;
      const infl = obj.morphTargetInfluences;
      const smileKey = Object.keys(dict).find((k) => /smile|happy/i.test(k));
      const blinkL = Object.keys(dict).find((k) => /blink.*(left|l)\b|(left|l)\b.*blink/i.test(k));
      const blinkR = Object.keys(dict).find((k) => /blink.*(right|r)\b|(right|r)\b.*blink/i.test(k));
      const blinkAny = Object.keys(dict).find((k) => /blink/i.test(k));

      if (smileKey) infl[dict[smileKey]] = 0.55;

      const autoBlink = Math.max(0, Math.sin(t * 1.8)) > 0.985 ? 1 : 0;
      if (blinkL && blinkR) {
        infl[dict[blinkL]] = isWinkingNow ? 0 : autoBlink;
        infl[dict[blinkR]] = isWinkingNow ? 1 : autoBlink;
      } else if (blinkAny) {
        infl[dict[blinkAny]] = isWinkingNow ? 1 : autoBlink;
      }
    });
  });

  // Drive scanline animation.
  useFrame(({ clock }) => {
    const shader = faceShaderRef.current;
    if (shader?.uniforms?.uTime) shader.uniforms.uTime.value = clock.getElapsedTime();
  });

  // Keep laptop texture fresh if a canvas is provided.
  useFrame(() => {
    const tex = laptopTexRef.current;
    if (tex) tex.needsUpdate = true;
  });

  // Pulse an inner “core” light so it feels alive.
  const corePhaseRef = useRef(0);
  useEffect(() => {
    corePhaseRef.current = Math.random() * Math.PI * 2;
  }, []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.65 + 0.35 * Math.sin(t * 2.0 + corePhaseRef.current);
    innerScene.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const m = obj.material;
      if ('emissiveIntensity' in m) m.emissiveIntensity = 0.22 + 0.55 * pulse;
    });
  });

  // Render a group so movement/rotation applies to both layers.
  return (
    <group ref={groupRef} {...rest}>
      <primitive object={innerScene} />
      <primitive object={shellScene} scale={1.006} />

      {/* Laptop prop: simple base + glowing screen showing the live route map */}
      <group position={[0, 1.08, 0.52]} rotation={[-0.55, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.52, 0.03, 0.34]} />
          <meshStandardMaterial color={'#0b0f18'} roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.16, -0.16]} rotation={[0.85, 0, 0]} renderOrder={19}>
          <planeGeometry args={[0.52, 0.34]} />
          <meshBasicMaterial
            color={'#ffffff'}
            transparent
            opacity={0.12}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0.16, -0.155]} rotation={[0.85, 0, 0]} renderOrder={20}>
          <planeGeometry args={[0.48, 0.30]} />
          <meshBasicMaterial
            ref={laptopMatRef}
            map={laptopTexRef.current || undefined}
            toneMapped={false}
            transparent
            opacity={0.98}
          />
        </mesh>
      </group>

      {/* Face "screen": attach to head node if found, else fallback to fixed position */}
      {faceParent ? (
        <primitive object={faceParent}>
          {/* Cyberpunk eyes (glow) */}
          <mesh ref={leftEyeGlowRef} position={[-0.12, 0.10, 0.22]}>
            <sphereGeometry args={[0.035, 14, 14]} />
            <meshStandardMaterial color={'#00E5FF'} emissive={'#00E5FF'} emissiveIntensity={3.0} roughness={0.2} metalness={0.8} toneMapped={false} />
          </mesh>
          <mesh ref={rightEyeGlowRef} position={[0.12, 0.10, 0.22]}>
            <sphereGeometry args={[0.035, 14, 14]} />
            <meshStandardMaterial color={'#00E5FF'} emissive={'#00E5FF'} emissiveIntensity={3.0} roughness={0.2} metalness={0.8} toneMapped={false} />
          </mesh>

          {/* Pupils (gaze) */}
          <mesh ref={leftPupilRef} position={[-0.12, 0.10, 0.255]} renderOrder={21}>
            <sphereGeometry args={[0.012, 12, 10]} />
            <meshStandardMaterial color={'#0b0f18'} roughness={0.6} metalness={0.05} />
          </mesh>
          <mesh ref={rightPupilRef} position={[0.12, 0.10, 0.255]} renderOrder={21}>
            <sphereGeometry args={[0.012, 12, 10]} />
            <meshStandardMaterial color={'#0b0f18'} roughness={0.6} metalness={0.05} />
          </mesh>
          <pointLight position={[-0.12, 0.10, 0.24]} color={'#00E5FF'} intensity={1.0} distance={3} />
          <pointLight position={[0.12, 0.10, 0.24]} color={'#00E5FF'} intensity={1.0} distance={3} />

          <mesh position={[0, 0.04, 0.175]} renderOrder={19}>
            <planeGeometry args={[0.565, 0.445]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.95}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.04, 0.18]} renderOrder={20}>
            <planeGeometry args={[0.52, 0.4]} />
            <primitive object={faceMaterial} attach="material" />
          </mesh>
        </primitive>
      ) : (
        <group>
          {/* Cyberpunk eyes (fallback) */}
          <mesh ref={leftEyeGlowRef} position={[-0.12, 1.72, 0.92]}>
            <sphereGeometry args={[0.035, 14, 14]} />
            <meshStandardMaterial color={'#00E5FF'} emissive={'#00E5FF'} emissiveIntensity={3.0} roughness={0.2} metalness={0.8} toneMapped={false} />
          </mesh>
          <mesh ref={rightEyeGlowRef} position={[0.12, 1.72, 0.92]}>
            <sphereGeometry args={[0.035, 14, 14]} />
            <meshStandardMaterial color={'#00E5FF'} emissive={'#00E5FF'} emissiveIntensity={3.0} roughness={0.2} metalness={0.8} toneMapped={false} />
          </mesh>

          {/* Pupils (fallback) */}
          <mesh ref={leftPupilRef} position={[-0.12, 1.72, 0.955]} renderOrder={21}>
            <sphereGeometry args={[0.012, 12, 10]} />
            <meshStandardMaterial color={'#0b0f18'} roughness={0.6} metalness={0.05} />
          </mesh>
          <mesh ref={rightPupilRef} position={[0.12, 1.72, 0.955]} renderOrder={21}>
            <sphereGeometry args={[0.012, 12, 10]} />
            <meshStandardMaterial color={'#0b0f18'} roughness={0.6} metalness={0.05} />
          </mesh>
          <pointLight position={[-0.12, 1.72, 0.94]} color={'#00E5FF'} intensity={1.0} distance={3} />
          <pointLight position={[0.12, 1.72, 0.94]} color={'#00E5FF'} intensity={1.0} distance={3} />

          <mesh position={[0, 1.62, 0.715]} renderOrder={19}>
            <planeGeometry args={[0.565, 0.445]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.95}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 1.62, 0.72]} renderOrder={20}>
            <planeGeometry args={[0.52, 0.4]} />
            <primitive object={faceMaterial} attach="material" />
          </mesh>
        </group>
      )}

      {/* Internal core */}
      <mesh position={[0, 1.15, 0.15]}>
        <sphereGeometry args={[0.18, 18, 18]} />
        <meshStandardMaterial
          color="#00E5FF"
          emissive="#00E5FF"
          emissiveIntensity={3.2}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, 1.15, 0.15]} color="#00E5FF" intensity={1.15} distance={4.5} />
      <pointLight position={[0, 1.05, -0.05]} color="#FF6B35" intensity={0.65} distance={4.0} />
    </group>
  );
});

Robot.displayName = 'Robot';

Robot.propTypes = {
  faceTextureUrl: PropTypes.string,
  laptopCanvas: PropTypes.any,
};

useGLTF.preload("/models/RobotExpressive.glb");
export default Robot;
