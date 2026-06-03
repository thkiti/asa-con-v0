import { THEME_STORAGE_KEY } from "./types"

/** Inline script for root layout — must stay in sync with resolve-theme + storage key. */
export function getThemeInitScript(): string {
  const key = THEME_STORAGE_KEY
  return `(function(){try{var k=${JSON.stringify(key)};var m=localStorage.getItem(k);if(m!=="light"&&m!=="dark"&&m!=="system")m="system";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var el=document.documentElement;el.setAttribute("data-theme-mode",m);el.setAttribute("data-theme",d?"dark":"light");}catch(e){}})();`
}
