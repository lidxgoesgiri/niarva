"use client";

import { createAuthClient } from "better-auth/react";

/** Browser-side Better Auth client. Requests go to the same origin. */
export const authClient = createAuthClient();
