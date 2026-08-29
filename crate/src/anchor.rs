//! Where a tray popover goes, given the tray icon, the popover size and the
//! monitor it lands on. All physical pixels.
//!
//! Pure, and the ONLY place this arithmetic should exist — the cases that
//! matter (a second monitor at negative coordinates, a taskbar on the top or
//! side, 150% scaling) are awkward to reproduce by hand, so they are
//! unit-tested here rather than left to be discovered on someone else's desk.
//!
//! From magma-ops, where the tray wiring around it stays; the caller converts
//! its window and monitor handles to plain tuples and takes back a point.

/// Gap in physical pixels between the tray icon and the popover edge.
pub const GAP: i32 = 8;

/// `monitor` is None when the handle is unavailable; the popover then goes
/// where it was asked to go, unclamped, which is better than guessing at a
/// screen size.
pub fn anchor(
    icon: (i32, i32, i32, i32),
    pop: (i32, i32),
    monitor: Option<(i32, i32, i32, i32)>,
) -> (i32, i32) {
    let (ix, iy, iw, ih) = icon;
    let (pw, ph) = pop;

    // Centred on the icon, sitting above it — the taskbar's usual home.
    let mut x = ix + iw / 2 - pw / 2;
    let mut y = iy - ph - GAP;

    let Some((mx, my, mw, mh)) = monitor else {
        return (x, y);
    };

    // Keep it on screen horizontally: an icon near the right edge would
    // otherwise push half the popover past it. The max < min guard is for a
    // monitor narrower than the popover, where a naive clamp inverts and
    // throws the window off the left edge.
    let min_x = mx + GAP;
    let max_x = mx + mw - pw - GAP;
    x = if max_x < min_x { min_x } else { x.clamp(min_x, max_x) };

    // Taskbar on TOP: above the icon is off the screen, so flip below it.
    if y < my + GAP {
        y = iy + ih + GAP;
    }

    // A taskbar on the LEFT or RIGHT puts the icon mid-screen, where a flip
    // can still run off the bottom.
    let max_y = my + mh - ph - GAP;
    if y > max_y {
        y = max_y.max(my + GAP);
    }

    (x, y)
}

#[cfg(test)]
mod tests {
    use super::{anchor, GAP};

    fn place(icon: (i32, i32, i32, i32), pop: (i32, i32), mon: (i32, i32, i32, i32)) -> (i32, i32) {
        anchor(icon, pop, Some(mon))
    }

    const POP: (i32, i32) = (340, 460);
    const FHD: (i32, i32, i32, i32) = (0, 0, 1920, 1080);

    #[test]
    fn taskbar_at_the_bottom_puts_the_popover_above_the_icon() {
        let (x, y) = place((1700, 1040, 24, 24), POP, FHD);
        assert_eq!(x, 1700 + 12 - 170, "centred on the icon");
        assert_eq!(y, 1040 - 460 - GAP, "above it");
    }

    #[test]
    fn taskbar_at_the_top_flips_the_popover_below() {
        // Above would be y = -468, off the top of the screen.
        let (_, y) = place((1700, 4, 24, 24), POP, FHD);
        assert_eq!(y, 4 + 24 + GAP, "flipped below the icon");
    }

    #[test]
    fn an_icon_at_the_right_edge_is_clamped_on_screen() {
        let (x, _) = place((1910, 1040, 24, 24), POP, FHD);
        assert_eq!(x, 1920 - 340 - GAP, "flush to the right margin");
        assert!(x + 340 <= 1920, "and fully on screen");
    }

    #[test]
    fn an_icon_at_the_left_edge_is_clamped_on_screen() {
        // A left-hand taskbar, icon at x=0.
        let (x, _) = place((0, 1040, 24, 24), POP, FHD);
        assert_eq!(x, GAP, "flush to the left margin");
    }

    /// A second monitor to the left has negative coordinates, which is exactly
    /// where a clamp written against (0,0) sends the popover to the wrong screen.
    #[test]
    fn a_monitor_at_negative_coordinates_is_handled() {
        let left = (-1920, 0, 1920, 1080);
        let (x, y) = place((-200, 1040, 24, 24), POP, left);
        assert!(x >= -1920 + GAP, "left of the left monitor: {x}");
        assert!(x + 340 <= 0 - GAP + 340 + 340, "on that monitor: {x}");
        assert_eq!(y, 1040 - 460 - GAP, "still above the icon");
    }

    /// A vertical taskbar puts the icon mid-screen, so "above" is legal but a
    /// flip could still run off the bottom.
    #[test]
    fn a_side_taskbar_icon_stays_on_screen() {
        let (_, y) = place((4, 540, 24, 24), POP, FHD);
        assert!(y >= GAP && y + 460 <= 1080 - GAP + 460, "on screen: {y}");
    }

    /// Degenerate case: a monitor narrower than the popover. The clamp must not
    /// invert and throw it off the left edge.
    #[test]
    fn a_monitor_narrower_than_the_popover_does_not_invert() {
        let tiny = (0, 0, 200, 400);
        let (x, y) = place((100, 380, 24, 24), POP, tiny);
        assert_eq!(x, GAP, "pinned to the left rather than a negative clamp");
        assert!(y >= GAP, "and still on screen: {y}");
    }

    #[test]
    fn no_monitor_means_no_clamp() {
        let (x, y) = anchor((1910, 1040, 24, 24), POP, None);
        assert_eq!(x, 1910 + 12 - 170, "asked-for position, unclamped");
        assert_eq!(y, 1040 - 460 - GAP);
    }
}
