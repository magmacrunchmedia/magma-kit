//! magma-kit — the Rust side of the shared desktop-app kit.
//!
//! Plain functions, not `#[tauri::command]`s: each app keeps its own
//! three-line command wrappers, so its invoke handler stays an explicit
//! allowlist and `generate_handler!` never has to reach across a crate
//! boundary. The kit owns the behavior; the app owns the surface.

pub mod anchor;
pub mod dirty;
pub mod fs;
pub mod log;

#[cfg(feature = "autostart")]
pub mod autostart;
