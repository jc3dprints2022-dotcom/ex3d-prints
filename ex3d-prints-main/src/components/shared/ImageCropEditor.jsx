import React, { useState, useRef } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Crop } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function ImageCropEditor({ isOpen, onClose, imageUrl, onSave }) {
  const aspectRatio = 3 / 2; // Width / Height = 66.67% padding-bottom ratio
  const [crop, setCrop] = useState({ unit: "%", width: 90, aspect: aspectRatio });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef(null);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current) {
      toast({ title: "Please make a crop selection", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      const image = imgRef.current;
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = completedCrop.width;
      canvas.height = completedCrop.height;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      );

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast({ title: "Failed to create image", variant: "destructive" });
          setSaving(false);
          return;
        }

        const file = new File([blob], "cropped-image.jpg", { type: "image/jpeg" });
        const result = await base44.integrations.Core.UploadFile({ file });
        
        onSave(result.file_url);
        toast({ title: "Image cropped and saved!" });
        onClose();
        setSaving(false);
      }, "image/jpeg", 0.95);
    } catch (error) {
      toast({ title: "Failed to save cropped image", description: error.message, variant: "destructive" });
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crop & Resize Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scale">Scale: {scale.toFixed(2)}x</Label>
              <Input
                id="scale"
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="rotate">Rotate: {rotate}°</Label>
              <Input
                id="rotate"
                type="range"
                min="0"
                max="360"
                step="1"
                value={rotate}
                onChange={(e) => setRotate(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-center bg-gray-100 p-4 rounded-lg">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop preview"
                crossOrigin="anonymous"
                style={{
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                  maxHeight: "500px",
                  maxWidth: "100%"
                }}
              />
            </ReactCrop>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Crop className="w-4 h-4 mr-2" />
                Save Cropped Image
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}