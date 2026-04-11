import { cn } from '@/shared/lib/cn';

import './skeleton.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({ width = '100%', height = 18, className }: SkeletonProps): React.JSX.Element {
  return <div className={cn('skeleton', className)} style={{ width, height }} />;
}


