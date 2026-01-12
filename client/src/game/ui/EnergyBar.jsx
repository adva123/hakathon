import PropTypes from 'prop-types';
import styles from '../game.module.css';

export default function EnergyBar({ energy }) {
  const clamped = Math.max(0, Math.min(100, energy));
  return (
    <div className={styles.energyBar} aria-label={`Energy ${clamped}%`}>
      <div className={styles.energyFill} style={{ width: `${clamped}%` }} />
    </div>
  );
}

EnergyBar.propTypes = {
  energy: PropTypes.number.isRequired,
};
