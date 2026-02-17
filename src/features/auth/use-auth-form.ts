"use client";

import { loginUser, registerUser } from "@/lib/api/auth";
import { storeSession } from "@/lib/auth/storage";
import { extractErrorMessage } from "@/lib/utils/error";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type AuthMode = "register" | "login";

interface AuthValues {
  email: string;
  password: string;
  rePassword: string;
}

export function useAuthForm(mode: AuthMode) {
  const router = useRouter();

  const [values, setValues] = useState<AuthValues>({
    email: "",
    password: "",
    rePassword: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateValue = (field: keyof AuthValues, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrorMessage(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === "register" && values.password !== values.rePassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response =
        mode === "register"
          ? await registerUser({
              email: values.email,
              password: values.password,
              rePassword: values.rePassword,
            })
          : await loginUser({
              email: values.email,
              password: values.password,
            });

      storeSession(response.token, response.user);
      router.replace("/dashboard");
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    values,
    updateValue,
    submit,
    isSubmitting,
    errorMessage,
  };
}
