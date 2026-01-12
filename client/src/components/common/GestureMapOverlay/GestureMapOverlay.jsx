import PropTypes from 'prop-types';
import styles from './GestureMapOverlay.module.css';

function NeonSvg({ children, viewBox = '0 0 64 64' }) {
  return (
    <svg
      width="44"
      height="44"
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 8px rgba(0,242,255,0.55))' }}
    >
      <g stroke="rgba(0,242,255,0.95)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
      <g stroke="rgba(112,0,255,0.65)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
        {children}
      </g>
    </svg>
  );
}

NeonSvg.propTypes = {
  children: PropTypes.node,
  viewBox: PropTypes.string,
};

function IconThumbUp() {
  return (
    <NeonSvg>
      <path d="M20 30v18" />
      <path d="M20 30c3-8 7-12 11-16 2-2 5 0 5 3v7h12c3 0 5 3 4 6l-4 14c-1 3-3 4-6 4H26c-3 0-6-3-6-6V30z" />
      <path d="M18 30h-4v22h4" />
    </NeonSvg>
  );
}

function IconThumbDown() {
  return (
    <NeonSvg>
      <path d="M20 34V16" />
      <path d="M20 34c3 8 7 12 11 16 2 2 5 0 5-3v-7h12c3 0 5-3 4-6l-4-14c-1-3-3-4-6-4H26c-3 0-6 3-6 6v16z" />
      <path d="M18 12h-4v22h4" />
    </NeonSvg>
  );
}

function IconPalm() {
  return (
    <NeonSvg>
      <path d="M22 42c-3 0-6-3-6-7V24c0-2 2-4 4-4s4 2 4 4v6" />
      <path d="M28 30V16c0-2 2-4 4-4s4 2 4 4v14" />
      <path d="M36 30V18c0-2 2-4 4-4s4 2 4 4v16" />
      <path d="M44 34V22c0-2 2-4 4-4s4 2 4 4v12c0 8-6 14-14 14H30c-2 0-4-1-6-2" />
    </NeonSvg>
  );
}

function IconFist() {
  return (
    <NeonSvg>
      <path d="M18 30v-8c0-2 2-4 4-4s4 2 4 4v8" />
      <path d="M26 30v-9c0-2 2-4 4-4s4 2 4 4v9" />
      <path d="M34 30v-9c0-2 2-4 4-4s4 2 4 4v9" />
      <path d="M42 30v-7c0-2 2-4 4-4s4 2 4 4v12c0 7-5 13-12 13H30c-7 0-12-6-12-13v-5h24" />
    </NeonSvg>
  );
}

function IconPeace() {
  return (
    <NeonSvg>
      <path d="M26 46V18c0-3 2-6 6-6s6 3 6 6v18" />
      <path d="M38 36V16c0-3 2-6 6-6s6 3 6 6v22" />
      <path d="M22 36c-4 0-8 3-8 7s4 9 10 9h18c6 0 12-4 12-10" />
      <path d="M30 44l-4 4" />
    </NeonSvg>
  );
}

function ActionArrow({ dir }) {
  const rot = dir === 'right' ? 0 : dir === 'left' ? 180 : 270;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: `rotate(${rot}deg)` }}>
      <path
        d="M5 12h12"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M13 6l6 6-6 6"
        stroke="rgba(0,242,255,0.92)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

ActionArrow.propTypes = {
  dir: PropTypes.oneOf(['right', 'left', 'up']).isRequired,
};

function ActionStop() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="rgba(0,242,255,0.92)" strokeWidth="2.2" />
    </svg>
  );
}

function ActionSpark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l1.4 5.1L18 8.5l-4.6 1.4L12 15l-1.4-5.1L6 8.5l4.6-1.4L12 2z" stroke="rgba(0,242,255,0.92)" strokeWidth="1.8" />
    </svg>
  );
}

const PANELS = [
  {
    key: 'thumbUp',
    pos: 'posRight',
    title: 'Move Right',
    sub: 'Thumb Up: Move Right',
    icon: <IconThumbUp />,
    action: <ActionArrow dir="right" />,
  },
  {
    key: 'thumbDown',
    pos: 'posLeft',
    title: 'Move Left',
    sub: 'Thumb Down: Move Left',
    icon: <IconThumbDown />,
    action: <ActionArrow dir="left" />,
  },
  {
    key: 'openPalm',
    pos: 'posTop',
    title: 'Move Forward',
    sub: 'Open Palm: Move Forward',
    icon: <IconPalm />,
    action: <ActionArrow dir="up" />,
  },
  {
    key: 'fist',
    pos: 'posBottom',
    title: 'Stop',
    sub: 'Fist: Stop (blocks room entry)',
    icon: <IconFist />,
    action: <ActionStop />,
  },
  {
    key: 'peace',
    pos: 'posBottomRight',
    title: 'Victory Dance',
    sub: 'Peace: Victory Dance',
    icon: <IconPeace />,
    action: <ActionSpark />,
  },
];


const GestureMapOverlay = function GestureMapOverlay({ visible = false, activeGesture }) {
  return null;
};

export default GestureMapOverlay;

GestureMapOverlay.propTypes = {
  visible: PropTypes.bool,
  activeGesture: PropTypes.string,
};
