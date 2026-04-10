interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filters?: { label: string; value: string; options: { label: string; value: string }[] }[];
  onFilterChange?: (filterName: string, value: string) => void;
}

export function SearchFilter({ searchTerm, onSearchChange, placeholder = 'Search...', filters, onFilterChange }: SearchFilterProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex gap-4 items-center">
      <div className="flex-1">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border rounded-lg px-4 py-2"
        />
      </div>
      {filters?.map((filter) => (
        <select
          key={filter.value}
          onChange={(e) => onFilterChange?.(filter.value, e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}
    </div>
  );
}
