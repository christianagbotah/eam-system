'use client';

import { useState, useEffect } from 'react';
import { maintenanceService } from '@/services/maintenanceService';
import { showToast } from '@/lib/toast';

interface Comment {
  id: number;
  comment: string;
  user_name: string;
  created_at: string;
  user_id: number;
}

interface CommentsProps {
  entityType: string;
  entityId: number;
  currentUserId: number;
}

export default function Comments({ entityType, entityId, currentUserId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [entityType, entityId]);

  const loadComments = async () => {
    try {
      const res = await maintenanceService.getComments(entityType, entityId);
      setComments(res.data.data || []);
    } catch (error) {
      showToast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newComment.trim()) return;
    try {
      await maintenanceService.addComment({
        entity_type: entityType,
        entity_id: entityId,
        comment: newComment,
        user_id: currentUserId
      });
      setNewComment('');
      showToast.success('Comment added');
      loadComments();
    } catch (error) {
      showToast.error('Failed to add comment');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editText.trim()) return;
    try {
      await maintenanceService.updateComment(id, editText);
      setEditingId(null);
      showToast.success('Comment updated');
      loadComments();
    } catch (error) {
      showToast.error('Failed to update comment');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await maintenanceService.deleteComment(id);
      showToast.success('Comment deleted');
      loadComments();
    } catch (error) {
      showToast.error('Failed to delete comment');
    }
  };

  if (loading) return <div className="text-gray-500">Loading comments...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 border rounded px-3 py-2"
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Add
        </button>
      </div>

      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="bg-gray-50 p-3 rounded">
            {editingId === c.id ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 border rounded px-2 py-1"
                />
                <button onClick={() => handleUpdate(c.id)} className="text-green-600 hover:text-green-700">
                  Save
                </button>
                <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-700">
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <p className="text-gray-800">{c.comment}</p>
                <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                  <span>{c.user_name} • {new Date(c.created_at).toLocaleString()}</span>
                  {c.user_id === currentUserId && (
                    <div className="space-x-2">
                      <button
                        onClick={() => {
                          setEditingId(c.id);
                          setEditText(c.comment);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-700">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        {comments.length === 0 && <p className="text-gray-500 text-center py-4">No comments yet</p>}
      </div>
    </div>
  );
}
