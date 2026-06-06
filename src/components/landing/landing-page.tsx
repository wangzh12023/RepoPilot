import {
  BotIcon,
  BoxesIcon,
  FileCode2Icon,
  GitPullRequestIcon,
  MapPinnedIcon,
  SparklesIcon,
} from "lucide-react";

import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { RepoUrlForm } from "@/components/landing/repo-url-form";
import Hero from "@/components/sections/hero/default";
import CTA from "@/components/sections/cta/default";
import { Badge } from "@/components/ui/badge";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Glow from "@/components/ui/glow";
import { Mockup, MockupFrame } from "@/components/ui/mockup";
import { Progress } from "@/components/ui/progress";
import { Section } from "@/components/ui/section";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { TypewriterText } from "@/components/ui/typewriter-text";
import { WarpBackground } from "@/components/ui/warp-background";
import {
  getRepoAnalysis,
  getSuggestedRepoTarget,
  SAMPLE_REPO_URL,
} from "@/lib/repo-analysis";

const demoAnalysis = getRepoAnalysis(SAMPLE_REPO_URL);
const demoTarget = getSuggestedRepoTarget(SAMPLE_REPO_URL);

const bentoItems = [
  {
    Icon: MapPinnedIcon,
    name: "Architecture map",
    description:
      "Translate directory structure, dependencies, and ownership into a guided visual graph.",
    href: "#product-demo",
    cta: "See the map",
    className: "lg:col-span-2 lg:min-h-[25rem]",
    previewClassName: "min-h-[17rem]",
    background: (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="grid gap-3 p-6">
          {demoAnalysis.modules.slice(0, 2).map((module) => (
            <Card key={module.id} className="bg-background/90 shadow-sm">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{module.title}</p>
                  <p className="break-words text-xs text-muted-foreground">
                    {module.path}
                  </p>
                </div>
                <Badge
                  variant={
                    module.importance === "Core" ? "default" : "secondary"
                  }
                >
                  {module.importance}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    ),
  },
  {
    Icon: BotIcon,
    name: "Grounded agent chat",
    description:
      "Answer questions with direct references to files, modules, tests, and issue threads.",
    href: "#product-demo",
    cta: "Preview chat",
    className: "",
    background: (
      <div className="pointer-events-none absolute inset-0 p-5">
        <Card className="h-full bg-background/90 shadow-sm">
          <CardHeader className="gap-2">
            <Badge variant="brand-secondary">Grounded reply</Badge>
            <CardTitle className="break-words text-sm leading-snug">
              Which file owns repository ingestion?
            </CardTitle>
            <CardDescription className="break-words text-xs leading-relaxed">
              `app/api/repo/analyze/route.ts` starts the scan, then hands off to
              `lib/github/fetch-repo-context.ts`.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    ),
  },
  {
    Icon: GitPullRequestIcon,
    name: "Starter issues",
    description:
      "Surface contribution tasks with difficulty, relevant files, and the safest first step.",
    href: "#cta",
    cta: "Browse tasks",
    className: "",
    background: (
      <div className="pointer-events-none absolute inset-0 grid gap-3 p-5">
        {demoAnalysis.issues.slice(0, 2).map((issue) => (
          <Card key={issue.id} className="bg-background/90 shadow-sm">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 break-words text-sm font-medium leading-snug">
                  {issue.id} {issue.title}
                </p>
                <Badge
                  variant={
                    issue.difficulty === "Starter" ? "default" : "secondary"
                  }
                >
                  {issue.difficulty}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{issue.module}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    ),
  },
  {
    Icon: FileCode2Icon,
    name: "Tests and docs in one view",
    description:
      "Keep README, docs, and test coverage visible while developers learn how the repo actually behaves.",
    href: "#signals",
    cta: "See signals",
    className: "",
    background: (
      <div className="pointer-events-none absolute inset-0 p-5">
        <Card className="bg-background/90 shadow-sm">
          <CardContent className="space-y-4 p-4">
            {demoAnalysis.metrics.slice(2).map((metric, index) => (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span>{metric.label}</span>
                  <span className="text-muted-foreground">{metric.value}</span>
                </div>
                <Progress value={index === 0 ? 82 : 64} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    ),
  },
  {
    Icon: BoxesIcon,
    name: "Module learning path",
    description:
      "Turn large repositories into an ordered onboarding sequence instead of a flat file tree.",
    href: "#product-demo",
    cta: "See the path",
    className: "",
    background: (
      <div className="pointer-events-none absolute inset-0 p-5">
        <Card className="h-full bg-background/90 shadow-sm">
          <CardContent className="space-y-3 p-4">
            {demoAnalysis.learningPath.slice(0, 3).map((step, index) => (
              <div key={step.id} className="flex items-start gap-3">
                <Badge variant="outline">{index + 1}</Badge>
                <div className="space-y-1">
                  <p className="break-words text-sm font-medium leading-snug">
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.duration}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    ),
  },
];

export function LandingPage() {
  return (
    <main id="top" className="relative flex flex-col overflow-x-hidden">
      <div className="absolute top-4 right-6 z-40 sm:top-6">
        <ThemeToggle />
      </div>
      <Hero
        className="pt-0"
        badge={
          <Badge variant="brand-secondary" className="animate-appear gap-1.5">
            <SparklesIcon className="size-3.5" />
            GitHub Repository Learning Assistant
          </Badge>
        }
        title="RepoPilot"
        subtitle={
          <TypewriterText
            text={"Paste any GitHub repository\nand learn the architecture before you open the code."}
            className="animate-appear from-foreground to-foreground dark:to-muted-foreground relative z-10 inline-block max-w-5xl whitespace-pre-line bg-linear-to-r bg-clip-text px-4 text-xl leading-tight font-semibold text-transparent opacity-0 delay-100 sm:px-0 sm:text-2xl md:text-3xl"
          />
        }
        description="An AI workspace that scans README, directory tree, dependencies, tests, docs, and issues, then turns the repository into an architecture map, grounded agent chat, and contributor-ready learning path."
        actions={<RepoUrlForm />}
        mockup={<DashboardPreview analysis={demoAnalysis} compact />}
      />

      <Section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <Badge variant="outline">Feature grid</Badge>
            <h2 className="text-3xl font-semibold sm:text-5xl">
              Everything a new contributor needs, without spelunking through the
              repo.
            </h2>
            <p className="text-muted-foreground text-lg">
              Each view is assembled from repository evidence, so onboarding
              stays grounded in the files and issues that actually matter.
            </p>
          </div>
          <BentoGrid className="mt-16 items-stretch">
            {bentoItems.map((item) => (
              <BentoCard key={item.name} {...item} />
            ))}
          </BentoGrid>
        </div>
      </Section>

      <Section id="signals" className="overflow-hidden">
        <div className="max-w-container mx-auto grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-5">
            <Badge variant="outline">Animated analysis backdrop</Badge>
            <h2 className="text-3xl font-semibold sm:text-5xl">
              Watch every repository signal converge into one grounded
              workspace.
            </h2>
            <p className="text-muted-foreground text-lg">
              README summaries, dependency choices, tests, docs, and open issues
              all stay visible while the assistant builds the module graph and
              contribution hints.
            </p>
            <div className="flex flex-wrap gap-2">
              {demoAnalysis.analysisSources.map((source) => (
                <Badge key={source.label} variant="outline">
                  {source.label}
                </Badge>
              ))}
            </div>
          </div>

          <WarpBackground className="rounded-3xl border-border/60 bg-background/70 p-4 md:p-6">
            <div className="grid gap-4 md:grid-cols-3">
              {demoAnalysis.analysisSources.slice(0, 3).map((source) => (
                <Card key={source.label} className="bg-background/95 shadow-sm">
                  <CardHeader className="gap-2">
                    <Badge variant="brand-secondary">{source.label}</Badge>
                    <CardTitle className="text-base">{source.detail}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
              {demoAnalysis.analysisSources.slice(3).map((source) => (
                <Card key={source.label} className="bg-background/95 shadow-sm">
                  <CardHeader className="gap-2">
                    <Badge variant="outline">{source.label}</Badge>
                    <CardDescription>{source.detail}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </WarpBackground>
        </div>
      </Section>

      <Section id="product-demo">
        <div className="max-w-container mx-auto grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-5">
            <Badge variant="outline">Product demo preview</Badge>
            <h2 className="text-3xl font-semibold sm:text-5xl">
              The dashboard turns repo sprawl into a single learning surface.
            </h2>
            <p className="text-muted-foreground text-lg">
              Review the project overview, architecture graph, module
              importance, workflow, code conventions, and starter issues side by
              side with a grounded chat panel.
            </p>
            <div className="grid gap-3">
              {demoAnalysis.workflow.slice(0, 3).map((item) => (
                <Card key={item} className="bg-muted/30">
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    {item}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="relative">
            <MockupFrame size="large" className="relative z-10">
              <Mockup
                type="responsive"
                className="w-full rounded-2xl bg-background/95"
              >
                <DashboardPreview analysis={demoAnalysis} />
              </Mockup>
            </MockupFrame>
            <Glow variant="center" />
          </div>
        </div>
      </Section>

      <CTA
        className="pb-24"
        title="Turn the next repository link into a guided onboarding workspace."
        buttons={[
          {
            href: demoTarget,
            text: "Launch Demo Workspace",
            variant: "default",
          },
          {
            href: "#top",
            text: "Paste Another Repo",
            variant: "secondary",
          },
        ]}
      />
    </main>
  );
}
