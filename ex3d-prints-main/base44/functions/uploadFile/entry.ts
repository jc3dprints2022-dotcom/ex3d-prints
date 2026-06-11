import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Unauthorized' 
            }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const formData = await req.formData();
        const file = formData.get('file');
        
        if (!file) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'No file provided' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Use Base44 Core integration to upload file
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        return new Response(JSON.stringify({ 
            success: true,
            file_url: file_url
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('File upload error:', error);
        return new Response(JSON.stringify({ 
            success: false,
            error: error.message || 'Failed to upload file' 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});