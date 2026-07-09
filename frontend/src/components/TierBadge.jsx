export function TierBadge({ tier }) {
  const normalizedTier = tier || 'bronze';

  return <span className={`tier-badge tier-${normalizedTier}`}>{normalizedTier}</span>;
}
