import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FlagIcon from '../../components/FlagIcon';

describe('FlagIcon Component', () => {
  it('renders Zwift flag correctly', () => {
    const { container } = render(<FlagIcon country="Zwift" />);
    // The Zwift flag uses the Gamepad2 lucide icon, not an image.
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders standard country flag image correctly', () => {
    render(<FlagIcon country="NL" />);
    const img = screen.getByAltText('NL flag');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://flagcdn.com/w40/nl.png');
  });

  it('handles image load error without rendering XSS vulnerabilities', () => {
    // Malicious payload that could trigger an alert if innerHTML was used
    const maliciousCountry = '<img src=x onerror=alert(1)>';
    render(<FlagIcon country={maliciousCountry} />);

    const img = screen.getByAltText(`${maliciousCountry} flag`);

    // Trigger the onError handler
    fireEvent.error(img);

    // Ensure the image is gone and fallback text is displayed.
    // The malicious country string should be rendered safely as text, not HTML.
    expect(screen.queryByAltText(`${maliciousCountry} flag`)).not.toBeInTheDocument();
    expect(screen.getByText(maliciousCountry)).toBeInTheDocument();

    // There shouldn't be any new img tag created inside the container from the malicious payload
    expect(screen.queryAllByRole('img').length).toBe(0);
  });
});
