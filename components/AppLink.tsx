"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";

export default function AppLink({
  className,
  ...props
}: ComponentProps<typeof NextLink>) {
  return <NextLink className={className} {...props} />;
}
