import { uploadedAssetUrl } from '../services/vendorService.js';

export function VendorAvatar({ logoUrl, companyName, size = 'medium' }) {
  const initial = (companyName || 'Vendor').trim().charAt(0).toUpperCase() || 'V';

  if (logoUrl) {
    return (
      <img
        alt={`${companyName || 'Vendor'} logo`}
        className={`vendor-avatar vendor-avatar-${size}`}
        src={uploadedAssetUrl(logoUrl)}
      />
    );
  }

  return <span className={`vendor-avatar vendor-avatar-${size} vendor-avatar-fallback`}>{initial}</span>;
}
