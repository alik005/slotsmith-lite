"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import { FormStatus } from "@/components/FormStatus";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required className="input" autoFocus />
      </div>
      <FormStatus state={state} />
      <button className="btn w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
