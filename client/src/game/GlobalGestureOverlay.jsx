import PropTypes from 'prop-types';
import GestureMapOverlay from '../components/common/GestureMapOverlay/GestureMapOverlay.jsx';
import { useRef, useState, useEffect } from 'react';

export default function GlobalGestureOverlay({ gestureRef }) {
  const [activeGesture, setActiveGesture] = useState('none');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let raf;
    function update() {
      if (gestureRef && gestureRef.current) {
        setActiveGesture(gestureRef.current.gesture || 'none');
      }
      raf = requestAnimationFrame(update);
    }
    update();
    return () => raf && cancelAnimationFrame(raf);
  }, [gestureRef]);

  return <GestureMapOverlay visible={visible} activeGesture={activeGesture} />;
}

GlobalGestureOverlay.propTypes = {
  gestureRef: PropTypes.shape({ current: PropTypes.any }),
};
