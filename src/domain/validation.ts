export type ValidationResult = { valid: boolean; errors: Record<string,string> };

function result(errors:Record<string,string>):ValidationResult{
  return { valid:Object.keys(errors).length===0, errors };
}

export function validatePatientInput(input:{name:string;diagnosis:string;age:number|null}){
  const errors:Record<string,string>={};
  if(!input.name.trim())errors.name='El nombre es obligatorio.';
  if(!input.diagnosis.trim())errors.diagnosis='El motivo o diagnóstico es obligatorio.';
  if(input.age!==null&&(!Number.isInteger(input.age)||input.age<0||input.age>130))errors.age='La edad debe estar entre 0 y 130 años.';
  return result(errors);
}

export function validatePlanInput(input:{title:string;status:'draft'|'active'|'paused'|'completed'|'archived';exerciseIds:string[]}){
  const errors:Record<string,string>={};
  if(!input.title.trim())errors.title='El título del plan es obligatorio.';
  if(input.status==='active'&&!input.exerciseIds.length)errors.exerciseIds='Un plan activo debe incluir al menos un ejercicio.';
  return result(errors);
}

export function validateExerciseInput(input:{name:string;instructions:string[];sets:number;repetitions?:number;time?:string;maxPain:number|null}){
  const errors:Record<string,string>={};
  if(!input.name.trim())errors.name='El nombre del ejercicio es obligatorio.';
  if(!input.instructions.some((item)=>item.trim()))errors.instructions='Añade al menos una instrucción.';
  if(!Number.isInteger(input.sets)||input.sets<1)errors.sets='Las series deben ser un número mayor o igual que 1.';
  if((input.repetitions===undefined||input.repetitions<1)&&!input.time?.trim())errors.dose='Indica repeticiones o tiempo.';
  if(input.maxPain!==null&&(input.maxPain<0||input.maxPain>10))errors.maxPain='El dolor máximo debe estar entre 0 y 10.';
  return result(errors);
}
