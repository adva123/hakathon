/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Html, Text } from "@react-three/drei";

import q1 from "../assets/q1.png";
import q2 from "../assets/q2.png";
import q3 from "../assets/q3.png";

export default function Mission1({ playerPose }) {
  const ROOM_W = 70;
  const ROOM_D = 70;
  const WALL_VIS_H = 220;
  const yCenter = -1.11 + WALL_VIS_H / 2;

  const GROUND_Y = -1.11;
  const JUMP_TRIGGER_Y = GROUND_Y + 0.55;

  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2173bc",
        transparent: true,
        opacity: 0.28,
        roughness: 0.85,
        metalness: 0.0,
        side: THREE.DoubleSide,
      }),
    []
  );

  const leftWallX = -ROOM_W / 2 + 0.12;

  const [phase, setPhase] = useState("intro");
  const [answers, setAnswers] = useState([]);

  const wasAboveRef = useRef(false);
  const phaseRef = useRef("intro");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const questions = useMemo(
    () => [
      {
        img: q1,
        correctSide: "red",
        correctMsg: "Correct. This is bullying.",
        wrongMsg: "Not quite. This is bullying, not friendly.",
        extra: "You can tell because the message is threatening and tries to control the other person.",
      },
      {
        img: q2,
        correctSide: "red",
        correctMsg: "Correct. This is bullying.",
        wrongMsg: "Not quite. This is bullying, not friendly.",
        extra: "Look for mocking, pressure, or making someone feel small.",
      },
      {
        img: q3,
        correctSide: "green",
        correctMsg: "Correct. This is friendly.",
        wrongMsg: "Not quite. This is friendly, not bullying.",
        extra: "Friendly messages feel safe and respectful, even when someone says no.",
      },
    ],
    []
  );

  const qIndex = phase === "q1" || phase === "fb1" ? 0 : phase === "q2" || phase === "fb2" ? 1 : 2;
  const currentQ = questions[qIndex];

  const onJumpEvent = () => {
    const side = playerPose?.z >= 0 ? "green" : "red";
    const p = phaseRef.current;

    if (p === "intro") {
      setPhase("q1");
      return;
    }

    if (p === "end") {
      setAnswers([]);
      setPhase("intro");
      return;
    }

    if (p === "q1" || p === "q2" || p === "q3") {
      const isCorrect = side === currentQ.correctSide;
      setAnswers((prev) => [...prev, isCorrect]);

      if (p === "q1") setPhase("fb1");
      if (p === "q2") setPhase("fb2");
      if (p === "q3") setPhase("fb3");
      return;
    }

    if (p === "fb1") setPhase("q2");
    if (p === "fb2") setPhase("q3");
    if (p === "fb3") setPhase("end");
  };

  useEffect(() => {
    const y = playerPose?.y ?? GROUND_Y;
    const above = y > JUMP_TRIGGER_Y;

    if (above && !wasAboveRef.current) {
      wasAboveRef.current = true;
      onJumpEvent();
    }

    if (!above) {
      wasAboveRef.current = false;
    }
  }, [playerPose]);

  const allCorrect = answers.length === 3 && answers.every(Boolean);

  const showImage =
    phase === "q1" ||
    phase === "fb1" ||
    phase === "q2" ||
    phase === "fb2" ||
    phase === "q3" ||
    phase === "fb3";

  const showFeedback = phase === "fb1" || phase === "fb2" || phase === "fb3";

  const feedbackText = (() => {
    if (!showFeedback) return "";
    const last = answers[answers.length - 1];
    return last ? currentQ.correctMsg : currentQ.wrongMsg;
  })();

  const feedbackExtra = showFeedback ? currentQ.extra : "";

  return (
    <group>
      <hemisphereLight intensity={1.15} skyColor="#ffffff" groundColor="#dfe6f4" />
      <directionalLight position={[6, 10, 8]} intensity={0.55} color="#f0f4ff" />

      {/* Walls */}
      <mesh position={[-ROOM_W / 2, yCenter, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, WALL_VIS_H]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh position={[ROOM_W / 2, yCenter, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, WALL_VIS_H]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh position={[0, yCenter, -ROOM_D / 2]}>
        <planeGeometry args={[ROOM_W, WALL_VIS_H]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      <mesh position={[0, yCenter, ROOM_D / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, WALL_VIS_H]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* Split floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, ROOM_D / 4]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D / 2]} />
        <meshStandardMaterial roughness={0.9} metalness={0.0} color="#7fc590" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, -ROOM_D / 4]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D / 2]} />
        <meshStandardMaterial roughness={0.9} metalness={0.0} color="#e74c3c" />
      </mesh>

      {/* Title */}
      <group position={[leftWallX, 12.8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Text fontSize={2.1} color="#ffffff" anchorX="center" anchorY="middle">
          Friendly / Bullying
        </Text>
        <Text position={[0, -2.2, 0]} fontSize={0.9} color="#e9eefc" anchorX="center" anchorY="middle">
          Jump on your answer to start
        </Text>
      </group>

      <WallSign x={leftWallX} z={16} text="Friendly" />
      <WallSign x={leftWallX} z={-16} text="Bullying" />

      {showImage && (
        <Html fullscreen>
          <div
            style={{
              position: "absolute",
              top: 18,
              left: 18,
              width: "360px",
              maxWidth: "44vw",
              padding: "10px",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "14px",
              backdropFilter: "blur(6px)",
              color: "white",
              fontFamily: "system-ui, Arial",
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.95, marginBottom: 8 }}>
              {showFeedback ? "Feedback" : "Question"} - Jump on green or red
            </div>

            <img
              src={currentQ.img}
              alt="question"
              style={{
                width: "100%",
                display: "block",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.22)",
              }}
            />

            {showFeedback && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{feedbackText}</div>
                <div style={{ fontSize: 13, opacity: 0.95 }}>{feedbackExtra}</div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>Jump to continue</div>
              </div>
            )}
          </div>
        </Html>
      )}

      {phase === "end" && (
        <Html fullscreen>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "system-ui, Arial",
              color: "white",
              background: "rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                width: "520px",
                maxWidth: "86vw",
                padding: "18px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
                backdropFilter: "blur(8px)",
                textAlign: "center",
              }}
            >
              {allCorrect ? (
                <>
                  <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>You won!</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>Great job spotting bullying patterns.</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Nice try</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>It’s ok - there is still more to learn. Jump to try again.</div>
                </>
              )}
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 12 }}>Jump to restart</div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function WallSign({ x, z, text }) {
  return (
    <group position={[x, 6.9, z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <boxGeometry args={[13.5, 4.3, 0.2]} />
        <meshStandardMaterial color="#a8b0bc" transparent opacity={0.28} roughness={0.35} metalness={0.0} />
      </mesh>
      <Text position={[0, 0, 0.13]} fontSize={1.5} anchorX="center" anchorY="middle" color="#111827">
        {text}
      </Text>
    </group>
  );
}
