//! Unsaved-changes tracking, Rust side.
//!
//! Whether the editor has unsaved changes, as last reported by the frontend.
//! Kept on this side so that closing the window can ask the same question
//! File > Exit asks. The frontend pushes it on every change (a `set_dirty`
//! command wrapping `set()`); if it ever stops pushing, the worst case is a
//! stale `true` and one dialog too many — never a window that cannot be
//! closed.
//!
//! From sprite-forge. The app manages a `Dirty` in tauri state, wires
//! `set_dirty` to `set()`, and calls `confirm_close` (feature `dialog`) from
//! its CloseRequested handler.

use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Default)]
pub struct Dirty(AtomicBool);

impl Dirty {
    pub fn new() -> Self {
        Dirty(AtomicBool::new(false))
    }

    pub fn set(&self, dirty: bool) {
        self.0.store(dirty, Ordering::Relaxed);
    }

    pub fn get(&self) -> bool {
        self.0.load(Ordering::Relaxed)
    }
}

/// The CloseRequested guard: clean work closes with no ceremony (which is also
/// the safe default if the frontend never told us anything); dirty work gets
/// the question, and only a yes destroys the window.
///
/// show() takes a callback and returns immediately — a blocking ask here would
/// be asking the thread that has to draw the dialog to wait for it.
#[cfg(feature = "dialog")]
pub fn confirm_close<R: tauri::Runtime>(
    window: &tauri::Window<R>,
    api: &tauri::CloseRequestApi,
    dirty: &Dirty,
    message: &str,
    title: &str,
) {
    if !dirty.get() {
        return;
    }

    api.prevent_close();
    let w = window.clone();
    tauri_plugin_dialog::DialogExt::dialog(window)
        .message(message)
        .title(title)
        .buttons(tauri_plugin_dialog::MessageDialogButtons::OkCancel)
        .show(move |discard| {
            if discard {
                let _ = w.destroy();
            }
        });
}

#[cfg(test)]
mod tests {
    use super::Dirty;

    #[test]
    fn starts_clean_and_follows_what_it_is_told() {
        let d = Dirty::new();
        assert!(!d.get(), "clean by default — the safe close is the default");
        d.set(true);
        assert!(d.get());
        d.set(false);
        assert!(!d.get());
    }
}
