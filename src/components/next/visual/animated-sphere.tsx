"use client";

import anime from "animejs";
import { useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "@/hooks/next/use-reduced-motion";

interface AnimatedSphereProps {
  compact?: boolean;
  className?: string;
}

const PARTICLES = [
  [8, 18, 5], [17, 72, 4], [27, 32, 3], [36, 86, 6], [44, 12, 4], [54, 58, 3],
  [61, 24, 5], [69, 78, 4], [77, 42, 3], [86, 17, 6], [91, 66, 4], [12, 48, 3],
];

export function AnimatedSphere({ compact = false, className = "" }: AnimatedSphereProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;

    const sphere = anime({
      targets: root.querySelector(".sphere-core"),
      translateY: [-7, 7],
      rotate: [0, 360],
      duration: 9000,
      direction: "alternate",
      easing: "easeInOutSine",
      loop: true,
    });
    const ring = anime({
      targets: root.querySelectorAll(".sphere-ring"),
      rotate: (_target: Element, index: number) => index === 0 ? 360 : -360,
      scale: [0.96, 1.04],
      delay: anime.stagger(320),
      duration: 11000,
      easing: "linear",
      loop: true,
    });
    const particles = anime({
      targets: root.querySelectorAll(".sphere-particle"),
      translateY: () => anime.random(-18, 18),
      translateX: () => anime.random(-12, 12),
      opacity: [0.2, 0.9],
      scale: [0.7, 1.25],
      delay: anime.stagger(120),
      duration: 2600,
      direction: "alternate",
      easing: "easeInOutQuad",
      loop: true,
    });

    return () => {
      sphere.pause();
      ring.pause();
      particles.pause();
      anime.remove(root.querySelectorAll("*"));
    };
  }, [reducedMotion]);

  return (
    <div ref={rootRef} className={`animated-sphere ${compact ? "is-compact" : ""} ${className}`} aria-hidden="true">
      <div className="sphere-glow" />
      <div className="sphere-ring sphere-ring-one" />
      <div className="sphere-ring sphere-ring-two" />
      <div className="sphere-core">
        <span className="sphere-shine" />
        <span className="sphere-grid" />
      </div>
      {PARTICLES.map(([left, top, size]) => (
        <i
          className="sphere-particle"
          key={`${left}-${top}`}
          style={{ "--particle-left": `${left}%`, "--particle-top": `${top}%`, "--particle-size": `${size}px` } as CSSProperties}
        />
      ))}
    </div>
  );
}
