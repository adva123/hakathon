import { useEffect, useMemo, forwardRef, useImperativeHandle, useRef, useContext } from "react";
import { GameContext } from '../../context/GameContext.jsx';
import { ROBOT_CATALOG } from './robotCatalog.js';
import PropTypes from 'prop-types';
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const GOLD_COLOR = '#d4af37';

const Robot = forwardRef((props, ref) => {
  const { faceTextureUrl, showFaceScreen = false, ...rest } = props;
  
  // סנכרון עם ה-Global State (Context)
  const { shopState } = useContext(GameContext);
  
  // חישוב הסקין הפעיל
  const selectedId = shopState?.selectedRobotId || ROBOT_CATALOG[0].id;
  const skin = useMemo(() => ROBOT_CATALOG.find(r => r.id === selectedId) || ROBOT_CATALOG[0], [selectedId]);
  
  const glbPath = '/models/RobotExpressive.glb';
  const gltf = useGLTF(glbPath);
  const { scene, animations } = gltf;

  const groupRef = useRef(null);
  useImperativeHandle(ref, () => groupRef.current);

  const leftEyeGlowRef = useRef(null);
  const rightEyeGlowRef = useRef(null);
  const leftPupilRef = useRef(null);
  const rightPupilRef = useRef(null);
  const leftBrowRef = useRef(null);
  const rightBrowRef = useRef(null);
  const headAttachmentRef = useRef(null);

  const hairSphereInstRef = useRef(null);
  const hairTorusInstRef = useRef(null);
  const tmpM4 = useRef(new THREE.Matrix4());
  const tmpQ = useRef(new THREE.Quaternion());
  const tmpV3 = useRef(new THREE.Vector3());
  const tmpE = useRef(new THREE.Euler());

  const gazeTmp = useRef(new THREE.Vector3());
  const gazeDir = useRef(new THREE.Vector3());
  const winkState = useRef({ lastWinkAt: 0, activeUntil: 0 });

  const waveRig = useRef({
    ready: false,
    inner: null,
    base: null,
  });

  // Clone the scene once
  const innerScene = useMemo(() => clone(scene), [scene, skin.color]);

  const { actions, names } = useAnimations(animations, innerScene);

  const faceMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#0a0e1a'),
        emissive: new THREE.Color('#00cbe6'),
        emissiveIntensity: 0.25,
        roughness: 0.22,
        metalness: 0.25,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        side: THREE.DoubleSide,
      }),
    []
  );
  const faceTextureRef = useRef(null);
  const faceShaderRef = useRef(null);

  // Upgrade GLB materials and apply Skin colors
  useEffect(() => {
    const created = [];
    const cache = new Map();

    const goldMat = new THREE.MeshPhysicalMaterial({
      color: GOLD_COLOR,
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    });

    const toPhysical = (src, key, forceColor = null) => {
      if (!src) return null;
      if (cache.has(key)) return cache.get(key);

      const mat = new THREE.MeshPhysicalMaterial({
        color: forceColor ? new THREE.Color(forceColor) : (src.color?.clone?.() ?? new THREE.Color('#ffffff')),
        map: src.map ?? null,
        emissive: src.emissive?.clone?.() ?? new THREE.Color('#000000'),
        emissiveMap: src.emissiveMap ?? null,
        emissiveIntensity: Number.isFinite(src.emissiveIntensity) ? src.emissiveIntensity : 0,
        roughness: forceColor ? 0.7 : 0.6, // מסגרת תהיה פחות מבריקה
        metalness: forceColor ? 0.05 : 0.1,
        transparent: Boolean(src.transparent),
        opacity: Number.isFinite(src.opacity) ? src.opacity : 1,
        side: src.side,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });

      cache.set(key, mat);
      created.push(mat);
      return mat;
    };

    innerScene.traverse((obj) => {
      if (!obj?.isMesh || !obj.material) return;
      const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      const matName = mat.name || "";
      const objName = obj.name || "";

      // בדיקה: האם זה חלק מהמסגרת או העיניים?
      const isFrame = matName.includes("Frame") || objName.includes("Frame");
      const isEye = matName.includes("Eye") || objName.includes("Eye");
      const isJoint = /(joint|hinge|elbow|knee|ankle|wrist|shoulder|hip)/i.test(objName);

      if (isJoint) {
        obj.material = goldMat;
      } else if (isFrame) {
        // צבע מסגרת קבוע - חום כהה/שחור
        obj.material = toPhysical(mat, 'frame_fixed', '#3b2a1c');
      } else if (isEye) {
        // צבע עיניים קבוע - לבן
        obj.material = toPhysical(mat, 'eye_fixed', '#f8fbff');
      } else if (matName.includes("Main") || objName.includes("Main") || objName.includes("Body")) {
        // כאן משתנה הצבע לפי הסקין הנבחר!
        const bodyMat = toPhysical(mat, `skin_${skin.id}_${skin.color}`);
        bodyMat.color.set(skin.color);
        bodyMat.metalness = skin.type === 'luxury' ? (skin.metalness ?? 0.9) : 0.1;
        bodyMat.roughness = skin.type === 'luxury' ? (skin.roughness ?? 0.1) : 0.6;
        bodyMat.wireframe = !!skin.wireframe;
        obj.material = bodyMat;
      } else {
        // שאר החלקים הכלליים
        obj.material = toPhysical(mat, mat.uuid);
      }

      obj.castShadow = true;
      obj.receiveShadow = true;
    });

    return () => {
      goldMat.dispose();
      created.forEach((m) => m.dispose());
    };
  }, [innerScene, skin]); // פועל בכל פעם שהסקין משתנה

  // Upgrade GLB materials to glossy physical
  useEffect(() => {
    const created = [];
    const cache = new Map();

    const goldMat = new THREE.MeshPhysicalMaterial({
      color: GOLD_COLOR,
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    });

    const toPhysical = (src, key) => {
      if (!src) return null;
      if (cache.has(key)) return cache.get(key);

      const mat = new THREE.MeshPhysicalMaterial({
        color: src.color?.clone?.() ?? new THREE.Color('#ffffff'),
        map: src.map ?? null,
        emissive: src.emissive?.clone?.() ?? new THREE.Color('#000000'),
        emissiveMap: src.emissiveMap ?? null,
        emissiveIntensity: Number.isFinite(src.emissiveIntensity) ? src.emissiveIntensity : 0,
        roughness: 0.6,
        roughnessMap: src.roughnessMap ?? null,
        metalness: 0.1,
        metalnessMap: src.metalnessMap ?? null,
        normalMap: src.normalMap ?? null,
        aoMap: src.aoMap ?? null,
        aoMapIntensity: Number.isFinite(src.aoMapIntensity) ? src.aoMapIntensity : 1,
        transparent: Boolean(src.transparent),
        opacity: Number.isFinite(src.opacity) ? src.opacity : 1,
        side: src.side,
        toneMapped: src.toneMapped,
        clearcoat: 0.3,
        clearcoatRoughness: 0.3,
      });

      cache.set(key, mat);
      created.push(mat);
      return mat;
    };

    innerScene.traverse((obj) => {
      if (!obj?.isMesh) return;
      
      const mat = obj.material;
      if (!mat) return;

      const name = `${obj.name || ''} ${(Array.isArray(mat) ? '' : (mat.name || ''))}`;
      const isJoint = /(joint|hinge|elbow|knee|ankle|wrist|shoulder|hip)/i.test(name);

      const applyOne = (m) => {
        if (!m) return m;
        if (isJoint) return goldMat;
        if (m.isMeshBasicMaterial) return m;
        
        const key = `${m.uuid}|phys`;
        return toPhysical(m, key) || m;
      };

      if (Array.isArray(mat)) obj.material = mat.map(applyOne);
      else obj.material = applyOne(mat);

      obj.castShadow = true;
      obj.receiveShadow = true;
    });

    return () => {
      try {
        goldMat.dispose();
      } catch {
        // ignore
      }
      created.forEach((m) => {
        try {
          m.dispose();
        } catch {
          // ignore
        }
      });
    };
  }, [innerScene]);

  const hairInstances = useMemo(() => {
    const rand01 = (seed) => {
      const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      return s - Math.floor(s);
    };

    const sphereCount = 34;
    const torusCount = 26;
    const sphere = [];
    const torus = [];

    const baseR = 0.325;
    const centerY = 0.19;

    for (let i = 0; i < sphereCount; i += 1) {
      const u = rand01(i * 19.7 + 2.3);
      const v = rand01(i * 31.1 + 8.1);
      const theta = u * Math.PI * 2;
      const phi = (0.35 + 0.55 * v) * (Math.PI / 2);
      const rr = baseR * (0.92 + 0.22 * rand01(i * 7.9 + 1.4));

      const x = Math.cos(theta) * Math.sin(phi) * rr;
      const y = centerY + Math.cos(phi) * rr * 0.95;
      const z = Math.sin(theta) * Math.sin(phi) * rr * 0.85;

      sphere.push({
        x,
        y: Math.min(0.36, y),
        z: THREE.MathUtils.clamp(z, -0.22, 0.24),
        s: 0.060 + 0.034 * rand01(i * 41.7 + 4.2),
        ry: (rand01(i * 5.7 + 8.8) - 0.5) * 1.0,
      });
    }

    for (let i = 0; i < torusCount; i += 1) {
      const u = rand01(i * 17.3 + 6.1);
      const v = rand01(i * 29.9 + 2.7);
      const theta = u * Math.PI * 2;
      const ringR = baseR * (0.72 + 0.18 * rand01(i * 10.1));
      const x = Math.cos(theta) * ringR;
      const z = Math.sin(theta) * ringR * 0.78;
      const y = 0.14 + 0.12 * v;
      torus.push({
        x,
        y: Math.min(0.32, y),
        z: THREE.MathUtils.clamp(z, -0.22, 0.22),
        s: 1.05 + 0.65 * rand01(i * 7.7 + 1.2),
        rx: (rand01(i * 13.3 + 0.8) - 0.5) * 1.3,
        rz: (rand01(i * 9.1 + 4.4) - 0.5) * 1.3,
      });
    }

    return { sphere, torus };
  }, []);

  useEffect(() => {
    const sphereInst = hairSphereInstRef.current;
    const torusInst = hairTorusInstRef.current;

    if (sphereInst) {
      for (let i = 0; i < hairInstances.sphere.length; i += 1) {
        const h = hairInstances.sphere[i];
        tmpE.current.set(0, h.ry || 0, 0);
        tmpQ.current.setFromEuler(tmpE.current);
        tmpV3.current.set(h.x, h.y, h.z);
        tmpM4.current.compose(tmpV3.current, tmpQ.current, new THREE.Vector3(h.s, h.s, h.s));
        sphereInst.setMatrixAt(i, tmpM4.current);
      }
      sphereInst.instanceMatrix.needsUpdate = true;
    }

    if (torusInst) {
      for (let i = 0; i < hairInstances.torus.length; i += 1) {
        const h = hairInstances.torus[i];
        tmpE.current.set(h.rx || 0, 0, h.rz || 0);
        tmpQ.current.setFromEuler(tmpE.current);
        tmpV3.current.set(h.x, h.y, h.z);
        tmpM4.current.compose(tmpV3.current, tmpQ.current, new THREE.Vector3(h.s, h.s, h.s));
        torusInst.setMatrixAt(i, tmpM4.current);
      }
      torusInst.instanceMatrix.needsUpdate = true;
    }
  }, [hairInstances]);

  useEffect(() => {
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
          `#include <map_fragment>\n\nfloat steps = max(2.0, uPosterize);\ndiffuseColor.rgb = floor(diffuseColor.rgb * steps) / steps;\n\nvec2 uv = vec2(0.5);\n#ifdef USE_MAP\n  uv = vMapUv;\n#endif\nfloat v = smoothstep(0.9, 0.1, distance(uv, vec2(0.5)));\ndiffuseColor.rgb = mix(diffuseColor.rgb * (1.0 - uVignette), diffuseColor.rgb, v);`
        );
    };
    faceMaterial.toneMapped = false;
    faceMaterial.needsUpdate = true;

    return () => {
      faceShaderRef.current = null;
    };
  }, [faceMaterial]);

  const headAnchor = useMemo(() => {
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

        const img = tex.image;
        const iw = img?.videoWidth || img?.width;
        const ih = img?.videoHeight || img?.height;
        const imgAspect = iw && ih ? iw / ih : 1;

        const screenAspect = 1.3;
        let rx = 1;
        let ry = 1;
        let ox = 0;
        let oy = 0;
        if (imgAspect > screenAspect) {
          rx = screenAspect / imgAspect;
          ox = (1 - rx) * 0.5;
        } else if (imgAspect < screenAspect) {
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

          if (/(walk|run)/i.test(currentActionName)) {
            applySpeedScale(innerScene.userData?.speedScale ?? 1);
          }
        }
      };

      innerScene.userData.speedScale = innerScene.userData.speedScale ?? 1;
      innerScene.userData.setSpeedScale = (s) => {
        innerScene.userData.speedScale = s;
        if (/(walk|run)/i.test(currentActionName || '')) applySpeedScale(s);
        else applySpeedScale(1);
      };

      innerScene.userData.setAction = setAction;
      if (groupRef.current) groupRef.current.userData.setAction = setAction;

      if (groupRef.current) {
        groupRef.current.userData.setSpeedScale = innerScene.userData.setSpeedScale;
      }

      setAction("Idle");
    }
  }, [actions, names, innerScene]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    const robot = groupRef.current;
    const greetActive = !!robot?.userData?.greetActive;
    const lookAt = robot?.userData?.lookAtVec;

    if (greetActive) {
      if (t - winkState.current.lastWinkAt > 2.8) {
        winkState.current.lastWinkAt = t;
        winkState.current.activeUntil = t + 0.16;
      }
    } else {
      winkState.current.activeUntil = 0;
    }
    const isWinkingNow = t < winkState.current.activeUntil;

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

    if (rightEyeGlowRef.current) {
      const y = isWinkingNow ? 0.18 : 1;
      rightEyeGlowRef.current.scale.y = y;
    }
    if (leftEyeGlowRef.current) {
      leftEyeGlowRef.current.scale.y = 1;
    }

    const curious = (lookAt ? 1 : 0) * 0.10 + 0.06 * Math.sin(t * 0.9 + 0.2);
    const smiley = (greetActive ? 1 : 0) * 0.10;
    const browTilt = curious - smiley;
    const browLift = 0.010 + (lookAt ? 0.008 : 0) + (greetActive ? 0.006 : 0);

    if (leftBrowRef.current) {
      leftBrowRef.current.rotation.z = 0.20 + browTilt;
      leftBrowRef.current.position.y = 0.17 + browLift;
    }
    if (rightBrowRef.current) {
      rightBrowRef.current.rotation.z = -0.20 - browTilt;
      rightBrowRef.current.position.y = 0.17 + browLift;
    }

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

  useFrame(({ clock }) => {
    const shader = faceShaderRef.current;
    if (shader?.uniforms?.uTime) shader.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <group ref={groupRef} {...rest}>
      <primitive object={innerScene} />

      <group ref={headAttachmentRef} position={headAnchor ? [0, 0, 0] : [0, 1.82, 0.12]}>
        <mesh position={[0, 0.02, 0.02]} castShadow receiveShadow>
          <sphereGeometry args={[0.26, 20, 16]} />
          <meshPhysicalMaterial color={'#3b2a1c'} roughness={0.7} metalness={0.05} clearcoat={1.0} clearcoatRoughness={0.08} />
        </mesh>

        <group position={[0, 0.20, 0.06]}>
          <instancedMesh ref={hairSphereInstRef} args={[null, null, hairInstances.sphere.length]} castShadow>
            <sphereGeometry args={[1, 12, 10]} />
            <meshPhysicalMaterial color={'#d6b15c'} roughness={0.92} metalness={0} clearcoat={1.0} clearcoatRoughness={0.12} />
          </instancedMesh>
          {hairInstances.torus.length > 0 ? (
            <instancedMesh ref={hairTorusInstRef} args={[null, null, hairInstances.torus.length]} castShadow>
              <torusGeometry args={[0.030, 0.012, 8, 18]} />
              <meshPhysicalMaterial color={'#d6b15c'} roughness={0.92} metalness={0} clearcoat={1.0} clearcoatRoughness={0.12} />
            </instancedMesh>
          ) : null}
        </group>

        <group ref={leftEyeGlowRef} position={[-0.12, 0.10, 0.245]}>
          <mesh>
            <sphereGeometry args={[0.048, 16, 14]} />
            <meshPhysicalMaterial color={'#f8fbff'} roughness={0.22} metalness={0.0} clearcoat={1.0} clearcoatRoughness={0.04} />
          </mesh>
          <group ref={leftPupilRef} position={[0, 0, 0.040]} renderOrder={21}>
            <mesh position={[0, 0, 0.002]}>
              <circleGeometry args={[0.022, 20]} />
              <meshPhysicalMaterial
                color={'#2b5ea8'}
                emissive={'#2b5ea8'}
                emissiveIntensity={0.25}
                roughness={0.35}
                metalness={0.02}
                clearcoat={1.0}
                clearcoatRoughness={0.06}
              />
            </mesh>
            <mesh position={[0, 0, 0.004]}>
              <circleGeometry args={[0.0105, 18]} />
              <meshPhysicalMaterial color={'#0b0f18'} roughness={0.5} metalness={0.05} clearcoat={1.0} clearcoatRoughness={0.08} />
            </mesh>
            <mesh position={[-0.006, 0.006, 0.008]}>
              <sphereGeometry args={[0.0055, 10, 8]} />
              <meshPhysicalMaterial color={'#ffffff'} roughness={0.12} metalness={0} clearcoat={1.0} clearcoatRoughness={0.04} />
            </mesh>
          </group>
        </group>

        <group ref={rightEyeGlowRef} position={[0.12, 0.10, 0.245]}>
          <mesh>
            <sphereGeometry args={[0.048, 16, 14]} />
            <meshPhysicalMaterial color={'#f8fbff'} roughness={0.22} metalness={0.0} clearcoat={1.0} clearcoatRoughness={0.04} />
          </mesh>
          <group ref={rightPupilRef} position={[0, 0, 0.040]} renderOrder={21}>
            <mesh position={[0, 0, 0.002]}>
              <circleGeometry args={[0.022, 20]} />
              <meshPhysicalMaterial
                color={'#2b5ea8'}
                emissive={'#2b5ea8'}
                emissiveIntensity={0.25}
                roughness={0.35}
                metalness={0.02}
                clearcoat={1.0}
                clearcoatRoughness={0.06}
              />
            </mesh>
            <mesh position={[0, 0, 0.004]}>
              <circleGeometry args={[0.0105, 18]} />
              <meshPhysicalMaterial color={'#0b0f18'} roughness={0.5} metalness={0.05} clearcoat={1.0} clearcoatRoughness={0.08} />
            </mesh>
            <mesh position={[0.006, 0.006, 0.008]}>
              <sphereGeometry args={[0.0055, 10, 8]} />
              <meshPhysicalMaterial color={'#ffffff'} roughness={0.12} metalness={0} clearcoat={1.0} clearcoatRoughness={0.04} />
            </mesh>
          </group>
        </group>

        <mesh ref={leftBrowRef} position={[-0.12, 0.17, 0.19]} rotation={[0, 0, 0.20]}>
          <torusGeometry args={[0.040, 0.006, 8, 16, Math.PI]} />
          <meshPhysicalMaterial color={'#7a3b1b'} roughness={0.9} metalness={0.0} clearcoat={1.0} clearcoatRoughness={0.12} />
        </mesh>
        <mesh ref={rightBrowRef} position={[0.12, 0.17, 0.19]} rotation={[0, 0, -0.20]}>
          <torusGeometry args={[0.040, 0.006, 8, 16, Math.PI]} />
          <meshPhysicalMaterial color={'#7a3b1b'} roughness={0.9} metalness={0.0} clearcoat={1.0} clearcoatRoughness={0.12} />
        </mesh>

        {showFaceScreen && faceTextureUrl ? (
          <mesh position={[0, 0.04, 0.18]} renderOrder={20}>
            <planeGeometry args={[0.52, 0.4]} />
            <primitive object={faceMaterial} attach="material" />
          </mesh>
        ) : null}
      </group>
    </group>
  );
});

Robot.displayName = 'Robot';

Robot.propTypes = {
  faceTextureUrl: PropTypes.string,
  showFaceScreen: PropTypes.bool,
};

useGLTF.preload("/models/RobotExpressive.glb");
export default Robot;