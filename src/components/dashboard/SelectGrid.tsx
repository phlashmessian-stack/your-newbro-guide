interface SelectGridItem {
  value: string;
  label?: string;
  icon?: string;
}

interface SelectGridProps {
  items: SelectGridItem[];
  value: string;
  onChange: (v: string) => void;
  cols?: number;
}

const SelectGrid = ({ items, value, onChange, cols = 4 }: SelectGridProps) => (
  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
    {items.map((item) => {
      const active = item.value === value;
      return (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={`relative py-3 rounded-2xl border text-sm font-medium transition-all duration-200 active:scale-[0.96] ${
            active
              ? "border-primary/40 bg-primary/10 text-primary shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)]"
              : "border-border/30 bg-secondary/30 text-muted-foreground hover:text-foreground hover:border-border/50 hover:bg-secondary/50"
          }`}
        >
          {item.icon ? `${item.icon} ` : ""}
          {item.label || item.value}
          {active && (
            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </button>
      );
    })}
  </div>
);

export default SelectGrid;
