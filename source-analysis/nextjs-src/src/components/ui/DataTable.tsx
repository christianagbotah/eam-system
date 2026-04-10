'use client';

import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
}

export function DataTable<T extends Record<string, any>>({ data, columns }: DataTableProps<T>) {
  return (
    <table className="w-full">
      <thead className="bg-gray-50 dark:bg-gray-700">
        <tr>
          {columns.map((col) => (
            <th key={col.key} className="px-4 py-3 text-left text-sm font-semibold">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y">
        {data.map((item, i) => (
          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
            {columns.map((col) => (
              <td key={col.key} className="px-4 py-3 text-sm">
                {col.render ? col.render(item) : item[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
