"use client";

import { login } from "./actions";
import { Card, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import Link from "next/link";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const sp = useSearchParams();
  const error = sp.get("error") ?? undefined;
  const message = sp.get("message") ?? undefined;
  const next = sp.get("next") ?? undefined;

  const Schema = useMemo(
    () =>
      z.object({
        email: z.string().email("Email invalide"),
        password: z.string().min(6, "Au moins 6 caractères"),
      }),
    []
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  function validateField(name: "email" | "password", value: string) {
    const res = Schema.safeParse({ email, password, [name]: value });
    if (!res.success) {
      const first = res.error.issues.find((i) => i.path[0] === name);
      setErrors((e) => ({ ...e, [name]: first?.message }));
    } else {
      setErrors((e) => ({ ...e, [name]: undefined }));
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <CardBody className="grid gap-4">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold">Connexion</h1>
            <p className="text-default-500 text-sm">
              Accède à ton espace pour gérer tes révisions.
            </p>
          </div>

          {error ? (
            <div className="text-sm text-danger bg-danger-50 p-2 rounded">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="text-sm text-success bg-success-50 p-2 rounded">
              {message}
            </div>
          ) : null}

          <form action={login} className="grid gap-3">
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <Input
              name="email"
              type="email"
              label="Email"
              value={email}
              onValueChange={(v) => {
                setEmail(v);
                validateField("email", v);
              }}
              isRequired
              isInvalid={!!errors.email}
              errorMessage={errors.email}
            />
            <Input
              name="password"
              type="password"
              label="Mot de passe"
              value={password}
              onValueChange={(v) => {
                setPassword(v);
                validateField("password", v);
              }}
              isRequired
              isInvalid={!!errors.password}
              errorMessage={errors.password}
            />
            <Button
              color="primary"
              type="submit"
              className="w-full"
              isDisabled={!!errors.email || !!errors.password}
            >
              Se connecter
            </Button>
          </form>

          <p className="text-sm text-default-500">
            Pas de compte ?{" "}
            <Link href="/signup" className="text-primary">
              Créer un compte
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
