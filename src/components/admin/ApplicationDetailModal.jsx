
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Home, Briefcase } from 'lucide-react'; // Removed BarChart and LinkIcon as they are no longer used

export default function ApplicationDetailModal({ isOpen, onClose, application, type, onUpdate }) {
  if (!application) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === 'maker' ? 'Maker' : 'Designer'} Application - {application?.full_name}
          </DialogTitle>
          <DialogDescription>Review the information submitted by the applicant.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Common basic info */}
          <div className="flex items-center gap-3"><User className="w-5 h-5 text-slate-500" /><p><strong>Full Name:</strong> {application.full_name}</p></div>
          <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-slate-500" /><p><strong>Email:</strong> {application.email}</p></div>

          {/* Maker-specific info */}
          {type === 'maker' && (
            <>
              {/* Phone and Address from original maker details */}
              <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-slate-500" /><p><strong>Phone:</strong> {application.phone}</p></div>
              <div className="flex items-start gap-3">
                <Home className="w-5 h-5 text-slate-500 mt-1" />
                <div>
                  <p><strong>Address:</strong></p>
                  <div className="pl-4 text-sm text-slate-600">
                    <p>{application.address?.street}</p>
                    <p>{application.address?.city}, {application.address?.state} {application.address?.zip}</p>
                    <p>{application.address?.country}</p>
                  </div>
                </div>
              </div>

              {/* Experience Level and Weekly Capacity (updated display from outline) */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold text-gray-700">Experience Level</Label>
                  <p className="text-gray-900 capitalize">{application?.experience_level}</p>
                </div>
                <div>
                  <Label className="font-semibold text-gray-700">Weekly Capacity</Label>
                  <p className="text-gray-900">{application?.weekly_capacity} hours/week</p>
                </div>
              </div>

              {/* Materials (new from outline) */}
              {application?.materials && application.materials.length > 0 && (
                <div>
                  <Label className="font-semibold text-gray-700 block mb-2">Materials</Label>
                  <div className="flex flex-wrap gap-2">
                    {application.materials.map((material, idx) => (
                      <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-800">
                        {material}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Colors (new from outline) */}
              {application?.colors && application.colors.length > 0 && (
                <div>
                  <Label className="font-semibold text-gray-700 block mb-2">Colors</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {application.colors.map((color, idx) => (
                      <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-800">
                        {color}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Designer-specific info (from original designer details) */}
          {type === 'designer' && (
            <>
              <div className="flex items-center gap-3"><User className="w-5 h-5 text-slate-500" /><p><strong>Designer Name:</strong> {application.designer_name}</p></div>
              <div className="mt-2">
                <p><strong>Bio:</strong></p>
                <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded border">{application.bio}</p>
              </div>
              <div className="mt-2">
                <p><strong>Portfolio Links:</strong></p>
                <ul className="list-disc pl-8 text-sm text-slate-600">
                  {(application.portfolio_links || []).map((link, i) => (
                    <li key={i}><a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{link}</a></li>
                  ))}
                </ul>
              </div>
              <div className="mt-2">
                <p><strong>Design Categories:</strong></p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(application.design_categories || []).map(cat => <Badge key={cat} variant="secondary">{cat}</Badge>)}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2"><Briefcase className="w-5 h-5 text-slate-500" /><p><strong>Experience Level:</strong> <span className="capitalize">{application.experience_level}</span></p></div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
