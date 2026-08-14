export type Status = 'Pending' | 'Approved' | 'Rejected' | 'Under review';
export type Patient = { id:string; name:string; dob:string; phone:string; email:string; status:'Active'|'Inactive'; lastVisit:string };
export type Case = { id:string; patientId:string; patientName:string; type:string; created:string; amount:number; status:Status; notes:string };
