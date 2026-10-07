/**
 * Colors that live outside CSS: the browser chrome (`<meta name="theme-color">`) and the
 * web app manifest. Must match `--color-background` in `src/app/globals.css` (a test
 * guards it), so the status bar blends with the light header every screen starts with.
 */
export const APP_BACKGROUND_COLOR = "#f9fafc";

/**
 * The login screen sits on the club's granate backdrop, so its browser chrome takes the
 * official granate (`--color-primary`, the backdrop's color at the top edge) instead.
 */
export const LOGIN_THEME_COLOR = "#70192d";
