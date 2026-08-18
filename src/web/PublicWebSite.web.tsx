import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import appIcon from "../../assets/fantasy-futsal-big-icon.png";
import splashImage from "../../assets/fantasy-futsal-splash.png";
import { LanguageSwitcher } from "../components/common/LanguageSwitcher";
import { useI18n } from "../i18n/I18nProvider";
import type { LanguageCode } from "../i18n/translations";
import { getLegalContent, type LegalKind } from "../legal/legalContent";
import { colors, radii, spacing, typography } from "../theme/tokens";
import {
  getCurrentWebPathname,
  getPublicWebRoute,
  NOT_FOUND_PUBLIC_WEB_PATH,
  PUBLIC_SITE_DOMAIN,
  PUBLIC_SITE_NAME,
  PUBLIC_SITE_SUPPORT_EMAIL,
  type PublicWebPath,
  type PublicWebRoute,
} from "./publicSiteConfig";

type PublicCopy = {
  nav: Record<PublicWebPath, string>;
  landing: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    statusLabel: string;
    statusText: string;
    cardsTitle: string;
    cardsDescription: string;
    cards: Array<{ path: PublicWebPath; title: string; description: string }>;
  };
  legal: Record<
    LegalKind,
    { eyebrow: string; title: string; description: string }
  >;
  support: {
    eyebrow: string;
    title: string;
    description: string;
    emailLabel: string;
    emailDescription: string;
    responseTitle: string;
    responseDescription: string;
    includeTitle: string;
    includeItems: string[];
  };
  deletion: {
    eyebrow: string;
    title: string;
    description: string;
    inAppTitle: string;
    inAppSteps: string[];
    emailTitle: string;
    emailDescription: string;
    deletedTitle: string;
    deletedItems: string[];
  };
  notFound: { title: string; description: string; cta: string };
  footer: string;
  updatedAt: string;
};

