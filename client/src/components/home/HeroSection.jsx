import { useRef, useEffect, useMemo } from 'react';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import anime from 'animejs';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef = useRef(null);
  const hasAnimated = useRef(false);

  // Memoize gradient URL to prevent unnecessary re-renders
  const gradientUrl = useMemo(() => {
    return isDark
      ? 'https://www.shadergradient.co/customize?animate=on&axesHelper=off&bgColor1=%230a0e1a&bgColor2=%2300f2ff&brightness=1.2&cAzimuthAngle=180&cDistance=3.6&cPolarAngle=90&cameraZoom=1&color1=%230a0e1a&color2=%2300f2ff&color3=%237000ff&destination=onCanvas&embedMode=off&envPreset=city&format=gif&fov=45&frameRate=10&gizmoHelper=hide&grain=on&lightType=3d&pixelDensity=1&positionX=-1.4&positionY=0&positionZ=0&range=enabled&rangeEnd=40&rangeStart=0&reflection=0.1&rotationX=0&rotationY=10&rotationZ=50&shader=defaults&type=waterPlane&uAmplitude=0&uDensity=1.3&uFrequency=5.5&uSpeed=0.4&uStrength=4&uTime=0&wireframe=false'
      : 'https://www.shadergradient.co/customize?animate=on&axesHelper=off&bgColor1=%23fff7fd&bgColor2=%2387CEEB&brightness=1.2&cAzimuthAngle=180&cDistance=3.6&cPolarAngle=90&cameraZoom=1&color1=%23fff7fd&color2=%2387CEEB&color3=%23D7B7FF&destination=onCanvas&embedMode=off&envPreset=city&format=gif&fov=45&frameRate=10&gizmoHelper=hide&grain=on&lightType=3d&pixelDensity=1&positionX=-1.4&positionY=0&positionZ=0&range=enabled&rangeEnd=40&rangeStart=0&reflection=0.1&rotationX=0&rotationY=10&rotationZ=50&shader=defaults&type=waterPlane&uAmplitude=0&uDensity=1.3&uFrequency=5.5&uSpeed=0.4&uStrength=4&uTime=0&wireframe=false';
  }, [isDark]);

  useEffect(() => {
    // Only animate once on mount
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // Staggered text animation
    const timeline = anime.timeline({
      easing: 'easeOutExpo',
    });

    timeline
      .add({
        targets: titleRef.current,
        translateY: [50, 0],
        opacity: [0, 1],
        duration: 1000,
      })
      .add(
        {
          targets: subtitleRef.current,
          translateY: [30, 0],
          opacity: [0, 1],
          duration: 800,
        },
        '-=600'
      )
      .add(
        {
          targets: ctaRef.current,
          scale: [0.8, 1],
          opacity: [0, 1],
          duration: 600,
        },
        '-=400'
      );
  }, []);

  const handleCtaClick = () => {
    // Animate before navigation
    anime({
      targets: ctaRef.current,
      scale: [1, 0.95, 1.05],
      duration: 300,
      easing: 'easeInOutQuad',
      complete: () => navigate('/game'),
    });
  };

  return (
    <section className={styles.hero}>
      {/* Video Background */}
      <div className={styles.videoWrapper}>
        <video
          className={styles.heroVideo}
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/homepage.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* 3D Gradient Background */}
      <div className={styles.gradientWrapper}>
        <ShaderGradientCanvas
          key={isDark ? 'dark' : 'light'}
          style={{
            position: 'absolute',
            top: 0,
          }}
        >
          <ShaderGradient control="query" urlString={gradientUrl} />
        </ShaderGradientCanvas>
      </div>

      {/* Content Overlay */}
      <div className={styles.content}>
        <h1 ref={titleRef} className={styles.title}>
          Learn <span className={styles.highlight}>Cybersecurity</span>
          <br />
          Through Play
        </h1>

        <p ref={subtitleRef} className={styles.subtitle}>
          Master password security, privacy protection, and digital safety in an
          immersive 3D game world with gesture controls.
        </p>

        <button ref={ctaRef} className={styles.ctaButton} onClick={handleCtaClick}>
          Start Your Journey
          <span className={styles.ctaArrow}>→</span>
        </button>
      </div>
    </section>
  );
}
