import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { SITE_NAME } from "./site";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

async function loadOgAssets() {
  const [fontData, iconData] = await Promise.all([
    readFile(join(process.cwd(), "public/fonts/ColusRegular.otf")),
    readFile(join(process.cwd(), "app/icon.png")),
  ]);

  return {
    fontData,
    iconSrc: `data:image/png;base64,${iconData.toString("base64")}`,
  };
}

export async function createOgImage({
  title,
  eyebrow = SITE_NAME,
  footer = "Communauté francophone · Projet indépendant",
}: {
  title: string;
  eyebrow?: string;
  footer?: string;
}): Promise<ImageResponse> {
  const { fontData, iconSrc } = await loadOgAssets();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0d1315 0%, #121a1c 55%, #0a3d32 100%)",
          color: "#dde6e8",
          padding: "64px 72px",
          fontFamily: "Colus",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iconSrc}
            width={72}
            height={72}
            alt=""
            style={{ borderRadius: 999 }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 28,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6BB89A",
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 48 ? 52 : 64,
            lineHeight: 1.15,
            maxWidth: 1040,
            color: "#ffffff",
          }}
        >
          {truncate(title, 110)}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#8a9b9f",
          }}
        >
          {footer}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        {
          name: "Colus",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
