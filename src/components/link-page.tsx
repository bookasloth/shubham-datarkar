"use client";

import { useState } from "react";
import type { LinkCategory } from "@/lib/links/queries";
import { site } from "@/lib/site";

type LinkPageProps = {
  categories: LinkCategory[];
};

const BLOB_COLORS = ["#ff6a25", "#FF4D93", "#36abff", "#45ff74", "#9d3aff"];

const BLOBS = [
  { color: BLOB_COLORS[0], top: "10%", left: "15%", duration: 8 },
  { color: BLOB_COLORS[1], top: "60%", left: "70%", duration: 2 },
  { color: BLOB_COLORS[2], top: "30%", left: "60%", duration: 6 },
  { color: BLOB_COLORS[3], top: "70%", left: "20%", duration: 9 },
  { color: BLOB_COLORS[4], top: "45%", left: "40%", duration: 4 },
];

function LinkRow({ link }: { link: LinkCategory["links"][number] }) {
  const [hover, setHover] = useState(false);

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "block",
        padding: "16px",
        textDecoration: "none",
        fontSize: "16px",
        fontWeight: 500,
        backgroundColor: hover ? link.color : "#1A1D24",
        color: "#ffffff",
        borderRadius: "4px",
        border: "0.5px solid rgba(255,255,255,0.55)",
        transition: "background-color 0.2s ease",
      }}
    >
      {link.title}
    </a>
  );
}

export function LinkPage({ categories }: LinkPageProps) {
  const [activeTab, setActiveTab] = useState(categories[0]?.slug ?? "");

  const activeCategory = categories.find((category) => category.slug === activeTab);

  return (
    <div className="fixed inset-0 z-50">
      <style>{`
        @keyframes link-page-float {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(100px, -80px) scale(1.2); }
          100% { transform: translate(-80px, 120px) scale(0.9); }
        }
      `}</style>

      {/* Animated fluid background */}
      <div
        className="fixed inset-0 overflow-hidden"
        style={{ filter: "blur(60px)", zIndex: -2 }}
      >
        {BLOBS.map((blob, index) => (
          <span
            key={index}
            style={{
              position: "absolute",
              top: blob.top,
              left: blob.left,
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              opacity: 0.6,
              backgroundColor: blob.color,
              animation: `link-page-float ${blob.duration}s infinite ease-in-out alternate`,
            }}
          />
        ))}
      </div>

      {/* Dark overlay */}
      <div
        className="fixed inset-0"
        style={{ background: "rgba(15,17,17,0.75)", zIndex: -1 }}
      />

      {/* Content container */}
      <div
        className="h-full overflow-y-auto"
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          padding: "50px 20px",
          textAlign: "center",
          fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
        }}
      >
        {/* Profile header */}
        <div className="flex flex-col items-center">
          <img
            src="https://website-assets.shubhamdatarkar.com/logos/shubham-logo-secondary.png"
            alt={site.name}
            style={{
              width: "50px",
              borderRadius: "9999px",
              backgroundColor: "#ffffff",
              padding: "6px",
            }}
          />
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 600,
              color: "#ffffff",
              marginTop: "16px",
            }}
          >
            {site.name}
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#9ca3af",
              marginTop: "4px",
              marginBottom: "34px",
            }}
          >
            {site.role}
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex flex-row flex-wrap items-center justify-center" style={{ gap: "8px", marginBottom: "28px" }}>
          {categories.map((category) => {
            const isActive = category.slug === activeTab;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveTab(category.slug)}
                style={{
                  padding: "10px 14px",
                  backgroundColor: isActive ? "#ffffff" : "#1A1D24",
                  color: isActive ? "#FE5100" : "#ffffff",
                  fontWeight: isActive ? 500 : 400,
                  cursor: "pointer",
                  fontSize: "14px",
                  borderRadius: "4px",
                  border: "none",
                  transition: "all 0.2s ease",
                }}
              >
                {category.name}
              </button>
            );
          })}
        </div>

        {/* Links list */}
        <div className="flex flex-col" style={{ gap: "12px" }}>
          {activeCategory?.links.map((link) => (
            <LinkRow key={link.id} link={link} />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "20px",
            fontSize: "12px",
            color: "#6b7280",
          }}
        >
          1995 - 2026 © Shubham N Datarkar | Build with Love ♥
        </div>
      </div>
    </div>
  );
}
