import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

// ============== PRODUCTS ==============

export const useGetProducts = (args?: {
  status?: "active" | "inactive" | "draft" | "all";
  category?: string;
  productType?: "glassat" | "wsayd" | "coudoir" | "zerbiya" | "majalis_set";
}) => {
  return useQuery(api.products.getProducts, args ?? {});
};

export const useGetProductBySlug = (slug: string) => {
  return useQuery(api.products.getProductBySlug, { slug });
};

export const useGetProductById = (id: Id<"products"> | null) => {
  return useQuery(api.products.getProductById, id ? { id } : 'skip');
};

export const useGetFeaturedProducts = () => {
  return useQuery(api.products.getFeaturedProducts);
};

export const useGetPopularProducts = () => {
  return useQuery(api.products.getPopularProducts);
};

export const useCreateProduct = () => {
  return useMutation(api.products.createProduct);
};

export const useUpdateProduct = () => {
  return useMutation(api.products.updateProduct);
};

export const useDeleteProduct = () => {
  return useMutation(api.products.deleteProduct);
};

export const useUpdateInventory = () => {
  return useMutation(api.products.updateInventory);
};

export const useInitializeMandatoryProducts = () => {
  return useMutation(api.products.initializeMandatoryProducts);
};

export const useGetProductsBySubcategory = (category: string, subcategory: string) => {
  return useQuery(api.products.getProductsBySubcategory, { category, subcategory });
};

export const useAssignSubcategory = () => {
  return useMutation(api.products.assignSubcategory);
};

export const useRemoveSubcategory = () => {
  return useMutation(api.products.removeSubcategory);
};

// ============== CATEGORIES ==============

export const useGetCategories = (args?: { activeOnly?: boolean; topLevelOnly?: boolean }) => {
  return useQuery(api.categories.getCategories, args ?? {});
};

export const useCreateCategory = () => {
  return useMutation(api.categories.createCategory);
};

export const useUpdateCategory = () => {
  return useMutation(api.categories.updateCategory);
};

export const useDeleteCategory = () => {
  return useMutation(api.categories.deleteCategory);
};

export const useSeedCategories = () => {
  return useMutation(api.categories.seedCategories);
};

// ============== SUBCATEGORIES ==============

export const useGetSubcategories = (parentId: Id<"categories">) => {
  return useQuery(api.categories.getSubcategories, { parentId });
};

export const useGetSubcategoriesBySlug = (parentSlug: string) => {
  return useQuery(api.categories.getSubcategoriesBySlug, { parentSlug });
};

export const useCreateSubcategory = () => {
  return useMutation(api.categories.createSubcategory);
};

// ============== GALLERY IMAGES ==============

export const useGetGalleryImages = () => {
  return useQuery(api.galleryImages.getGalleryImages);
};

export const useAddGalleryImages = () => {
  return useMutation(api.galleryImages.addGalleryImages);
};

export const useDeleteGalleryImages = () => {
  return useMutation(api.galleryImages.deleteGalleryImages);
};

export const useSeedGalleryImages = () => {
  return useMutation(api.galleryImages.seedGalleryImages);
};

// ============== CUSTOMERS ==============

export const useGetCustomers = () => {
  return useQuery(api.customers.getCustomers);
};

export const useGetCustomerByEmail = (email: string) => {
  return useQuery(api.customers.getCustomerByEmail, { email });
};

export const useGetCustomerById = (id: Id<"customers">) => {
  return useQuery(api.customers.getCustomerById, { id });
};

export const useCreateCustomer = () => {
  return useMutation(api.customers.createCustomer);
};

export const useUpdateCustomer = () => {
  return useMutation(api.customers.updateCustomer);
};

export const useDeleteCustomer = () => {
  return useMutation(api.customers.deleteCustomer);
};

export const useAddOrderToCustomer = () => {
  return useMutation(api.customers.addOrderToCustomer);
};

export const useGetCustomerOrders = (customerId: Id<"customers">) => {
  return useQuery(api.customers.getCustomerOrders, { customerId });
};

// ============== ORDERS ==============

export const useGetOrders = (args?: {
  status?: "draft" | "pending_payment" | "confirmed" | "in_production" | "ready_for_delivery" | "delivered" | "cancelled";
  orderType?: "direct_purchase" | "room_measurement";
}) => {
  return useQuery(api.orders.getOrders, args ?? {});
};

export const useGetOrderById = (id: Id<"orders"> | null) => {
  return useQuery(api.orders.getOrderById, id ? { id } : 'skip');
};

export const useGetOrderByReference = (reference: string) => {
  return useQuery(api.orders.getOrderByReference, { reference });
};

export const useGetOrdersByCustomerEmail = (email: string) => {
  return useQuery(api.orders.getOrdersByCustomerEmail, { email });
};

export const useCreateDirectPurchaseOrder = () => {
  return useMutation(api.orders.createDirectPurchaseOrder);
};

export const useCreateRoomMeasurementOrder = () => {
  return useMutation(api.orders.createRoomMeasurementOrder);
};

export const useUpdateOrderStatus = () => {
  return useMutation(api.orders.updateOrderStatus);
};

