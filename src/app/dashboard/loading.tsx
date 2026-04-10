export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 bg-neutral-50 min-h-[calc(100vh-73px)]">
      {/* Page title skeleton */}
      <div className="mb-6">
        <div className="h-8 w-48 bg-neutral-200 rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-neutral-200 rounded-md animate-pulse mt-2" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-neutral-200 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-24 bg-neutral-200 rounded-md animate-pulse" />
              <div className="h-9 w-9 bg-neutral-100 rounded-lg animate-pulse" />
            </div>
            <div className="h-7 w-20 bg-neutral-200 rounded-md animate-pulse mb-1" />
            <div className="h-3 w-32 bg-neutral-100 rounded-md animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        {/* Table header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-36 bg-neutral-200 rounded-md animate-pulse" />
          <div className="h-9 w-28 bg-neutral-100 rounded-lg animate-pulse" />
        </div>

        {/* Spinner */}
        <div className="flex justify-center py-8">
          <div className="w-10 h-10 border-4 border-[#BD7C48] border-t-transparent rounded-full animate-spin" />
        </div>

        {/* Table rows skeleton */}
        <div className="space-y-4 mt-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-3 border-b border-neutral-100 last:border-0"
            >
              <div className="h-10 w-10 bg-neutral-100 rounded-lg animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/5 bg-neutral-200 rounded-md animate-pulse" />
                <div className="h-3 w-2/5 bg-neutral-100 rounded-md animate-pulse" />
              </div>
              <div className="h-6 w-16 bg-neutral-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
