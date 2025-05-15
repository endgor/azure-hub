import Image from 'next/image';
import { ImageProps } from 'next/image';

interface OptimizedImageProps extends Omit<ImageProps, 'alt'> {
  alt: string;  // Make alt text required
}

export default function OptimizedImage({ alt, ...props }: OptimizedImageProps) {
  return (
    <Image
      {...props}
      alt={alt}
      loading="lazy"
      quality={85}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}
