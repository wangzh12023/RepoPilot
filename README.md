# RepoPilot

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=6D5CFF&height=220&section=header&text=RepoPilot&fontSize=68&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Learn%20any%20GitHub%20repository%20before%20you%20open%20the%20code&descAlignY=58&descSize=18" width="100%" alt="RepoPilot banner" />

<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=24&pause=1000&color=8B7BFF&center=true&vCenter=true&width=900&lines=Paste+any+GitHub+repository.;Map+the+architecture+before+you+open+the+code.;Grounded+chat,+learning+paths,+and+starter+tasks." alt="RepoPilot typing intro" />
</a>

<br/>

<p>
  <b>AI workspace for understanding unfamiliar codebases</b>
</p>
<p>
  🧭 Architecture mapping • 🤖 Grounded repo chat • 🧩 Contributor onboarding • 🚀 Starter task discovery
</p>

<p>
  <a href="https://github.com/wangzh12023/RepoPilot">
    <img src="https://img.shields.io/github/stars/wangzh12023/RepoPilot?style=for-the-badge&logo=github&logoColor=white&label=Star+RepoPilot&color=6D5CFF&labelColor=101010" alt="Star RepoPilot" />
  </a>
  <a href="https://github.com/wangzh12023/RepoPilot">
    <img src="https://img.shields.io/github/forks/wangzh12023/RepoPilot?style=for-the-badge&logo=github&logoColor=white&label=Fork&color=4F46E5&labelColor=101010" alt="Fork RepoPilot" />
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-111827?style=for-the-badge&logo=opensourceinitiative&logoColor=white" alt="MIT License" />
  </a>
</p>

<p>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-149eca?style=flat-square" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178c6?style=flat-square" alt="TypeScript" />
  <img src="https://img.shields.io/badge/DeepSeek-Live%20Analysis-4f46e5?style=flat-square" alt="DeepSeek" />
  <img src="https://img.shields.io/badge/GitHub-Repository%20Context-24292f?style=flat-square" alt="GitHub API" />
</p>

</div>

---

<p align="center">
  <a href="#-demo">Demo</a> ·
  <a href="#-product-preview">Product Preview</a> ·
  <a href="#-why-repopilot">Why RepoPilot</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-how-it-works">How It Works</a> ·
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-usage">Usage</a> ·
  <a href="#-environment-variables">Environment Variables</a> ·
  <a href="#-tech-stack">Tech Stack</a> ·
  <a href="#-roadmap">Roadmap</a> ·
  <a href="#-contributing">Contributing</a>
</p>

## 🎥 Demo

Paste a GitHub repository URL and RepoPilot turns it into an interactive architecture map, grounded chat workspace, learning path, and contribution guide.

<p align="center">
  <a href="https://github.com/wangzh12023/RepoPilot/raw/main/public/repopilot-demo.mp4">
    <img src="https://github.com/wangzh12023/RepoPilot/releases/download/readme-media-v1/landing-v2.png" width="100%" alt="RepoPilot demo preview" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/wangzh12023/RepoPilot/raw/main/public/repopilot-demo.mp4"><b>▶ Watch the demo video</b></a>
</p>

## 🖼️ Product Preview

<p align="center">
  <img src="https://github.com/wangzh12023/RepoPilot/releases/download/readme-media-v1/landing-v2.png" width="100%" alt="RepoPilot landing page" />
</p>

<table>
  <tr>
    <td width="50%">
      <img src="https://github.com/wangzh12023/RepoPilot/releases/download/readme-media-v1/dashboard-overview-v2.png" alt="RepoPilot dashboard overview" />
    </td>
    <td width="50%">
      <img src="https://github.com/wangzh12023/RepoPilot/releases/download/readme-media-v1/architecture.png" alt="RepoPilot architecture section" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="https://github.com/wangzh12023/RepoPilot/releases/download/readme-media-v1/chat.png" alt="RepoPilot grounded chat panel" />
    </td>
    <td width="50%">
      <img src="https://github.com/wangzh12023/RepoPilot/releases/download/readme-media-v1/sidebar.png" alt="RepoPilot sidebar and contribution tasks" />
    </td>
  </tr>
</table>

## ✨ Why RepoPilot

Open-source projects are powerful, but understanding a new repository is still slow.

Before making a contribution, developers often need to answer:

- What does this project actually do?
- Where is the core logic?
- How are the modules connected?
- Which files should I read first?
- What issues are suitable for beginners?
- How do I start contributing without getting lost?

RepoPilot shortens the path from **"I found a repo"** to **"I know where to start."**

## 🧠 Features

### 🗂️ Repository Overview

Get a high-level summary of the repository, including its purpose, main modules, stack hints, and structure.

### 🕸️ Architecture Map

Visualize how key folders, files, and modules connect so you can build a mental model faster.

### 🤖 Grounded AI Chat

Ask repository-specific questions and get answers grounded in README content, dependency manifests, docs, tests, and issue signals.

### 🪜 Learning Path

Follow an ordered onboarding path that moves from overview to core implementation and then to safe contribution slices.

### 🛠️ Contribution Tasks

Surface starter issues or synthesized contribution briefs with relevant files, difficulty level, and the safest first step.

### 🧑‍💻 Developer-Focused Workspace

Explore repository context through a dashboard built for architecture inspection, codebase navigation, and contributor onboarding.

## 🔄 How It Works

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

## 🚀 Quick Start

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

The repository includes a committed `.env.example` with no sensitive values. Use it as the reference template for local setup.

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

## 🐳 Docker Deployment

### Option 1. One-command Docker Compose

```bash
cp .env.example .env.local
docker compose up --build
# or, if your Docker installation still uses the legacy plugin:
docker-compose up --build
```

Open `http://localhost:3000`.

### Option 2. Plain Docker

```bash
cp .env.example .env.local
docker build -t repopilot .
docker run --rm -p 3000:3000 --env-file .env.local repopilot
```

Open `http://localhost:3000`.

## 🧪 Usage

1. Start the app locally.
2. Paste a full GitHub repository URL into the landing page input.
3. Wait for RepoPilot to analyze the repository context.
4. Explore the overview, architecture map, learning path, and contribution tasks.
5. Use the chat panel to ask repository-specific questions grounded in the analyzed files and issue context.

## 🔐 Environment Variables

RepoPilot uses `.env.local` for local configuration. Start from `.env.example`, which is committed to this repository as a safe reference.

| Variable | Required | Description |
| --- | --- | --- |
| `REPO_ANALYSIS_MODE` | Yes | Controls how repository analysis runs. The default is `auto`. |
| `DEEPSEEK_BASE_URL` | Yes | Base URL for the DeepSeek API endpoint. |
| `DEEPSEEK_MODEL` | Yes | Model name used for repository analysis and chat. |
| `DEEPSEEK_API_KEY` | Yes | Your DeepSeek API key. |
| `GITHUB_TOKEN` | Recommended | Helps avoid anonymous GitHub API rate limits during live repository analysis. |

## 🧱 Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI, shadcn-style components
- **Agent UI**: assistant-ui
- **Graph Visualization**: XYFlow
- **State Management**: Zustand
- **LLM Provider**: DeepSeek API
- **Repository Data**: GitHub API

## 🧭 Try It With

- `https://github.com/vercel/next.js`
- `https://github.com/facebook/react`
- `https://github.com/langchain-ai/langchain`
- `https://github.com/shadcn-ui/ui`

## 🗺️ Roadmap

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

## 🤝 Contributing

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

## 📄 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).

## ⭐ Star RepoPilot

If RepoPilot helps you understand open-source repositories faster, consider giving the project a star.
