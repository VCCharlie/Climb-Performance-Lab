/**
 * Intent-driven fluid workout templates for outdoor polder training.
 * No rigid ERG steps — structured objectives and execution cues instead.
 */

const STIMULUS_META = {
    recovery: {
        label: 'Recovery',
        color: 'green',
        rpe: 'RPE 2–3 / Zone 1',
    },
    endurance: {
        label: 'Endurance',
        color: 'blue',
        rpe: 'RPE 4–5 / Zone 2 (55–75% FTP)',
    },
    sweetspot: {
        label: 'Sweetspot',
        color: 'yellow',
        rpe: 'RPE 7 / Sweetspot (88–94% FTP)',
    },
    threshold: {
        label: 'Threshold',
        color: 'orange',
        rpe: 'RPE 8 / Threshold (95–100% FTP)',
    },
    vo2: {
        label: 'VO2',
        color: 'red',
        rpe: 'RPE 9 / VO2 (105–115% FTP)',
    },
};

const TEMPLATES = {
    recovery: {
        name: 'Polder Recovery Spin',
        totalMinutes: { min: 45, max: 60 },
        warmup: { minutes: 5, guidance: 'Start very easy. High cadence (90–100 rpm), no pressure on the pedals.' },
        mainSet: {
            description: 'Continuous easy riding — conversation pace throughout.',
            blocks: [],
            outdoorTips: [
                'Short loop close to home so you can bail if legs feel heavy.',
                'Use tailwind sections only; avoid battling headwind today.',
                'Focus on smooth pedalling and relaxed shoulders.',
            ],
        },
        cooldown: { minutes: 5, guidance: 'Ease off gradually. Stretch when home.' },
        successCheck: [
            'Heart rate stayed low throughout',
            'You finish feeling better than when you started',
            'No burning legs or breathlessness',
        ],
    },
    endurance: {
        name: 'Coastal/Polder Endurance Ride',
        totalMinutes: { min: 75, max: 150 },
        warmup: { minutes: 15, guidance: 'Gradual ramp from Z1 into low Z2. No surges at lights.' },
        mainSet: {
            description: 'Steady aerobic riding — hold Z2 with minimal drift into tempo.',
            blocks: [
                { reps: 1, workMin: 60, recoveryMin: 0, zone: 'Zone 2', powerHint: '55–75% FTP' },
            ],
            outdoorTips: [
                'Pick a long flat loop (dike roads, polder routes) to avoid stop-start traffic.',
                'Into headwind: drop cadence slightly, keep power steady not heroic.',
                'Eat every 45–60 min if riding over 90 min.',
            ],
        },
        cooldown: { minutes: 10, guidance: 'Last 10 min easy spin home.' },
        successCheck: [
            'Could hold a full conversation for most of the ride',
            'Normalized power stayed in Z2 band',
            'No intervals or "just one more" efforts snuck in',
        ],
    },
    sweetspot: {
        name: 'Polder Power: Sweetspot Blocks',
        totalMinutes: { min: 75, max: 105 },
        warmup: { minutes: 15, guidance: 'Easy spin, then 2–3 short openers (30s at tempo) to wake up the legs.' },
        mainSet: {
            description: 'Repeatable sweetspot blocks on open straight sections.',
            blocks: [
                { reps: 3, workMin: 8, recoveryMin: 4, zone: 'Sweetspot', powerHint: '88–94% FTP' },
            ],
            outdoorTips: [
                'Scout 2–4 km straight polder stretches — use headwind outbound for work, tailwind for recovery.',
                'If traffic breaks rhythm: pause the block, resume on the next open section.',
                'Hold "firm but sustainable" — full sentences should be difficult but not impossible.',
                'Bridge crossings work as natural segment markers.',
            ],
        },
        cooldown: { minutes: 10, guidance: 'Easy spin home, shake out the legs.' },
        successCheck: [
            'All blocks within 88–94% FTP (or RPE 7)',
            'Recovery intervals felt genuinely easy',
            'Could repeat tomorrow at Z2 intensity',
        ],
    },
    threshold: {
        name: 'Headwind Threshold Repeats',
        totalMinutes: { min: 75, max: 95 },
        warmup: { minutes: 15, guidance: 'Progressive warmup into tempo. Include 1× 1 min at threshold to preview the effort.' },
        mainSet: {
            description: 'Longer sustained efforts at FTP — use wind and road layout, not a trainer.',
            blocks: [
                { reps: 2, workMin: 15, recoveryMin: 5, zone: 'Threshold', powerHint: '95–100% FTP' },
            ],
            outdoorTips: [
                'Find a 4–6 km straight with steady headwind for the 15-min blocks.',
                'Start conservatively — first 3 min should feel controlled, not maximal.',
                'Use a gear that keeps cadence 85–95 rpm.',
                'If power fades below 95% FTP, shorten the block rather than grinding.',
            ],
        },
        cooldown: { minutes: 10, guidance: 'Very easy home. No bonus efforts.' },
        successCheck: [
            'Both blocks held at or just below FTP',
            'Form did not collapse in the final third',
            'RPE 8 but not 10 — you had one more rep in reserve',
        ],
    },
    vo2: {
        name: 'Bridge & Open-Road VO2',
        totalMinutes: { min: 60, max: 75 },
        warmup: { minutes: 15, guidance: 'Easy spin plus 2× 30s at tempo to prepare breathing.' },
        mainSet: {
            description: 'Short hard efforts — use natural landmarks, not a stopwatch obsession.',
            blocks: [
                { reps: 4, workMin: 4, recoveryMin: 4, zone: 'VO2', powerHint: '105–115% FTP' },
            ],
            outdoorTips: [
                'Accelerate over a bridge or from a traffic light, then hold hard on the open stretch.',
                'Each rep: first 30s is the hardest — settle into rhythm after that.',
                'Full recovery between reps — spin easy, no half-recovery.',
                'Skip a rep if legs feel flat — quality over quantity.',
            ],
        },
        cooldown: { minutes: 10, guidance: 'Easy spin. You should feel worked but not destroyed.' },
        successCheck: [
            'Each rep felt hard (RPE 9) but repeatable',
            'Power did not drop more than 5% across reps',
            'Recovery spins were genuinely easy',
        ],
    },
};

