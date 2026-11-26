# Reviewing package benefits

A supported structured Benefit table in a Zenoti PDF supplies the individual services for invoice review, even when the billed parent is named Trial or Custom Package. The billed parent is retained as source reference rather than counted again. All detail rows must be read successfully before replacing the parent automatically.

## Percentage and nominal discounts

Add-item and edit-item controls let Finance choose Percentage (%) or Nominal (Rp). The alternative value is shown underneath. A nominal discount applies to the full row, before tax, rather than to each unit. Switching the display preserves the exact rupiah value; the displayed equivalent percentage can be approximate. Changing a value recalculates the row under the selected mode. Source subtotal, tax, and invoice total remain the review targets.

The percentage or Rp suffix inside a discount input opens an inline alternative on its right. The chevron points left while open, and the single alternative shares the input height and rounded contour. The control reserves space within its existing field, so the alternative does not cover typing or neighbouring inputs. Its back layer animates with CSS transform and opacity; keyboard selection, Escape, focus restoration, and reduced motion are supported. Currency inputs show an Rp prefix, dots for thousands, and a comma for decimals. Unit prices retain up to six decimal places; nominal discounts remain whole rupiah. Formatting is limited to the interface: requests still contain numeric prices and discounts without currency symbols or grouping separators.

On desktop, invoice review starts with a 66% inspection panel and a 34% source preview. The divider remains adjustable and double-click restores these defaults. Edit-row controls align at the top, with discount conversion text below the input. The format reveal uses coordinated 280 ms CSS transitions inside the control; its animated layer is separate from the Radix measurement wrapper so intermediate frames are preserved.

## Review with a note

An extraction exception panel appears for supported package reading problems. After Finance has completed the treatment lines and matched the source amounts, the panel allows review with a mandatory 10-1000-character reason. Save the review, then use Submit with a note in the existing batch workflow. The submit confirmation identifies that a note is included. Saved notes remain available in invoice review, and the backend records the reason, reviewer identity, and submission in its audit history.

Financial differences, missing or invalid mappings, ambiguous parent attribution, invalid source identities, duplicate/conflicting invoices, and role restrictions remain blocking. Changing reviewed details or mapping requires review again. Internal reasons are kept in intgrte; this feature does not add them to the Accurate financial payload.

## Older draft PDFs

The Read Benefit details again action opens a confirmation before replacing the current file's manual corrections, mappings, status, and review with a new parse of its original PDF. Old rows and audit references remain retained. The action is limited to draft PDFs with supported extraction errors and never changes submitted invoices. Opening a page does not reparse or modify an existing draft automatically.

No MySQL migration or new frontend configuration is required.
