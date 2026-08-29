//! The filesystem bridge: a small, generic set of file operations.
//!
//! Deliberately dumb. It knows nothing about any app's file formats or on-disk
//! layouts — all of that lives in the app's core/, in JavaScript, where the
//! web build and the desktop build share one copy of it and the Node test
//! suite can reach it. Putting format knowledge down here would fork that
//! logic into a second language for no gain.
//!
//! So: bytes in, bytes out, and errors always name the path. Apps expose these
//! as `#[tauri::command]` wrappers — the kit owns the behavior, the app owns
//! its command allowlist.
//!
//! From sprite-forge, where this boundary was drawn.

use std::fs;
use std::path::{Component, Path, PathBuf};

use serde::Serialize;

#[derive(Serialize)]
pub struct DirEntry {
    pub name: String,
    pub is_dir: bool,
}

/// Rejects paths that try to climb out of where they were pointed.
///
/// The one guard in the module, and the reason `write_in_root` exists as its
/// own function: relative paths built from data read out of project files are
/// data, not necessarily the user's own typing, and a name like `../../..`
/// would otherwise write outside the root it was aimed at.
pub fn join_checked(root: &str, rel: &str) -> Result<PathBuf, String> {
    let rel_path = Path::new(rel);
    if rel_path.is_absolute() {
        return Err(format!("path must be relative to the target root: {rel}"));
    }
    for c in rel_path.components() {
        match c {
            Component::ParentDir => return Err(format!("path escapes the target root: {rel}")),
            Component::Prefix(_) | Component::RootDir => {
                return Err(format!("path must be relative to the target root: {rel}"))
            }
            _ => {}
        }
    }
    Ok(Path::new(root).join(rel_path))
}

pub fn read_text(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| format!("{path}: {e}"))
}

pub fn write_text(path: &str, contents: &str) -> Result<(), String> {
    if let Some(parent) = Path::new(path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("{}: {e}", parent.display()))?;
    }
    fs::write(path, contents).map_err(|e| format!("{path}: {e}"))
}

pub fn read_bytes(path: &str) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|e| format!("{path}: {e}"))
}

pub fn write_bytes(path: &str, contents: &[u8]) -> Result<(), String> {
    if let Some(parent) = Path::new(path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("{}: {e}", parent.display()))?;
    }
    fs::write(path, contents).map_err(|e| format!("{path}: {e}"))
}

/// Writes one file of a plan, resolved against a target root.
///
/// Separate from `write_bytes` because this is the call that takes an
/// untrusted relative path, and it is the only one that does. Keeping it
/// distinct means the containment check cannot be forgotten at a call site.
pub fn write_in_root(root: &str, rel: &str, contents: &[u8]) -> Result<String, String> {
    let target = join_checked(root, rel)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("{}: {e}", parent.display()))?;
    }
    fs::write(&target, contents).map_err(|e| format!("{}: {e}", target.display()))?;
    Ok(target.display().to_string())
}

pub fn write_text_in_root(root: &str, rel: &str, contents: &str) -> Result<String, String> {
    write_in_root(root, rel, contents.as_bytes())
}

pub fn exists(path: &str) -> bool {
    Path::new(path).exists()
}

/// Directories first, each group by name — the order a picker wants.
pub fn read_dir(path: &str) -> Result<Vec<DirEntry>, String> {
    let mut out = Vec::new();
    for entry in fs::read_dir(path).map_err(|e| format!("{path}: {e}"))? {
        let entry = entry.map_err(|e| format!("{path}: {e}"))?;
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
        out.push(DirEntry {
            name: entry.file_name().to_string_lossy().into_owned(),
            is_dir,
        });
    }
    out.sort_by(|a, b| (b.is_dir, &a.name).cmp(&(a.is_dir, &b.name)));
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::join_checked;

    #[test]
    fn joins_a_plain_relative_path() {
        let p = join_checked("/games/tc", "sprites/spr_dag/a.png").unwrap();
        assert!(p.ends_with("sprites/spr_dag/a.png"));
    }

    #[test]
    fn refuses_to_climb_out() {
        assert!(join_checked("/games/tc", "../../etc/passwd").is_err());
        assert!(join_checked("/games/tc", "sprites/../../../x").is_err());
    }

    #[test]
    fn refuses_an_absolute_path() {
        assert!(join_checked("/games/tc", "/etc/passwd").is_err());
    }

    #[test]
    fn round_trips_text_and_bytes_and_names_the_path_on_failure() {
        let dir = std::env::temp_dir().join(format!("magma-kit-fs-{}", std::process::id()));
        let file = dir.join("deep/nested/note.txt");
        let path = file.to_string_lossy();

        super::write_text(&path, "hello").unwrap();
        assert_eq!(super::read_text(&path).unwrap(), "hello");
        assert!(super::exists(&path));

        super::write_bytes(&path, &[1, 2, 3]).unwrap();
        assert_eq!(super::read_bytes(&path).unwrap(), vec![1, 2, 3]);

        let missing = dir.join("nope.txt");
        let err = super::read_text(&missing.to_string_lossy()).unwrap_err();
        assert!(err.contains("nope.txt"), "error names the path: {err}");

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn write_in_root_creates_parents_and_reports_the_final_path() {
        let dir = std::env::temp_dir().join(format!("magma-kit-root-{}", std::process::id()));
        let root = dir.to_string_lossy();

        let written = super::write_in_root(&root, "sprites/a/b.bin", &[9]).unwrap();
        assert!(written.contains("b.bin"));
        assert!(super::exists(&written));

        assert!(super::write_in_root(&root, "../escape.bin", &[9]).is_err());

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn read_dir_puts_directories_first() {
        let dir = std::env::temp_dir().join(format!("magma-kit-ls-{}", std::process::id()));
        std::fs::create_dir_all(dir.join("zdir")).unwrap();
        std::fs::write(dir.join("afile"), b"").unwrap();

        let entries = super::read_dir(&dir.to_string_lossy()).unwrap();
        assert_eq!(entries[0].name, "zdir");
        assert!(entries[0].is_dir);
        assert_eq!(entries[1].name, "afile");

        let _ = std::fs::remove_dir_all(&dir);
    }
}
