import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'light',
      primaryColor: '#e21a1c',
      fontSize: 16,
      
      setTheme: (theme) => {
        set({ theme });
        get().applySettings();
      },
      
      setPrimaryColor: (color) => {
        set({ primaryColor: color });
        get().applySettings();
      },
      
      setFontSize: (size) => {
        set({ fontSize: size });
        get().applySettings();
      },
      
      applySettings: () => {
        const { theme, primaryColor, fontSize } = get();
        const root = document.documentElement;
        
        // Apply theme attribute
        root.setAttribute('data-theme', theme);
        
        // Apply custom colors
        root.style.setProperty('--primary-color', primaryColor);
        
        // Calculate HSL components for better dynamic usage in CSS (calc)
        const hsl = hexToHsl(primaryColor);
        if (hsl) {
          root.style.setProperty('--primary-h', hsl.h.toString());
          root.style.setProperty('--primary-s', `${hsl.s}%`);
          root.style.setProperty('--primary-l', `${hsl.l}%`);
        }
        
        // Calculate and apply RGB for transparent variants
        const rgb = hexToRgb(primaryColor);
        if (rgb) {
          root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
        
        // Calculate a darker hover color automatically (simple version)
        root.style.setProperty('--primary-hover', adjustColor(primaryColor, -20));
        
        // Apply font size basics
        root.style.setProperty('--font-size-base', `${fontSize}px`);
        root.style.setProperty('--root-font-size', `${fontSize}px`);
        // For global scaling via rems and baseline
        root.style.fontSize = `${fontSize}px`;
      },
    }),
    {
      name: 'portal-theme-settings',
      onRehydrateStorage: () => (state) => {
        if (state) state.applySettings();
      },
    }
  )
);

// Helper to darken colors for hover state
function adjustColor(hex, amt) {
  let usePound = false;
  if (hex[0] === "#") {
    hex = hex.slice(1);
    usePound = true;
  }
  const num = parseInt(hex, 16);
  let r = (num >> 16) + amt;
  if (r > 255) r = 255;
  else if (r < 0) r = 0;
  let b = ((num >> 8) & 0x00FF) + amt;
  if (b > 255) b = 255;
  else if (b < 0) b = 0;
  let g = (num & 0x0000FF) + amt;
  if (g > 255) g = 255;
  else if (g < 0) g = 0;
  return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}

// Helper to convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Helper to convert hex to HSL
function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  
  let r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: break;
    }
    h /= 6;
  }

  return { 
    h: Math.round(h * 360), 
    s: Math.round(s * 100), 
    l: Math.round(l * 100) 
  };
}

export default useThemeStore;
