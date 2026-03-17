import * as React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

// ──── Simple native-select compound components (shadcn-compatible API) ────

interface SelectContextValue {
  value: string;
  onChange: (val: string) => void;
}
const SelectCtx = React.createContext<SelectContextValue>({ value: "", onChange: () => {} });

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const controlled = value !== undefined;
  const current = controlled ? (value ?? "") : internal;
  const onChange = (val: string) => {
    if (!controlled) setInternal(val);
    onValueChange?.(val);
  };
  return <SelectCtx.Provider value={{ value: current, onChange }}>{children}</SelectCtx.Provider>;
}

export function SelectTrigger({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  const { value, onChange } = React.useContext(SelectCtx);
  // Rendered by SelectContent's underlying <select>
  return <div className={`select-trigger-wrapper ${className}`} data-value={value}>{children}</div>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectCtx);
  return <span className="select-value">{value || placeholder}</span>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  const { value, onChange } = React.useContext(SelectCtx);
  // Collect option values from SelectItem children
  const opts: { val: string; label: string }[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && (child as any).props?.value !== undefined) {
      opts.push({ val: (child as any).props.value, label: (child as any).props.children ?? (child as any).props.value });
    }
  });
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        position: "absolute",
        left: 0, top: 0, width: "100%", height: "100%",
        opacity: 0, cursor: "pointer", zIndex: 1,
      }}
    >
      {opts.map((o) => (
        <option key={o.val} value={o.val}>{o.label}</option>
      ))}
    </select>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  // Rendered inside SelectContent collector — no DOM output needed
  return null;
}

// ──── Legacy simple Select ────

interface SimpleProp extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  placeholder?: string;
}

export function SimpleSelect({ options = [], placeholder, ...props }: SimpleProp) {
  return (
    <select
      className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm shadow-sm focus-visible:outline-none"
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
