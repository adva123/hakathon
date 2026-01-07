import { forwardRef } from 'react';
import Robot from './Robot.jsx';

// Thin wrapper to match naming in docs/specs.
// Prop: faceTextureUrl (data URL or URL string)

// Accept equippedItem prop and pass to Robot
const RobotModel = forwardRef((props, ref) => {
  return <Robot ref={ref} {...props} equippedItem={props.equippedItem} />;
});

RobotModel.displayName = 'RobotModel';

export default RobotModel;
