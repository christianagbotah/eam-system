export const CardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
  </div>
);

export const TableSkeleton = () => (
  <div className="bg-white rounded-lg shadow overflow-hidden animate-pulse">
    <div className="h-12 bg-gray-200"></div>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-16 bg-gray-100 border-t border-gray-200"></div>
    ))}
  </div>
);

export const GridSkeleton = ({ cols = 3 }: { cols?: number }) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-4`}>
    {[...Array(6)].map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export const FormSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 space-y-4 animate-pulse">
    {[...Array(4)].map((_, i) => (
      <div key={i}>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    ))}
  </div>
);

export const StatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    ))}
  </div>
);
