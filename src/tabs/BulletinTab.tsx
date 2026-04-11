import { useAppStore } from '../store/appStore';
import BulletinCard from '../components/BulletinCard';

export default function BulletinTab() {
  const bulletin = useAppStore((state) => state.bulletin);

  // Sort bulletin posts newest first (reverse order)
  const sortedPosts = [...bulletin].reverse();

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {sortedPosts.length > 0 ? (
        <div>
          {sortedPosts.map((post) => (
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
