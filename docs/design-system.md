# Interaction geometry

Hover, keyboard highlight, selection and expanded backgrounds follow the geometry
of the interactive surface. Use the existing semantic colors, focus indicators,
Radix behavior, and reduced-motion variants. The brand accent remains `#5343df`
in both themes.

In dark mode, the semantic interaction token `--accent` uses `--brand-blue`
directly (`#5343df`), with `--accent-foreground: #ffffff`. Dropdown and select
hover/keyboard highlights consume this pair instead of the dark `--brand-soft`
tint. Light mode keeps its soft accent background and darker accent text.
Neutral and destructive interactions retain their own semantic tokens; selected
states that specify opacity still derive their color from the same accent.

## Standalone controls

Buttons, icon buttons, inputs, upload controls, tabs and interactive cards paint
their own shape. Keep the same border radius before, during and after hover.
Text links use the existing text/underline treatment. Do not give a nested button
the radius of the entire card or add hover behavior to non-interactive cards.

Calendar day buttons use the cell radius. Range interiors remain square; the
existing range ends and single-day selection retain their defined shape.

## Contiguous menus and lists

The shared rules for contiguous vertical rows live in `src/styles/interactions.css`:

- `data-hover-list` marks the actual list boundary, with its real CSS radius.
- `data-hover-group` passes the available corners through structural groups.
- `data-hover-item` marks a row whose background follows the boundary.

Only the first visible structural child may inherit the top corners. Only the
last may inherit the bottom corners. A middle row is square; a sole row inherits
all four corners. A square boundary produces square rows. Asymmetric radii are
inherited individually, without assumptions about a particular radius token.

Labels, separators, footers and disabled rows occupy space and count when finding
the edges. For example, in the workspace menu, the heading above Easy Recap means
its top corners are square; the final Command row inherits only the bottom ones.
Groups between a heading and a footer inherit no outer corners.

Use conditional rendering or the `hidden` attribute for removed/hidden rows, so
edge ownership updates automatically. `data-hover-ignore` is reserved for
invisible bookkeeping elements that occupy no layout space. Do not use it on
labels, separators or disabled options.

Dropdown and select primitives opt in centrally, including radio/checkbox items
and submenu triggers. **Preserve the gap between the highlight and the popup
edge.** Shared popups use a 4px gutter; the notification panel uses 8px.
`--hover-inset` controls both the popup padding and the reduction of its inner
corner radius. `--hover-radius` controls the actual outer radius. Customize these
tokens together through the shared component, rather than applying independent
padding or rounded utilities. For example, a 16px outer radius with 4px padding
produces a 12px bottom corner on the final row. Only subtract the inset once;
structural groups further inside inherit the resulting inner radius.

Preserve the Radix primitive wrappers and item groups when composing menus.
Rows do not need an inter-row gap: the gutter around the popup remains visible
while middle rows stay square. Hover and keyboard highlight use the same inset.

For an inset list, establish a separate inner boundary. Its radius is the outer
radius minus the inset, clamped at zero, so the curves remain concentric:

```tsx
<div className="rounded-lg p-1">
  <div data-hover-list="" className="flex flex-col rounded-[max(0px,calc(var(--radius-lg)-4px))]">
    <Button variant="ghost" data-hover-item="">
      First row
    </Button>
    <Button variant="ghost" data-hover-item="">
      Middle row
    </Button>
    <Button variant="ghost" data-hover-item="">
      Last row
    </Button>
  </div>
</div>
```

The inner boundary must match the intended inset on each edge; do not apply
`rounded-full` independently to each contiguous row. Use ordinary standalone
buttons when the design deliberately spaces independent controls apart.

## Tables and clipping

Table body hover and keyboard focus within a row share one background rule.
Interior rows stay square. A rounded card already clips the table at the card's
outer edge; a table above pagination or a footer does not own the bottom corners.
Headers do not gain a row-hover background. Keep horizontal scrolling, cell
semantics and the focus indicator on the actual link/button inside the row.

Avoid blanket `overflow: hidden` on controls: it can cut off focus rings, shadows
and portaled menus. Existing rounded card/popup boundaries provide clipping where
it is needed. Do not add pointer tracking, DOM measurement or request polling to
determine hover geometry.

## Verification

Coverage of the existing application:

| Surface                                                         | Geometry owner                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Workspace, account and notification menus                       | Shared dropdown boundary and structural groups                          |
| Company, status, period, pagination, master and account options | Shared select boundary and viewport                                     |
| Buttons, icon actions, sidebar navigation, upload area          | Their own Button border radius and background                           |
| Tabs, field option cards, badges and text links                 | Their own existing shape and interaction treatment                      |
| Calendar days and date ranges                                   | Calendar cell radius and range modifiers                                |
| Invoice, receipt, audit and user tables                         | Square interior rows, clipped by the actual outer card where applicable |

Feature-level hover colors continue to paint the same control box. Avoid new
rounded overlays or per-row radius overrides when extending these surfaces.

Run the focused browser suite with a local frontend server and mocked API:

```sh
npx playwright test tests/e2e/dynamic-hover.spec.ts
```

Check light/dark themes, desktop/mobile layouts, keyboard selection, disabled and
hidden rows, dynamic lists, scrolling, and reduced motion when changing this
standard or adopting it in another component.
