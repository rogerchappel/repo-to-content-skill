# Repo To Content Skill PRD

## Problem

OSS launch content is often drafted from memory instead of repository evidence. Agents need a repeatable local workflow that turns real files into claims, demo commands, and warnings without posting anywhere.

## Goals

- Inspect local repository evidence.
- Generate launch briefs with proof paths.
- Draft short and technical posts from supported claims.
- Flag missing README, test, or smoke evidence.

## Non-goals

- Posting to social networks.
- Inventing claims that are not backed by local files.
- Calling external accounts or analytics services.

## Success criteria

- Fixture repo produces a Markdown launch brief.
- Tests cover evidence extraction and warning behavior.
- CLI remains local-first and dry-run only.
