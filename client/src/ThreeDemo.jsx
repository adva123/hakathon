/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import Scene from "./Scene";
import CorridorScene from "./CorridorScene";

export default function ThreeDemo() {
  // --- ניהול מצבי החדרים ---
  const [room, setRoom] = useState("main"); // החדר הנוכחי שבו נמצא המשתמש
  const [targetRoom, setTargetRoom] = useState(null); // חדר היעד בזמן מעבר

  // --- מצבי ויזואליזציה ומעברים ---
  const [fade, setFade] = useState(0); // רמת השקיפות של המסך השחור (0 עד 1)
  const [transitionText, setTransitionText] = useState(""); // הטקסט שיוצג בזמן המעבר

  // --- נתוני הרובוט והסביבה (עבור המפה) ---
  const [pose, setPose] = useState(null); // מיקום וזווית הרובוט (x, z, yaw)
  const [iconsForMap, setIconsForMap] = useState([]); // רשימת נקודות העניין (משימות) למפה
  const [nearLabel, setNearLabel] = useState("None"); // שם המשימה הקרובה ביותר לרובוט

  // --- ניהול לוגיקת המעבר (State Machine) ---
  const [isTransitioning, setIsTransitioning] = useState(false); // האם מתבצע כרגע מעבר?
  const stageRef = useRef("idle"); // השלב הנוכחי במעבר: fadeOut, hold, או fadeIn
  const startTimeRef = useRef(0); // זמן תחילת השלב הנוכחי

  // מפתח לריענון הרובוט במיקום ההתחלתי כשעוברים חדר
  const [spawnKey, setSpawnKey] = useState(0);

  // הגדרת מיקום התחלתי יציב (Memoized) כדי למנוע רינדורים מיותרים
  const spawn = useMemo(() => {
    return { x: 0, y: -1.15, z: 0, yaw: 0 };
  }, []);

  // פונקציות עזר להמרת מזהי חדרים לשמות ידידותיים
  function roomLabel(r) {
    if (r === "main") return "Main Room";
    if (r === "task1") return "Mission 1";
    if (r === "task2") return "Mission 2";
    if (r === "task3") return "Mission 3";
    if (r === "task4") return "Mission 4";
    return "Room";
  }

  function missionLabelFromId(id) {
    if (id === "task1") return "Mission 1";
    if (id === "task2") return "Mission 2";
    if (id === "task3") return "Mission 3";
    if (id === "task4") return "Mission 4";
    return "Mission";
  }

  // התחלת תהליך המעבר בין חדרים
  function beginTransition(next, message) {
    if (isTransitioning) return; // מניעת התחלת מעבר חדש אם כבר יש אחד פעיל
    setTargetRoom(next);
    setTransitionText(message);
    setIsTransitioning(true);
    stageRef.current = "fadeOut"; // מתחילים בהחשכת המסך
    startTimeRef.current = performance.now();
  }

  // פונקציה שנקראת כשהרובוט נכנס לטווח של משימה
  function onMissionTrigger(missionId) {
    if (room === "main") {
      // אם אנחנו בלובי, כניסה למשימה
      const msg = `starting ${missionLabelFromId(missionId)}`;
      beginTransition(missionId, msg);
      return;
    }

    if (room === missionId) {
      // אם אנחנו בתוך משימה, חזרה ללובי
      const msg = "  going back to Main Room  ";
      beginTransition("main", msg);
    }
  }

  // --- מנוע המעברים (Animation Loop) ---
  useEffect(() => {
    if (!isTransitioning) return;

    let raf = 0;
    const fadeOutMs = 850; // משך זמן ההחשכה
    const holdMs = 850;    // זמן ההמתנה בחושך (טעינה)
    const fadeInMs = 950;  // משך זמן הופעת החדר החדש

    // פונקציית החלקה למעברים רכים (Easing)
    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function tick(now) {
      const stage = stageRef.current;
      const elapsed = now - startTimeRef.current;

      // שלב 1: החשכה (Fade Out)
      if (stage === "fadeOut") {
        const t = Math.min(1, elapsed / fadeOutMs);
        setFade(easeInOut(t));
        if (t >= 1) {
          stageRef.current = "hold";
          startTimeRef.current = now;
        }
        raf = requestAnimationFrame(tick);
        return;
      }

      // שלב 2: החזקת המסך החשוך והחלפת החדר בפועל
      if (stage === "hold") {
        setFade(1);
        if (elapsed >= holdMs) {
          if (targetRoom) {
            setRoom(targetRoom);
            setSpawnKey((k) => k + 1); // גורם ל-Scene לאפס את מיקום הרובוט
          }
          stageRef.current = "fadeIn";
          startTimeRef.current = now;
        }
        raf = requestAnimationFrame(tick);
        return;
      }

      // שלב 3: חשיפת החדר החדש (Fade In)
      if (stage === "fadeIn") {
        const t = Math.min(1, elapsed / fadeInMs);
        setFade(1 - easeInOut(t));
        if (t >= 1) {
          setFade(0);
          setTransitionText("");
          setTargetRoom(null);
          setIsTransitioning(false);
          stageRef.current = "idle";
          return;
        }
        raf = requestAnimationFrame(tick);
        return;
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isTransitioning, targetRoom]);

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      {/* עולם התלת-ממד */}
      <Canvas
        camera={{ position: [0, 2.6, 14], fov: 60, near: 0.1, far: 500 }}
        shadows
        gl={{ antialias: true }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color("#ffffff");
          scene.fog = new THREE.Fog("#e3e4f2", 25, 120); // הוספת ערפל לעומק
        }}
      >
        <Scene
          roomId={room}
          spawnKey={spawnKey}
          spawn={spawn}
          onPose={setPose}
          onIconsForMap={setIconsForMap}
          onNearLabel={setNearLabel}
          onMissionTrigger={onMissionTrigger}
        />
      </Canvas>

      {/* ממשק משתמש - מפה קטנה */}
      {pose && (
        <MiniMap
          pose={pose}
          icons={iconsForMap}
          roomTitle={roomLabel(room)}
          nearLabel={nearLabel}
        />
      )}

      {/* סצנת המעבר (המסדרון או הטקסט שצף בחושך) */}
      {isTransitioning && transitionText && <CorridorScene text={transitionText} />}

      {/* השכבה השחורה שיוצרת את אפקט ה-Fade */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#070b16",
          opacity: fade,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// --- רכיב המפה הקטנה (MiniMap) ---
function MiniMap({ pose, icons, roomTitle, nearLabel }) {
  const size = 128; // גודל המפה בפיקסלים
  const pad = 10;   // ריפוד פנימי

  // פונקציות המרה ממיקומי תלת-ממד (X, Z) למיקומי פיקסלים בדו-ממד
  function toMapX(x) {
    return ((x + pose.roomW / 2) / pose.roomW) * (size - 2 * pad) + pad;
  }
  function toMapZ(z) {
    return ((z + pose.roomD / 2) / pose.roomD) * (size - 2 * pad) + pad;
  }

  const px = toMapX(pose.x);
  const pz = toMapZ(pose.z);

  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        bottom: 16,
        width: 184,
        fontFamily: "system-ui, Arial",
        pointerEvents: "none",
      }}
    >
      {/* כותרת החדר הנוכחי */}
      <div
        style={{
          marginBottom: 10,
          color: "rgba(255,255,255,0.68)",
          fontSize: 12,
          textAlign: "right",
        }}
      >
        {roomTitle}
      </div>

      {/* עיגול המפה */}
      <div
        style={{
          width: size,
          height: size,
          marginLeft: "auto",
          borderRadius: 999,
          background: "rgba(10,14,24,0.92)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* אפקט תאורה פנימי למפה */}
        <div
          style={{
            position: "absolute",
            inset: -20,
            background:
              "radial-gradient(circle at 50% 30%, rgba(120,160,255,0.22), rgba(0,0,0,0) 55%)",
          }}
        />

        {/* רינדור נקודות המשימה על המפה */}
        {icons.map((ic) => {
          const ix = toMapX(ic.x);
          const iz = toMapZ(ic.z);
          return (
            <div
              key={ic.id}
              style={{
                position: "absolute",
                left: ix - 4.5,
                top: iz - 4.5,
                width: 9,
                height: 9,
                borderRadius: 999,
                background: "rgba(255,255,255,0.92)",
                boxShadow: "0 0 10px rgba(255,255,255,0.38)",
              }}
            />
          );
        })}

        {/* הסמן הכחול המייצג את הרובוט */}
        <div
          style={{
            position: "absolute",
            left: px - 5.5,
            top: pz - 5.5,
            width: 11,
            height: 11,
            borderRadius: 999,
            background: "#123b9b",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 0 12px rgba(120,160,255,0.28)",
          }}
        />
      </div>

      {/* חיווי טקסטואלי על משימה קרובה */}
      <div
        style={{
          marginTop: 10,
          color: "rgba(255,255,255,0.65)",
          fontSize: 12,
          textAlign: "right",
        }}
      >
        Nearby: <span style={{ color: "rgba(255,255,255,0.88)" }}>{nearLabel || "None"}</span>
      </div>
    </div>
  );
}