'use client';

import Link from "next/link";
import { Home } from "lucide-react";
import { motion } from "motion/react";
import { buttonVariants } from "@/components/shadcn/button";
import { cn } from "@/lib/utils";

export default function NotFoundView() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center text-center px-4">
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="text-8xl font-black tracking-tighter text-foreground mb-2"
        style={{
          background: "linear-gradient(to bottom, var(--foreground) 60%, rgba(255, 255, 255, 0.15))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        404
      </motion.h1>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mb-6 flex items-center justify-center"
      >
        <div className="absolute -inset-4 rounded-2xl bg-primary/10 blur-xl" />

        <div className="relative z-10 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.4)] aspect-video w-72 sm:w-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/404.gif"
            alt="Animation Deadlock : page introuvable"
            className="size-full object-cover"
          />
        </div>
      </motion.div>
      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-2xl font-bold tracking-tight text-foreground mb-4"
      >
        T&apos;es perdu ?
      </motion.h2>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-muted-foreground max-w-md mx-auto mb-8 text-sm sm:text-base leading-relaxed"
      >
        La page que tu cherches n&apos;existe pas ou a été déplacée.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "rounded-xl font-semibold gap-2 border border-primary/20 hover:border-primary/40 shadow-[0_4px_20px_rgba(88,164,132,0.15)] hover:shadow-[0_4px_25px_rgba(88,164,132,0.25)] transition-all duration-300"
          )}
        >
          <Home size={16} />
          Retourner à l&apos;accueil
        </Link>
      </motion.div>
    </div>
  );
}
