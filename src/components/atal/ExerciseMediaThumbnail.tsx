import { useEffect, useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { getExerciseMedia } from '@/src/data/exerciseMediaRepository';

export function ExerciseMediaThumbnail({ mediaId, name }: { mediaId?: string; name: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true; let objectUrl = '';
    if (!mediaId) { setUrl(''); return; }
    getExerciseMedia(mediaId).then((record) => {
      if (!active || !record?.files[0]) return;
      objectUrl = URL.createObjectURL(record.files[0]); setUrl(objectUrl);
    }).catch(() => setUrl(''));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [mediaId]);
  return url ? <img src={url} alt={`Recurso de ${name}`} /> : <span className="atal-exercise-thumb-empty" aria-hidden="true"><Dumbbell /></span>;
}
