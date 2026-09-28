interface SkeletonProps {
  className?: string;
  height?: number | string;
  width?: number | string;
}

export function Skeleton({ className = '', height = 16, width }: SkeletonProps) {
  return (
    <span
      className={`skeleton inline-block ${className}`}
      style={{ height, width: width ?? '100%', display: 'block' }}
      aria-hidden="true"
    />
  );
}
