export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "CRPE ❤️",
  description:
    "Plateforme de révision CRPE basée sur la courbe de l’oubli d’Ebbinghaus.",
  navItems: [
    { label: "Accueil", href: "/dashboard" },
    { label: "QCM", href: "/dashboard/quizzes" },
    { label: "Statistiques", href: "/stats" },
  ],
  navMenuItems: [
    { label: "Accueil", href: "/dashboard" },
    { label: "Statistiques", href: "/stats" },
  ],
  links: {
    github: "https://github.com/heroui-inc/heroui",
    twitter: "https://twitter.com/hero_ui",
    docs: "https://heroui.com",
    discord: "https://discord.gg/9b6yyZKmH4",
    sponsor: "https://patreon.com/jrgarciadev",
  },
};
