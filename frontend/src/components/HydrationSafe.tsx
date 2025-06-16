import { useEffect, useState, ReactNode } from 'react';

interface HydrationSafeProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

/**
 * HydrationSafe component prevents hydration mismatches by only rendering
 * children after the component has hydrated on the client side.
 * 
 * This is useful for components that depend on browser-only APIs or
 * have different server/client rendering.
 */
export default function HydrationSafe({ 
  children, 
  fallback = <div className="animate-pulse">Loading...</div>,
  className 
}: HydrationSafeProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className={className}>
        {fallback}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Higher-order component version for wrapping components
 */
export function withHydrationSafe<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function HydrationSafeComponent(props: P) {
    return (
      <HydrationSafe fallback={fallback}>
        <Component {...props} />
      </HydrationSafe>
    );
  };
} 