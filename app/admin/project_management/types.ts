export interface Milestone {
  id: string;
  date: string;
  label: string;
  color: string;
}

export interface Vacation {
  id: string;
  person: string;
  team?: string;
  label?: string;
  start: string;
  end: string;
  color: string;
}

export interface Project {
  _id?: string; 
  id: string | number;   
  name: string;
  person: string;
  team: string;
  start: string;
  end: string;
  colorIdx: number;
  docUrl?: string;
  docName?: string;
  docKey?: string;
  isTentative?: boolean;
  customColor?: string;
  notes?: string;
  milestones?: Milestone[];
  vacations?: Vacation[];
}

export interface Team {
  id?: string;
  _id?: string;
  name: string;
  members: string[];
}

export interface Assignee {
  name: string;
  team: string;
  isNew?: boolean;
}

export interface GroupedProject extends Project {
  members: { person: string; team: string }[];
}

export interface EditingMember {
  _id?: string;
  id: string | number;
  person: string;
  team: string;
  start: string;
  end: string;
  docUrl?: string;
  docName?: string;
  docKey?: string;
  isTentative?: boolean;
  customColor?: string;
  notes?: string;
  milestones?: Milestone[];
  vacations?: Vacation[];
  isNew?: boolean;
  isDeleted?: boolean;
}

export type ApiProjectsResponse = {
  success: boolean;
  data?: Array<Project & { _id?: string }>;
  error?: string;
};
