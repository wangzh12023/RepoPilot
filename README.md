# RepoPilot

**Understand any GitHub repository before you clone it.**

RepoPilot is an AI-powered GitHub repository learning assistant that helps developers understand unfamiliar codebases, inspect architecture, follow a practical learning path, and identify safe contribution entry points.

<p align="center">
  <a href="#demo">Demo</a> ·
  <a href="#why-repopilot">Why RepoPilot</a> ·
  <a href="#features">Features</a> ·
  <a href="#how-it-works">How It Works</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#environment-variables">Environment Variables</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#try-it-with">Try It With</a> ·
  <a href="#roadmap">Roadmap</a> ·
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/wangzh12023/RepoPilot?style=social" alt="GitHub stars" />
  <img src="https://img.shields.io/github/forks/wangzh12023/RepoPilot?style=social" alt="GitHub forks" />
  <img src="https://img.shields.io/github/license/wangzh12023/RepoPilot" alt="License" />
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-149eca" alt="React 19" />
  <img src="https://img.shields.io/badge/AI-Repo%20Understanding-2563eb" alt="AI Repo Understanding" />
</p>

## Demo

Paste a GitHub repository URL. RepoPilot turns it into an interactive architecture map, grounded chat workspace, learning path, and contribution guide.

<video src="./public/repopilot-demo.mp4" controls width="100%"></video>

If the embedded player does not render in your GitHub client, open the file directly: [public/repopilot-demo.mp4](./public/repopilot-demo.mp4).

## Why RepoPilot

Open-source projects are powerful, but understanding a new repository is still slow.

Before making a contribution, developers often need to answer:

- What does this project actually do?
- Where is the core logic?
- How are the modules connected?
- Which files should I read first?
- What issues are suitable for beginners?
- How do I start contributing without getting lost?

RepoPilot is designed to shorten the path from **"I found a repo"** to **"I know where to start."**

## Features

### Repository Overview

Get a high-level summary of the repository, including its purpose, main modules, stack hints, and project structure.

### Architecture Map

Visualize how key folders, files, and modules connect so you can build a mental model of the codebase faster.

### Grounded AI Chat

Ask repository-specific questions and get contextual answers grounded in README content, dependency manifests, docs, tests, and issue signals.

### Learning Path

Follow an ordered onboarding path that helps new contributors move from overview to core implementation and then to safe contribution slices.

### Contribution Tasks

Surface starter issues or synthesized contribution briefs with relevant files, difficulty level, and the safest first step.

### Developer-Focused Interface

Explore repository context through a modern dashboard built for codebase navigation, architecture inspection, and contributor onboarding.

## How It Works

```mermaid
flowchart TD
    A[Paste GitHub Repository URL] --> B[Fetch Repository Metadata]
    B --> C[Analyze README, tree, docs, tests, and issues]
    C --> D[Generate Repository Understanding]
    D --> E[Architecture Map]
    D --> F[Grounded AI Chat]
    D --> G[Learning Path]
    D --> H[Contribution Tasks]
```

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/wangzh12023/RepoPilot.git
cd RepoPilot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

The repository already includes a committed `.env.example` with no sensitive values. Use it as the reference template for local setup.

Edit `.env.local`:

```bash
REPO_ANALYSIS_MODE=auto
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_API_KEY=your_deepseek_api_key
# Strongly recommended for live analysis after anonymous GitHub rate limits are exhausted
GITHUB_TOKEN=your_github_token
```

### 4. Start the development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Usage

1. Start the app locally.
2. Paste a full GitHub repository URL into the landing page input.
3. Wait for RepoPilot to analyze the repository context.
4. Explore the overview, architecture map, learning path, and contribution tasks.
5. Use the chat panel to ask repository-specific questions grounded in the analyzed files and issue context.

## Environment Variables

RepoPilot uses `.env.local` for local configuration. Start from `.env.example`, which is committed to this repository as a safe reference.

| Variable | Required | Description |
| --- | --- | --- |
| `REPO_ANALYSIS_MODE` | Yes | Controls how repository analysis runs. The default is `auto`. |
| `DEEPSEEK_BASE_URL` | Yes | Base URL for the DeepSeek API endpoint. |
| `DEEPSEEK_MODEL` | Yes | Model name used for repository analysis and chat. |
| `DEEPSEEK_API_KEY` | Yes | Your DeepSeek API key. |
| `GITHUB_TOKEN` | Recommended | Helps avoid anonymous GitHub API rate limits during live repository analysis. |

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI, shadcn-style components
- **Agent UI**: assistant-ui
- **Graph Visualization**: XYFlow
- **State Management**: Zustand
- **LLM Provider**: DeepSeek API
- **Repository Data**: GitHub API

## Try It With

- `https://github.com/vercel/next.js`
- `https://github.com/facebook/react`
- `https://github.com/langchain-ai/langchain`
- `https://github.com/shadcn-ui/ui`

## Roadmap

- [x] GitHub repository URL input
- [x] Repository structure analysis
- [x] AI-powered repository summary
- [x] Interactive dashboard workspace
- [x] Grounded assistant chat
- [x] Architecture visualization
- [x] Learning path generation
- [x] Contribution task suggestions
- [ ] File-level explanation with deeper code references
- [ ] Function-level dependency tracing
- [ ] Better issue recommendation ranking for first-time contributors
- [ ] Local repository indexing
- [ ] Private repository support
- [ ] Multi-model provider support
- [ ] VS Code extension
- [ ] Hosted demo

## Contributing

Contributions are welcome.

Good first areas to improve:

- Repository analysis prompts and grounding quality
- Support for more LLM providers
- Architecture graph layout and readability
- Demo examples and onboarding docs
- UI and UX for code exploration
- Test coverage and error handling

Typical workflow:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Open a pull request.

```bash
git checkout -b feature/your-feature-name
```

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).

## Star RepoPilot

If RepoPilot helps you understand open-source repositories faster, consider giving the project a star.
