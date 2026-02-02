import React, { useState } from "react";

export default function EmailPreview({ blocks, selectedBlockId, onSelectBlock, onUpdateBlock }) {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const handleTextClick = (blockId, currentContent) => {
    setEditingId(blockId);
    setEditText(currentContent);
  };

  const handleTextBlur = (blockId) => {
    if (editText.trim()) {
      onUpdateBlock(blockId, { content: editText });
    }
    setEditingId(null);
  };

  return (
    <div className="p-8 bg-white">
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
              selectedBlockId === block.id ? "ring-2 ring-cyan-500 ring-offset-2 ring-offset-white" : "hover:bg-gray-50"
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
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleTextClick(block.id, block.content);
                }}
              >
                {editingId === block.id ? (
                  <textarea
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => handleTextBlur(block.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        handleTextBlur(block.id);
                      }
                    }}
                    style={{
                      width: "100%",
                      fontSize: `${block.fontSize}px`,
                      color: block.color,
                      textAlign: block.alignment,
                      fontFamily: "inherit",
                      border: "2px solid #14b8a6",
                      padding: "8px",
                      borderRadius: "4px",
                    }}
                  />
                ) : (
                  block.content
                )}
              </div>
            )}

            {block.type === "button" && (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <a
                  href={block.link}
                  onClick={(e) => e.preventDefault()}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTextClick(block.id, block.content);
                  }}
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
                  {editingId === block.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => handleTextBlur(block.id)}
                      style={{
                        background: "transparent",
                        color: "inherit",
                        border: "none",
                        outline: "2px dashed #fff",
                        padding: "2px",
                      }}
                    />
                  ) : (
                    block.content
                  )}
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
                <div
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleTextClick(block.id, block.title);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {editingId === block.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => {
                        if (editText.trim()) {
                          onUpdateBlock(block.id, { title: editText });
                        }
                        setEditingId(null);
                      }}
                      style={{
                        fontSize: "36px",
                        fontWeight: "bold",
                        background: "rgba(0,0,0,0.3)",
                        color: block.titleColor,
                        border: "2px dashed white",
                        padding: "10px",
                        borderRadius: "4px",
                        textAlign: "center",
                      }}
                    />
                  ) : (
                    <>
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
                    </>
                  )}
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