# Depthguard

Depthguard is a lightweight security and safety scanner for modern AI systems and APIs.  
It helps developers and teams quickly test **web chat UIs**, **chat-like HTTP JSON endpoints**, and **general REST APIs** for vulnerabilities, misconfigurations, and unsafe behaviors.

<img width="1125" height="1003" alt="Screenshot 2025-08-22 at 13 15 15" src="https://github.com/user-attachments/assets/d0371e0c-9e2d-441b-97c2-6fb898cb4c48" />

---

## What it does

- **Web Chat Scanning (Playwright)**  
  Opens public chat UIs, auto-accepts cookie/consent banners, sends adversarial prompts, and scrapes assistant replies for unsafe outputs.

- **HTTP JSON Chat Endpoints**  
  Sends `POST { input }` payloads and reads `output.text` / `text` fields. Runs jailbreak & safety detectors to catch risky responses.

- **REST API Checks**  
  Probes endpoints for:
  - CORS misconfigurations
  - Verbose error messages (stack traces, SQL leaks)
  - Missing security headers
  - Sensitive caching
  - Rate-limit headers
  - Unauthenticated access

- **Findings & Scoring**  
  Results are stored in Supabase. Each scan produces:
  - Findings with severity, excerpt, and recommendations  
  - An overall score (or marked *inconclusive* if no useful response text was captured)

---

## Built-in attack packs

- **baseline-v1 (AI/Chat)**  
  Prompt leakage, risky HTML/JS sinks, unsafe action hints, and related adversarial prompts.

- **rest-v1 (APIs)**  
  CORS permissiveness, stack traces/SQL errors, missing headers, caching issues, rate-limit headers, unauthenticated probes.

---
