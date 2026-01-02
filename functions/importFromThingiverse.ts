import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";
import * as cheerio from "npm:cheerio@1.0.0-rc.12";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { url } = await req.json();
    if (!url?.includes("thingiverse.com"))
      return Response.json({ error: "Invalid Thingiverse URL" }, { status: 400 });

    // -----------------------------
    //   Extract Thing ID
    // -----------------------------
    const thingId = url.match(/thing:(\d+)/)?.[1];
    if (!thingId)
      return Response.json({ error: "Could not extract thing ID" }, { status: 400 });

    // -----------------------------
    //   Fetch core HTML for fallback title/desc
    // -----------------------------
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await pageRes.text();
    const $ = cheerio.load(html);

    // Title + description fallbacks
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('h1[data-test="thing-name"]').text().trim() ||
      "";
    const description =
      $('meta[property="og:description"]').attr("content") ||
      $("div[data-test='thing-description']").text().trim() ||
      "";

    // -----------------------------
    //   Fetch images from Thingiverse API
    // -----------------------------
    const apiRes = await fetch(
      `https://api.thingiverse.com/things/${thingId}/images`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );

    const imageData = apiRes.ok ? await apiRes.json() : [];
    const imageUrls = [];
    for (const img of imageData) {
      const size =
        img.sizes?.find((s) => s.type === "display" || s.size === "large") ||
        img.sizes?.[0];
      if (size?.url && !imageUrls.includes(size.url)) imageUrls.push(size.url);
    }

    console.log(`✅ Found ${imageUrls.length} images via API`);

    // -----------------------------
    //   Fetch downloadable files
    // -----------------------------
    const fileApi = await fetch(
      `https://api.thingiverse.com/things/${thingId}/files`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const fileData = fileApi.ok ? await fileApi.json() : [];

    const fileUrls = fileData
      .map((f) => f.public_url || f.download_url)
      .filter(Boolean)
      .slice(0, 10);

    console.log(`✅ Found ${fileUrls.length} downloadable files`);

    // -----------------------------
    //   Upload ALL Images to Base44
    // -----------------------------
    const uploadedImages = [];
    for (const imageUrl of imageUrls) {
      try {
        const r = await fetch(imageUrl);
        if (r.ok) {
          const blob = await r.blob();
          const filename = imageUrl.split("/").pop().split("?")[0];
          const file = new File([blob], filename, { type: blob.type });
          const up = await base44.integrations.Core.UploadFile({ file });
          uploadedImages.push(up.file_url);
        }
      } catch (e) {
        console.log("Image upload failed:", e.message);
      }
    }

    // -----------------------------
    //   Upload 3D Files to Base44
    // -----------------------------
    const uploadedFiles = [];
    for (const fileUrl of fileUrls) {
      try {
        const r = await fetch(fileUrl);
        if (r.ok) {
          const blob = await r.blob();
          const cd = r.headers.get("content-disposition");
          let name = "model.stl";
          if (cd) {
            const m = cd.match(/filename="?([^"]+)"?/);
            if (m) name = m[1];
          }
          const file = new File([blob], name, {
            type: blob.type || "application/octet-stream",
          });
          const up = await base44.integrations.Core.UploadFile({ file });
          uploadedFiles.push(up.file_url);
        }
      } catch (e) {
        console.log("File upload failed:", e.message);
      }
    }

    // -----------------------------
    //   Return Response
    // -----------------------------
    return Response.json({
      success: true,
      data: {
        title: title || "Untitled Design",
        description: description || "No description available",
        images: uploadedImages,
        print_files: uploadedFiles,
        platform: "Thingiverse",
      },
    });
  } catch (error) {
    console.error("Import error:", error);
    return Response.json(
      { error: error.message || "Failed to import from Thingiverse" },
      { status: 500 }
    );
  }
});