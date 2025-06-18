export function intensityToColor(intensity, maxIntensity = 1) {
    const t = Math.min(intensity / maxIntensity, 1);

    let r, g, b;

    if (t < 0.33) {
        // Green -> Yellow
        const localT = t / 0.33;
        r = (1 - localT) * 46 + localT * 241;
        g = (1 - localT) * 204 + localT * 196;
        b = (1 - localT) * 113 + localT * 15;
    } else if (t < 0.66) {
        // Yellow -> Orange
        const localT = (t - 0.33) / 0.33;
        r = (1 - localT) * 241 + localT * 230;
        g = (1 - localT) * 196 + localT * 126;
        b = (1 - localT) * 15 + localT * 34;
    } else {
        // Orange -> Red
        const localT = (t - 0.66) / 0.34;
        r = (1 - localT) * 230 + localT * 231;
        g = (1 - localT) * 126 + localT * 76;
        b = (1 - localT) * 34 + localT * 60;
    }

    return [r / 255, g / 255, b / 255];
}

export function getColorMapping(positions, chargeConfig, maxIntensity = 1) {
    const colors = [];

    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        if (isNaN(x) || isNaN(y)) {
            colors.push(0, 0, 0);
            continue;
        }
        const mag = chargeConfig.getElectricFieldAt(x, y).length();
        const color = intensityToColor((mag / 500e8).toFixed(2), maxIntensity);
        colors.push(...color);
    }

    return colors;
}