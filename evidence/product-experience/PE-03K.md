# Desktop keyboard verification

The completed PE-03K run records actual keyboard findings: the focused “Resume animations” control has a purple solid2px outline and its bounds remain inside the recorded viewport. Typed observations confirm visible focus, no sticky-header obstruction, and reachable primary action and boundary sandbox. The final screenshot was inspected and agrees with those observations.

[Run identity and sanitized observations](./PE-03K.json) bind this PASS to the recorded pre-integration build. The integrated PE-01 boundary regression is recorded separately. This desktop result does not prove mobile navigation, narrow widths, or browser zoom. The earlier placeholder extraction remains BLOCKED in the private chronology.

The [integrated regression](./PE-03K-integrated.json) also passed on build `-0Q19m_sHu5FEM9F0CQrt`, with 40 completed keyboard steps, actual findings and a reviewed final screenshot. “Resume animations” retains a visible purple focus ring inside the viewport. The pack records zero console errors and 20 first-party HTTP200 responses. The existing native build was reused; no source changed between the integrated boundary and keyboard runs.
