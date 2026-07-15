// Diya color follows the IST clock: warm yellow-orange from 7 PM to 7 AM,
// cool blue from 7 AM to 7 PM. IST = UTC+5:30. Shared by <TorchOverlay>
// (flame/aura palette) and <ThemeToggle> (beacon icon tint).
export function warmNow(now = new Date()) {
  const istMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
  const hour = istMinutes / 60;
  return hour >= 19 || hour < 7;
}

// Beacon-icon tints (match the flame's outer color per palette).
export const WARM_TINT = "#ffb020";
export const COOL_TINT = "#3b82f6";
