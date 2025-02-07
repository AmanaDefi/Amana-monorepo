const PendingDots = ({className}: { className?: string }) => {
  return (
    <span className={`whitespace-nowrap ${className || ''}`}>
      <span className={'opacity-0 animate-dot1'}>.</span>
      <span className={'opacity-0 animate-dot2'}>.</span>
      <span className={'opacity-0 animate-dot3'}>.</span>
    </span>
  );
};

export default PendingDots;
