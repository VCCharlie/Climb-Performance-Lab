import React from 'react';
import { Gamepad2 } from 'lucide-react';

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
            <img
                src={`https://flagcdn.com/w${imgWidth}/${code}.png`}
                srcSet={`https://flagcdn.com/w${imgWidth * 2}/${code}.png 2x`}
                alt={`${country} flag`}
                className="w-full h-full object-cover"
                onError={(e) => {
                    // Fallback to a placeholder if image fails
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<span class="text-[8px] font-bold text-cdmuted">${country}</span>`;
                }}
            />
        </div>
    );
};

export default FlagIcon;
