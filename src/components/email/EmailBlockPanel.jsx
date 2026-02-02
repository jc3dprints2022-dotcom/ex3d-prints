import React from "react";
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

export default function EmailBlockPanel({ block, onUpdate, uploadedImages }) {
  if (!block) return null;

  const renderSettings = () => {
    switch (block.type) {
      case "text":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white text-sm">Content</Label>
              <Textarea
                value={block.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                className="bg-slate-900 border-slate-600 text-white text-sm"
                rows={4}
              />
            </div>
            <div>
              <Label className="text-white text-sm">Font Size</Label>
              <Input
                type="number"
                value={block.fontSize || 16}
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-white text-sm">Color</Label>
              <Input
                type="color"
                value={block.color || "#000000"}
                onChange={(e) => onUpdate({ color: e.target.value })}
                className="bg-slate-900 border-slate-600 h-10"
              />
            </div>
            <div>
              <Label className="text-white text-sm">Alignment</Label>
              <Select value={block.alignment || "left"} onValueChange={(v) => onUpdate({ alignment: v })}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "button":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white text-sm">Button Text</Label>
              <Input
                value={block.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-white text-sm">Link URL</Label>
              <Input
                value={block.link || "#"}
                onChange={(e) => onUpdate({ link: e.target.value })}
                className="bg-slate-900 border-slate-600 text-white"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label className="text-white text-sm">Button Color</Label>
              <Input
                type="color"
                value={block.bgColor || "#14b8a6"}
                onChange={(e) => onUpdate({ bgColor: e.target.value })}
                className="bg-slate-900 border-slate-600 h-10"
              />
            </div>
            <div>
              <Label className="text-white text-sm">Text Color</Label>
              <Input
                type="color"
                value={block.textColor || "#ffffff"}
                onChange={(e) => onUpdate({ textColor: e.target.value })}
                className="bg-slate-900 border-slate-600 h-10"
              />
            </div>
          </div>
        );

      case "image":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white text-sm">Image URL</Label>
              <Input
                value={block.src || ""}
                onChange={(e) => onUpdate({ src: e.target.value })}
                className="bg-slate-900 border-slate-600 text-white"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            {uploadedImages.length > 0 && (
              <div>
                <Label className="text-white text-sm">Or select from library</Label>
                <div className="grid grid-cols-3 gap-2">
                  {uploadedImages.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => onUpdate({ src: url })}
                      className={`aspect-square rounded overflow-hidden border-2 ${
                        block.src === url ? "border-cyan-500" : "border-slate-600"
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label className="text-white text-sm">Width (px)</Label>
              <Input
                type="number"
                value={block.width || 300}
                onChange={(e) => onUpdate({ width: parseInt(e.target.value) })}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-white text-sm">Height (px)</Label>
              <Input
                type="number"
                value={block.height || 200}
                onChange={(e) => onUpdate({ height: parseInt(e.target.value) })}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-white text-sm">Alignment</Label>
              <Select value={block.alignment || "center"} onValueChange={(v) => onUpdate({ alignment: v })}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "spacer":
        return (
          <div>
            <Label className="text-white text-sm">Height (px)</Label>
            <Input
              type="number"
              value={block.height || 20}
              onChange={(e) => onUpdate({ height: parseInt(e.target.value) })}
              className="bg-slate-900 border-slate-600 text-white"
            />
          </div>
        );

      case "hero":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white text-sm">Background Image</Label>
              <Input
                value={block.bgImage || ""}
                onChange={(e) => onUpdate({ bgImage: e.target.value })}
                className="bg-slate-900 border-slate-600 text-white"
                placeholder="https://example.com/bg.jpg"
              />
            </div>
            <div>
              <Label className="text-white text-sm">Title</Label>
              <Input
                value={block.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-white text-sm">Subtitle</Label>
              <Input
                value={block.subtitle}
                onChange={(e) => onUpdate({ subtitle: e.target.value })}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-white text-sm">Title Color</Label>
              <Input
                type="color"
                value={block.titleColor || "#ffffff"}
                onChange={(e) => onUpdate({ titleColor: e.target.value })}
                className="bg-slate-900 border-slate-600 h-10"
              />
            </div>
            <div>
              <Label className="text-white text-sm">Subtitle Color</Label>
              <Input
                type="color"
                value={block.subtitleColor || "#ffffff"}
                onChange={(e) => onUpdate({ subtitleColor: e.target.value })}
                className="bg-slate-900 border-slate-600 h-10"
              />
            </div>
            <div>
              <Label className="text-white text-sm">Height (px)</Label>
              <Input
                type="number"
                value={block.height || 300}
                onChange={(e) => onUpdate({ height: parseInt(e.target.value) })}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
          </div>
        );

      case "divider":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white text-sm">Color</Label>
              <Input
                type="color"
                value={block.color || "#e5e7eb"}
                onChange={(e) => onUpdate({ color: e.target.value })}
                className="bg-slate-900 border-slate-600 h-10"
              />
            </div>
            <div>
              <Label className="text-white text-sm">Height (px)</Label>
              <Input
                type="number"
                value={block.height || 1}
                onChange={(e) => onUpdate({ height: parseInt(e.target.value) })}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <div className="space-y-4">{renderSettings()}</div>;
}