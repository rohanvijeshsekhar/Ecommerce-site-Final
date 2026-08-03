import { api } from '../api';

export interface ShareableProduct {
  id: string;
  name: string;
  slug: string;
  price?: number;
  originalPrice?: number;
  discountPercentage?: number;
  short_description?: string;
  image_url?: string;
  image?: string;
}

export const shareService = {
  // Generate canonical product URL
  getCanonicalUrl(slug: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://faazo.com';
    return `${origin}/products/${slug}`;
  },

  // Format share message template
  getShareMessage(product: ShareableProduct): string {
    const url = this.getCanonicalUrl(product.slug || product.id);
    const priceStr = product.price ? `₹${Number(product.price).toLocaleString('en-IN')}` : '';

    return `🔥 Check out this product on FAAZO Dental Solutions!

Product:
${product.name}

${priceStr ? `Price: ${priceStr}` : ''}

View Product:
${url}`;
  },

  // Generate platform-specific share URL
  getPlatformShareUrl(platform: string, product: ShareableProduct): string {
    const url = this.getCanonicalUrl(product.slug || product.id);
    const text = this.getShareMessage(product);

    switch (platform) {
      case 'whatsapp':
        return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      case 'telegram':
        return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(product.name)}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(product.name)}&url=${encodeURIComponent(url)}`;
      case 'linkedin':
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
      case 'email':
        return `mailto:?subject=${encodeURIComponent(`Check out ${product.name} on FAAZO`)}&body=${encodeURIComponent(text)}`;
      default:
        return url;
    }
  },

  // Log analytics share event to backend
  async logShareEvent(productId: string, platform: string): Promise<void> {
    if (!productId) return;
    try {
      await api.post(`products/${productId}/share-log/`, { platform });
    } catch (e) {
      console.error('Failed to log share event:', e);
    }
  },
};
