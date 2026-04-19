import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "NovaPivots — Your Career Transition Plan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)",
          padding: "80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "48px",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              color: "white",
              fontWeight: 700,
            }}
          >
            N
          </div>
          <span
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            NovaPivots
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)",
              background: "rgba(255,255,255,0.15)",
              padding: "4px 12px",
              borderRadius: 999,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Beta
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            marginBottom: "24px",
            maxWidth: 900,
          }}
        >
          From laid off to{" "}
          <span style={{ color: "#93c5fd" }}>focused</span>
        </div>

        {/* Subline */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.4,
            maxWidth: 800,
          }}
        >
          A personalized action plan for your severance, benefits, finances, and job search.
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 80,
            fontSize: 22,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.02em",
          }}
        >
          novapivots.com
        </div>
      </div>
    ),
    { ...size }
  );
}
