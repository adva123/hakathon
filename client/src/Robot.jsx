/* eslint-disable react/no-unknown-property */
/* eslint-disable react-hooks/immutability */
import { useEffect, useMemo, useState, forwardRef, useImperativeHandle, useRef } from "react";
import PropTypes from 'prop-types';
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

// מוסיף forwardRef כדי ש-ThreeDemo יוכל לשלוט עליו
const Robot = forwardRef((props, ref) => {
  const gltf = useGLTF("/models/RobotExpressive.glb");
  const { scene, animations } = gltf;

  const { faceTextureUrl, ...rest } = props;

  const groupRef = useRef(null);
  useImperativeHandle(ref, () => groupRef.current);

  // Eye gaze + greeting refs.
  const leftEyeGlowRef = useRef(null);
  const rightEyeGlowRef = useRef(null);
  const leftPupilRef = useRef(null);
  const rightPupilRef = useRef(null);
  const headAttachmentRef = useRef(null);

  const gazeTmp = useRef(new THREE.Vector3());
  const gazeDir = useRef(new THREE.Vector3());
  const winkState = useRef({ lastWinkAt: 0, activeUntil: 0 });

  const waveRig = useRef({
    ready: false,
    inner: null,
    base: null,
  });

  // Single clone: the playable walking robot
  const innerScene = useMemo(() => clone(scene), [scene]);

  const { actions, names } = useAnimations(animations, innerScene);

  // === Face "screen" material (user avatar) ===
  const faceMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0a0e1a'),
        emissive: new THREE.Color('#00cbe6'),
        emissiveIntensity: 0.25,
        roughness: 0.22,
        metalness: 0.25,
        side: THREE.DoubleSide,
      }),
    []
  );
  const faceTextureRef = useRef(null);
  const faceShaderRef = useRef(null);

  // Laptop prop intentionally disabled.

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

  const headAnchor = useMemo(() => {
    // Prefer a real head/neck/face bone (or node) from the cloned rig.
    // If not found, fall back to the highest bone in the skeleton.
    const tmp = new THREE.Vector3();
    innerScene.updateMatrixWorld(true);

    const headLike = [];
    const bones = [];

    innerScene.traverse((obj) => {
      if (!obj) return;
      const name = String(obj.name || '').toLowerCase();
      const isBone = !!obj.isBone;
      if (isBone) bones.push(obj);

      const isHeadish = name.includes('head') || name.includes('neck') || name.includes('face');
      if (isHeadish) headLike.push(obj);
    });

    const pickHighest = (list) => {
      let best = null;
      let bestScore = -Infinity;
      for (const obj of list) {
        obj.getWorldPosition(tmp);
        const name = String(obj.name || '').toLowerCase();
        const bonus = (obj.isBone ? 2 : 0) + (name.includes('head') ? 2 : 0) + (name.includes('neck') ? 1 : 0) + (name.includes('face') ? 1 : 0);
        const score = tmp.y + bonus * 0.25;
        if (score > bestScore) {
          bestScore = score;
          best = obj;
        }
      }
      return best;
    };

    return pickHighest(headLike) || pickHighest(bones) || null;
  }, [innerScene]);

  useEffect(() => {
    const attachment = headAttachmentRef.current;
    if (!attachment) return;

    if (headAnchor) {
      headAnchor.add(attachment);
      attachment.position.set(0, 0, 0);
      attachment.rotation.set(0, 0, 0);
      attachment.scale.set(1, 1, 1);
    }

    return () => {
      try {
        if (headAnchor) headAnchor.remove(attachment);
      } catch {
        // ignore
      }
    };
  }, [headAnchor]);

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

  // Cache bones for a simple wave gesture (right arm/forearm/hand).
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
    const ok = inner.arm && inner.forearm && inner.hand;

    if (ok) {
      waveRig.current.ready = true;
      waveRig.current.inner = inner;
      waveRig.current.base = {
        inner: {
          arm: inner.arm.rotation.clone(),
          forearm: inner.forearm.rotation.clone(),
          hand: inner.hand.rotation.clone(),
        },
      };
    } else {
      waveRig.current.ready = false;
      waveRig.current.inner = null;
      waveRig.current.base = null;
    }
  }, [innerScene]);

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
      if (groupRef.current) groupRef.current.userData.setAction = setAction;

      // Forward the same API on the group root.
      if (groupRef.current) {
        groupRef.current.userData.setSpeedScale = innerScene.userData.setSpeedScale;
      }

      // ברירת מחדל: Idle
      setAction("Idle");
    }
  }, [actions, names, innerScene]);

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
    if (lookAt && headAnchor) {
      gazeTmp.current.copy(lookAt);
      headAnchor.worldToLocal(gazeTmp.current);

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

  // Render a group so movement/rotation applies to both layers.
  return (
    <group ref={groupRef} {...rest}>
      <primitive object={innerScene} />

      {/* Head/face overlay that follows the animated head bone (no reparenting of the bone itself). */}
      <group ref={headAttachmentRef} position={headAnchor ? [0, 0, 0] : [0, 1.82, 0.12]}>
        {/* Head (simple proxy, tinted to match the dark-brown body) */}
        <mesh position={[0, 0.02, 0.02]} castShadow receiveShadow>
          <sphereGeometry args={[0.26, 20, 16]} />
          <meshStandardMaterial color={'#3b2a1c'} roughness={0.7} metalness={0.05} />
        </mesh>

        {/* Eyes (kept subtle to avoid bloom/shimmer) */}
        <mesh ref={leftEyeGlowRef} position={[-0.12, 0.10, 0.22]}>
          <sphereGeometry args={[0.028, 14, 14]} />
          <meshStandardMaterial
            color={'#00cbe6'}
            emissive={'#00cbe6'}
            emissiveIntensity={0.55}
            roughness={0.35}
            metalness={0.25}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={rightEyeGlowRef} position={[0.12, 0.10, 0.22]}>
          <sphereGeometry args={[0.028, 14, 14]} />
          <meshStandardMaterial
            color={'#00cbe6'}
            emissive={'#00cbe6'}
            emissiveIntensity={0.55}
            roughness={0.35}
            metalness={0.25}
            toneMapped={false}
          />
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

        {/* Face screen (no point lights / no additive plane to prevent weird blue shimmer) */}
        <mesh position={[0, 0.04, 0.18]} renderOrder={20}>
          <planeGeometry args={[0.52, 0.4]} />
          <primitive object={faceMaterial} attach="material" />
        </mesh>
      </group>

    </group>
  );
});

Robot.displayName = 'Robot';

Robot.propTypes = {
  faceTextureUrl: PropTypes.string,
};

useGLTF.preload("/models/RobotExpressive.glb");
export default Robot;
