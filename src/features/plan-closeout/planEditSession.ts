export type PlanEditSession={stagedExerciseIds:Set<string>;saved:boolean};
export function createPlanEditSession():PlanEditSession{return{stagedExerciseIds:new Set(),saved:false};}
export function stagePlanExercise(session:PlanEditSession,exerciseId:string){session.stagedExerciseIds.add(exerciseId);}
export function promotePlanEditSession(session:PlanEditSession){session.saved=true;session.stagedExerciseIds.clear();}
export function discardPlanEditSession(session:PlanEditSession){const ids=[...session.stagedExerciseIds];session.stagedExerciseIds.clear();return ids;}