export const useUpdateOrder = () => {
  return useMutation(api.orders.updateOrder);
};

export const useDeleteOrder = () => {
  return useMutation(api.orders.deleteOrder);
};

export const useSoftDeleteOrder = () => {
  return useMutation(api.orders.softDeleteOrder);
};

export const useRestoreOrder = () => {
  return useMutation(api.orders.restoreOrder);
};

export const useGetRecentOrders = (limit?: number) => {
  return useQuery(api.orders.getRecentOrders, limit !== undefined ? { limit } : {});
};

export const useGetOrderStats = () => {
  return useQuery(api.orders.getOrderStats);
};

// ============== BLOGS ==============

export const useGetAllBlogs = () => {
  return useQuery(api.blogs.getAll);
};

export const useGetPublishedBlogs = () => {
  return useQuery(api.blogs.getPublished);
};

export const useGetBlogBySlug = (slug: string) => {
  return useQuery(api.blogs.getBySlug, { slug });
};

export const useGetBlogById = (id: Id<"blogs">) => {
  return useQuery(api.blogs.getById, { id });
};

export const useGetAllBlogsForAdmin = () => {
  return useQuery(api.blogs.getAllForAdmin);
};

export const useGetBlogsByStatus = (status: "published" | "draft") => {
  return useQuery(api.blogs.getByStatus, { status });
};

export const useCreateBlog = () => {
  return useMutation(api.blogs.create);
};

export const useUpdateBlog = () => {
  return useMutation(api.blogs.update);
};

export const useDeleteBlog = () => {
  return useMutation(api.blogs.remove);
};

export const useToggleBlogStatus = () => {
  return useMutation(api.blogs.toggleStatus);
};

// ============== REVIEWS ==============

export const useGetReviews = (args?: {
  status?: "pending" | "approved" | "rejected";
}) => {
  return useQuery(api.reviews.getReviews, args ?? {});
};

export const useGetProductReviews = (productId: Id<"products">) => {
  return useQuery(api.reviews.getProductReviews, { productId });
};

export const useGetApprovedProductReviews = (productId: Id<"products"> | undefined) => {
  return useQuery(api.reviews.getApprovedProductReviews, productId ? { productId } : 'skip');
};

export const useCreateReview = () => {
  return useMutation(api.reviews.createReview);
};

export const useUpdateReviewStatus = () => {
  return useMutation(api.reviews.updateReviewStatus);
};

export const useDeleteReview = () => {
  return useMutation(api.reviews.deleteReview);
};

// ============== INVENTORY ==============

export const useGetProductInventoryHistory = (productId: Id<"products"> | null) => {
  return useQuery(api.inventory.getProductInventoryHistory, productId ? { productId } : 'skip');
};

export const useGetAllInventoryHistory = (limit?: number) => {
  return useQuery(api.inventory.getAllInventoryHistory, limit !== undefined ? { limit } : {});
};

export const useGetInventoryByOperation = (operation: "add" | "subtract" | "adjustment", limit?: number) => {
  return useQuery(api.inventory.getInventoryByOperation, { operation, limit });
};

export const useLogInventoryChange = () => {
  return useMutation(api.inventory.logInventoryChange);
};

// ============== FABRIC VARIANTS ==============

export const useGetFabricVariants = () => {
  return useQuery(api.fabricVariants.getAll);
};

export const useGetActiveFabricVariants = () => {
  return useQuery(api.fabricVariants.getActive);
};

export const useGetFabricVariantById = (id: Id<"fabricVariants"> | null) => {
  return useQuery(api.fabricVariants.getById, id ? { id } : 'skip');
};

export const useCreateFabricVariant = () => {
  return useMutation(api.fabricVariants.create);
};

export const useUpdateFabricVariant = () => {
  return useMutation(api.fabricVariants.update);
};

export const useUpdateFabricVariantStock = () => {
  return useMutation(api.fabricVariants.updateStock);
};

export const useDeleteFabricVariant = () => {
  return useMutation(api.fabricVariants.remove);
};

export const useGetFabricVariantInventoryHistory = (fabricVariantId: Id<"fabricVariants"> | null) => {
  return useQuery(api.fabricVariants.getInventoryHistory, fabricVariantId ? { fabricVariantId } : 'skip');
};

export const useGetRecentHistoryForAll = () => {
  return useQuery(api.fabricVariants.getRecentHistoryForAll, {});
};

export const useGetFabricVariantsByCategory = (categoryId: Id<"categories"> | null) => {
  return useQuery(api.fabricVariants.getByCategory, categoryId ? { categoryId } : 'skip');
};

export const useGetFabricVariantsBySubcategory = (subcategoryId: Id<"categories"> | null) => {
  return useQuery(api.fabricVariants.getBySubcategory, subcategoryId ? { subcategoryId } : 'skip');
};

// ============== CARPET FEEDBACK ==============

export const useGetAllCarpetFeedback = () => {
  return useQuery(api.carpetFeedback.getAll);
};

export const useSaveCarpetFeedback = () => {
  return useMutation(api.carpetFeedback.saveFeedback);
};

export const useDeleteCarpetFeedback = () => {
  return useMutation(api.carpetFeedback.deleteFeedback);
};
