import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div
      style={{
        height: "100vh",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ marginBottom: 20 }}>ברוכה הבאה</h1>

      <Link to="/room">
        <button
          style={{
            padding: "14px 32px",
            fontSize: 18,
            borderRadius: 30,
            border: "none",
            cursor: "pointer",
            background: "#000",
            color: "#fff",
          }}
        >
          כניסה לחדר
        </button>
      </Link>
    </div>
  );
}