/**
 * @param {string} stimulus
 * @param {object} [options]
 * @param {number} [options.ftp]
 * @returns {object}
 */
export function buildFluidWorkout(stimulus, options = {}) {
    const key = TEMPLATES[stimulus] ? stimulus : 'sweetspot';
    const template = TEMPLATES[key];
    const meta = STIMULUS_META[key];
    const ftp = Number(options.ftp) || 0;

    const blocksWithWatts = template.mainSet.blocks.map((block) => {
        const hint = block.powerHint || '';
        let wattRange = null;
        if (ftp > 0 && hint.includes('%')) {
            const match = hint.match(/(\d+)[–-](\d+)%/);
            if (match) {
                wattRange = `${Math.round(ftp * Number(match[1]) / 100)}–${Math.round(ftp * Number(match[2]) / 100)} W`;
            } else {
                const single = hint.match(/(\d+)%/);
                if (single) {
                    const w = Math.round(ftp * Number(single[1]) / 100);
                    wattRange = `~${w} W`;
                }
            }
        }
        return { ...block, wattRange };
    });

    const shortAlt = buildShortAlternative(key, template, ftp);

    return {
        stimulus: key,
        stimulusLabel: meta.label,
        stimulusColor: meta.color,
        rpeTarget: meta.rpe,
        name: template.name,
        totalMinutes: template.totalMinutes,
        warmup: template.warmup,
        mainSet: {
            ...template.mainSet,
            blocks: blocksWithWatts,
        },
        cooldown: template.cooldown,
        successCheck: template.successCheck,
        shortOnTimeAlternative: shortAlt,
    };
}

function buildShortAlternative(stimulus, template, ftp) {
    const shortMap = {
        recovery: { totalMinutes: 30, summary: '30 min very easy spin', whatYouKeep: 'Active recovery stimulus', whatYouCut: 'Duration' },
        endurance: { totalMinutes: 60, summary: '60 min steady Z2', whatYouKeep: 'Aerobic base work', whatYouCut: 'Extra duration beyond 60 min' },
        sweetspot: {
            totalMinutes: 60,
            summary: '2× 10 min sweetspot instead of 3× 8 min',
            whatYouKeep: 'Sweetspot FTP stimulus',
            whatYouCut: 'One block — still counts',
        },
        threshold: {
            totalMinutes: 65,
            summary: '1× 20 min threshold instead of 2× 15 min',
            whatYouKeep: 'Threshold adaptation',
            whatYouCut: 'Second block',
        },
        vo2: {
            totalMinutes: 55,
            summary: '3× 4 min VO2 instead of 4× 4 min',
            whatYouKeep: 'VO2 ceiling stimulus',
            whatYouCut: 'One rep',
        },
    };

    const alt = shortMap[stimulus] || shortMap.sweetspot;
    if (ftp > 0 && stimulus === 'sweetspot') {
        alt.wattHint = `${Math.round(ftp * 0.88)}–${Math.round(ftp * 0.94)} W`;
    }
    return alt;
}

export { STIMULUS_META, TEMPLATES };
