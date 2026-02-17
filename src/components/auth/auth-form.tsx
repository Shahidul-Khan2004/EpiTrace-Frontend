"use client";

import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthForm } from "@/features/auth/use-auth-form";
import Link from "next/link";

interface AuthFormProps {
  mode: "register" | "login";
}

export function AuthForm({ mode }: AuthFormProps) {
  const { values, updateValue, submit, isSubmitting, errorMessage } = useAuthForm(mode);

  return (
    <form className="space-y-6" onSubmit={submit}>
      {errorMessage ? <Alert message={errorMessage} tone="error" /> : null}

      <div className="space-y-5">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => updateValue("email", event.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={values.password}
          onChange={(event) => updateValue("password", event.target.value)}
          required
        />

        {mode === "register" ? (
          <Input
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            value={values.rePassword}
            onChange={(event) => updateValue("rePassword", event.target.value)}
            required
          />
        ) : null}
      </div>

      <Button className="w-full" loading={isSubmitting} type="submit">
        {mode === "register" ? "Create Account" : "Login"}
      </Button>

      <p className="pt-1 text-center text-sm text-slate-600">
        {mode === "register" ? "Already have an account?" : "Need an account?"} {" "}
        <Link
          href={mode === "register" ? "/login" : "/register"}
          className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4"
        >
          {mode === "register" ? "Login instead" : "Register here"}
        </Link>
      </p>
    </form>
  );
}
