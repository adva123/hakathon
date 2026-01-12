import PropTypes from 'prop-types';

export default function ImageUploader({
  label,
  accept = 'image/png,image/jpeg',
  onDataUrl,
  className,
}) {
  return (
    <label className={className} style={{ display: 'inline-block' }}>
      {label ? <span style={{ fontWeight: 600, marginRight: 8 }}>{label}</span> : null}
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (!['image/png', 'image/jpeg'].includes(file.type)) return;

          // Downscale + compress to keep storage small and rendering stable.
          const reader = new FileReader();
          reader.onload = async () => {
            const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
            if (!rawDataUrl) return;

            try {
              const img = new Image();
              img.onload = () => {
                const maxDim = 384;
                const w = img.naturalWidth || img.width;
                const h = img.naturalHeight || img.height;
                if (!w || !h) {
                  onDataUrl(rawDataUrl);
                  return;
                }

                const scale = Math.min(1, maxDim / Math.max(w, h));
                const tw = Math.max(1, Math.round(w * scale));
                const th = Math.max(1, Math.round(h * scale));

                const canvas = document.createElement('canvas');
                canvas.width = tw;
                canvas.height = th;
                const ctx = canvas.getContext('2d', { alpha: false });
                if (!ctx) {
                  onDataUrl(rawDataUrl);
                  return;
                }
                ctx.drawImage(img, 0, 0, tw, th);

                // JPEG is much smaller than PNG for photos.
                const compressed = canvas.toDataURL('image/jpeg', 0.86);
                onDataUrl(compressed);
              };
              img.onerror = () => onDataUrl(rawDataUrl);
              img.src = rawDataUrl;
            } catch {
              onDataUrl(rawDataUrl);
            }
          };
          reader.readAsDataURL(file);
        }}
      />
    </label>
  );
}

ImageUploader.propTypes = {
  label: PropTypes.string,
  accept: PropTypes.string,
  onDataUrl: PropTypes.func.isRequired,
  className: PropTypes.string,
};
