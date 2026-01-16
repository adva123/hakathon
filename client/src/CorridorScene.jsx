/* eslint-disable react/no-unknown-property */

/**
 * רכיב CorridorScene
 * תפקידו להציג שכבת ממשק (UI Overlay) בזמן מעבר בין חדרים.
 * הוא מציג טקסט מרכזי עם אפקט "זכוכית חלבית" (Glassmorphism).
 */
export default function CorridorScene({ text }) {
  return (
    <div
      style={{
        // פריסה על כל המסך מעל שכבת התלת-ממד
        position: "absolute",
        inset: 0,
        
        // מרכז את הטקסט בדיוק באמצע המסך (אופקית ואנכית)
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        
        // מבטיח שהשכבה הזו לא תחסום לחיצות עכבר אם הן נדרשות מתחת
        pointerEvents: "none",
        fontFamily: "system-ui, Arial",
      }}
    >
      <div
        style={{
          // עיצוב התיבה (Padding ורדיוס פינות)
          padding: "14px 18px",
          borderRadius: 14,
          
          // צבע רקע לבן שקוף מאוד
          background: "rgba(255,255,255,0.10)",
          
          // מסגרת עדינה שנותנת תחושת עומק הייטקית
          border: "1px solid rgba(255,255,255,0.12)",
          
          // צבע טקסט לבן כמעט מלא
          color: "rgba(255,255,255,0.92)",
          
          // צל רך מתחת לתיבה
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          
          // האפקט החשוב ביותר: טשטוש של מה שנמצא מתחת לתיבה (אפקט זכוכית)
          backdropFilter: "blur(6px)",
          
          // הגדרות טיפוגרפיה
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 0.2,
        }}
      >
        {text}
      </div>
    </div>
  );
}