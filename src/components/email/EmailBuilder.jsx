import React, { useState, useRef } from "react";
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
  Loader2,
  Clock,
  Mail as MailIcon,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import EmailPreview from "./EmailPreview";
import EmailBlockPanel from "./EmailBlockPanel";

const DEFAULT_BLOCKS = [
  { id: "text-1", type: "text", content: "Enter your text here", fontSize: 16, color: "#000000", alignment: "left" },
  { id: "button-1", type: "button", content: "Click Me", link: "#", bgColor: "#14b8a6", textColor: "#ffffff" },
  { id: "image-1", type: "image", src: "", width: 300, alignment: "center" },
  { id: "spacer-1", type: "spacer", height: 20 },
];

export default function EmailBuilder({ onSave, initialContent, onEmailCampaignSetup }) {
  const [blocks, setBlocks] = useState(initialContent?.blocks || []);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [automationName, setAutomationName] = useState("");
  const [automationSchedule, setAutomationSchedule] = useState("");
  const [automationAudience, setAutomationAudience] = useState("all");
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleDragEnd = (result) => {
    const { source, destination, draggableId, sourceDroppableId } = result;
    if (!destination) return;

    // Reordering blocks within the preview
    if (sourceDroppableId === "preview-blocks" && destination.droppableId === "preview-blocks") {
      const newBlocks = [...blocks];
      const [removed] = newBlocks.splice(source.index, 1);
      newBlocks.splice(destination.index, 0, removed);
      setBlocks(newBlocks);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/functions/uploadFile', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (result.file_url) {
        setUploadedImages((prev) => [...prev, result.file_url]);
        toast({ title: "Image uploaded successfully!" });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Failed to upload image", variant: "destructive" });
    }
    setUploading(false);
    e.target.value = '';
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
                return `<div style="text-align: center; padding: 20px; display: flex; justify-content: center;"><img src="${block.src}" style="width: ${block.width}px; max-width: 100%; height: auto; border-radius: 6px;" /></div>`;
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

  const handleSetupCampaign = async () => {
    if (!automationName.trim()) {
      toast({ title: "Please enter a campaign name", variant: "destructive" });
      return;
    }
    if (!automationSchedule) {
      toast({ title: "Please select a schedule", variant: "destructive" });
      return;
    }
    if (onEmailCampaignSetup) {
      onEmailCampaignSetup({
        name: automationName,
        schedule: automationSchedule,
        audience: automationAudience,
        html: getEmailHTML(),
        blocks: blocks
      });
      toast({ title: "Campaign automation set up!" });
      setShowAutomation(false);
    }
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
      <div className="col-span-3 flex flex-col gap-4 h-screen">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="preview-blocks">
            {(provided, snapshot) => (
              <Card className="bg-white border-gray-300 flex-1 flex flex-col overflow-hidden shadow-lg">
                <CardContent 
                  className="flex-1 overflow-y-auto p-0"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {blocks.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 p-8">
                      <p>No blocks yet. Add some from the left panel.</p>
                    </div>
                  ) : (
                    <div className="p-8 bg-white">
                      {blocks.map((block, index) => (
                        <Draggable key={block.id} draggableId={block.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`${snapshot.isDragging ? "opacity-50 bg-gray-100" : ""}`}
                            >
                              <EmailPreview 
                                blocks={[block]} 
                                selectedBlockId={selectedBlockId} 
                                onSelectBlock={setSelectedBlockId}
                                onUpdateBlock={updateBlock}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                  )}
                  {provided.placeholder}
                </CardContent>
              </Card>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Right Panel - Block List & Settings */}
      <div className="col-span-1 flex flex-col gap-4 h-screen overflow-y-auto">
        <Card className="bg-slate-800 border-slate-700 flex-1 flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle className="text-white text-sm">Blocks ({blocks.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 p-3">
            {blocks.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-4">No blocks added yet</p>
            ) : (
              blocks.map((block, index) => (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`p-2 rounded border-2 cursor-pointer transition-all text-xs ${
                    selectedBlockId === block.id
                      ? "border-cyan-500 bg-cyan-900 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {block.type === "text" && "📝"}
                      {block.type === "image" && "🖼️"}
                      {block.type === "button" && "🔘"}
                      {block.type === "spacer" && "⬌"}
                      {block.type === "hero" && "🎯"}
                      {block.type === "divider" && "─"}
                      {" "}{index + 1}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateBlock(block.id);
                        }}
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBlock(block.id);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

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

        <div className="space-y-2">
          <Button
            onClick={() => onSave({ blocks, html: getEmailHTML() })}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Save Email
          </Button>
          
          <Button
            onClick={() => setShowAutomation(true)}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            <MailIcon className="w-4 h-4 mr-2" />
            Set as Campaign
          </Button>
        </div>

        {showAutomation && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Campaign Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-white text-xs">Campaign Name</Label>
                <Input
                  value={automationName}
                  onChange={(e) => setAutomationName(e.target.value)}
                  placeholder="e.g., Summer Sale"
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-white text-xs">Schedule</Label>
                <Select value={automationSchedule} onValueChange={setAutomationSchedule}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="Select schedule..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="once">Send Once</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white text-xs">Audience</Label>
                <Select value={automationAudience} onValueChange={setAutomationAudience}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue placeholder="Select audience..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="makers">Makers Only</SelectItem>
                    <SelectItem value="consumers">Consumers Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAutomation(false)}
                  variant="outline"
                  className="flex-1 bg-slate-700 text-white border-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSetupCampaign}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}