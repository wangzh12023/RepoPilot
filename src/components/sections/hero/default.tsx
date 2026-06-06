import { ArrowRightIcon } from "lucide-react";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

import Github from "../../logos/github";
import { Badge } from "../../ui/badge";
import Glow from "../../ui/glow";
import { LinkButton, type LinkButtonProps } from "../../ui/link-button";
import { Mockup, MockupFrame } from "../../ui/mockup";
import Screenshot from "../../ui/screenshot";
import { Section } from "../../ui/section";

interface HeroButtonProps extends Omit<LinkButtonProps, "children"> {
  text: string;
}

interface HeroProps {
  title?: string;
  subtitle?: ReactNode | false;
  description?: string;
  mockup?: ReactNode | false;
  badge?: ReactNode | false;
  actions?: ReactNode | false;
  buttons?: HeroButtonProps[] | false;
  className?: string;
}

const DEFAULT_HERO_BUTTONS: HeroButtonProps[] = [
  {
    href: "https://www.launchuicomponents.com/",
    text: "Get Started",
    variant: "default",
  },
  {
    href: "https://www.launchuicomponents.com/",
    text: "GitHub",
    variant: "glow",
    icon: <Github className="mr-2 size-4" />,
  },
];

const DEFAULT_HERO_BADGE = (
  <Badge variant="outline" className="animate-appear">
    <span className="text-muted-foreground">
      New version of Launch UI is out!
    </span>
    <a
      href="https://www.launchuicomponents.com/"
      className="flex items-center gap-1"
    >
      Get started
      <ArrowRightIcon className="size-3" />
    </a>
  </Badge>
);

const DEFAULT_HERO_MOCKUP = (
  <Screenshot
    srcLight="/placeholder-light.svg"
    srcDark="/placeholder-dark.svg"
    alt="Launch UI app screenshot"
    width={1248}
    height={765}
    className="w-full"
  />
);

export default function Hero({
  title = "Give your big idea the design it deserves",
  subtitle,
  description = "Professionally designed blocks and templates built with React, Shadcn/ui and Tailwind that will help your product stand out.",
  mockup = DEFAULT_HERO_MOCKUP,
  badge = DEFAULT_HERO_BADGE,
  actions,
  buttons = DEFAULT_HERO_BUTTONS,
  className,
}: HeroProps) {
  return (
    <Section
      className={cn(
        "fade-bottom overflow-hidden pb-0 pt-0 sm:pb-0 sm:pt-0 md:pb-0 md:pt-0",
        className,
      )}
    >
      <div className="max-w-container mx-auto flex flex-col gap-8 pt-2 sm:gap-16 sm:pt-4">
        <div className="flex flex-col items-center gap-4 text-center sm:gap-8">
          {badge !== false && badge}
          <div className="relative flex w-full justify-center">
            <Glow
              variant="top"
              className="animate-appear-zoom opacity-0 delay-1000"
              primaryClassName="h-[192px] w-[52%] scale-[2.05] opacity-20 sm:h-[360px] dark:from-violet-400/60 dark:to-transparent"
              secondaryClassName="h-[112px] w-[34%] scale-[1.55] opacity-20 sm:h-[208px] dark:from-fuchsia-400/35 dark:to-transparent"
            />
            <h1 className="animate-appear from-foreground to-foreground dark:to-muted-foreground relative z-10 inline-block max-w-6xl bg-linear-to-r bg-clip-text text-4xl leading-tight font-semibold text-balance text-transparent drop-shadow-2xl sm:text-6xl sm:leading-tight md:text-8xl md:leading-tight xl:max-w-[1200px]">
              {title}
            </h1>
          </div>
          {subtitle !== false && subtitle ? subtitle : null}
          <p className="text-md animate-appear text-muted-foreground relative z-10 max-w-[740px] font-medium text-balance opacity-0 delay-100 sm:text-xl">
            {description}
          </p>
          {actions !== false && actions ? (
            actions
          ) : buttons !== false && buttons.length > 0 ? (
            <div className="animate-appear relative z-10 flex justify-center gap-4 opacity-0 delay-300">
              {buttons.map((button) => (
                <LinkButton
                  key={`${button.href}-${button.text}`}
                  variant={button.variant || "default"}
                  size="lg"
                  href={button.href}
                  icon={button.icon}
                  iconRight={button.iconRight}
                >
                  {button.text}
                </LinkButton>
              ))}
            </div>
          ) : null}
          {mockup !== false && (
            <div className="relative w-full pt-4 sm:pt-6">
              <MockupFrame
                className="animate-appear opacity-0 delay-700"
                size="small"
              >
                <Mockup
                  type="responsive"
                  className="bg-background/90 w-full rounded-xl border-0"
                >
                  {mockup}
                </Mockup>
              </MockupFrame>
              <Glow
                variant="top"
                className="animate-appear-zoom opacity-0 delay-1000"
              />
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
