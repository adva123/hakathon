import { forwardRef } from 'react';
import Robot from './Robot.jsx';

// Thin wrapper to match naming in docs/specs.
// Prop: faceTextureUrl (data URL or URL string)
const RobotModel = forwardRef((props, ref) => {
  return <Robot ref={ref} {...props} />;
});

RobotModel.displayName = 'RobotModel';

export default RobotModel;