const COPY: Record<LanguageCode, PublicCopy> = {
  en: {
    nav: {
      "/": "Home",
      "/privacy": "Privacy",
      "/terms": "Terms",
      "/rules": "Rules",
      "/support": "Support",
      "/account-deletion": "Account deletion",
    },
    landing: {
      eyebrow: "Fantasy futsal platform",
      title: "Fantasy Futsal",
      description:
        "Build a futsal fantasy squad, follow supported leagues, and compete through real match events.",
      primaryCta: "Read the rules",
      secondaryCta: "Contact support",
      statusLabel: "Current league",
      statusText:
        "Extra-liga is the first supported fantasy league. More leagues can be added on the same platform later.",
      cardsTitle: "Public information",
      cardsDescription:
        "Store-required documents and support pages for Fantasy Futsal.",
      cards: [
        {
          path: "/privacy",
          title: "Privacy Policy",
          description: "How account, fantasy, and notification data is used.",
        },
        {
          path: "/terms",
          title: "Terms and Conditions",
          description: "The terms for using Fantasy Futsal.",
        },
        {
          path: "/rules",
          title: "Game Rules",
          description: "Squads, deadlines, transfers, and scoring rules.",
        },
        {
          path: "/support",
          title: "Support",
          description: "How to contact us about the app or your account.",
        },
        {
          path: "/account-deletion",
          title: "Account deletion",
          description: "How to delete your account and app data.",
        },
      ],
    },
    legal: {
      terms: {
        eyebrow: "Legal",
        title: "Terms and Conditions",
        description: "The terms for using Fantasy Futsal.",
      },
      privacy: {
        eyebrow: "Legal",
        title: "Privacy Policy",
        description: "How Fantasy Futsal uses account and game data.",
      },
      rules: {
        eyebrow: "Game",
        title: "Game Rules",
        description: "Squad, transfer, deadline, and scoring rules.",
      },
    },
    support: {
      eyebrow: "Support",
      title: "Need help?",
      description:
        "For account, app, data, or fantasy scoring questions, contact the Fantasy Futsal support email.",
      emailLabel: "Support email",
      emailDescription:
        "We use this address for store listings and user support.",
      responseTitle: "Response time",
      responseDescription:
        "We aim to review support messages within a few business days. Urgent account deletion requests should include the email used in the app.",
      includeTitle: "What to include",
      includeItems: [
        "Your account email",
        "Your device platform: iOS, Android, or web",
        "A short description of the issue",
      ],
    },
    deletion: {
      eyebrow: "Account",
      title: "Account and data deletion",
      description:
        "You can delete your Fantasy Futsal account and app data from inside the app. If you cannot access the app, contact support from the email used for your account.",
      inAppTitle: "Delete from the app",
      inAppSteps: [
        "Open Fantasy Futsal and sign in.",
        "Go to Profile.",
        "Choose Delete account and confirm the action.",
      ],
      emailTitle: "Delete by support request",
      emailDescription:
        "If you cannot sign in, email support and include the account email. We may ask for verification before deletion.",
      deletedTitle: "Data removed",
      deletedItems: [
        "App profile and authentication link",
        "Fantasy team, squad picks, captains, transfers, and favourites",
        "Fantasy scores and push notification tokens stored by the app",
      ],
    },
    notFound: {
      title: "Page not found",
      description: "This public Fantasy Futsal page does not exist.",
      cta: "Go home",
    },
    footer: "Fantasy Futsal is an entertainment fantasy sports app.",
    updatedAt: "Updated",
  },
  uk: {
    nav: {
      "/": "Головна",
      "/privacy": "Приватність",
      "/terms": "Умови",
      "/rules": "Правила",
      "/support": "Підтримка",
      "/account-deletion": "Видалення акаунта",
    },
    landing: {
      eyebrow: "Fantasy-платформа для футзалу",
      title: "Fantasy Futsal",
      description:
        "Збирайте fantasy-склад із футзалістів, стежте за підтримуваними лігами та змагайтесь за очки з реальних матчів.",
      primaryCta: "Правила гри",
      secondaryCta: "Підтримка",
      statusLabel: "Поточна ліга",
      statusText:
        "Екстра-ліга — перша fantasy-ліга на платформі. Пізніше можна буде додавати інші ліги.",
      cardsTitle: "Публічна інформація",
      cardsDescription:
        "Документи й сторінки підтримки, потрібні для Fantasy Futsal і магазинів застосунків.",
      cards: [
        {
          path: "/privacy",
          title: "Політика конфіденційності",
          description:
            "Як використовуються акаунт, fantasy-дані та сповіщення.",
        },
        {
          path: "/terms",
          title: "Умови використання",
          description: "Умови користування Fantasy Futsal.",
        },
        {
          path: "/rules",
          title: "Правила гри",
          description: "Склади, дедлайни, трансфери та нарахування очок.",
        },
        {
          path: "/support",
          title: "Підтримка",
          description: "Як звʼязатися з нами щодо застосунку або акаунта.",
        },
        {
          path: "/account-deletion",
          title: "Видалення акаунта",
          description: "Як видалити акаунт і дані застосунку.",
        },
      ],
    },
    legal: {
      terms: {
        eyebrow: "Документи",
        title: "Умови використання",
        description: "Умови користування Fantasy Futsal.",
      },
      privacy: {
        eyebrow: "Документи",
        title: "Політика конфіденційності",
        description: "Як Fantasy Futsal використовує акаунт і дані гри.",
      },
      rules: {
        eyebrow: "Гра",
        title: "Правила гри",
        description:
          "Правила складу, трансферів, дедлайнів і нарахування очок.",
      },
    },
    support: {
      eyebrow: "Підтримка",
      title: "Потрібна допомога?",
      description:
        "З питань акаунта, застосунку, даних або fantasy-очок напишіть на email підтримки Fantasy Futsal.",
      emailLabel: "Email підтримки",
      emailDescription:
        "Цю адресу можна використовувати в сторінках магазинів застосунків і для звернень користувачів.",
      responseTitle: "Час відповіді",
      responseDescription:
        "Ми намагаємося переглядати звернення протягом кількох робочих днів. Для термінового видалення акаунта вкажіть email, з яким ви входили в застосунок.",
      includeTitle: "Що вказати",
      includeItems: [
        "Email вашого акаунта",
        "Платформу: iOS, Android або web",
        "Короткий опис питання",
      ],
    },
    deletion: {
      eyebrow: "Акаунт",
      title: "Видалення акаунта й даних",
      description:
        "Ви можете видалити акаунт Fantasy Futsal і дані застосунку всередині застосунку. Якщо доступу до застосунку немає, напишіть у підтримку з email, який використовувався для акаунта.",
      inAppTitle: "Видалення в застосунку",
      inAppSteps: [
        "Відкрийте Fantasy Futsal і увійдіть в акаунт.",
        "Перейдіть у Профіль.",
        "Оберіть видалення акаунта й підтвердьте дію.",
      ],
      emailTitle: "Видалення через підтримку",
      emailDescription:
        "Якщо ви не можете увійти, напишіть у підтримку й вкажіть email акаунта. Перед видаленням ми можемо попросити підтвердження.",
      deletedTitle: "Що видаляється",
      deletedItems: [
        "Профіль застосунку та звʼязок з авторизацією",
        "Fantasy-команда, склад, капітани, трансфери й обрані гравці",
        "Fantasy-очки та push-токени, які зберігає застосунок",
      ],
    },
    notFound: {
      title: "Сторінку не знайдено",
      description: "Такої публічної сторінки Fantasy Futsal немає.",
      cta: "На головну",
    },
    footer: "Fantasy Futsal — розважальний fantasy-застосунок для спорту.",
    updatedAt: "Оновлено",
  },
};

