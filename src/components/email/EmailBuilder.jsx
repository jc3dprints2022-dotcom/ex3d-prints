import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Trash2,
  Copy,
  Upload,
  Loader2,
  Mail as MailIcon,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import EmailPreview from "./EmailPreview";
import EmailBlockPanel from "./EmailBlockPanel";

export default function EmailBuilder({ onSave, initialContent }) {
  const [blocks, setBlocks] = useState(initialContent?.blocks || []);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgImage, setBgImage] = useState("");
  const [draggedBlockId, setDraggedBlockId] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  React.useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const allCampaigns = await base44.entities.EmailCampaign.list();
      setCampaigns(allCampaigns.sort((a, b) => b.created_date.localeCompare(a.created_date)).slice(0, 5));
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
    setLoadingCampaigns(false);
  };

  const handleDragEnd = (result) => {
    const { source, destination, sourceDroppableId } = result;
    if (!destination) return;

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
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (file_url) {
        setUploadedImages((prev) => [...prev, file_url]);
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
      ...(type === "hero" && { bgImage: "", title: "Your Hero Title", subtitle: "Your subtitle here", titleColor: "#ffffff", subtitleColor: "#ffffff", height: 300 }),
      ...(type === "divider" && { color: "#e5e7eb", height: 1 }),
      ...(type === "footer" && { content: "© 2025 EX3DPrints. All rights reserved." }),
    };
    setBlocks((prev) => [...prev, newBlock]);
    toast({ title: `${type} block added` });
  };

  const handleDragStart = (e, blockId) => {
    setDraggedBlockId(blockId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnBlock = (e, targetBlockId) => {
    e.preventDefault();
    if (!draggedBlockId || draggedBlockId === targetBlockId) return;

    const draggedIndex = blocks.findIndex(b => b.id === draggedBlockId);
    const targetIndex = blocks.findIndex(b => b.id === targetBlockId);

    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, removed);
    setBlocks(newBlocks);
    setDraggedBlockId(null);
  };

  const getEmailHTML = () => {
    const bgStyle = bgImage ? `background-image: url('${bgImage}'); background-size: cover; background-position: center;` : `background-color: ${bgColor};`;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; ${bgStyle} }
          .email-container { max-width: 600px; margin: 0 auto; background: transparent; }
          img { max-width: 100%; height: auto; display: block; }
          .text-block { padding: 20px; margin: 0; }
          .button-block { text-align: center; padding: 20px; margin: 0; }
          .image-block { text-align: center; padding: 20px; margin: 0; }
          .spacer-block { margin: 0; }
          .divider-block { margin: 0; }
          .footer-block { background: #000000; color: #ffffff; padding: 20px; text-align: center; font-size: 12px; margin: 0; }
        </style>
      </head>
      <body style="margin: 0; padding: 0; ${bgStyle}">
        <div class="email-container" style="margin: 0 auto; max-width: 600px;">
          ${blocks.map((block) => {
            switch (block.type) {
              case "text":
                return `<div class="text-block" style="font-size: ${block.fontSize}px; color: ${block.color}; text-align: ${block.alignment};">${block.content}</div>`;
              case "button":
                return `<div class="button-block"><a href="${block.link}" style="display: inline-block; padding: 12px 24px; background: ${block.bgColor}; color: ${block.textColor}; text-decoration: none; border-radius: 6px; font-weight: bold;">${block.content}</a></div>`;
              case "image":
                return `<div class="image-block"><img src="${block.src}" style="width: ${block.width}px; max-width: 100%; height: auto; border-radius: 6px;" /></div>`;
              case "spacer":
                return `<div class="spacer-block" style="height: ${block.height}px;"></div>`;
              case "hero":
                return `<div style="background-image: url('${block.bgImage}'); background-size: cover; background-position: center; height: ${block.height}px; display: flex; align-items: center; justify-content: center; text-align: center;"><div><h1 style="color: ${block.titleColor}; margin: 0 0 10px 0;">${block.title}</h1><p style="color: ${block.subtitleColor}; margin: 0;">${block.subtitle}</p></div></div>`;
              case "divider":
                return `<div class="divider-block" style="border-top: ${block.height}px solid ${block.color}; margin: 20px 0;"></div>`;
              case "footer":
                return `<div class="footer-block">${block.content}</div>`;
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
    <div className="flex flex-col h-screen bg-slate-900">
      <div className="flex flex-1 gap-6 p-6 overflow-hidden">
        {/* Left Panel - Blocks */}
        <div className="w-48 flex flex-col gap-3 overflow-y-auto">
          <Card className="bg-slate-800 border-slate-700 flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xs">Add Blocks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Button onClick={() => addBlock("hero")} variant="outline" size="sm" className="w-full justify-start text-white bg-slate-700 border-slate-600 text-xs h-7">Hero</Button>
              <Button onClick={() => addBlock("text")} variant="outline" size="sm" className="w-full justify-start text-white bg-slate-700 border-slate-600 text-xs h-7">Text</Button>
              <Button onClick={() => addBlock("image")} variant="outline" size="sm" className="w-full justify-start text-white bg-slate-700 border-slate-600 text-xs h-7">Image</Button>
              <Button onClick={() => addBlock("button")} variant="outline" size="sm" className="w-full justify-start text-white bg-slate-700 border-slate-600 text-xs h-7">Button</Button>
              <Button onClick={() => addBlock("spacer")} variant="outline" size="sm" className="w-full justify-start text-white bg-slate-700 border-slate-600 text-xs h-7">Spacer</Button>
              <Button onClick={() => addBlock("divider")} variant="outline" size="sm" className="w-full justify-start text-white bg-slate-700 border-slate-600 text-xs h-7">Divider</Button>
              <Button onClick={() => addBlock("footer")} variant="outline" size="sm" className="w-full justify-start text-white bg-slate-700 border-slate-600 text-xs h-7">Footer</Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xs">Upload Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                size="sm"
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-xs h-7"
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                Upload
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-1 mt-2">
                  {uploadedImages.map((url, idx) => (
                    <img key={idx} src={url} alt="" className="aspect-square object-cover rounded border border-slate-700" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle Panel - Email Preview */}
        <div className="flex-1 flex flex-col gap-4" style={{ backgroundColor: bgColor, backgroundImage: bgImage ? `url('${bgImage}')` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="preview-blocks">
              {(provided) => (
                <Card className="bg-white border-gray-300 flex-1 flex flex-col overflow-hidden">
                  <CardContent className="flex-1 overflow-y-auto p-0" ref={provided.innerRef} {...provided.droppableProps}>
                    {blocks.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 p-8">
                        <p>No blocks yet. Add some from the left panel.</p>
                      </div>
                    ) : (
                      <div className="p-8 bg-white">
                        {blocks.map((block, index) => (
                          <Draggable key={block.id} draggableId={block.id} index={index}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={snapshot.isDragging ? "opacity-50 bg-gray-100" : ""}>
                                <EmailPreview blocks={[block]} selectedBlockId={selectedBlockId} onSelectBlock={setSelectedBlockId} onUpdateBlock={updateBlock} />
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

        {/* Right Panel - Settings */}
        <div className="w-56 flex flex-col gap-3 overflow-y-auto">
          <Card className="bg-slate-800 border-slate-700 flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xs">Email Background</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label className="text-white text-xs">Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="bg-slate-900 border-slate-600 h-8 cursor-pointer w-20"
                  />
                  <div style={{ backgroundColor: bgColor, width: "30px", height: "24px", borderRadius: "3px" }} />
                </div>
              </div>
              <div>
                <Label className="text-white text-xs">Image URL</Label>
                <Input
                  value={bgImage}
                  onChange={(e) => setBgImage(e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white text-xs h-7"
                  placeholder="https://example.com/bg.jpg"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xs">Blocks ({blocks.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-48 overflow-y-auto">
              {blocks.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-2">No blocks yet</p>
              ) : (
                blocks.map((block, index) => (
                  <div key={block.id} draggable onDragStart={(e) => handleDragStart(e, block.id)} onDragOver={handleDragOver} onDrop={(e) => handleDropOnBlock(e, block.id)} onClick={() => setSelectedBlockId(block.id)} className={`p-2 rounded border cursor-move text-xs transition-all ${selectedBlockId === block.id ? "border-cyan-500 bg-cyan-900 text-white" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"} ${draggedBlockId === block.id ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between">
                      <span>{block.type === "text" && "📝"}{block.type === "image" && "🖼️"}{block.type === "button" && "🔘"}{block.type === "spacer" && "⬌"}{block.type === "hero" && "🎯"}{block.type === "divider" && "─"}{block.type === "footer" && "🔗"} {index + 1}</span>
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }} className="text-cyan-400 hover:text-cyan-300"><Copy className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} className="text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {selectedBlockId && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-xs">Block Settings</CardTitle>
              </CardHeader>
              <CardContent className="max-h-64 overflow-y-auto">
                <EmailBlockPanel block={blocks.find((b) => b.id === selectedBlockId)} onUpdate={(updates) => updateBlock(selectedBlockId, updates)} uploadedImages={uploadedImages} />
              </CardContent>
            </Card>
          )}

          <Card className="bg-slate-800 border-slate-700 flex-shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xs">Recent Campaigns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-48 overflow-y-auto">
              {loadingCampaigns ? (
                <p className="text-slate-400 text-xs text-center py-2">Loading...</p>
              ) : campaigns.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-2">No campaigns yet</p>
              ) : (
                campaigns.map((campaign) => (
                  <div key={campaign.id} className="p-2 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 text-xs cursor-pointer hover:text-white transition-all">
                    <p className="font-medium truncate">{campaign.name}</p>
                    <p className="text-slate-500 text-xs truncate">{campaign.email_subject}</p>
                    <Badge className={campaign.is_active ? 'bg-green-500 text-xs mt-1' : 'bg-gray-500 text-xs mt-1'}>
                      {campaign.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-2 flex-shrink-0">
            <Button className="w-full bg-teal-600 hover:bg-teal-700 text-xs h-8"><MailIcon className="w-3 h-3 mr-1" />Setup Campaign</Button>
          </div>
        </div>
      </div>
    </div>
  );
}