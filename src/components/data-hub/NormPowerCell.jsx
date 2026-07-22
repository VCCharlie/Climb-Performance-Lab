import React from 'react';
import ZoneMetricCell from './ZoneMetricCell';

/** @deprecated Use ZoneMetricCell — kept for existing imports. */
export default function NormPowerCell(props) {
    return <ZoneMetricCell metric="power" value={props.watts} profileFtp={props.profileFtp} className={props.className} suffix={props.suffix} />;
}
