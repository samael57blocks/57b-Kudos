# Skill Registry — 57b-kudos

Generated: 2026-06-23
Source: SDD Init phase
Version: 1

## Project Convention Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Web3-Architect-Agent persona, pnpm-only policy, GitFlow, env security rules |

## Available Skills

### branch-pr
| Field | Value |
|-------|-------|
| Description | Create Gentle AI pull requests with issue-first checks |
| Trigger | creating, opening, or preparing PRs for review |
| Source | `~/.config/opencode/skills/branch-pr/SKILL.md` |
| Compact Rules | — Every PR MUST link an approved issue |
| | — Every PR MUST have exactly one `type:*` label |
| | — Automated checks must pass before merge |
| | — Blank PRs without issue linkage will be blocked |

### chained-pr
| Field | Value |
|-------|-------|
| Description | Split oversized changes into chained PRs that protect review focus |
| Trigger | PRs over 400 lines, stacked PRs, review slices |
| Source | `~/.config/opencode/skills/chained-pr/SKILL.md` |
| Compact Rules | — Split PRs over 400 changed lines unless exception |
| | — One deliverable work unit per PR; tests/docs with the unit |
| | — State start, end, dependencies, and out-of-scope in every chained PR |
| | — Each child PR must include a dependency diagram marking the current PR |
| | — Do not mix chain strategies after user chooses |

### cognitive-doc-design
| Field | Value |
|-------|-------|
| Description | Design docs that reduce cognitive load |
| Trigger | writing guides, READMEs, RFCs, onboarding, architecture, or review-facing docs |
| Source | `~/.config/opencode/skills/cognitive-doc-design/SKILL.md` |
| Compact Rules | — Lead with the answer (decision/action first) |
| | — Progressive disclosure: happy path first, then details |
| | — Chunking: small sections, short lists |
| | — Recognition over recall: tables/checklists/templates over prose |
| | — Review empathy: design so intent is verifiable without reconstruction |

### comment-writer
| Field | Value |
|-------|-------|
| Description | Write warm, direct collaboration comments |
| Trigger | PR feedback, issue replies, reviews, Slack messages, GitHub comments |
| Source | `~/.config/opencode/skills/comment-writer/SKILL.md` |
| Compact Rules | — Start with the actionable point |
| | — Be warm and direct (thoughtful teammate, not corporate bot) |
| | — Keep to 1-3 short paragraphs or a tight bullet list |
| | — Explain why when asking for a change |
| | — Match thread language (use Rioplatense voseo in Spanish) |

### customize-opencode
| Field | Value |
|-------|-------|
| Description | Use ONLY when editing opencode's own configuration |
| Trigger | editing opencode.json, .opencode/*, ~/.config/opencode/* |
| Source | Built-in (from AGENTS.md system prompt instructions) |
| Compact Rules | — Only for opencode's own config, never user's application code |
| | — Covers agents, subagents, skills, plugins, MCP, permission rules |

### go-testing
| Field | Value |
|-------|-------|
| Description | Apply focused Go testing patterns |
| Trigger | Go tests, go test coverage, Bubbletea teatest, golden files |
| Source | `~/.config/opencode/skills/go-testing/SKILL.md` |
| Compact Rules | — Prefer table-driven tests with `t.Run(tt.name, ...)` |
| | — Test behavior and state transitions, not implementation trivia |
| | — Use `t.TempDir()` for filesystem tests |
| | — Keep integration tests skippable with `testing.Short()` |
| | — Golden files must be deterministic; update via `-update` path |

### issue-creation
| Field | Value |
|-------|-------|
| Description | Create Gentle AI issues with issue-first checks |
| Trigger | creating GitHub issues, bug reports, or feature requests |
| Source | `~/.config/opencode/skills/issue-creation/SKILL.md` |
| Compact Rules | — MUST use a template (bug report or feature request) |
| | — Every issue gets `status:needs-review` automatically |
| | — A maintainer MUST add `status:approved` before any PR |
| | — Questions go to Discussions, not issues |

### judgment-day
| Field | Value |
|-------|-------|
| Description | Run blind dual review, fix confirmed issues, then re-judge |
| Trigger | judgment day, dual review, adversarial review, juzgar |
| Source | `~/.config/opencode/skills/judgment-day/SKILL.md` |
| Compact Rules | — Launch two blind judges in parallel; never review code yourself |
| | — Wait for both judges before synthesis |
| | — Classify warnings as real only if normal use triggers them |
| | — Re-launch both judges after every fix iteration |
| | — Terminal states: APPROVED or ESCALATED |

### skill-creator
| Field | Value |
|-------|-------|
| Description | Create LLM-first skills with valid frontmatter |
| Trigger | new skills, agent instructions, documenting AI usage patterns |
| Source | `~/.config/opencode/skills/skill-creator/SKILL.md` |
| Compact Rules | — Create when pattern is repeated and AI needs guidance |
| | — Skill is a runtime instruction contract for LLM, not human docs |
| | — Target 180-450 tokens body, hard max 1000 |
| | — References must point to local files |
| | — Preserve trigger words in `description` |

### solana-dev
| Field | Value |
|-------|-------|
| Description | End-to-end Solana development playbook |
| Trigger | "build a Solana dapp", "write an Anchor program", "create a token" |
| Source | `~/.claude/skills/solana-dev/SKILL.md` |
| Compact Rules | — UI: framework-kit first (`@solana/client` + `@solana/react-hooks`) |
| | — Wallet Standard discovery/connect via framework-kit client |
| | — Programs: Anchor or Pinocchio |
| | — Client SDK: Codama codegen from IDL |
| | — Testing: LiteSVM (unit), Mollusk (program), Surfpool (integration) |

### work-unit-commits
| Field | Value |
|-------|-------|
| Description | Plan commits as reviewable work units |
| Trigger | implementation, commit splitting, chained PRs |
| Source | `~/.config/opencode/skills/work-unit-commits/SKILL.md` |
| Compact Rules | — Commit by work unit (deliverable behavior/fix/migration/docs) |
| | — Do not commit by file type |
| | — Keep tests with the code they verify |
| | — Keep docs with the user-visible change |
| | — A reviewer should understand why each commit exists from its diff |

## SDD Skills (managed separately)
- sdd-init, sdd-explore, sdd-propose, sdd-spec, sdd-design, sdd-tasks, sdd-apply, sdd-verify, sdd-archive, sdd-onboard
- Stored at: `~/.claude/skills/sdd-*/` and `~/.config/opencode/skills/sdd-*/`
