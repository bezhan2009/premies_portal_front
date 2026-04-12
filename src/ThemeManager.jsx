import { useEffect } from 'react';
import useThemeStore from './store/useThemeStore';

/**
 * ThemeManager component that injects CSS variables into the document root
 * strictly following the theme and primary color stored in the themeStore.
 */
export default function ThemeManager() {
  const { theme, primaryColor, fontSize } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    
    // Set basic theme attribute
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;

    // Inject primary colors
    root.style.setProperty('--primary-color', primaryColor);
    
    // Generate hover color (slightly darker)
    // Simple way to get a hover color for now, or use the one from store if it existed
    // For now we just use the primary color and let CSS filters or overlay handle hovers if possible
    // But since we have --primary-hover in SCSS, let's set it.
    root.style.setProperty('--primary-hover', adjustColor(primaryColor, -20));

    // Inject primary RGB for alpha support
    const rgb = hexToRgb(primaryColor);
    if (rgb) {
      root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }

    // Inject dynamic sizing
    root.style.setProperty('--font-size-base', `${fontSize}px`);

  }, [theme, primaryColor, fontSize]);

  return null;
}

// Utility to convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Utility to darken/lighten color
function adjustColor(hex, amt) {
  var usePound = false;
  if (hex[0] === "#") {
    hex = hex.slice(1);
    usePound = true;
  }
  var num = parseInt(hex, 16);
  var r = (num >> 16) + amt;
  if (r > 255) r = 255;
  else if (r < 0) r = 0;
  var b = ((num >> 8) & 0x00FF) + amt;
  if (b > 255) b = 255;
  else if (b < 0) b = 0;
  var g = (num & 0x0000FF) + amt;
  if (g > 255) g = 255;
  else if (g < 0) g = 0;
  return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}
