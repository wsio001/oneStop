import type { BulletinPost } from '../types';

type BulletinCardProps = {
  post: BulletinPost;
};

export default function BulletinCard({ post }: BulletinCardProps) {
  const handleLinkClick = () => {
    if (post.link_url) {
      window.open(post.link_url, '_blank');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 mb-2">
      {/* Top row: date and posted_by */}
      <div className="flex justify-between mb-1">
        <div className="text-[9px] text-gray-500">{post.date}</div>
        <div className="text-[9px] text-gray-500">{post.posted_by}</div>
      </div>

      {/* Subject */}
      <div className="text-[12px] font-medium mb-1">{post.subject}</div>

      {/* Body - preserve newlines, dynamic height to show all text */}
      <div className="text-[10px] text-gray-600 leading-relaxed mb-2 whitespace-pre-line">
        {post.body}
      </div>

      {/* Link pill (only if link_url exists) */}
      {post.link_url && (
        <button
          onClick={handleLinkClick}
          className="inline-block bg-blue-500 text-white text-[9px] px-2 py-1 rounded-full font-semibold hover:bg-blue-600 transition-colors"
        >
          {post.link_label || 'Open link →'}
        </button>
      )}
    </div>
  );
}
