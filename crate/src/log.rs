//! A log file on disk, for the times the window cannot tell you what it knows.
//!
//! Both sides write here: Rust directly, and the webview through the app's
//! `log_line` command (which the kit's boot.js reports crashes into). One
//! file, one timeline, and the webview's view of an event sits next to the
//! Rust side's view of the same event — which is precisely what you need when
//! the two disagree.
//!
//! Deliberately not a logging framework. Append a line, cap the file, never
//! fail loudly: a logger that panics while you are diagnosing a hang has made
//! things worse.

use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

/// Past this, the file is truncated and started again. Big enough to hold a
/// long session, small enough to open in an editor without regret.
const MAX_BYTES: u64 = 1_000_000;

static PATH: OnceLock<Mutex<Option<PathBuf>>> = OnceLock::new();

fn slot() -> &'static Mutex<Option<PathBuf>> {
    PATH.get_or_init(|| Mutex::new(None))
}

/// Point the logger at `dir/file_name` — e.g. `init(&config_dir, "my-app.log")`.
pub fn init(dir: &Path, file_name: &str) -> PathBuf {
    let path = dir.join(file_name);
    if let Ok(meta) = std::fs::metadata(&path) {
        if meta.len() > MAX_BYTES {
            let _ = std::fs::remove_file(&path);
        }
    }
    *slot().lock().unwrap() = Some(path.clone());
    path
}

pub fn path() -> Option<PathBuf> {
    slot().lock().unwrap().clone()
}

/// Local wall-clock, to the second. Matching a log line to "it hung at about
/// ten past" is the entire job, and that does not need milliseconds.
fn stamp() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // Seconds into the current day, formatted by hand — pulling in chrono for
    // one timestamp is not worth the dependency.
    let secs_today = now % 86_400;
    format!("{:02}:{:02}:{:02}", secs_today / 3600, (secs_today % 3600) / 60, secs_today % 60)
}

/// `side` is RS or JS, so a disagreement between the two is visible at a glance.
pub fn write(side: &str, kind: &str, message: &str, detail: Option<&str>) {
    let Some(path) = path() else { return };
    let line = match detail {
        Some(d) if !d.is_empty() => format!("{} {side} {kind:<8} {message} | {d}\n", stamp()),
        _ => format!("{} {side} {kind:<8} {message}\n", stamp()),
    };
    // Every failure here is swallowed. A logger that panics while you are
    // diagnosing a hang has made the situation worse, not better.
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&path) {
        let _ = f.write_all(line.as_bytes());
    }
}

pub fn rs(kind: &str, message: &str) {
    write("RS", kind, message, None);
}

pub fn rs_detail(kind: &str, message: &str, detail: &str) {
    write("RS", kind, message, Some(detail));
}

#[cfg(test)]
mod tests {
    // One test, not several: the logger is a process-wide singleton (that is
    // its job), so parallel tests would fight over where it points.
    #[test]
    fn appends_named_lines_and_truncates_an_oversized_file() {
        let dir = std::env::temp_dir().join(format!("magma-kit-log-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();

        // An oversized leftover from a previous run is dropped at init.
        let stale = dir.join("app.log");
        std::fs::write(&stale, vec![b'x'; (super::MAX_BYTES + 1) as usize]).unwrap();
        let path = super::init(&dir, "app.log");
        assert!(!path.exists(), "oversized log was truncated at init");

        assert_eq!(super::path().as_deref(), Some(path.as_path()));

        super::rs("boot", "starting");
        super::rs_detail("ERROR", "it broke", "the detail");
        super::write("JS", "boot", "page loading", None);

        let text = std::fs::read_to_string(&path).unwrap();
        assert!(text.contains("RS boot"), "{text}");
        assert!(text.contains("it broke | the detail"), "{text}");
        assert!(text.contains("JS boot"), "{text}");
        assert_eq!(text.lines().count(), 3);

        let _ = std::fs::remove_dir_all(&dir);
    }
}
