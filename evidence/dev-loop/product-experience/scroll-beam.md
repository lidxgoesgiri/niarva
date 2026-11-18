# Scroll beam repair

The [first PE-07 pack](../../product-experience/PE-07-incomplete.json) exposed the repeated bright segments visible in its [pipeline screenshot](../../product-experience/scroll-beam-before.jpg). The highlighted SVG path used a non-scaling stroke on a path stretched vertically by the SVG view box. The repair keeps the highlight's normalized dash lengths in the SVG coordinate space and uses a single dash and gap.

The [same-objective Kane retest](../../product-experience/PE-07-scroll-observations.json) shows one continuous highlight after scrolling down and the shorter beam on return. Its sealed images retain the [early](../../product-experience/scroll-early.jpg), [later](../../product-experience/scroll-later.jpg), and [returned](../../product-experience/scroll-returned.jpg) positions. The broader objective remains BLOCKED because its structured extraction retained one position. Both runs retain their own build and pack identity.
