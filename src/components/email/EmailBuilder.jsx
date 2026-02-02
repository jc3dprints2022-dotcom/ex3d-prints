import React, { useState, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Trash2,
  Copy,
  Plus,
  Upload,
  Image as ImageIcon,
  Monitor,
  Smartphone,
  Loader2,
} from "lucide-react";
import EmailPreview from "./EmailPreview";
import EmailBlockPanel from "./EmailBlockPanel";

const DEFAULT_BLOCKS = [
  { id: "text-1", type: "text", content: "Enter your text here", fontSize: 16, color: "#000000", alignment: "left" },
  { id: "button-1", type: "button", content: "Click Me", link: "#", bgColor: "#14b8a6", textColor: "#ffffff" },
  { id: "image-1", type: "image", src: "", width: 300, alignment: "center" },
  { id: "spacer-1", type: "spacer", height: 20 },
];

export default function EmailBuilder({ onSave, initialContent }) {
  const [blocks, setBlocks] = useState(initialContent?.blocks || []);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [previewMode, setPreviewMode] = useState("desktop");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockType, setBlockType] = useState("text");
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (draggableId.startsWith("template-")) {
      // Adding a new block from template
      const newBlock = { ...DEFAULT_BLOCKS[parseInt(draggableId.split("-")[1])], id: `block-${Date.now()}` };
      const newBlocks = [...blocks];
      newBlocks.splice(destination.index, 0, newBlock);
      setBlocks(newBlocks);
      toast({ title: "Block added!" });
      return;
    }

    // Reordering existing blocks
    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(source.index, 1);
    newBlocks.splice(destination.index, 0, removed);
    setBlocks(newBlocks);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { data } = await base44.functions.invoke("uploadFile", { file });
      if (data?.file_url) {
        setUploadedImages((prev) => [...prev, data.file_url]);
        toast({ title: "Image uploaded successfully!" });
      }
    } catch (error) {
      toast({ title: "Failed to upload image", variant: "destructive" });
    }
    setUploading(false);
  };

  const deleteBlock = (id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedBlockId(null);
    toast({ title: "Block removed" });
  };

  const duplicateBlock = (id) => {
    const blockToDuplicate = blocks.find((b) => b.id === id);
    if (blockToDuplicate) {
      const newBlock = { ...blockToDuplicate, id: `block-${Date.now()}` };
      const index = blocks.findIndex((b) => b.id === id);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
      toast({ title: "Block duplicated" });
    }
  };

  const updateBlock = (id, updates) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, ...updates } : block))
    );
  };

  const addBlock = (type) => {
    const newBlock = {
      id: `block-${Date.now()}`,
      type: type,
      ...(type === "text" && { content: "Enter text here", fontSize: 16, color: "#000000", alignment: "left" }),
      ...(type === "button" && { content: "Button", link: "#", bgColor: "#14b8a6", textColor: "#ffffff" }),
      ...(type === "image" && { src: "", width: 300, alignment: "center" }),
      ...(type === "spacer" && { height: 20 }),
      ...(type === "hero" && { 
        bgImage: "", 
        title: "Your Hero Title", 
        subtitle: "Your subtitle here",
        titleColor: "#ffffff",
        subtitleColor: "#ffffff",
        height: 300
      }),
      ...(type === "divider" && { color: "#e5e7eb", height: 1 }),
    };
    setBlocks((prev) => [...prev, newBlock]);
    toast({ title: `${type} block added` });
  };

  const getEmailHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .email-container { max-width: 600px; margin: 0 auto; background: white; }
          img { max-width: 100%; height: auto; display: block; }
        </style>
      </head>
      <body>
        <div class="email-container">
          ${blocks.map((block) => {
            switch (block.type) {
              case "text":
                return `<div style="padding: 20px; font-size: ${block.fontSize}px; color: ${block.color}; text-align: ${block.alignment};">${block.content}</div>`;
              case "button":
                return `<div style="text-align: center; padding: 20px;"><a href="${block.link}" style="display: inline-block; padding: 12px 24px; background: ${block.bgColor}; color: ${block.textColor}; text-decoration: none; border-radius: 6px; font-weight: bold;">${block.content}</a></div>`;
              case "image":
                return `<div style="text-align: ${block.alignment}; padding: 20px;"><img src="${block.src}" style="width: ${block.width}px; max-width: 100%; height: auto;" /></div>`;
              case "spacer":
                return `<div style="height: ${block.height}px;"></div>`;
              case "hero":
                return `<div style="background-image: url('${block.bgImage}'); background-size: cover; background-position: center; height: ${block.height}px; display: flex; align-items: center; justify-content: center; text-align: center; color: white;"><div><h1 style="color: ${block.titleColor}; margin: 0 0 10px 0;">${block.title}</h1><p style="color: ${block.subtitleColor}; margin: 0;">${block.subtitle}</p></div></div>`;
              case "divider":
                return `<div style="border-top: ${block.height}px solid ${block.color}; margin: 20px 0;"></div>`;
              default:
                return "";
            }
          }).join("")}
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="grid grid-cols-5 gap-6 h-screen bg-slate-900 p-6">
      {/* Left Panel - Block Library */}
      <div className="col-span-1 flex flex-col gap-4 overflow-y-auto max-h-screen">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Add Blocks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => addBlock("hero")} variant="outline" className="w-full justify-start text-white bg-slate-700 border-slate-600">Hero Section</Button>
            <Button onClick={() => addBlock("text")} variant="outline" className="w-full justify-start text-white bg-slate-700 border-slate-600">Text</Button>
            <Button onClick={() => addBlock("image")} variant="outline" className="w-full justify-start text-white bg-slate-700 border-slate-600">Image</Button>
            <Button onClick={() => addBlock("button")} variant="outline" className="w-full justify-start text-white bg-slate-700 border-slate-600">Button</Button>
            <Button onClick={() => addBlock("spacer")} variant="outline" className="w-full justify-start text-white bg-slate-700 border-slate-600">Spacer</Button>
            <Button onClick={() => addBlock("divider")} variant="outline" className="w-full justify-start text-white bg-slate-700 border-slate-600">Divider</Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Image Library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {uploadedImages.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setShowImageLibrary(true)}
                    className="aspect-square rounded overflow-hidden border border-slate-700 hover:border-cyan-500"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Middle Panel - Preview/Editor */}
      <div className="col-span-3 flex flex-col gap-4">
        <Card className="bg-white border-gray-300 flex-1 flex flex-col overflow-hidden shadow-lg">
          <CardContent className="flex-1 overflow-y-auto p-0">
            <EmailPreview 
              blocks={blocks} 
              selectedBlockId={selectedBlockId} 
              onSelectBlock={setSelectedBlockId}
              onUpdateBlock={updateBlock}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Preview */}
      <div className="col-span-1 flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            onClick={() => setPreviewMode("desktop")}
            variant={previewMode === "desktop" ? "default" : "outline"}
            className={previewMode === "desktop" ? "bg-cyan-600" : "border-slate-600"}
          >
            <Monitor className="w-4 h-4 mr-1" />
            Desktop
          </Button>
          <Button
            onClick={() => setPreviewMode("mobile")}
            variant={previewMode === "mobile" ? "default" : "outline"}
            className={previewMode === "mobile" ? "bg-cyan-600" : "border-slate-600"}
          >
            <Smartphone className="w-4 h-4 mr-1" />
            Mobile
          </Button>
        </div>

        <div className={`border border-slate-700 rounded-lg overflow-auto flex-1 bg-white ${
          previewMode === "mobile" ? "max-w-xs" : ""
        }`}>
          <EmailPreview blocks={blocks} selectedBlockId={selectedBlockId} onSelectBlock={setSelectedBlockId} />
        </div>

        {selectedBlockId && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Block Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <EmailBlockPanel
                block={blocks.find((b) => b.id === selectedBlockId)}
                onUpdate={(updates) => updateBlock(selectedBlockId, updates)}
                uploadedImages={uploadedImages}
              />
            </CardContent>
          </Card>
        )}

        <Button
          onClick={() => onSave({ blocks, html: getEmailHTML() })}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          Save Email
        </Button>
      </div>
    </div>
  );
}