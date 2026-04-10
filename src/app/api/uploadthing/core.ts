import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/clerk-auth";

const f = createUploadthing();

export const ourFileRouter = {
  // Featured image uploader - single image
  featuredImage: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1
    }
  })
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new UploadThingError("Unauthorized");

      const adminStatus = await isAdmin();
      if (!adminStatus) throw new UploadThingError("Admin access required");

      return { userId, uploadType: "featured" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("✅ Featured image uploaded!");
      console.log("📁 File:", file.name);
      console.log("🔗 URL:", file.url);
      
      return { 
        uploadedBy: metadata.userId,
        url: file.url,
        name: file.name
      };
    }),

  // Gallery images uploader - multiple images
  galleryImages: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 10
    }
  })
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new UploadThingError("Unauthorized");

      const adminStatus = await isAdmin();
      if (!adminStatus) throw new UploadThingError("Admin access required");

      return { userId, uploadType: "gallery" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("✅ Gallery image uploaded!");
      console.log("📁 File:", file.name);
      console.log("🔗 URL:", file.url);
      
      return { 
        uploadedBy: metadata.userId,
        url: file.url,
        name: file.name
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;