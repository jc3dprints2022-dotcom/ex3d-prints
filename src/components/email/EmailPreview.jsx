import React from "react";

export default function EmailPreview({ blocks, selectedBlockId, onSelectBlock }) {
  return (
    <div className="p-4">
      {blocks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No blocks yet. Add some to see preview.</p>
        </div>
      ) : (
        blocks.map((block) => (
          <div
            key={block.id}
            onClick={() => onSelectBlock(block.id)}
            className={`cursor-pointer transition-all ${
              selectedBlockId === block.id ? "ring-2 ring-cyan-500 ring-offset-2" : "hover:opacity-80"
            }`}
          >
            {block.type === "text" && (
              <div
                style={{
                  padding: "20px",
                  fontSize: `${block.fontSize}px`,
                  color: block.color,
                  textAlign: block.alignment,
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                }}
              >
                {block.content}
              </div>
            )}

            {block.type === "button" && (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <a
                  href={block.link}
                  onClick={(e) => e.preventDefault()}
                  style={{
                    display: "inline-block",
                    padding: "12px 24px",
                    background: block.bgColor,
                    color: block.textColor,
                    textDecoration: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                  }}
                >
                  {block.content}
                </a>
              </div>
            )}

            {block.type === "image" && (
              <div style={{ textAlign: block.alignment, padding: "20px" }}>
                {block.src ? (
                  <img
                    src={block.src}
                    alt="Email image"
                    style={{
                      width: `${block.width}px`,
                      maxWidth: "100%",
                      height: "auto",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: `${block.width}px`,
                      height: "200px",
                      background: "#f0f0f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                      borderRadius: "6px",
                    }}
                  >
                    No image selected
                  </div>
                )}
              </div>
            )}

            {block.type === "spacer" && <div style={{ height: `${block.height}px` }} />}

            {block.type === "hero" && (
              <div
                style={{
                  backgroundImage: block.bgImage ? `url('${block.bgImage}')` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  height: `${block.height}px`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  background: block.bgImage ? undefined : "#e5e7eb",
                }}
              >
                <div>
                  <h1
                    style={{
                      color: block.titleColor,
                      margin: "0 0 10px 0",
                      fontSize: "36px",
                      fontWeight: "bold",
                    }}
                  >
                    {block.title}
                  </h1>
                  <p
                    style={{
                      color: block.subtitleColor,
                      margin: "0",
                      fontSize: "18px",
                    }}
                  >
                    {block.subtitle}
                  </p>
                </div>
              </div>
            )}

            {block.type === "divider" && (
              <div
                style={{
                  borderTop: `${block.height}px solid ${block.color}`,
                  margin: "20px 0",
                }}
              />
            )}
          </div>
        ))
      )}
    </div>
  );
}