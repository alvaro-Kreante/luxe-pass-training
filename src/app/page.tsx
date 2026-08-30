import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * Índice de las pantallas implementadas. Provisional: lo sustituye el Home del
 * área de miembro (App shell, patrón 3) cuando se implemente el Epic 2.
 */
const SCREENS = [
  {
    href: "/signup",
    title: "Create account",
    artboard: "Main.dc.html · Terms.dc.html",
    detail: "Email, contraseña y aceptación de términos con fecha y versión",
  },
  {
    href: "/verify-email",
    title: "Check your inbox",
    artboard: "Verification.dc.html",
    detail: "Verificación de email con reenvío en cuenta atrás",
  },
  {
    href: "/onboarding/basics",
    title: "A bit about you",
    artboard: "ProfileBasic.dc.html",
    detail: "Paso 1 de 3 — foto, nombre, teléfono y fecha de nacimiento",
  },
  {
    href: "/onboarding/personal",
    title: "Your interests",
    artboard: "ProfilePersonal.dc.html",
    detail: "Paso 2 de 3 — intereses, residencia y ciudades de viaje",
  },
  {
    href: "/onboarding/professional",
    title: "Professional details",
    artboard: "ProfileProfessional.dc.html",
    detail: "Paso 3 de 3 — cargo, industria y empresa",
  },
  {
    href: "/welcome",
    title: "Welcome to En Soleil",
    artboard: "Welcome.dc.html",
    detail: "Confirmación con enlaces de descarga de la app",
  },
  {
    href: "/login",
    title: "Welcome back",
    artboard: "Login.dc.html",
    detail: "Acceso con remember me y bloqueo tras 5 intentos fallidos",
  },
  {
    href: "/forgot-password",
    title: "Reset your password",
    artboard: "ForgotPassword.dc.html",
    detail: "Envío del enlace de restablecimiento y su acuse",
  },
];

export default function Home() {
  return (
    <main className="surface-blush flex min-h-screen flex-col items-center px-6 py-16">
      <div className="w-full max-w-[640px]">
        <Image
          src="/logo.png"
          alt="En Soleil"
          width={170}
          height={179}
          priority
          className="mb-7 w-[72px]"
        />
        <Eyebrow className="mb-2">Epic 1 · Stories 1.1 y 1.2</Eyebrow>
        <h1 className="mb-2 text-[34px] text-fg">Onboarding &amp; Authentication</h1>
        <p className="m-0 mb-8 text-sm leading-normal text-fg-muted">
          Ocho pantallas implementadas desde los artboards de la Fase 1.
          Empieza en <strong className="font-bold text-fg">Create account</strong> para
          recorrer el alta, o en <strong className="font-bold text-fg">Welcome back</strong> para
          el acceso.
        </p>

        <div className="flex flex-col gap-3">
          {SCREENS.map((screen) => (
            <Link key={screen.href} href={screen.href} className="hover:text-fg">
              <Card
                variant="content"
                interactive
                className="flex items-center gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-display text-[19px] text-fg">
                    {screen.title}
                  </p>
                  <p className="m-0 mt-0.5 text-[12.5px] text-fg-subtle">
                    {screen.detail}
                  </p>
                  <p className="m-0 mt-1.5 text-[11.5px] text-fg-subtle">
                    {screen.artboard}
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  strokeWidth={1.8}
                  className="shrink-0 text-fg-subtle"
                />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
