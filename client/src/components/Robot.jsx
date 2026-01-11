import { useEffect, useMemo, forwardRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";

// מוסיף forwardRef כדי ש-ThreeDemo יוכל לשלוט עליו
const Robot = forwardRef((props, ref) => {
  const gltf = useGLTF("/models/RobotExpressive.glb");
  const { scene, animations } = gltf;
  const { actions, names } = useAnimations(animations, scene);

  // חומרים בסגנון Toon
  const toonMaterial = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: new THREE.Color("#ffd6ff"), // פסטלי-ורדרד
      }),
    []
  );

  // החלת חומרים וחישול הצללות
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const skinned = obj.isSkinnedMesh;
        obj.material = obj.material.clone();
        obj.material.color.multiplyScalar(1.1); // קצת יותר בהיר
        if (skinned) obj.material.skinning = true;
      }
    });
  }, [scene, toonMaterial]);

  // === שליטה באנימציות (Idle / Walking) ===
  useEffect(() => {
    if (actions && names.length > 0) {
      let currentAction = null;

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
        }
      };

      // שומר את הפונקציה ב־userData כדי ש-ThreeDemo תוכל להפעיל אותה
      scene.userData.setAction = setAction;

      // ברירת מחדל: Idle
      setAction("Idle");
    }
  }, [actions, names, scene]);

  // חיוך + מצמוץ עדין (כמו קודם)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    scene.traverse((obj) => {
      if (!obj.morphTargetInfluences || !obj.morphTargetDictionary) return;
      const dict = obj.morphTargetDictionary;
      const infl = obj.morphTargetInfluences;
      const smileKey = Object.keys(dict).find((k) => /smile|happy/i.test(k));
      const blinkKey = Object.keys(dict).find((k) => /blink/i.test(k));

      if (smileKey) infl[dict[smileKey]] = 0.55;
      if (blinkKey) {
        const blink = Math.max(0, Math.sin(t * 1.8));
        infl[dict[blinkKey]] = blink > 0.98 ? 1 : 0;
      }
    });
  });

  // מחזיר את הסצנה
  return <primitive ref={ref} object={scene} {...props} />;
});

useGLTF.preload("/models/RobotExpressive.glb");
export default Robot;
