import useBreakpoint from 'use-breakpoint';

const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };

export const useScreenSize = () => {
  const { breakpoint } = useBreakpoint(BREAKPOINTS);
  return { breakpoint, isMobile: breakpoint === 'sm', isSmall: breakpoint === 'sm' || breakpoint === 'md' };
};
