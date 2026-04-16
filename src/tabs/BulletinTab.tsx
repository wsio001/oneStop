import { useAppStore } from '../store/appStore';
import BulletinCard from '../components/BulletinCard';

function BulletinSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 mb-2 animate-pulse">
      {/* Top row skeleton */}
      <div className="flex justify-between mb-1">
        <div className="h-3 w-12 bg-gray-200 rounded"></div>
        <div className="h-3 w-20 bg-gray-200 rounded"></div>
      </div>

      {/* Subject skeleton */}
      <div className="h-3.5 w-3/4 bg-gray-300 rounded mb-1"></div>

      {/* Body skeleton - 3 lines */}
      <div className="space-y-2 mb-2">
        <div className="h-2.5 w-full bg-gray-200 rounded"></div>
        <div className="h-2.5 w-full bg-gray-200 rounded"></div>
        <div className="h-2.5 w-2/3 bg-gray-200 rounded"></div>
      </div>

      {/* Optional link pill skeleton */}
      <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
    </div>
  );
}

export default function BulletinTab() {
  const bulletin = useAppStore((state) => state.bulletin);
  const lastSync = useAppStore((state) => state.lastSync);

  // Loading state: if never synced (lastSync is null)
  const isLoading = lastSync === null;

  // Bulletin posts are already sorted newest first in parser
  // No need to reverse or re-sort

  if (isLoading) {
    return (
      <div className="pb-6">
        <BulletinSkeleton />
        <BulletinSkeleton />
        <BulletinSkeleton />
      </div>
    );
  }

  return (
    <div className="pb-6">
      {bulletin.length > 0 ? (
        <div>
          {bulletin.map((post) => (
            <BulletinCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p className="text-base mb-2">No bulletin posts</p>
          <p className="text-sm text-gray-400">
            Check back later for updates
          </p>
        </div>
      )}
    </div>
  );
}
