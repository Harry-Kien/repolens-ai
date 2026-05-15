# Skill: Responsive UI Design

When building or modifying UI components:

## Mobile-First Approach
1. **Design for mobile first** (375px), then expand for tablet (768px) and desktop (1024px+).
2. **Test at these breakpoints:** 375px, 768px, 1024px, 1440px.
3. **Touch targets:** Minimum 44x44px for buttons and links on mobile.
4. **Font sizes:** Minimum 16px body text (prevents iOS zoom on input focus).

## Layout Rules
- Use **flexbox** or **CSS Grid** — never use float for layout.
- Use **relative units** (rem, %, vh/vw) — avoid fixed pixel widths for containers.
- **Images:** Always set `max-width: 100%` and use proper aspect ratios.
- **Navigation:** Hamburger menu on mobile, horizontal nav on desktop.

## Common Mistakes to Avoid
- ❌ Fixed widths on containers (`width: 500px`)
- ❌ Horizontal scrolling on mobile
- ❌ Text too small to read on mobile
- ❌ Buttons too small to tap
- ❌ Hiding critical content on mobile
- ✅ Fluid widths (`max-width: 500px; width: 100%`)
- ✅ Stack columns on mobile, side-by-side on desktop
- ✅ Readable text at every breakpoint