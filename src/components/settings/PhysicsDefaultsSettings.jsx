import React from 'react';
import { Gauge } from 'lucide-react';
import { inputNumberClass } from '../ui';
import { mergePhysicsSettings, DEFAULT_PHYSICS_SETTINGS } from '../../utils/physicsConstants';

const PhysicsDefaultsSettings = ({ userSettings, updateUserSettings }) => {
    const physics = mergePhysicsSettings(userSettings.physics);

    const updatePhysics = (key, value) => {
        updateUserSettings('physics', { ...physics, [key]: Number(value) });
    };

    return (
        <div className="rounded-cdlg border border-cdborder bg-cdsurface p-6">
            <div className="flex items-center gap-2 pb-2 border-b border-cdborder/50 mb-4">
                <Gauge className="text-cdaccent" size={18} aria-hidden />
                <h3 className="font-bold text-cdtext">Physics defaults</h3>
            </div>
            <p className="text-xs text-cdmuted mb-4 leading-relaxed">
                Used as starting values in Physics, Race Pacing, Gear Optimizer, and Weather Climb calculations.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className="block text-[10px] font-semibold mb-1 text-cdmuted">CdA (m²)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={physics.cda}
                        onChange={(e) => updatePhysics('cda', e.target.value)}
                        className={inputNumberClass}
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-semibold mb-1 text-cdmuted">CRR (rolling resistance)</label>
                    <input
                        type="number"
                        step="0.0001"
                        min="0.001"
                        value={physics.crr}
                        onChange={(e) => updatePhysics('crr', e.target.value)}
                        className={inputNumberClass}
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-semibold mb-1 text-cdmuted">Drivetrain loss (fraction)</label>
                    <input
                        type="number"
                        step="0.005"
                        min="0"
                        max="0.2"
                        value={physics.drivetrainLossFraction}
                        onChange={(e) => updatePhysics('drivetrainLossFraction', e.target.value)}
                        className={inputNumberClass}
                    />
                </div>
            </div>
            <button
                type="button"
                className="mt-4 text-xs text-cdaccent hover:underline"
                onClick={() => updateUserSettings('physics', { ...DEFAULT_PHYSICS_SETTINGS })}
            >
                Reset physics defaults
            </button>
        </div>
    );
};

export default PhysicsDefaultsSettings;
