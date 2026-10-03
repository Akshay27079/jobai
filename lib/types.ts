export type ExperienceItem = {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
};

export type EducationItem = {
  school: string;
  degree: string;
  dates: string;
};

export type ParsedProfile = {
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  titles: string[];
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
};

export const emptyProfile = (): ParsedProfile => ({
  name: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  titles: [],
  skills: [],
  experience: [],
  education: [],
});
