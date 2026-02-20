"use client";

import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const springTransition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
} as const;

const logLines = [
  "[watchdog] GET /api/v1/auth -> 200 OK",
  "[watchdog] GET /api/v1/users -> 200 OK",
  "[watchdog] GET /api/v1/auth -> 500 Internal Server Error",
  "[agent] Cline Agent initialized...",
  "[agent] Cloning repo...",
  "[agent] Analyzing stack trace...",
  "[result] PR #402 Created: 'Fix: Null pointer in /api/v1/auth'",
];

const workflowTicker = [
  "GitHub",
  "Cline AI",
  "Slack",
  "Discord",
  "Webhooks",
  "Next.js",
  "Python",
  "Go",
];

export default function HomePage() {
  const pageRef = useRef<HTMLElement | null>(null);
  const heartbeatRef = useRef<SVGPathElement | null>(null);
  const travelAlertRef = useRef<HTMLDivElement | null>(null);
  const travelAgentRef = useRef<HTMLDivElement | null>(null);
  const prBadgeRef = useRef<HTMLDivElement | null>(null);
  const logTrackRef = useRef<HTMLDivElement | null>(null);
  const loopPathRef = useRef<SVGCircleElement | null>(null);
  const auraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const tickerTrackRef = useRef<HTMLDivElement | null>(null);
  const tickerSetRef = useRef<HTMLDivElement | null>(null);
  const featureCardsSectionRef = useRef<HTMLElement | null>(null);
  const idleHeavyVisualRef = useRef<number | null>(null);

  const [showHeavyVisuals, setShowHeavyVisuals] = useState(false);
  const [areFeatureCardsVisible, setAreFeatureCardsVisible] = useState(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const root = pageRef.current;

    if (!root) {
      return;
    }

    const context = gsap.context(() => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let tickerTween: gsap.core.Tween | null = null;

      gsap.fromTo(
        "[data-reveal]",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 1.05,
          stagger: 0.12,
          ease: "power2.out",
          clearProps: "transform",
        },
      );

      if (prefersReducedMotion) {
        return;
      }

      if (terminalRef.current) {
        const sequenceLines = terminalRef.current.querySelectorAll("[data-terminal-line]");
        gsap.fromTo(
          sequenceLines,
          { opacity: 0.2 },
          {
            opacity: 1,
            duration: 0.8,
            stagger: 1,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut",
          },
        );
      }

      if (heartbeatRef.current && travelAlertRef.current && travelAgentRef.current) {
        const lane = travelAlertRef.current.parentElement;
        const laneWidth = lane?.clientWidth ?? 500;
        const alertTravel = Math.max(140, laneWidth * 0.48);
        const agentStart = Math.max(140, laneWidth * 0.48);
        const agentTravel = Math.max(240, laneWidth * 0.8);

        const beat = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });

        beat
          .to(heartbeatRef.current, {
            attr: {
              d: "M0 32 L16 32 L24 16 L32 48 L40 22 L48 32 L100 32",
            },
            duration: 0.45,
            ease: "power2.inOut",
          })
          .to(heartbeatRef.current, {
            attr: {
              d: "M0 32 L100 32",
            },
            duration: 0.25,
            ease: "none",
          })
          .set(travelAlertRef.current, { x: 0, opacity: 0 })
          .to(travelAlertRef.current, { opacity: 1, duration: 0.12 })
          .to(travelAlertRef.current, {
            x: alertTravel,
            duration: 0.9,
            ease: "power2.inOut",
          })
          .to(travelAlertRef.current, { opacity: 0, duration: 0.2 })
          .set(travelAgentRef.current, { x: agentStart, opacity: 0 })
          .to(travelAgentRef.current, { opacity: 1, duration: 0.12 })
          .to(travelAgentRef.current, {
            x: agentTravel,
            duration: 0.9,
            ease: "power2.inOut",
          })
          .to(travelAgentRef.current, { opacity: 0, duration: 0.2 });
      }

      if (prBadgeRef.current) {
        gsap.fromTo(
          prBadgeRef.current,
          { x: 24, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.55,
            ease: "back.out(1.7)",
            repeat: -1,
            repeatDelay: 3.2,
          },
        );
      }

      if (logTrackRef.current) {
        gsap.fromTo(
          logTrackRef.current,
          { yPercent: 0 },
          {
            yPercent: -50,
            duration: 7,
            ease: "none",
            repeat: -1,
          },
        );
      }

      if (loopPathRef.current) {
        const length = loopPathRef.current.getTotalLength();
        gsap.set(loopPathRef.current, {
          strokeDasharray: length,
          strokeDashoffset: length,
        });

        gsap.to(loopPathRef.current, {
          strokeDashoffset: 0,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "[data-repair-loop]",
            start: "top 80%",
            end: "bottom 30%",
            scrub: true,
          },
        });
      }

      gsap.to("[data-webhook-icon]", {
        opacity: 0.8,
        scale: 1.04,
        duration: 1.6,
        ease: "sine.inOut",
        stagger: 0.2,
        repeat: -1,
        yoyo: true,
      });

      const setupTickerLoop = () => {
        if (!tickerTrackRef.current || !tickerSetRef.current) {
          return;
        }

        tickerTween?.kill();
        gsap.set(tickerTrackRef.current, { x: 0 });

        const singleSetWidth = tickerSetRef.current.scrollWidth;

        if (singleSetWidth <= 0) {
          return;
        }

        tickerTween = gsap.to(tickerTrackRef.current, {
          x: -singleSetWidth,
          duration: 18,
          ease: "none",
          repeat: -1,
        });
      };

      setupTickerLoop();
      window.addEventListener("resize", setupTickerLoop);

      return () => {
        window.removeEventListener("resize", setupTickerLoop);
        tickerTween?.kill();
      };
    }, root);

    return () => {
      context.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  useEffect(() => {
    const idle =
      "requestIdleCallback" in window
        ? (window as Window & {
            requestIdleCallback: (callback: () => void, options?: { timeout: number }) => number;
          }).requestIdleCallback(() => {
            setShowHeavyVisuals(true);
          }, { timeout: 900 })
        : window.setTimeout(() => {
            setShowHeavyVisuals(true);
          }, 450);

    idleHeavyVisualRef.current = idle;

    return () => {
      if (idleHeavyVisualRef.current === null) {
        return;
      }

      if ("cancelIdleCallback" in window) {
        (
          window as Window & {
            cancelIdleCallback: (id: number) => void;
          }
        ).cancelIdleCallback(idleHeavyVisualRef.current);
      } else {
        window.clearTimeout(idleHeavyVisualRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const section = featureCardsSectionRef.current;

    if (!section || areFeatureCardsVisible) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry?.isIntersecting) {
          return;
        }

        setAreFeatureCardsVisible(true);
        observer.disconnect();
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -10% 0px",
      },
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
    };
  }, [areFeatureCardsVisible]);

  useEffect(() => {
    const canvas = auraCanvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);
      const gradient = context.createRadialGradient(
        width * 0.6,
        height * 0.55,
        10,
        width * 0.6,
        height * 0.55,
        width * 0.5,
      );
      gradient.addColorStop(0, "rgba(56, 189, 248, 0.35)");
      gradient.addColorStop(0.45, "rgba(59, 130, 246, 0.2)");
      gradient.addColorStop(1, "rgba(14, 116, 144, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      return;
    }

    let frame = 0;
    let raf = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      frame += 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const pulse = 0.5 + Math.sin(frame / 25) * 0.2;

      context.clearRect(0, 0, width, height);

      const gradient = context.createRadialGradient(
        width * 0.6,
        height * 0.55,
        10,
        width * 0.6,
        height * 0.55,
        width * 0.5,
      );
      gradient.addColorStop(0, `rgba(56, 189, 248, ${0.26 + pulse})`);
      gradient.addColorStop(0.45, "rgba(59, 130, 246, 0.26)");
      gradient.addColorStop(1, "rgba(14, 116, 144, 0)");

      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      raf = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main ref={pageRef} className="mx-auto min-h-screen max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <section className="space-y-4">
        <motion.article
          data-reveal
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="glass-panel rounded-[32px] p-6 sm:p-8"
        >
          <p className="inline-flex rounded-full border border-slate-300/80 bg-white/65 px-3 py-1 text-xs font-semibold text-slate-700">
            Active Recovery • AI-native monitoring & auto-remediation
          </p>

          <div className="mt-4 grid gap-5 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-7">
              <h1 className="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Don’t just monitor your downtime. Autonomously fix it.
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-slate-600 sm:text-base">
                24/7 API monitoring that does more than alert your Slack. When a service drops, our
                Cline-powered agents clone your repo, diagnose the failure, and submit a Pull
                Request before your first cup of coffee.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <motion.div whileHover={{ y: -2 }} transition={springTransition}>
                  <Link
                    href="/register"
                    className="inline-flex min-w-56 whitespace-nowrap items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-blue-50"
                  >
                    Start Fixing for Free
                  </Link>
                </motion.div>

                <p className="text-xs text-slate-500">No credit card. Connect GitHub in 30s.</p>
              </div>

              <p className="mt-5 text-sm font-medium text-slate-800">
                Don&apos;t just wake up to an error; wake up to the Pull Request that fixes it.
              </p>
            </div>

            <div className="space-y-3 lg:col-span-5">
              <div
                ref={terminalRef}
                className="rounded-2xl border border-slate-300/70 bg-slate-950 p-3 font-mono text-xs text-slate-200"
              >
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Micro Terminal</p>
                <p data-terminal-line className="mt-2 text-red-400">
                  Status: 500 Internal Server Error
                </p>
                <p data-terminal-line className="mt-1 text-cyan-300">
                  Action: Cline Agent initialized...
                </p>
                <p data-terminal-line className="mt-1 text-slate-100">
                  Action: Cloning repo... Analyzing stack trace...
                </p>
                <p data-terminal-line className="mt-1 text-emerald-400">
                  Result: PR #402 Created: &quot;Fix: Null pointer in /api/v1/auth&quot;
                </p>
              </div>

              <div className="rounded-2xl border border-slate-300/70 bg-white/70 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Active Monitor
                  </p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Live
                  </span>
                </div>

                <div className="relative mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-950/95 p-3">
                  <svg viewBox="0 0 100 64" className="h-14 w-full">
                    <path
                      ref={heartbeatRef}
                      d="M0 32 L16 32 L24 16 L32 48 L40 22 L48 32 L100 32"
                      fill="none"
                      stroke="rgb(56 189 248)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="relative mt-2 h-9 overflow-hidden">
                    <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-slate-600/70" />
                    <div className="absolute inset-y-0 left-0 flex w-full items-center text-sm">
                      <div ref={travelAlertRef} className="absolute rounded-md bg-rose-400/90 px-1.5 py-0.5 text-[10px] font-semibold text-rose-950">
                        ⚠ Alert
                      </div>
                      <div ref={travelAgentRef} className="absolute rounded-md bg-cyan-300/90 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-950">
                        ◇ Cline
                      </div>
                    </div>

                    <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-2 text-[10px]">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">Slack/Discord</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">GitHub</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.article>

        <section className="overflow-hidden rounded-2xl border border-slate-300/70 bg-white/55 py-3" data-reveal>
          <div ref={tickerTrackRef} className="flex w-max items-center gap-2 will-change-transform" data-ticker-track>
            <div ref={tickerSetRef} className="flex shrink-0 items-center gap-2 px-2">
              {workflowTicker.map((item) => (
                <div key={`${item}-primary`} className="rounded-full border border-slate-300/80 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700">
                  {item}
                </div>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2 px-2" aria-hidden="true">
              {workflowTicker.map((item) => (
                <div key={`${item}-clone`} className="rounded-full border border-slate-300/80 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={featureCardsSectionRef} className="grid gap-4 lg:grid-cols-12">
          <motion.article
            whileHover={{ y: -3 }}
            transition={springTransition}
            className={`glass-panel rounded-[28px] p-5 lg:col-span-4 transition-[transform,opacity] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              areFeatureCardsVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
            style={{ transitionDelay: areFeatureCardsVisible ? "0ms" : "0ms" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Silent Surveillance</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">24/7 Watchdog</h2>
            <p className="mt-2 text-sm text-slate-600">
              Real-time heartbeats across Discord, Slack, and Webhooks. If it breathes, we’re
              watching.
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-300/70 bg-slate-950 p-3 font-mono text-xs text-slate-200">
              <div ref={logTrackRef} className="space-y-1">
                {[...logLines, ...logLines].map((line, index) => (
                  <p key={`${line}-${index}`} className={line.includes("500") ? "text-rose-400" : line.includes("200") ? "text-emerald-400" : "text-cyan-300"}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </motion.article>

          <motion.article
            whileHover={{ y: -3 }}
            transition={springTransition}
            className={`glass-panel relative overflow-hidden rounded-[28px] p-5 lg:col-span-4 transition-[transform,opacity] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              areFeatureCardsVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
            style={{ transitionDelay: areFeatureCardsVisible ? "200ms" : "0ms" }}
            data-repair-loop
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Remediation</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">The Repair Loop</h2>
            <p className="mt-2 text-sm text-slate-600">
              Our agents use your GitHub tokens to clone, analyze, and patch bugs in real-time.
            </p>

            <div className="relative mt-4 flex items-center justify-center">
              {showHeavyVisuals ? (
                <svg viewBox="0 0 220 220" className="h-52 w-52">
                  <circle cx="110" cy="110" r="76" stroke="rgb(148 163 184 / 0.35)" strokeWidth="8" fill="none" />
                  <circle ref={loopPathRef} cx="110" cy="110" r="76" stroke="rgb(14 116 144)" strokeWidth="8" fill="none" strokeLinecap="round" />
                  <text x="110" y="56" textAnchor="middle" className="fill-slate-700 text-[10px] font-semibold">Clone</text>
                  <text x="168" y="118" textAnchor="middle" className="fill-slate-700 text-[10px] font-semibold">Analyze</text>
                  <text x="110" y="180" textAnchor="middle" className="fill-slate-700 text-[10px] font-semibold">PR</text>
                </svg>
              ) : (
                <div className="h-52 w-52 rounded-full border border-slate-300/70 bg-slate-100/80" />
              )}

              <div
                ref={prBadgeRef}
                className="absolute bottom-3 right-3 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
              >
                Pull Request Submitted ✓
              </div>
            </div>
          </motion.article>

          <motion.article
            whileHover={{ y: -3 }}
            transition={springTransition}
            className={`glass-panel rounded-[28px] p-5 lg:col-span-4 transition-[transform,opacity] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              areFeatureCardsVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
            style={{ transitionDelay: areFeatureCardsVisible ? "400ms" : "0ms" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deep Logic Logs</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Webhook Integration</h2>
            <p className="mt-2 text-sm text-slate-600">
              Watch the thought process of the Cline agent as it navigates your codebase.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Discord", symbol: "✦" },
                { label: "Slack", symbol: "◻" },
                { label: "Webhook", symbol: "↻" },
              ].map((item) => (
                <div
                  key={item.label}
                  data-webhook-icon
                  className="rounded-2xl border border-slate-300/70 bg-white/45 p-4 text-center shadow-sm"
                  style={{ opacity: 0.4 }}
                >
                  <p className="text-lg text-slate-800">{item.symbol}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="relative mt-4 overflow-hidden rounded-xl border border-slate-300/70 bg-slate-950 p-3">
              <canvas ref={auraCanvasRef} className="absolute inset-0 h-full w-full" />
              <div className="relative z-10 font-mono text-[11px] text-slate-200">
                <p>$ cline --recover --incident=auth-api</p>
                <p className="text-cyan-300">→ tracing null pointer at /api/v1/auth</p>
                <p className="text-emerald-300">→ patch generated, tests green, PR opened</p>
              </div>
            </div>
          </motion.article>
        </section>
      </section>
    </main>
  );
}
