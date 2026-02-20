"use client";

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useRef } from "react";

const bentoItems = [
  { title: "24/7 Uptime", text: "Continuous checks with smart intervals." },
  { title: "Alert Routing", text: "Slack and Discord hooks in one flow." },
  { title: "Code-Fix Ready", text: "Attach GitHub tokens per monitor." },
  { title: "History View", text: "Track incidents with clear timelines." },
];

const bottomStats = [
  { label: "Avg response", value: "132ms" },
  { label: "Monitors online", value: "42" },
  { label: "Open incidents", value: "3" },
  { label: "Alert latency", value: "<1s" },
];

export default function HomePage() {
  const pageRef = useRef<HTMLElement | null>(null);
  const floatingCardRef = useRef<HTMLDivElement | null>(null);
  const parallaxLayerARef = useRef<HTMLDivElement | null>(null);
  const parallaxLayerBRef = useRef<HTMLDivElement | null>(null);
  const ctaMagneticRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, CustomEase);
    CustomEase.create("snapIn", "M0,0 C0.2,0.8 0.2,1 1,1");

    const context = gsap.context(() => {
      if (floatingCardRef.current) {
        gsap.to(floatingCardRef.current, {
          y: -10,
          duration: 3.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          force3D: true,
        });
      }

      const revealItems = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      gsap.fromTo(
        revealItems,
        { opacity: 0, y: 34, force3D: true },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "snapIn",
          stagger: 0.1,
          scrollTrigger: {
            trigger: pageRef.current,
            start: "top top+=80",
          },
        },
      );

      if (parallaxLayerARef.current) {
        gsap.to(parallaxLayerARef.current, {
          y: 280,
          ease: "none",
          force3D: true,
          scrollTrigger: {
            trigger: pageRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          },
        });
      }

      if (parallaxLayerBRef.current) {
        gsap.to(parallaxLayerBRef.current, {
          y: -240,
          ease: "none",
          force3D: true,
          scrollTrigger: {
            trigger: pageRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          },
        });
      }
    }, pageRef);

    const magnetic = ctaMagneticRef.current;

    const onMouseMove = (event: MouseEvent) => {
      if (!magnetic) {
        return;
      }

      const bounds = magnetic.getBoundingClientRect();
      const offsetX = event.clientX - (bounds.left + bounds.width / 2);
      const offsetY = event.clientY - (bounds.top + bounds.height / 2);
      const distance = Math.hypot(offsetX, offsetY);

      if (distance <= 20) {
        gsap.to(magnetic, {
          x: offsetX * 0.35,
          y: offsetY * 0.35,
          duration: 0.2,
          ease: "power2.out",
          force3D: true,
        });
        return;
      }

      gsap.to(magnetic, {
        x: 0,
        y: 0,
        duration: 0.25,
        ease: "power2.out",
        force3D: true,
      });
    };

    const onMouseLeave = () => {
      if (!magnetic) {
        return;
      }

      gsap.to(magnetic, {
        x: 0,
        y: 0,
        duration: 0.3,
        ease: "power2.out",
        force3D: true,
      });
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      context.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <main ref={pageRef} className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div ref={parallaxLayerARef} className="mesh-orb mesh-orb-a" />
        <div ref={parallaxLayerBRef} className="mesh-orb mesh-orb-b" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 md:pt-8 lg:px-8">
        <header
          data-reveal
          className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-[28px] px-4 py-3 sm:px-5"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-blue-100">
              E
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">EpiTrace</p>
              <p className="text-xs text-slate-500">Fluid reliability platform</p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300/80 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white sm:w-auto"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-blue-50 transition hover:bg-slate-800 sm:w-auto"
            >
              Start Free
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-12">
          <article
            data-reveal
            className="glass-panel rounded-[32px] p-6 lg:col-span-7 lg:p-8"
          >
            <span className="inline-flex rounded-full border border-slate-200/80 bg-white/50 px-3 py-1 text-xs font-semibold text-slate-700">
              Real-time monitoring + agent workflows
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
              A fluid command center for API reliability.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-slate-600 sm:text-base">
              Watch endpoint health, route alerts instantly, and keep every incident response
              traceable from one high-signal workspace.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                ref={ctaMagneticRef}
                href="/register"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-blue-50 will-change-transform"
              >
                Launch Workspace
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300/80 bg-white/60 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
              >
                View Dashboard
              </Link>
            </div>
          </article>

          <article data-reveal className="glass-panel relative rounded-[32px] p-5 lg:col-span-5">
            <div
              ref={floatingCardRef}
              className="rounded-[26px] border border-white/50 bg-white/55 p-4 backdrop-blur-[12px] will-change-transform"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Floating Dock</p>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                  Live
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3">
                  <p className="text-xs text-slate-500">Monitors</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">42</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3">
                  <p className="text-xs text-slate-500">Uptime</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">99.98%</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3">
                  <p className="text-xs text-slate-500">Alerts</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">3</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="h-2 rounded-full bg-slate-200/90">
                  <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-blue-500 to-slate-800" />
                </div>
                <div className="h-2 rounded-full bg-slate-200/90">
                  <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-cyan-400 to-blue-600" />
                </div>
              </div>
            </div>
          </article>

          {bentoItems.map((item) => (
            <article
              key={item.title}
              data-reveal
              className="glass-panel rounded-[28px] p-5 lg:col-span-3"
            >
              <p className="text-lg font-semibold text-slate-900">{item.title}</p>
              <p className="mt-2 text-sm text-slate-600">{item.text}</p>
            </article>
          ))}

          <article
            data-reveal
            className="glass-panel rounded-[30px] p-6 lg:col-span-12 lg:flex lg:items-center lg:justify-between"
          >
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                Built for motion, clarity, and speed.
              </h2>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Transform-based motion keeps interactions smooth and performant across devices.
              </p>
            </div>
            <div className="mt-4 lg:mt-0">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-blue-50 transition hover:bg-slate-800"
              >
                Create Account
              </Link>
            </div>
          </article>

          <article data-reveal className="glass-panel rounded-[30px] p-6 lg:col-span-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {bottomStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 backdrop-blur-[12px]"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article data-reveal className="glass-panel rounded-[30px] p-6 lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Integrations</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm font-semibold text-slate-800">
                GitHub
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm font-semibold text-slate-800">
                Slack
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm font-semibold text-slate-800">
                Discord
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm font-semibold text-slate-800">
                Webhooks
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
