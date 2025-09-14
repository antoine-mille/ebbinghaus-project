import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarBrand,
  NavbarItem,
} from "@heroui/navbar";
import { link as linkStyles } from "@heroui/theme";
import NextLink from "next/link";
import clsx from "clsx";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { LogoutIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";

export const Navbar = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <HeroUINavbar maxWidth="xl" position="sticky">
      <NavbarContent className="basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink
            className="flex justify-start items-center gap-1"
            href="/dashboard"
          >
            <p className="font-bold text-inherit">{siteConfig.name}</p>
          </NextLink>
        </NavbarBrand>
        <ul className="flex gap-4 justify-start ml-2">
          {siteConfig.navItems.map((item) => (
            <NavbarItem key={item.href}>
              <NextLink
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-primary data-[active=true]:font-medium text-sm"
                )}
                href={item.href}
              >
                {item.label}
              </NextLink>
            </NavbarItem>
          ))}
        </ul>
      </NavbarContent>

      <NavbarContent className="basis-auto" justify="end">
        <NavbarItem>
          <ThemeSwitch />
        </NavbarItem>
        {user ? (
          <NavbarItem>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                title="Se déconnecter"
                aria-label="Se déconnecter"
                className="inline-flex items-center gap-1 text-sm cursor-pointer text-default-600 hover:text-danger transition-colors"
              >
                <LogoutIcon />
              </button>
            </form>
          </NavbarItem>
        ) : null}
      </NavbarContent>
    </HeroUINavbar>
  );
};
