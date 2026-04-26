import React, { useState } from 'react';
import { Gamepad2 } from 'lucide-react';

/** Renders flagcdn image with text fallback; remounted when `country` changes so error state resets without effects. */
function FlagCdnImage({ country, code, imgWidth }) {
    const [imageError, setImageError] = useState(false);

    if (imageError) {
        return <span className="text-[8px] font-bold text-cdmuted">{country}</span>;
    }

    return (
        <img
            src={`https://flagcdn.com/w${imgWidth}/${code}.png`}
            srcSet={`https://flagcdn.com/w${imgWidth * 2}/${code}.png 2x`}
            alt={`${country} flag`}
            className="w-full h-full object-cover"
            onError={() => {
                setImageError(true);
            }}
        />
    );
}

const FlagIcon = ({ country, size = 'sm', className = '' }) => {
    if (!country) return null;

    if (country.toUpperCase() === 'ZWIFT') {
        return <Gamepad2 size={size === 'sm' ? 14 : 18} className={`text-cyan-400 ${className}`} />;
    }

    // Standard flagcdn mapping
    // We've standardized most to 2-letter codes, but ensure UK -> gb
    let code = country.toLowerCase();
    if (code === 'uk') code = 'gb';
    if (code === 'usa') code = 'us';

    const dimensions = size === 'sm' ? 'w-5 h-3.5' : 'w-7 h-5';
    const imgWidth = size === 'sm' ? 40 : 80;

    return (
        <div className={`inline-flex items-center justify-center ${dimensions} overflow-hidden rounded-sm shadow-sm bg-cdborder/30 ${className}`}>
            <FlagCdnImage key={country} country={country} code={code} imgWidth={imgWidth} />
        </div>
    );
};

export default FlagIcon;
