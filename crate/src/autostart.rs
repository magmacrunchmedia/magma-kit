//! Living on the desktop: autostart, and the launch mode that goes with it.
//!
//! THE OS OWNS THE AUTOSTART STATE, NOT the app's config file. On Windows it
//! is a registry Run entry, on macOS a login item, on Linux a .desktop file —
//! all of which the user can change from outside the app. Storing a copy in
//! config would create a second answer that silently goes stale, so
//! `is_enabled()` is asked every time rather than cached.
//!
//! The minimized flag is registered with the autostart entry so a boot launch
//! goes straight to the tray. Opening a full window over whatever you were
//! doing at login is not what "start with the OS" is supposed to mean.
//!
//! From magma-ops. The app registers `tauri_plugin_autostart` with
//! `MINIMIZED_FLAG` in its args and wraps these in its own commands.

use tauri::{AppHandle, Runtime};
use tauri_plugin_autostart::ManagerExt;

/// Passed to the autostart entry, and checked at startup.
pub const MINIMIZED_FLAG: &str = "--minimized";

/// Should the main window stay hidden on this launch?
///
/// True when the OS started us (the flag is on the autostart entry) or when
/// the user asked for it in settings. Either is a request for the tray.
pub fn start_hidden(configured: bool) -> bool {
    configured || std::env::args().any(|a| a == MINIMIZED_FLAG)
}

pub fn is_enabled<R: Runtime>(app: &AppHandle<R>) -> Result<bool, String> {
    app.autolaunch()
        .is_enabled()
        .map_err(|e| format!("read autostart: {e}"))
}

/// Turn autostart on or off.
///
/// REFUSED IN DEBUG BUILDS, deliberately. The plugin registers whatever
/// `current_exe()` happens to be, which under `tauri dev` is a binary inside
/// target/debug/. Enabling it there writes a path into the registry that
/// breaks the first time target/ is cleaned, and leaves a dangling Run entry
/// behind that nothing will ever clean up. Install the app and toggle it
/// there.
pub fn set_enabled<R: Runtime>(app: &AppHandle<R>, on: bool) -> Result<bool, String> {
    #[cfg(debug_assertions)]
    {
        let _ = (app, on);
        Err(
            "autostart is disabled in dev builds — it would register a target/debug binary \
             into the registry, which breaks the moment target/ is cleaned. Install the app \
             and toggle it there."
                .into(),
        )
    }

    #[cfg(not(debug_assertions))]
    {
        let manager = app.autolaunch();
        if on {
            manager
                .enable()
                .map_err(|e| format!("enable autostart: {e}"))?;
        } else {
            manager
                .disable()
                .map_err(|e| format!("disable autostart: {e}"))?;
        }
        is_enabled(app)
    }
}

/// What a settings panel shows for the autostart row.
#[derive(serde::Serialize)]
pub struct AutostartView {
    pub enabled: bool,
    /// False in dev builds. The panel disables the control and says why rather
    /// than offering a toggle that always errors.
    pub available: bool,
    pub reason: Option<String>,
}

pub fn view<R: Runtime>(app: &AppHandle<R>) -> AutostartView {
    let enabled = is_enabled(app).unwrap_or(false);

    #[cfg(debug_assertions)]
    let (available, reason) = (
        false,
        Some("not available in a dev build — install the app to use it".to_string()),
    );

    #[cfg(not(debug_assertions))]
    let (available, reason) = (true, None);

    AutostartView {
        enabled,
        available,
        reason,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The flag has to match what is registered with the autostart entry, or a
    /// boot launch opens a window instead of going to the tray.
    #[test]
    fn the_minimized_flag_is_a_plain_long_option() {
        assert_eq!(MINIMIZED_FLAG, "--minimized");
        assert!(MINIMIZED_FLAG.starts_with("--"));
    }
}
