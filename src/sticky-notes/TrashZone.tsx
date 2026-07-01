interface TrashZoneProps {
  readonly isActive: boolean;
}

export function TrashZone({ isActive }: TrashZoneProps) {
  return (
    <div className={`trash-zone${isActive ? ' trash-zone--active' : ''}`}>
      <span aria-hidden="true">🗑</span>
    </div>
  );
}