function getTitleForRoute(copy: PublicCopy, route: PublicWebRoute) {
  if (route === "/") return PUBLIC_SITE_NAME;
  if (route === "/privacy")
    return `${copy.legal.privacy.title} | ${PUBLIC_SITE_NAME}`;
  if (route === "/terms")
    return `${copy.legal.terms.title} | ${PUBLIC_SITE_NAME}`;
  if (route === "/rules")
    return `${copy.legal.rules.title} | ${PUBLIC_SITE_NAME}`;
  if (route === "/support")
    return `${copy.support.title} | ${PUBLIC_SITE_NAME}`;
  if (route === "/account-deletion") {
    return `${copy.deletion.title} | ${PUBLIC_SITE_NAME}`;
  }

  return `${copy.notFound.title} | ${PUBLIC_SITE_NAME}`;
}

export function PublicWebSite() {
  const { language } = useI18n();
  const [route, setRoute] = useState<PublicWebRoute>(() => getPublicWebRoute());
  const copy = COPY[language];

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handlePopState = () => setRoute(getPublicWebRoute());
    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.title = getTitleForRoute(copy, route);
    document.documentElement.lang = language;
    document.body.style.backgroundColor = colors.background;
  }, [copy, language, route]);

  const navigate = (nextPath: PublicWebPath) => {
    if (typeof window !== "undefined") {
      const currentPath = getCurrentWebPathname();
      if (currentPath !== nextPath) {
        window.history.pushState(null, "", nextPath);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    setRoute(getPublicWebRoute(nextPath));
  };

  const openMail = () => {
    void Linking.openURL(`mailto:${PUBLIC_SITE_SUPPORT_EMAIL}`);
  };

  return (
    <ScrollView
      contentContainerStyle={webStyles.pageContent}
      style={webStyles.page}
    >
      <View style={webStyles.header}>
        <Pressable
          accessibilityRole="link"
          onPress={() => navigate("/")}
          style={webStyles.brand}
        >
          <Image source={appIcon} style={webStyles.brandIcon} />
          <View>
            <Text style={webStyles.brandTitle}>{PUBLIC_SITE_NAME}</Text>
            <Text style={webStyles.brandSubtitle}>fantasyfutsal.app</Text>
          </View>
        </Pressable>

        <View style={webStyles.headerActions}>
          <View style={webStyles.nav}>
            {(["/privacy", "/terms", "/rules", "/support"] as const).map(
              (path) => (
                <Pressable
                  accessibilityRole="link"
                  key={path}
                  onPress={() => navigate(path)}
                  style={webStyles.navLink}
                >
                  <Text
                    style={[
                      webStyles.navLinkText,
                      route === path ? webStyles.navLinkTextActive : null,
                    ]}
                  >
                    {copy.nav[path]}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
          <LanguageSwitcher variant="app" />
        </View>
      </View>

      {route === "/" ? (
        <LandingPage copy={copy} navigate={navigate} />
      ) : route === "/privacy" ? (
        <LegalPage copy={copy} kind="privacy" language={language} />
      ) : route === "/terms" ? (
        <LegalPage copy={copy} kind="terms" language={language} />
      ) : route === "/rules" ? (
        <LegalPage copy={copy} kind="rules" language={language} />
      ) : route === "/support" ? (
        <SupportPage copy={copy} openMail={openMail} />
      ) : route === "/account-deletion" ? (
        <AccountDeletionPage copy={copy} openMail={openMail} />
      ) : route === NOT_FOUND_PUBLIC_WEB_PATH ? (
        <NotFoundPage copy={copy} navigate={navigate} />
      ) : null}

      <Footer copy={copy} navigate={navigate} />
    </ScrollView>
  );
}

function LandingPage({
  copy,
  navigate,
}: {
  copy: PublicCopy;
  navigate: (path: PublicWebPath) => void;
}) {
  return (
    <View style={webStyles.main}>
      <View style={webStyles.hero}>
        <View style={webStyles.heroCopy}>
          <Text style={webStyles.eyebrow}>{copy.landing.eyebrow}</Text>
          <Text style={webStyles.heroTitle}>{copy.landing.title}</Text>
          <Text style={webStyles.heroDescription}>
            {copy.landing.description}
          </Text>

          <View style={webStyles.ctaRow}>
            <Pressable
              accessibilityRole="link"
              onPress={() => navigate("/rules")}
              style={webStyles.primaryButton}
            >
              <Text style={webStyles.primaryButtonText}>
                {copy.landing.primaryCta}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              onPress={() => navigate("/support")}
              style={webStyles.secondaryButton}
            >
              <Text style={webStyles.secondaryButtonText}>
                {copy.landing.secondaryCta}
              </Text>
            </Pressable>
          </View>
        </View>

        <ImageBackground
          imageStyle={webStyles.heroArtImage}
          resizeMode="cover"
          source={splashImage}
          style={webStyles.heroArt}
        >
          <View style={webStyles.heroArtOverlay}>
            <Image source={appIcon} style={webStyles.heroIcon} />
          </View>
        </ImageBackground>
      </View>

      <View style={webStyles.statusCard}>
        <Text style={webStyles.statusLabel}>{copy.landing.statusLabel}</Text>
        <Text style={webStyles.statusText}>{copy.landing.statusText}</Text>
      </View>

      <View style={webStyles.sectionHeader}>
        <Text style={webStyles.sectionTitle}>{copy.landing.cardsTitle}</Text>
        <Text style={webStyles.sectionDescription}>
          {copy.landing.cardsDescription}
        </Text>
      </View>

      <View style={webStyles.cardGrid}>
        {copy.landing.cards.map((card) => (
          <Pressable
            accessibilityRole="link"
            key={card.path}
            onPress={() => navigate(card.path)}
            style={webStyles.infoCard}
          >
            <Text style={webStyles.infoCardTitle}>{card.title}</Text>
            <Text style={webStyles.infoCardText}>{card.description}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function LegalPage({
  copy,
  kind,
  language,
}: {
  copy: PublicCopy;
  kind: LegalKind;
  language: LanguageCode;
}) {
  const legalContent = useMemo(
    () => getLegalContent(language, kind),
    [kind, language],
  );
  const pageCopy = copy.legal[kind];

  return (
    <ArticleShell
      description={pageCopy.description}
      eyebrow={pageCopy.eyebrow}
      title={pageCopy.title}
    >
      <Text style={webStyles.updatedAt}>
        {copy.updatedAt}: {legalContent.updatedAt}
      </Text>
      {legalContent.sections.map((section) => (
        <View key={section.title} style={webStyles.articleSection}>
          <Text style={webStyles.articleSectionTitle}>{section.title}</Text>
          {section.body.map((paragraph) => (
            <Text key={paragraph} style={webStyles.articleText}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </ArticleShell>
  );
}

function SupportPage({
  copy,
  openMail,
}: {
  copy: PublicCopy;
  openMail: () => void;
}) {
  return (
    <ArticleShell
      description={copy.support.description}
      eyebrow={copy.support.eyebrow}
      title={copy.support.title}
    >
      <View style={webStyles.callout}>
        <Text style={webStyles.calloutLabel}>{copy.support.emailLabel}</Text>
        <Pressable accessibilityRole="link" onPress={openMail}>
          <Text style={webStyles.emailText}>{PUBLIC_SITE_SUPPORT_EMAIL}</Text>
        </Pressable>
        <Text style={webStyles.calloutText}>
          {copy.support.emailDescription}
        </Text>
      </View>

      <View style={webStyles.articleSection}>
        <Text style={webStyles.articleSectionTitle}>
          {copy.support.responseTitle}
        </Text>
        <Text style={webStyles.articleText}>
          {copy.support.responseDescription}
        </Text>
      </View>

      <View style={webStyles.articleSection}>
        <Text style={webStyles.articleSectionTitle}>
          {copy.support.includeTitle}
        </Text>
        {copy.support.includeItems.map((item) => (
          <Text key={item} style={webStyles.listItem}>
            {item}
          </Text>
        ))}
      </View>
    </ArticleShell>
  );
}

function AccountDeletionPage({
  copy,
  openMail,
}: {
  copy: PublicCopy;
  openMail: () => void;
}) {
  return (
    <ArticleShell
      description={copy.deletion.description}
      eyebrow={copy.deletion.eyebrow}
      title={copy.deletion.title}
    >
      <View style={webStyles.articleSection}>
        <Text style={webStyles.articleSectionTitle}>
          {copy.deletion.inAppTitle}
        </Text>
        {copy.deletion.inAppSteps.map((item, index) => (
          <Text key={item} style={webStyles.listItem}>
            {index + 1}. {item}
          </Text>
        ))}
      </View>

      <View style={webStyles.callout}>
        <Text style={webStyles.calloutLabel}>{copy.deletion.emailTitle}</Text>
        <Text style={webStyles.calloutText}>
          {copy.deletion.emailDescription}
        </Text>
        <Pressable accessibilityRole="link" onPress={openMail}>
          <Text style={webStyles.emailText}>{PUBLIC_SITE_SUPPORT_EMAIL}</Text>
        </Pressable>
      </View>

      <View style={webStyles.articleSection}>
        <Text style={webStyles.articleSectionTitle}>
          {copy.deletion.deletedTitle}
        </Text>
        {copy.deletion.deletedItems.map((item) => (
          <Text key={item} style={webStyles.listItem}>
            {item}
          </Text>
        ))}
      </View>
    </ArticleShell>
  );
}

function NotFoundPage({
  copy,
  navigate,
}: {
  copy: PublicCopy;
  navigate: (path: PublicWebPath) => void;
}) {
  return (
    <ArticleShell
      description={copy.notFound.description}
      eyebrow="404"
      title={copy.notFound.title}
    >
      <Pressable onPress={() => navigate("/")} style={webStyles.primaryButton}>
        <Text style={webStyles.primaryButtonText}>{copy.notFound.cta}</Text>
      </Pressable>
    </ArticleShell>
  );
}

function ArticleShell({
  children,
  description,
  eyebrow,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <View style={webStyles.articleShell}>
      <View style={webStyles.articleHero}>
        <Text style={webStyles.eyebrow}>{eyebrow}</Text>
        <Text style={webStyles.articleTitle}>{title}</Text>
        <Text style={webStyles.articleDescription}>{description}</Text>
      </View>
      <View style={webStyles.articleCard}>{children}</View>
    </View>
  );
}

function Footer({
  copy,
  navigate,
}: {
  copy: PublicCopy;
  navigate: (path: PublicWebPath) => void;
}) {
  return (
    <View style={webStyles.footer}>
      <Text style={webStyles.footerText}>{copy.footer}</Text>
      <Text style={webStyles.footerText}>{PUBLIC_SITE_DOMAIN}</Text>
      <View style={webStyles.footerLinks}>
        {(
          [
            "/privacy",
            "/terms",
            "/rules",
            "/support",
            "/account-deletion",
          ] as const
        ).map((path) => (
          <Pressable
            accessibilityRole="link"
            key={path}
            onPress={() => navigate(path)}
          >
            <Text style={webStyles.footerLinkText}>{copy.nav[path]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const webStyles = StyleSheet.create({
  page: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.background,
  },
  pageContent: {
    flexGrow: 1,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  header: {
    width: "100%",
    maxWidth: 1120,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.lg,
  },
  brandTitle: {
    color: colors.text.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.lg,
  },
  brandSubtitle: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.sm,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  navLink: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  navLinkText: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.sm,
  },
  navLinkTextActive: {
    color: colors.app.primary,
  },
  main: {
    width: "100%",
    maxWidth: 1120,
    gap: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  hero: {
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.xl,
  },
  heroCopy: {
    flex: 1,
    minWidth: 280,
    justifyContent: "center",
    gap: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  eyebrow: {
    color: colors.app.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sm,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: colors.text.primary,
    fontSize: 48,
    fontWeight: typography.weight.black,
    lineHeight: 54,
  },
  heroDescription: {
    maxWidth: 560,
    color: colors.text.secondary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.medium,
    lineHeight: 26,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  primaryButton: {
    minHeight: 48,
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    backgroundColor: colors.app.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.size.base,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.base,
  },
  secondaryButton: {
    minHeight: 48,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.base,
  },
  heroArt: {
    flex: 1,
    minWidth: 280,
    minHeight: 420,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.app.primaryDark,
  },
  heroArtImage: {
    borderRadius: radii.lg,
  },
  heroArtOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(12, 6, 42, 0.28)",
  },
  heroIcon: {
    width: 148,
    height: 148,
    borderRadius: 34,
  },
  statusCard: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  statusLabel: {
    color: colors.app.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sm,
    textTransform: "uppercase",
  },
  statusText: {
    color: colors.text.secondary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.base,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.xxl,
  },
  sectionDescription: {
    color: colors.text.secondary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.base,
  },
  cardGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  infoCard: {
    minWidth: 220,
    flexGrow: 1,
    flexBasis: 220,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  infoCardTitle: {
    color: colors.text.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.lg,
  },
  infoCardText: {
    color: colors.text.secondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.sm,
  },
  articleShell: {
    width: "100%",
    maxWidth: 860,
    gap: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  articleHero: {
    gap: spacing.sm,
  },
  articleTitle: {
    color: colors.text.primary,
    fontSize: 38,
    fontWeight: typography.weight.black,
    lineHeight: 44,
  },
  articleDescription: {
    color: colors.text.secondary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.medium,
    lineHeight: 26,
  },
  articleCard: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  updatedAt: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.sm,
  },
  articleSection: {
    gap: spacing.sm,
  },
  articleSectionTitle: {
    color: colors.text.primary,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
    lineHeight: 26,
  },
  articleText: {
    color: colors.text.secondary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    lineHeight: 23,
  },
  listItem: {
    color: colors.text.secondary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    lineHeight: 24,
  },
  callout: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.lg,
    backgroundColor: colors.app.primarySoft,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  calloutLabel: {
    color: colors.app.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sm,
    textTransform: "uppercase",
  },
  calloutText: {
    color: colors.text.secondary,
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.base,
  },
  emailText: {
    color: colors.app.primary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.lg,
  },
  footer: {
    width: "100%",
    maxWidth: 1120,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    gap: spacing.sm,
    marginTop: spacing.xxxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  footerText: {
    color: colors.text.muted,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.sm,
  },
  footerLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  footerLinkText: {
    color: colors.app.primary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.black,
    lineHeight: typography.lineHeight.sm,
  },
});
