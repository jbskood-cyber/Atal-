import { useCallback, useEffect, useState } from 'react';

export function useUnsavedChangesGuard(dirty:boolean){
  const[pending,setPending]=useState<null|(()=>void)>(null);
  useEffect(()=>{
    if(!dirty)return;
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',unload);
    return()=>window.removeEventListener('beforeunload',unload);
  },[dirty]);
  const requestNavigation=useCallback((action:()=>void)=>{if(!dirty){action();return true;}setPending(()=>action);return false;},[dirty]);
  const confirmDiscard=useCallback(()=>{const action=pending;setPending(null);action?.();},[pending]);
  const cancelDiscard=useCallback(()=>setPending(null),[]);
  return{hasPendingNavigation:Boolean(pending),requestNavigation,confirmDiscard,cancelDiscard};
}
